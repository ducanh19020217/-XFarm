import path from 'path';
import * as dotenv from 'dotenv';

const rootEnvPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnvPath });
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  'postgresql://xfarm:xfarm_secret@localhost:5442/xfarm_test?schema=public';
process.env.NODE_ENV = 'test';

import { prisma, Prisma } from '@xfarm/db';
import { InventoryService } from '../src/modules/inventory/inventory.service';
import { cleanupDatabase } from './helpers/cleanup';

describe('InventoryService E2E', () => {
  const service = new InventoryService();
  let itemId: string;
  let warehouseId: string;
  let secondWarehouseId: string;

  beforeEach(async () => {
    await cleanupDatabase(prisma);
    const item = await prisma.item.create({
      data: { sku: `INV-${Date.now()}`, name: 'Phân hữu cơ', category: 'FERTILIZER', unit: 'kg' },
    });
    const warehouses = await prisma.$transaction([
      prisma.warehouse.create({ data: { code: `INV-A-${Date.now()}`, name: 'Kho A' } }),
      prisma.warehouse.create({ data: { code: `INV-B-${Date.now()}`, name: 'Kho B' } }),
    ]);
    itemId = item.id;
    [warehouseId, secondWarehouseId] = warehouses.map((warehouse) => warehouse.id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('xuất FIFO theo hạn dùng và chặn xuất vượt tồn mà không tạo move', async () => {
    await prisma.$transaction(async (tx) => {
      await service.receive(tx, {
        itemId,
        warehouseId,
        quantity: 4,
        unitCost: 10,
        lotCode: 'EARLY',
        expiryDate: new Date('2026-01-01'),
      });
      await service.receive(tx, {
        itemId,
        warehouseId,
        quantity: 6,
        unitCost: 12,
        lotCode: 'LATE',
        expiryDate: new Date('2026-12-31'),
      });
    });

    const issued = await prisma.$transaction((tx) =>
      service.issueFifo(tx, { itemId, warehouseId, quantity: 3, refType: 'TEST', refId: 'FIFO-1' }),
    );
    expect(issued.lots[0]).toMatchObject({ lotCode: 'EARLY', quantity: new Prisma.Decimal(3) });
    expect(await service.getBalance({ itemId, warehouseId })).toEqual(new Prisma.Decimal(7));

    await expect(
      prisma.$transaction((tx) =>
        service.issueFifo(tx, {
          itemId,
          warehouseId,
          quantity: 8,
          refType: 'TEST',
          refId: 'FIFO-2',
        }),
      ),
    ).rejects.toThrow('Không đủ tồn kho');
    expect(await prisma.stockMove.count({ where: { type: 'OUT', refId: 'FIFO-2' } })).toBe(0);
  });

  it('khóa đồng thời để chỉ đủ số lệnh xuất thành công', async () => {
    await prisma.$transaction((tx) =>
      service.receive(tx, {
        itemId,
        warehouseId,
        quantity: 7,
        unitCost: 10,
        lotCode: 'CONCURRENT',
      }),
    );
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        prisma
          .$transaction((tx) =>
            service.issueFifo(tx, {
              itemId,
              warehouseId,
              quantity: 1,
              refType: 'CONCURRENT',
              refId: String(index),
            }),
          )
          .then(() => true)
          .catch(() => false),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(7);
    expect(results.filter((result) => !result)).toHaveLength(3);
    expect(await service.getBalance({ itemId, warehouseId })).toEqual(new Prisma.Decimal(0));
  });

  it('điều chuyển FIFO, kiểm kê tăng giảm và đảo bút toán', async () => {
    await prisma.$transaction((tx) =>
      service.receive(tx, {
        itemId,
        warehouseId,
        quantity: 5,
        unitCost: 10,
        lotCode: 'TRANSFER',
        refType: 'RECEIVE',
        refId: 'R-1',
      }),
    );
    await prisma.$transaction((tx) =>
      service.transfer(tx, {
        itemId,
        fromWarehouseId: warehouseId,
        toWarehouseId: secondWarehouseId,
        quantity: 2,
        refType: 'TRANSFER',
        refId: 'T-1',
      }),
    );
    expect(await service.getBalance({ itemId, warehouseId })).toEqual(new Prisma.Decimal(3));
    expect(await service.getBalance({ itemId, warehouseId: secondWarehouseId })).toEqual(
      new Prisma.Decimal(2),
    );

    const lot = await prisma.stockLot.findUniqueOrThrow({
      where: { itemId_lotCode: { itemId, lotCode: 'TRANSFER' } },
    });
    await prisma.$transaction((tx) =>
      service.adjust(tx, {
        itemId,
        warehouseId,
        stockLotId: lot.id,
        countedQuantity: 4,
        refType: 'COUNT',
        refId: 'C-1',
      }),
    );
    expect(await service.getBalance({ itemId, warehouseId })).toEqual(new Prisma.Decimal(4));
    await prisma.$transaction((tx) =>
      service.adjust(tx, {
        itemId,
        warehouseId,
        stockLotId: lot.id,
        countedQuantity: 1,
        refType: 'COUNT',
        refId: 'C-2',
      }),
    );
    expect(await service.getBalance({ itemId, warehouseId })).toEqual(new Prisma.Decimal(1));

    await prisma.$transaction((tx) => service.reverseByRef(tx, 'COUNT', 'C-2'));
    await prisma.$transaction((tx) => service.reverseByRef(tx, 'COUNT', 'C-1'));
    await prisma.$transaction((tx) => service.reverseByRef(tx, 'TRANSFER', 'T-1'));
    await prisma.$transaction((tx) => service.reverseByRef(tx, 'RECEIVE', 'R-1'));
    expect(await service.getBalance({ itemId, warehouseId })).toEqual(new Prisma.Decimal(0));
    expect(await service.getBalance({ itemId, warehouseId: secondWarehouseId })).toEqual(
      new Prisma.Decimal(0),
    );
  });
});
