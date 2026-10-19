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
import { prisma } from '@xfarm/db';
import argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { cleanupInventoryData } from './helpers/cleanup';

describe('Stock documents API E2E', () => {
  let app: INestApplication;
  let ownerCookies: string[];
  let accountantCookies: string[];
  let itemId: string;
  let warehouseAId: string;
  let warehouseBId: string;

  const login = async (email: string) => {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email,
      password: 'Admin@123',
    });
    expect(response.status).toBe(200);
    const rawCookies = response.headers['set-cookie'];
    return Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];
  };

  const balance = async (warehouseId: string) => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/stock/balances')
      .query({ warehouseId, itemId })
      .set('Cookie', ownerCookies);
    expect(response.status).toBe(200);
    return response.body.data.reduce(
      (total: number, row: { quantity?: string | number }) => total + Number(row.quantity ?? 0),
      0,
    );
  };

  beforeAll(async () => {
    const passwordHash = await argon2.hash('Admin@123');
    await prisma.user.upsert({
      where: { email: 'stock-owner@xfarm.local' },
      update: { isActive: true, passwordHash },
      create: {
        email: 'stock-owner@xfarm.local',
        fullName: 'Stock Owner',
        passwordHash,
        role: 'OWNER',
        isActive: true,
      },
    });
    await prisma.user.upsert({
      where: { email: 'stock-accountant@xfarm.local' },
      update: { isActive: true, passwordHash },
      create: {
        email: 'stock-accountant@xfarm.local',
        fullName: 'Stock Accountant',
        passwordHash,
        role: 'ACCOUNTANT',
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

    ownerCookies = await login('stock-owner@xfarm.local');
    accountantCookies = await login('stock-accountant@xfarm.local');
  });

  beforeEach(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [item, warehouseA, warehouseB] = await prisma.$transaction([
      prisma.item.create({
        data: {
          sku: `STOCK-${suffix}`,
          name: 'Phân NPK',
          category: 'FERTILIZER',
          unit: 'kg',
        },
      }),
      prisma.warehouse.create({ data: { code: `STOCK-A-${suffix}`, name: 'Kho A' } }),
      prisma.warehouse.create({ data: { code: `STOCK-B-${suffix}`, name: 'Kho B' } }),
    ]);
    itemId = item.id;
    warehouseAId = warehouseA.id;
    warehouseBId = warehouseB.id;
  });

  afterEach(async () => {
    await cleanupInventoryData(prisma, {
      itemIds: [itemId],
      warehouseIds: [warehouseAId, warehouseBId],
    });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('nhập, xuất FIFO theo hạn dùng và trả phiếu đầy đủ', async () => {
    const receipt = await request(app.getHttpServer())
      .post('/api/v1/stock/receipts')
      .set('Cookie', ownerCookies)
      .send({
        warehouseId: warehouseAId,
        lines: [
          { itemId, quantity: 4, unitCost: 10, lotCode: 'EARLY', expiryDate: '2026-01-01' },
          { itemId, quantity: 6, unitCost: 12, lotCode: 'LATE', expiryDate: '2026-12-31' },
        ],
      });
    expect(receipt.status).toBe(201);
    expect(receipt.body.data.code).toMatch(/^NK-\d{4}-\d{4}$/);
    expect(await balance(warehouseAId)).toBe(10);

    const issue = await request(app.getHttpServer())
      .post('/api/v1/stock/issues')
      .set('Cookie', ownerCookies)
      .send({ warehouseId: warehouseAId, reason: 'Bón phân', lines: [{ itemId, quantity: 3 }] });
    expect(issue.status).toBe(201);
    expect(await balance(warehouseAId)).toBe(7);

    const document = await request(app.getHttpServer())
      .get(`/api/v1/stock/documents/${issue.body.data.code}`)
      .set('Cookie', ownerCookies);
    expect(document.status).toBe(200);
    expect(document.body.data.moves).toHaveLength(1);
    expect(document.body.data.moves[0]).toMatchObject({ stockLot: { lotCode: 'EARLY' } });
    expect(Number(document.body.data.moves[0].quantity)).toBe(3);
  });

  it('rollback toàn bộ phiếu khi xuất vượt tồn hoặc có dòng thiếu tồn', async () => {
    const receipt = await request(app.getHttpServer())
      .post('/api/v1/stock/receipts')
      .set('Cookie', ownerCookies)
      .send({ warehouseId: warehouseAId, lines: [{ itemId, quantity: 10, unitCost: 10 }] });
    expect(receipt.status).toBe(201);

    const movesBefore = await prisma.stockMove.count();
    const sequenceBefore = await prisma.sequence.findUnique({
      where: { key_year: { key: 'XK', year: new Date().getFullYear() } },
    });
    const tooMuch = await request(app.getHttpServer())
      .post('/api/v1/stock/issues')
      .set('Cookie', ownerCookies)
      .send({ warehouseId: warehouseAId, lines: [{ itemId, quantity: 11 }] });
    expect(tooMuch.status).toBe(422);
    expect(tooMuch.body.message).toContain('Không đủ tồn kho');
    expect(await prisma.stockMove.count()).toBe(movesBefore);
    const sequenceAfter = await prisma.sequence.findUnique({
      where: { key_year: { key: 'XK', year: new Date().getFullYear() } },
    });
    expect(sequenceAfter?.current ?? null).toEqual(sequenceBefore?.current ?? null);

    const secondItem = await prisma.item.create({
      data: { sku: `STOCK-SECOND-${Date.now()}`, name: 'Kali', category: 'FERTILIZER', unit: 'kg' },
    });
    try {
      const partial = await request(app.getHttpServer())
        .post('/api/v1/stock/issues')
        .set('Cookie', ownerCookies)
        .send({
          warehouseId: warehouseAId,
          lines: [
            { itemId, quantity: 2 },
            { itemId: secondItem.id, quantity: 1 },
          ],
        });
      expect(partial.status).toBe(422);
      expect(await prisma.stockMove.count({ where: { refType: 'STOCK_DOC' } })).toBe(1);
    } finally {
      await prisma.item.delete({ where: { id: secondItem.id } });
    }
  });

  it('điều chuyển và kiểm kê tăng giảm tồn', async () => {
    const receipt = await request(app.getHttpServer())
      .post('/api/v1/stock/receipts')
      .set('Cookie', ownerCookies)
      .send({
        warehouseId: warehouseAId,
        lines: [{ itemId, quantity: 10, unitCost: 10, lotCode: 'MOVE' }],
      });
    expect(receipt.status).toBe(201);

    const transfer = await request(app.getHttpServer())
      .post('/api/v1/stock/transfers')
      .set('Cookie', ownerCookies)
      .send({
        fromWarehouseId: warehouseAId,
        toWarehouseId: warehouseBId,
        lines: [{ itemId, quantity: 4 }],
      });
    expect(transfer.status).toBe(201);
    expect(await balance(warehouseAId)).toBe(6);
    expect(await balance(warehouseBId)).toBe(4);

    const lot = await prisma.stockLot.findFirstOrThrow({ where: { itemId, lotCode: 'MOVE' } });
    const increase = await request(app.getHttpServer())
      .post('/api/v1/stock/counts')
      .set('Cookie', ownerCookies)
      .send({
        warehouseId: warehouseAId,
        lines: [{ itemId, stockLotId: lot.id, countedQuantity: 8 }],
      });
    expect(increase.status).toBe(201);
    expect(await balance(warehouseAId)).toBe(8);

    const decrease = await request(app.getHttpServer())
      .post('/api/v1/stock/counts')
      .set('Cookie', ownerCookies)
      .send({
        warehouseId: warehouseAId,
        lines: [{ itemId, stockLotId: lot.id, countedQuantity: 3 }],
      });
    expect(decrease.status).toBe(201);
    expect(await balance(warehouseAId)).toBe(3);
  });

  it('sinh mã phiếu khác nhau khi tạo song song', async () => {
    const responses = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        request(app.getHttpServer())
          .post('/api/v1/stock/receipts')
          .set('Cookie', ownerCookies)
          .send({
            warehouseId: warehouseAId,
            notes: `parallel-${index}`,
            lines: [{ itemId, quantity: 1, unitCost: 10, lotCode: `PARALLEL-${index}` }],
          }),
      ),
    );
    expect(responses.map((response) => response.status)).toEqual([201, 201, 201, 201, 201]);
    expect(new Set(responses.map((response) => response.body.data.code)).size).toBe(5);
  });

  it('ACCOUNTANT chỉ được xem và không được tạo phiếu', async () => {
    const forbidden = await request(app.getHttpServer())
      .post('/api/v1/stock/receipts')
      .set('Cookie', accountantCookies)
      .send({ warehouseId: warehouseAId, lines: [{ itemId, quantity: 1, unitCost: 10 }] });
    expect(forbidden.status).toBe(403);

    const documents = await request(app.getHttpServer())
      .get('/api/v1/stock/documents')
      .set('Cookie', accountantCookies);
    expect(documents.status).toBe(200);
  });
});
