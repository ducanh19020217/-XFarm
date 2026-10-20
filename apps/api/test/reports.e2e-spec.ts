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
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { prisma, Prisma } from '@xfarm/db';
import { AppModule } from '../src/app.module';
import { cleanupDatabase } from './helpers/cleanup';

describe('Reports E2E', () => {
  let app: INestApplication;
  let ownerCookies: string[];
  let salesCookies: string[];
  let cycleId: string;

  async function login(email: string) {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email,
      password: 'Admin@123',
    });
    expect(response.status).toBe(200);
    const cookies = response.headers['set-cookie'];
    return Array.isArray(cookies) ? cookies : [cookies as string];
  }

  beforeAll(async () => {
    await cleanupDatabase();
    const passwordHash = await argon2.hash('Admin@123');
    await prisma.user.createMany({
      data: [
        {
          email: 'admin@xfarm.local',
          fullName: 'Admin Owner',
          passwordHash,
          role: 'OWNER',
          isActive: true,
        },
        {
          email: 'sales@xfarm.local',
          fullName: 'Sales User',
          passwordHash,
          role: 'SALES',
          isActive: true,
        },
      ],
    });
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@xfarm.local' } });
    const area = await prisma.area.create({
      data: { code: 'AR-REPORT', name: 'Khu báo cáo', type: 'FIELD', createdById: owner.id },
    });
    const warehouse = await prisma.warehouse.create({
      data: { code: 'WH-REPORT', name: 'Kho báo cáo', areaId: area.id },
    });
    const item = await prisma.item.create({
      data: {
        sku: 'REPORT-PRODUCE',
        name: 'Rau báo cáo',
        category: 'PRODUCE',
        unit: 'kg',
        isSellable: true,
      },
    });
    const material = await prisma.item.create({
      data: {
        sku: 'REPORT-FERTILIZER',
        name: 'Phân báo cáo',
        category: 'FERTILIZER',
        unit: 'kg',
        isSellable: false,
      },
    });
    cycleId = (
      await prisma.cycle.create({
        data: {
          code: 'CY-REPORT',
          name: 'Mùa vụ báo cáo',
          kind: 'CROP',
          areaId: area.id,
          species: 'Rau',
          startDate: new Date('2026-01-01T00:00:00.000Z'),
          status: 'HARVESTING',
          createdById: owner.id,
        },
      })
    ).id;
    const activity = await prisma.activity.create({
      data: {
        areaId: area.id,
        cycleId,
        type: 'FERTILIZING',
        performedAt: new Date('2026-01-02T03:00:00.000Z'),
        createdById: owner.id,
      },
    });
    await prisma.activityMaterial.create({
      data: {
        activityId: activity.id,
        itemId: material.id,
        quantity: new Prisma.Decimal('2'),
        unitCost: new Prisma.Decimal('15000'),
        createdById: owner.id,
      },
    });
    const category = await prisma.financeCategory.create({
      data: { name: 'Chi phí báo cáo', type: 'EXPENSE' },
    });
    await prisma.transaction.create({
      data: {
        code: 'TX-REPORT',
        type: 'EXPENSE',
        categoryId: category.id,
        amount: new Prisma.Decimal('10000'),
        date: new Date('2026-01-15T16:30:00.000Z'),
        cycleId,
        method: 'CASH',
        createdById: owner.id,
      },
    });
    const employee = await prisma.employee.create({
      data: {
        code: 'NV-REPORT',
        fullName: 'Công nhân báo cáo',
        position: 'Công nhân',
        payType: 'DAILY',
        baseRate: new Prisma.Decimal('300000'),
      },
    });
    await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        date: new Date('2026-01-10T00:00:00.000Z'),
        hours: new Prisma.Decimal('8'),
        cycleId,
      },
    });
    const harvestActivity = await prisma.activity.create({
      data: {
        areaId: area.id,
        cycleId,
        type: 'HARVEST',
        performedAt: new Date('2026-01-20T03:00:00.000Z'),
        createdById: owner.id,
      },
    });
    const harvestLot = await prisma.harvestLot.create({
      data: {
        code: 'HL-REPORT',
        traceCode: 'REPORT0001',
        cycleId,
        activityId: harvestActivity.id,
        itemId: item.id,
        quantity: new Prisma.Decimal('10'),
        unit: 'kg',
        harvestedAt: harvestActivity.performedAt,
        warehouseId: warehouse.id,
        isPublic: true,
        createdById: owner.id,
      },
    });
    const stockLot = await prisma.stockLot.create({
      data: {
        itemId: item.id,
        lotCode: 'LOT-REPORT',
        harvestLotId: harvestLot.id,
        warehouseId: warehouse.id,
        unitCost: new Prisma.Decimal(0),
      },
    });
    await prisma.stockMove.create({
      data: {
        type: 'IN',
        itemId: item.id,
        stockLotId: stockLot.id,
        toWarehouseId: warehouse.id,
        quantity: new Prisma.Decimal('10'),
        unitCost: new Prisma.Decimal(0),
        refType: 'HARVEST',
        refId: harvestLot.id,
      },
    });
    const customer = await prisma.customer.create({
      data: { code: 'CU-REPORT', name: 'Khách báo cáo', phone: '0900000001', type: 'RETAIL' },
    });
    const order = await prisma.salesOrder.create({
      data: {
        code: 'SO-REPORT',
        customerId: customer.id,
        channel: 'ADMIN',
        status: 'CONFIRMED',
        paymentMethod: 'CASH',
        shippingAddress: 'Hà Nội',
        subtotal: new Prisma.Decimal('60000'),
        discount: new Prisma.Decimal(0),
        shippingFee: new Prisma.Decimal(0),
        total: new Prisma.Decimal('60000'),
        warehouseId: warehouse.id,
      },
    });
    const line = await prisma.salesOrderLine.create({
      data: {
        orderId: order.id,
        itemId: item.id,
        stockLotId: stockLot.id,
        quantity: new Prisma.Decimal('4'),
        unitPrice: new Prisma.Decimal('15000'),
      },
    });
    await prisma.stockMove.create({
      data: {
        type: 'OUT',
        itemId: item.id,
        stockLotId: stockLot.id,
        fromWarehouseId: warehouse.id,
        quantity: new Prisma.Decimal('4'),
        unitCost: new Prisma.Decimal(0),
        refType: 'SalesOrderLine',
        refId: line.id,
      },
    });
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();
    ownerCookies = await login('admin@xfarm.local');
    salesCookies = await login('sales@xfarm.local');
  });

  afterAll(async () => {
    await cleanupDatabase();
    await app?.close();
  });

  it('returns monthly cashflow in Vietnam time and denies SALES', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/reports/cashflow?year=2026')
      .set('Cookie', ownerCookies);
    expect(response.status).toBe(200);
    expect(response.body.data[0]).toEqual({
      month: 1,
      income: '0.00',
      expense: '10000.00',
      net: '-10000.00',
    });
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/reports/cashflow?year=2026')
          .set('Cookie', salesCookies)
      ).status,
    ).toBe(403);
  });

  it('calculates cycle cost, allocated sales revenue, profit, and product top ten', async () => {
    const cost = await request(app.getHttpServer())
      .get(`/api/v1/reports/cycles/${cycleId}/cost`)
      .set('Cookie', ownerCookies);
    expect(cost.status).toBe(200);
    expect(cost.body.data.laborCost).toBe('300000.00');
    expect(cost.body.data.totalCost).toBe('340000.00');
    expect(cost.body.data.revenue).toBe('60000.00');
    expect(cost.body.data.profit).toBe('-280000.00');
    expect(cost.body.data.outputQuantity).toBe('10.00');
    const products = await request(app.getHttpServer())
      .get('/api/v1/reports/products?from=2026-01-01&to=2026-12-31')
      .set('Cookie', ownerCookies);
    expect(products.status).toBe(200);
    expect(products.body.data[0]).toMatchObject({ quantity: '4.00', revenue: '60000.00' });
  });

  it('excludes revenue of cancelled orders from cycle profit', async () => {
    await prisma.salesOrder.update({ where: { code: 'SO-REPORT' }, data: { status: 'CANCELLED' } });
    const cost = await request(app.getHttpServer())
      .get(`/api/v1/reports/cycles/${cycleId}/cost`)
      .set('Cookie', ownerCookies);
    expect(cost.status).toBe(200);
    expect(cost.body.data.totalCost).toBe('340000.00');
    expect(cost.body.data.revenue).toBe('0.00');
    expect(cost.body.data.profit).toBe('-340000.00');
    const products = await request(app.getHttpServer())
      .get('/api/v1/reports/products?from=2026-01-01&to=2026-12-31')
      .set('Cookie', ownerCookies);
    expect(products.body.data).toHaveLength(0);
  });
});
