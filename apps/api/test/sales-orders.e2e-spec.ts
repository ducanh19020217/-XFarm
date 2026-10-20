import path from 'path';
import * as dotenv from 'dotenv';

const rootEnvPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnvPath });
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  'postgresql://xfarm:xfarm_secret@localhost:5442/xfarm_test?schema=public';
process.env.NODE_ENV = 'test';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import argon2 from 'argon2';
import { prisma } from '@xfarm/db';
import { AppModule } from '../src/app.module';

describe('Sales orders API E2E', () => {
  let app: INestApplication;
  let salesCookies: string[];
  let workerCookies: string[];
  let itemId: string;
  let warehouseId: string;
  let customerId: string;
  let lotIds: string[];

  const login = async (email: string) => {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email,
      password: 'Admin@123',
    });
    expect(response.status).toBe(200);
    const rawCookies = response.headers['set-cookie'];
    return Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];
  };

  const createOrder = async (quantity: number, cookies = salesCookies) =>
    request(app.getHttpServer())
      .post('/api/v1/sales-orders')
      .set('Cookie', cookies)
      .send({
        customerId,
        paymentMethod: 'COD',
        shippingAddress: '12 Đường Mẫu, Hà Nội',
        lines: [{ itemId, quantity, unitPrice: 10000 }],
      });

  const balances = async () => {
    const rows = await prisma.$queryRaw<Array<{ quantity: string | number }>>`
      SELECT COALESCE(SUM(quantity), 0) AS quantity
      FROM stock_balances
      WHERE "itemId" = ${itemId} AND "warehouseId" = ${warehouseId}
    `;
    return Number(rows[0]?.quantity ?? 0);
  };

  beforeAll(async () => {
    const passwordHash = await argon2.hash('Admin@123');
    await prisma.user.upsert({
      where: { email: 'sales-e2e@xfarm.local' },
      update: { passwordHash, isActive: true, role: 'SALES' },
      create: {
        email: 'sales-e2e@xfarm.local',
        passwordHash,
        fullName: 'Sales E2E',
        role: 'SALES',
        isActive: true,
      },
    });
    await prisma.user.upsert({
      where: { email: 'worker-e2e@xfarm.local' },
      update: { passwordHash, isActive: true, role: 'WORKER' },
      create: {
        email: 'worker-e2e@xfarm.local',
        passwordHash,
        fullName: 'Worker E2E',
        role: 'WORKER',
        isActive: true,
      },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();

    salesCookies = await login('sales-e2e@xfarm.local');
    workerCookies = await login('worker-e2e@xfarm.local');
  });

  beforeEach(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [item, warehouse, customer] = await prisma.$transaction([
      prisma.item.create({
        data: {
          sku: `SO-E2E-${suffix}`,
          name: 'Nông sản kiểm thử',
          category: 'PRODUCE',
          unit: 'kg',
          isSellable: true,
        },
      }),
      prisma.warehouse.create({ data: { code: `SO-E2E-${suffix}`, name: 'Kho bán hàng E2E' } }),
      prisma.customer.create({
        data: {
          code: `CU-E2E-${suffix}`,
          name: 'Khách bán hàng E2E',
          phone: `09${suffix.replace(/\D/g, '').slice(-8)}`,
        },
      }),
    ]);
    itemId = item.id;
    warehouseId = warehouse.id;
    customerId = customer.id;

    const oldLot = await prisma.stockLot.create({
      data: {
        itemId,
        warehouseId,
        lotCode: `OLD-${suffix}`,
        unitCost: 1000,
      },
    });
    const newLot = await prisma.stockLot.create({
      data: {
        itemId,
        warehouseId,
        lotCode: `NEW-${suffix}`,
        unitCost: 1200,
      },
    });
    lotIds = [oldLot.id, newLot.id];
    await prisma.stockMove.createMany({
      data: [
        {
          type: 'IN',
          itemId,
          stockLotId: oldLot.id,
          toWarehouseId: warehouseId,
          quantity: 4,
          unitCost: 1000,
        },
        {
          type: 'IN',
          itemId,
          stockLotId: newLot.id,
          toWarehouseId: warehouseId,
          quantity: 6,
          unitCost: 1200,
        },
      ],
    });
  });

  afterEach(async () => {
    await prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({ where: { order: { customerId } } });
      await tx.salesOrderLine.deleteMany({ where: { order: { customerId } } });
      await tx.salesOrder.deleteMany({ where: { customerId } });
      await tx.stockMove.deleteMany({ where: { itemId } });
      await tx.stockLot.deleteMany({ where: { itemId } });
      await tx.item.delete({ where: { id: itemId } });
      await tx.warehouse.delete({ where: { id: warehouseId } });
      await tx.customer.delete({ where: { id: customerId } });
    });
  });

  afterAll(async () => {
    await app.close();
    const users = await prisma.user.findMany({
      where: { email: { in: ['sales-e2e@xfarm.local', 'worker-e2e@xfarm.local'] } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    await prisma.$transaction(async (tx) => {
      await tx.auditLog.deleteMany({ where: { userId: { in: userIds } } });
      await tx.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    });
    await prisma.$disconnect();
  });

  it('SALES tạo được đơn, xác nhận FIFO qua hai lô và hủy hoàn đúng từng lô', async () => {
    const created = await createOrder(7);
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('PENDING');
    expect(created.body.data.total).toBe('70000');

    const orderId = created.body.data.id as string;
    const lineId = created.body.data.lines[0].id as string;
    const confirmed = await request(app.getHttpServer())
      .post(`/api/v1/sales-orders/${orderId}/confirm`)
      .set('Cookie', salesCookies)
      .send({ warehouseId });
    expect(confirmed.status).toBe(201);
    expect(confirmed.body.data.status).toBe('CONFIRMED');
    expect(confirmed.body.data.lines[0].stockLotId).toBe(lotIds[0]);
    expect(await balances()).toBe(3);

    const issued = await prisma.stockMove.findMany({
      where: { refType: 'SalesOrderLine', refId: lineId, type: 'OUT' },
      orderBy: { createdAt: 'asc' },
    });
    expect(issued).toHaveLength(2);
    expect(issued.map((move) => [move.stockLotId, Number(move.quantity)])).toEqual([
      [lotIds[0], 4],
      [lotIds[1], 3],
    ]);

    const cancelled = await request(app.getHttpServer())
      .post(`/api/v1/sales-orders/${orderId}/cancel`)
      .set('Cookie', salesCookies)
      .send();
    expect(cancelled.status).toBe(201);
    expect(cancelled.body.data.status).toBe('CANCELLED');
    expect(await balances()).toBe(10);
    const returned = await prisma.stockMove.findMany({
      where: { refType: 'SalesOrderCancel', refId: orderId },
      orderBy: { createdAt: 'asc' },
    });
    expect(returned).toHaveLength(2);
    expect(
      returned.map((move) => [move.stockLotId, move.toWarehouseId, Number(move.quantity)]),
    ).toEqual([
      [lotIds[0], warehouseId, 4],
      [lotIds[1], warehouseId, 3],
    ]);
    const secondCancel = await request(app.getHttpServer())
      .post(`/api/v1/sales-orders/${orderId}/cancel`)
      .set('Cookie', salesCookies)
      .send();
    expect(secondCancel.status).toBe(422);
  });

  it('thiếu tồn bị chặn và không tạo xuất kho', async () => {
    const created = await createOrder(11);
    expect(created.status).toBe(201);
    const lineId = created.body.data.lines[0].id as string;
    const before = await balances();
    const confirmed = await request(app.getHttpServer())
      .post(`/api/v1/sales-orders/${created.body.data.id}/confirm`)
      .set('Cookie', salesCookies)
      .send({ warehouseId });
    expect(confirmed.status).toBe(422);
    expect(confirmed.body.message).toContain('Không đủ tồn kho');
    expect(await balances()).toBe(before);
    expect(
      await prisma.stockMove.count({ where: { refType: 'SalesOrderLine', refId: lineId } }),
    ).toBe(0);
  });

  it('chặn chuyển trạng thái sai và WORKER không được tạo đơn', async () => {
    const created = await createOrder(1);
    expect(created.status).toBe(201);
    const invalidTransition = await request(app.getHttpServer())
      .patch(`/api/v1/sales-orders/${created.body.data.id}/status`)
      .set('Cookie', salesCookies)
      .send({ status: 'SHIPPING' });
    expect(invalidTransition.status).toBe(422);

    const forbidden = await createOrder(1, workerCookies);
    expect(forbidden.status).toBe(403);
  });
});
