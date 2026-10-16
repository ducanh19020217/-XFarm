import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';

type DbClient = Prisma.TransactionClient;
type Client = DbClient | typeof prisma;

export type StockReference = {
  refType?: string;
  refId?: string;
  movedAt?: Date;
};

export type GetBalanceInput = {
  itemId: string;
  warehouseId?: string;
  stockLotId?: string;
};

export type ReceiveInput = StockReference & {
  itemId: string;
  warehouseId: string;
  quantity: Prisma.Decimal | number | string;
  unitCost: Prisma.Decimal | number | string;
  lotCode?: string;
  expiryDate?: Date;
  harvestLotId?: string;
};

export type IssueInput = StockReference & {
  itemId: string;
  warehouseId: string;
  quantity: Prisma.Decimal | number | string;
};

export type TransferInput = StockReference & {
  itemId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: Prisma.Decimal | number | string;
};

export type AdjustInput = StockReference & {
  itemId: string;
  warehouseId: string;
  stockLotId: string;
  countedQuantity: Prisma.Decimal | number | string;
};

type LotBalance = {
  stockLotId: string;
  lotCode: string;
  unitCost: Prisma.Decimal;
  quantity: Prisma.Decimal;
  expiryDate: Date | null;
  createdAt: Date;
};

@Injectable()
export class InventoryService {
  private decimal(value: Prisma.Decimal | number | string) {
    return new Prisma.Decimal(value);
  }

  private async lockPair(tx: Client, itemId: string, warehouseId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${itemId}:${warehouseId}`}))`;
  }

  private async lockLotCode(tx: Client, itemId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${itemId}:lot-code`}))`;
  }

  async getBalance(input: GetBalanceInput, tx?: DbClient): Promise<Prisma.Decimal> {
    const client = tx ?? prisma;
    const conditions = [Prisma.sql`"itemId" = ${input.itemId}`];
    if (input.warehouseId) conditions.push(Prisma.sql`"warehouseId" = ${input.warehouseId}`);
    if (input.stockLotId) conditions.push(Prisma.sql`"stockLotId" = ${input.stockLotId}`);
    const where = Prisma.join(conditions, ' AND ');
    const rows = await client.$queryRaw<Array<{ quantity: Prisma.Decimal }>>(
      Prisma.sql`SELECT COALESCE(SUM(quantity), 0) AS quantity FROM "stock_balances" WHERE ${where}`,
    );
    return new Prisma.Decimal(rows[0]?.quantity ?? 0);
  }

  async receive(tx: DbClient, input: ReceiveInput) {
    await this.lockPair(tx, input.itemId, input.warehouseId);
    await this.lockLotCode(tx, input.itemId);
    const quantity = this.decimal(input.quantity);
    if (quantity.lessThanOrEqualTo(0)) {
      throw new UnprocessableEntityException('Số lượng nhập phải lớn hơn 0');
    }

    const lotCode = input.lotCode?.trim() || (await this.nextLotCode(tx, input.itemId));
    const lot = await tx.stockLot.create({
      data: {
        itemId: input.itemId,
        lotCode,
        expiryDate: input.expiryDate,
        harvestLotId: input.harvestLotId,
        warehouseId: input.warehouseId,
        unitCost: this.decimal(input.unitCost),
      },
    });
    const move = await tx.stockMove.create({
      data: {
        type: 'IN',
        itemId: input.itemId,
        stockLotId: lot.id,
        toWarehouseId: input.warehouseId,
        quantity,
        unitCost: lot.unitCost,
        refType: input.refType,
        refId: input.refId,
        movedAt: input.movedAt,
      },
    });
    return { lot, move };
  }

  async issueFifo(tx: DbClient, input: IssueInput) {
    await this.lockPair(tx, input.itemId, input.warehouseId);
    const requested = this.decimal(input.quantity);
    if (requested.lessThanOrEqualTo(0)) {
      throw new UnprocessableEntityException('Số lượng xuất phải lớn hơn 0');
    }
    const lots = await this.availableLots(tx, input.itemId, input.warehouseId);
    const available = lots.reduce((sum, lot) => sum.plus(lot.quantity), new Prisma.Decimal(0));
    if (available.lessThan(requested)) {
      const item = await tx.item.findUnique({
        where: { id: input.itemId },
        select: { name: true, unit: true },
      });
      throw new UnprocessableEntityException(
        `Không đủ tồn kho: ${item?.name ?? input.itemId} còn ${available.toString()} ${item?.unit ?? ''}, cần ${requested.toString()}`.trim(),
      );
    }

    let remaining = requested;
    let totalCost = new Prisma.Decimal(0);
    const moves: Prisma.StockMoveGetPayload<{}>[] = [];
    const issuedLots: Array<{
      stockLotId: string;
      lotCode: string;
      quantity: Prisma.Decimal;
      unitCost: Prisma.Decimal;
    }> = [];
    for (const lot of lots) {
      if (remaining.isZero()) break;
      const quantity = Prisma.Decimal.min(remaining, lot.quantity);
      const move = await tx.stockMove.create({
        data: {
          type: 'OUT',
          itemId: input.itemId,
          stockLotId: lot.stockLotId,
          fromWarehouseId: input.warehouseId,
          quantity,
          unitCost: lot.unitCost,
          refType: input.refType,
          refId: input.refId,
          movedAt: input.movedAt,
        },
      });
      moves.push(move);
      issuedLots.push({
        stockLotId: lot.stockLotId,
        lotCode: lot.lotCode,
        quantity,
        unitCost: lot.unitCost,
      });
      remaining = remaining.minus(quantity);
      totalCost = totalCost.plus(quantity.times(lot.unitCost));
    }
    return { lots: issuedLots, moves, totalCost };
  }

  async transfer(tx: DbClient, input: TransferInput) {
    const warehouseIds = [input.fromWarehouseId, input.toWarehouseId].sort();
    for (const warehouseId of warehouseIds) {
      await this.lockPair(tx, input.itemId, warehouseId);
    }
    const requested = this.decimal(input.quantity);
    if (requested.lessThanOrEqualTo(0)) {
      throw new UnprocessableEntityException('Số lượng điều chuyển phải lớn hơn 0');
    }
    const lots = await this.availableLots(tx, input.itemId, input.fromWarehouseId);
    const available = lots.reduce((sum, lot) => sum.plus(lot.quantity), new Prisma.Decimal(0));
    if (available.lessThan(requested)) {
      const item = await tx.item.findUnique({
        where: { id: input.itemId },
        select: { name: true, unit: true },
      });
      throw new UnprocessableEntityException(
        `Không đủ tồn kho: ${item?.name ?? input.itemId} còn ${available.toString()} ${item?.unit ?? ''}, cần ${requested.toString()}`.trim(),
      );
    }

    let remaining = requested;
    const moves: Prisma.StockMoveGetPayload<{}>[] = [];
    for (const lot of lots) {
      if (remaining.isZero()) break;
      const quantity = Prisma.Decimal.min(remaining, lot.quantity);
      moves.push(
        await tx.stockMove.create({
          data: {
            type: 'TRANSFER',
            itemId: input.itemId,
            stockLotId: lot.stockLotId,
            fromWarehouseId: input.fromWarehouseId,
            toWarehouseId: input.toWarehouseId,
            quantity,
            unitCost: lot.unitCost,
            refType: input.refType,
            refId: input.refId,
            movedAt: input.movedAt,
          },
        }),
      );
      remaining = remaining.minus(quantity);
    }
    return moves;
  }

  async adjust(tx: DbClient, input: AdjustInput) {
    await this.lockPair(tx, input.itemId, input.warehouseId);
    const counted = this.decimal(input.countedQuantity);
    if (counted.lessThan(0)) {
      throw new UnprocessableEntityException('Số lượng kiểm kê không được âm');
    }
    const current = await this.getBalance(
      { itemId: input.itemId, warehouseId: input.warehouseId, stockLotId: input.stockLotId },
      tx,
    );
    const difference = counted.minus(current);
    if (difference.isZero()) return null;
    const lot = await tx.stockLot.findUnique({
      where: { id: input.stockLotId },
      select: { itemId: true, unitCost: true },
    });
    if (!lot || lot.itemId !== input.itemId)
      throw new UnprocessableEntityException('Lô hàng không hợp lệ');
    return tx.stockMove.create({
      data: {
        type: 'ADJUST',
        direction: difference.isPositive() ? 'IN' : 'OUT',
        itemId: input.itemId,
        stockLotId: input.stockLotId,
        toWarehouseId: input.warehouseId,
        quantity: difference.abs(),
        unitCost: lot.unitCost,
        refType: input.refType,
        refId: input.refId,
        movedAt: input.movedAt,
      },
    });
  }

  async reverseByRef(tx: DbClient, refType: string, refId: string) {
    const moves = await tx.stockMove.findMany({
      where: { refType, refId },
      orderBy: { createdAt: 'asc' },
    });
    const reversed = [];
    for (const move of moves) {
      const data = {
        itemId: move.itemId,
        stockLotId: move.stockLotId,
        quantity: move.quantity,
        unitCost: move.unitCost,
        refType: 'REVERSAL',
        refId: move.id,
        movedAt: new Date(),
      };
      if (move.type === 'IN') {
        reversed.push(
          await tx.stockMove.create({
            data: { ...data, type: 'OUT', fromWarehouseId: move.toWarehouseId },
          }),
        );
      } else if (move.type === 'OUT') {
        reversed.push(
          await tx.stockMove.create({
            data: { ...data, type: 'IN', toWarehouseId: move.fromWarehouseId },
          }),
        );
      } else if (move.type === 'TRANSFER') {
        reversed.push(
          await tx.stockMove.create({
            data: {
              ...data,
              type: 'TRANSFER',
              fromWarehouseId: move.toWarehouseId,
              toWarehouseId: move.fromWarehouseId,
            },
          }),
        );
      } else if (move.direction) {
        reversed.push(
          await tx.stockMove.create({
            data: {
              ...data,
              type: 'ADJUST',
              direction: move.direction === 'IN' ? 'OUT' : 'IN',
              toWarehouseId: move.toWarehouseId,
            },
          }),
        );
      }
    }
    return reversed;
  }

  private async nextLotCode(tx: Client, itemId: string) {
    const year = new Date().getUTCFullYear();
    const prefix = `LOT-${year}-`;
    const last = await tx.stockLot.findFirst({
      where: { itemId, lotCode: { startsWith: prefix } },
      orderBy: { lotCode: 'desc' },
      select: { lotCode: true },
    });
    const number = last ? Number(last.lotCode.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(number).padStart(4, '0')}`;
  }

  private async availableLots(tx: Client, itemId: string, warehouseId: string) {
    return tx.$queryRaw<LotBalance[]>(Prisma.sql`
      SELECT l.id AS "stockLotId", l."lotCode", l."unitCost", l."expiryDate", l."createdAt", b.quantity
      FROM "stock_lots" l
      JOIN "stock_balances" b ON b."stockLotId" = l.id
        AND b."itemId" = l."itemId"
        AND b."warehouseId" = ${warehouseId}
      WHERE l."itemId" = ${itemId} AND b.quantity > 0
      ORDER BY l."expiryDate" ASC NULLS LAST, l."createdAt" ASC
    `);
  }
}
