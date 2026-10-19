import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { SequenceService } from '../../common/sequence/sequence.service';
import { InventoryService } from '../inventory/inventory.service';
import { Role } from '@xfarm/shared';
import {
  CreateCountDto,
  CreateIssueDto,
  CreateReceiptDto,
  CreateTransferDto,
  StockBalanceQueryDto,
  StockMoveQueryDto,
} from './stock.dto';

const REF_TYPE = 'STOCK_DOC';

@Injectable()
export class StockService {
  constructor(
    private readonly inventory: InventoryService,
    private readonly sequence: SequenceService,
  ) {}

  async balances(query: StockBalanceQueryDto, role?: Role) {
    const conditions = [Prisma.sql`1 = 1`];
    if (query.warehouseId) conditions.push(Prisma.sql`b."warehouseId" = ${query.warehouseId}`);
    if (query.itemId) conditions.push(Prisma.sql`b."itemId" = ${query.itemId}`);
    if (query.search) {
      const searchPattern = `%${query.search}%`;
      conditions.push(Prisma.sql`(i.sku ILIKE ${searchPattern} OR i.name ILIKE ${searchPattern})`);
    }
    if (query.category) conditions.push(Prisma.sql`i."category"::text = ${query.category}`);
    if (query.lotCode) conditions.push(Prisma.sql`l."lotCode" ILIKE ${`%${query.lotCode}%`}`);
    if (!query.includeZero) conditions.push(Prisma.sql`b.quantity <> 0`);
    const where = Prisma.join(conditions, ' AND ');
    const offset = (query.page - 1) * query.pageSize;
    const [data, count] = await Promise.all([
      prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT b."itemId", i.sku, i.name AS "itemName", i.unit, i.category,
          b."stockLotId", l."lotCode", l."expiryDate", b."warehouseId",
          w.code AS "warehouseCode", w.name AS "warehouseName", b.quantity,
          l."unitCost", (b.quantity * l."unitCost") AS "totalCost"
        FROM "stock_balances" b
        JOIN items i ON i.id = b."itemId"
        LEFT JOIN stock_lots l ON l.id = b."stockLotId"
        LEFT JOIN warehouses w ON w.id = b."warehouseId"
        WHERE ${where}
        ORDER BY i.name ASC, l."expiryDate" ASC NULLS LAST, l."lotCode" ASC
        OFFSET ${offset} LIMIT ${query.pageSize}`),
      prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count FROM "stock_balances" b
        JOIN items i ON i.id = b."itemId"
        LEFT JOIN stock_lots l ON l.id = b."stockLotId"
        WHERE ${where}`),
    ]);
    return {
      data:
        role === Role.WORKER
          ? data.map(
              ({ unitCost: _unitCost, totalCost: _totalCost, ...availability }) => availability,
            )
          : data,
      total: Number(count[0]?.count ?? 0),
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async moves(query: StockMoveQueryDto) {
    const where: Prisma.StockMoveWhereInput = {};
    if (query.itemId) where.itemId = query.itemId;
    if (query.type) where.type = query.type;
    if (query.warehouseId) {
      where.OR = [{ fromWarehouseId: query.warehouseId }, { toWarehouseId: query.warehouseId }];
    }
    if (query.from || query.to) {
      where.movedAt = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }
    const [data, total] = await Promise.all([
      prisma.stockMove.findMany({
        where,
        include: { item: true, stockLot: true, fromWarehouse: true, toWarehouse: true },
        orderBy: { movedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.stockMove.count({ where }),
    ]);
    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async receipt(dto: CreateReceiptDto, userId: string) {
    return prisma.$transaction(async (tx) => {
      await this.assertWarehouse(tx, dto.warehouseId);
      const code = await this.sequence.nextInTransaction(tx, 'NK');
      for (const line of dto.lines) {
        await this.assertItem(tx, line.itemId);
        await this.inventory.receive(tx, {
          itemId: line.itemId,
          warehouseId: dto.warehouseId,
          quantity: line.quantity,
          unitCost: line.unitCost ?? 0,
          lotCode: line.lotCode,
          expiryDate: line.expiryDate ?? undefined,
          refType: REF_TYPE,
          refId: code,
          movedAt: dto.movedAt ?? undefined,
        });
      }
      return this.document(tx, code, 'NK', userId, dto.notes);
    });
  }

  async issue(dto: CreateIssueDto, userId: string) {
    return prisma.$transaction(async (tx) => {
      await this.assertWarehouse(tx, dto.warehouseId);
      const code = await this.sequence.nextInTransaction(tx, 'XK');
      for (const line of dto.lines) {
        await this.assertItem(tx, line.itemId);
        await this.inventory.issueFifo(tx, {
          itemId: line.itemId,
          warehouseId: dto.warehouseId,
          quantity: line.quantity,
          refType: REF_TYPE,
          refId: code,
          movedAt: dto.movedAt ?? undefined,
        });
      }
      return this.document(tx, code, 'XK', userId, dto.reason ?? dto.notes);
    });
  }

  async transfer(dto: CreateTransferDto, userId: string) {
    return prisma.$transaction(async (tx) => {
      await this.assertWarehouse(tx, dto.fromWarehouseId);
      await this.assertWarehouse(tx, dto.toWarehouseId);
      const code = await this.sequence.nextInTransaction(tx, 'DC');
      for (const line of dto.lines) {
        await this.assertItem(tx, line.itemId);
        await this.inventory.transfer(tx, {
          itemId: line.itemId,
          fromWarehouseId: dto.fromWarehouseId,
          toWarehouseId: dto.toWarehouseId,
          quantity: line.quantity,
          refType: REF_TYPE,
          refId: code,
          movedAt: dto.movedAt ?? undefined,
        });
      }
      return this.document(tx, code, 'DC', userId, dto.notes);
    });
  }

  async count(dto: CreateCountDto, userId: string) {
    return prisma.$transaction(async (tx) => {
      await this.assertWarehouse(tx, dto.warehouseId);
      const code = await this.sequence.nextInTransaction(tx, 'KK');
      for (const line of dto.lines) {
        await this.inventory.adjust(tx, {
          itemId: line.itemId,
          warehouseId: dto.warehouseId,
          stockLotId: line.stockLotId ?? '',
          countedQuantity: 'countedQuantity' in line ? line.countedQuantity : line.quantity,
          refType: REF_TYPE,
          refId: code,
          movedAt: dto.movedAt ?? undefined,
        });
      }
      return this.document(tx, code, 'KK', userId, dto.notes);
    });
  }

  async documents(page: number, pageSize: number) {
    const groups = await prisma.stockMove.groupBy({
      by: ['refId'],
      where: { refType: REF_TYPE, refId: { not: null } },
      _min: { movedAt: true, createdAt: true },
      orderBy: { _min: { createdAt: 'desc' } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const total = await prisma.stockMove.findMany({
      where: { refType: REF_TYPE },
      distinct: ['refId'],
      select: { refId: true },
    });
    const codes = groups.flatMap((group) => (group.refId ? [group.refId] : []));
    const data = await Promise.all(codes.map((code) => this.getDocument(code)));
    return { data, total: total.length, page, pageSize };
  }

  async getDocument(code: string) {
    const moves = await prisma.stockMove.findMany({
      where: { refType: REF_TYPE, refId: code },
      include: { item: true, stockLot: true, fromWarehouse: true, toWarehouse: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!moves.length) throw new NotFoundException('Không tìm thấy phiếu kho');
    return { code, type: code.slice(0, 2), movedAt: moves[0].movedAt, moves };
  }

  private async document(
    tx: Prisma.TransactionClient,
    code: string,
    type: string,
    _userId: string,
    notes?: string,
  ) {
    const moves = await tx.stockMove.findMany({
      where: { refType: REF_TYPE, refId: code },
      orderBy: { createdAt: 'asc' },
    });
    if (notes)
      await tx.stockMove.updateMany({ where: { refType: REF_TYPE, refId: code }, data: { notes } });
    return { code, type, movedAt: moves[0]?.movedAt ?? new Date(), moves };
  }

  private async assertWarehouse(tx: Prisma.TransactionClient, id: string) {
    if (!(await tx.warehouse.findUnique({ where: { id }, select: { id: true } })))
      throw new UnprocessableEntityException('Kho không tồn tại');
  }

  private async assertItem(tx: Prisma.TransactionClient, id: string) {
    if (!(await tx.item.findUnique({ where: { id }, select: { id: true } })))
      throw new UnprocessableEntityException('Vật tư không tồn tại');
  }
}
