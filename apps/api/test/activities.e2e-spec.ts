import * as crypto from 'crypto';
import path from 'path';
import * as dotenv from 'dotenv';

const rootEnvPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnvPath });
const testDbUrl =
  process.env.DATABASE_URL_TEST ||
  'postgresql://xfarm:xfarm_secret@localhost:5442/xfarm_test?schema=public';
process.env.DATABASE_URL = testDbUrl;
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { prisma, Prisma } from '@xfarm/db';
import { AppModule } from '../src/app.module';
import { cleanupDatabase } from './helpers/cleanup';

describe('Activities API E2E', () => {
  let app: INestApplication;
  let ownerCookies: string[];
  let workerCookies: string[];
  let salesCookies: string[];
  let ownerId: string;
  let workerId: string;
  let cropAreaId: string;
  let livestockAreaId: string;
  let aquaAreaId: string;
  let cropCycleId: string;
  let closedCycleId: string;
  let mediaId: string;
  let fertilizerItemId: string;
  let fertilizerWarehouseId: string;
  let produceItemId: string;

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
    await cleanupDatabase(prisma);

    const passwordHash = await import('argon2').then((argon2) => argon2.hash('Admin@123'));
    const owner = await prisma.user.create({
      data: {
        email: 'activity-owner@xfarm.local',
        fullName: 'Activity Owner',
        passwordHash,
        role: 'OWNER',
      },
    });
    const worker = await prisma.user.create({
      data: {
        email: 'activity-worker@xfarm.local',
        fullName: 'Activity Worker',
        passwordHash,
        role: 'WORKER',
      },
    });
    await prisma.user.create({
      data: {
        email: 'activity-sales@xfarm.local',
        fullName: 'Activity Sales',
        passwordHash,
        role: 'SALES',
      },
    });
    ownerId = owner.id;
    workerId = worker.id;

    const areas = await prisma.$transaction([
      prisma.area.create({
        data: { code: 'ACT-CROP', name: 'Khu trồng', type: 'FIELD', createdById: ownerId },
      }),
      prisma.area.create({
        data: { code: 'ACT-LIVE', name: 'Chuồng nuôi', type: 'BARN', createdById: ownerId },
      }),
      prisma.area.create({
        data: { code: 'ACT-AQUA', name: 'Ao nuôi', type: 'POND', createdById: ownerId },
      }),
    ]);
    [cropAreaId, livestockAreaId, aquaAreaId] = areas.map((area) => area.id);

    const fertilizer = await prisma.item.create({
      data: {
        sku: 'ACT-FERTILIZER',
        name: 'Phân hữu cơ',
        category: 'FERTILIZER',
        unit: 'kg',
      },
    });
    const fertilizerWarehouse = await prisma.warehouse.create({
      data: { code: 'ACT-WAREHOUSE', name: 'Kho khu trồng', areaId: cropAreaId },
    });
    const fertilizerLot = await prisma.stockLot.create({
      data: {
        itemId: fertilizer.id,
        lotCode: 'ACT-FERT-LOT',
        warehouseId: fertilizerWarehouse.id,
        unitCost: 12000,
      },
    });
    await prisma.stockMove.create({
      data: {
        type: 'IN',
        itemId: fertilizer.id,
        stockLotId: fertilizerLot.id,
        toWarehouseId: fertilizerWarehouse.id,
        quantity: 10,
        unitCost: 12000,
      },
    });
    fertilizerItemId = fertilizer.id;
    fertilizerWarehouseId = fertilizerWarehouse.id;
    const produce = await prisma.item.create({
      data: {
        sku: 'ACT-PRODUCE',
        name: 'Rau cải thu hoạch',
        category: 'PRODUCE',
        unit: 'kg',
      },
    });
    produceItemId = produce.id;

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const cycles = await prisma.$transaction([
      prisma.cycle.create({
        data: {
          code: 'ACT-CROP-01',
          name: 'Rau cải',
          kind: 'CROP',
          areaId: cropAreaId,
          species: 'Rau',
          startDate,
          status: 'ACTIVE',
        },
      }),
      prisma.cycle.create({
        data: {
          code: 'ACT-CLOSED-01',
          name: 'Mùa đã đóng',
          kind: 'CROP',
          areaId: cropAreaId,
          species: 'Rau',
          startDate,
          status: 'CLOSED',
        },
      }),
      prisma.cycle.create({
        data: {
          code: 'ACT-LIVE-01',
          name: 'Gà thịt',
          kind: 'LIVESTOCK',
          areaId: livestockAreaId,
          species: 'Gà',
          startDate,
          status: 'ACTIVE',
        },
      }),
      prisma.cycle.create({
        data: {
          code: 'ACT-AQUA-01',
          name: 'Cá rô phi',
          kind: 'AQUA',
          areaId: aquaAreaId,
          species: 'Cá rô phi',
          startDate,
          status: 'ACTIVE',
        },
      }),
    ]);
    cropCycleId = cycles[0].id;
    closedCycleId = cycles[1].id;
    await prisma.cycle.create({
      data: {
        code: 'ACT-PLANNED-01',
        name: 'Mùa chuẩn bị',
        kind: 'CROP',
        areaId: cropAreaId,
        species: 'Rau',
        startDate,
        status: 'PLANNED',
      },
    });

    const media = await prisma.media.create({
      data: {
        url: 'https://example.test/activity.jpg',
        key: `uploads/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.jpg`,
        mime: 'image/jpeg',
        size: 100,
        uploadedById: ownerId,
      },
    });
    mediaId = media.id;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();
    ownerCookies = await login('activity-owner@xfarm.local');
    workerCookies = await login('activity-worker@xfarm.local');
    salesCookies = await login('activity-sales@xfarm.local');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('tạo được activity cho cả ba loại sản xuất và trả media ở chi tiết', async () => {
    const cases = [
      { cycleId: cropCycleId, areaId: cropAreaId, type: 'PLANTING', data: { seedLot: 'R-01' } },
      {
        cycleId: (await prisma.cycle.findUniqueOrThrow({ where: { code: 'ACT-LIVE-01' } })).id,
        areaId: livestockAreaId,
        type: 'FEEDING',
        data: { feedKg: 5 },
      },
      {
        cycleId: (await prisma.cycle.findUniqueOrThrow({ where: { code: 'ACT-AQUA-01' } })).id,
        areaId: aquaAreaId,
        type: 'WATER_TEST',
        data: { pH: 7, DO: 5, temp: 28 },
      },
    ];
    for (const item of cases) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/activities')
        .set('Cookie', ownerCookies)
        .send({ ...item, performedAt: new Date().toISOString(), mediaIds: [mediaId] });
      expect(response.status).toBe(201);
      expect(response.body.data.performedById).toBe(ownerId);
      expect(response.body.data.media[0].id).toBe(mediaId);
    }
  });

  it('chặn cycle đã đóng, data sai và media không tồn tại', async () => {
    const closed = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', ownerCookies)
      .send({
        cycleId: closedCycleId,
        areaId: cropAreaId,
        type: 'PLANTING',
      });
    expect(closed.status).toBe(422);
    expect(closed.body.message).toBe('Mùa vụ đã đóng, không thể ghi nhật ký');

    const invalidData = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', ownerCookies)
      .send({
        cycleId: cropCycleId,
        areaId: cropAreaId,
        type: 'WATER_TEST',
        data: { pH: 99, DO: -1, temp: 28 },
      });
    expect(invalidData.status).toBe(400);

    const invalidMedia = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', ownerCookies)
      .send({
        cycleId: cropCycleId,
        areaId: cropAreaId,
        type: 'PLANTING',
        mediaIds: ['missing-media-id'],
      });
    expect(invalidMedia.status).toBe(400);
  });

  it('timeline sắp mới nhất trước và worker không sửa được nhật ký của người khác', async () => {
    const older = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', ownerCookies)
      .send({
        cycleId: cropCycleId,
        areaId: cropAreaId,
        type: 'CLEANING',
        performedAt: '2026-02-01T00:00:00.000Z',
      });
    const newer = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', ownerCookies)
      .send({
        cycleId: cropCycleId,
        areaId: cropAreaId,
        type: 'SOWING',
        performedAt: '2026-03-01T00:00:00.000Z',
      });
    expect(older.status).toBe(201);
    expect(newer.status).toBe(201);

    const timeline = await request(app.getHttpServer())
      .get(`/api/v1/cycles/${cropCycleId}/timeline`)
      .set('Cookie', ownerCookies);
    expect(timeline.status).toBe(200);
    const timelineDates = timeline.body.data.map((activity: { performedAt: string }) =>
      new Date(activity.performedAt).getTime(),
    );
    expect(timelineDates).toEqual([...timelineDates].sort((a, b) => b - a));
    expect(timeline.body.data.map((activity: { id: string }) => activity.id)).toEqual(
      expect.arrayContaining([older.body.data.id, newer.body.data.id]),
    );
    expect(timeline.body.data[0].performedBy.fullName).toBe('Activity Owner');

    const update = await request(app.getHttpServer())
      .patch(`/api/v1/activities/${newer.body.data.id}`)
      .set('Cookie', workerCookies)
      .send({ notes: 'Không được sửa' });
    expect(update.status).toBe(403);
  });

  it('worker mặc định chỉ thấy nhật ký do chính mình ghi', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', workerCookies)
      .send({ cycleId: cropCycleId, areaId: cropAreaId, type: 'CLEANING', performedById: ownerId });
    expect(created.status).toBe(201);
    expect(created.body.data.performedById).toBe(workerId);
    const list = await request(app.getHttpServer())
      .get('/api/v1/activities')
      .set('Cookie', workerCookies);
    expect(list.status).toBe(200);
    expect(
      list.body.data.every(
        (activity: { performedById: string }) => activity.performedById === workerId,
      ),
    ).toBe(true);
  });

  it('sales không được tạo activity', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', salesCookies)
      .send({ cycleId: cropCycleId, areaId: cropAreaId, type: 'CLEANING' });
    expect(response.status).toBe(403);
  });

  it('tự xuất vật tư FIFO trong transaction, đổi vật tư thì đảo kho và xóa thì hoàn kho', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', workerCookies)
      .send({
        cycleId: cropCycleId,
        areaId: cropAreaId,
        type: 'FERTILIZING',
        materials: [{ itemId: fertilizerItemId, quantity: 3, warehouseId: fertilizerWarehouseId }],
      });
    expect(created.status).toBe(201);
    expect(created.body.data.materials).toEqual([
      expect.objectContaining({
        quantity: '3',
        unitCost: '12000',
        item: { id: fertilizerItemId, name: 'Phân hữu cơ', unit: 'kg' },
      }),
    ]);
    expect(
      await prisma.stockMove.count({ where: { refType: 'ACTIVITY', refId: created.body.data.id } }),
    ).toBe(1);
    const createdBalance = await prisma.$queryRaw<[{ quantity: string }]>(Prisma.sql`
        SELECT quantity FROM stock_balances
        WHERE "itemId" = ${fertilizerItemId} AND "warehouseId" = ${fertilizerWarehouseId}`);
    expect(createdBalance[0]?.quantity.toString()).toBe('7');

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/activities/${created.body.data.id}`)
      .set('Cookie', ownerCookies)
      .send({ materials: [{ itemId: fertilizerItemId, quantity: 2 }] });
    expect(updated.status).toBe(200);
    expect(updated.body.data.materials[0].quantity).toBe('2');
    const updatedBalance = await prisma.$queryRaw<[{ quantity: string }]>(Prisma.sql`
        SELECT quantity FROM stock_balances
        WHERE "itemId" = ${fertilizerItemId} AND "warehouseId" = ${fertilizerWarehouseId}`);
    expect(updatedBalance[0]?.quantity.toString()).toBe('8');

    const activityCountBeforeInsufficient = await prisma.activity.count();
    const insufficient = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', ownerCookies)
      .send({
        cycleId: cropCycleId,
        areaId: cropAreaId,
        type: 'FERTILIZING',
        materials: [{ itemId: fertilizerItemId, quantity: 20 }],
      });
    expect(insufficient.status).toBe(422);
    expect(await prisma.activity.count()).toBe(activityCountBeforeInsufficient);

    const removed = await request(app.getHttpServer())
      .delete(`/api/v1/activities/${created.body.data.id}`)
      .set('Cookie', ownerCookies);
    expect(removed.status).toBe(200);
    const removedBalance = await prisma.$queryRaw<[{ quantity: string }]>(Prisma.sql`
        SELECT quantity FROM stock_balances
        WHERE "itemId" = ${fertilizerItemId} AND "warehouseId" = ${fertilizerWarehouseId}`);
    expect(removedBalance[0]?.quantity.toString()).toBe('10');
  });

  it('HARVEST tạo lô, nhập kho, hoàn kho khi xóa và chặn lô đã xuất', async () => {
    const harvested = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', ownerCookies)
      .send({
        cycleId: cropCycleId,
        areaId: cropAreaId,
        type: 'HARVEST',
        quantity: 50,
        data: {
          itemId: produceItemId,
          quantity: 50,
          unit: 'kg',
          warehouseId: fertilizerWarehouseId,
        },
      });
    expect(harvested.status).toBe(201);
    const harvestLot = await prisma.harvestLot.findUniqueOrThrow({
      where: { activityId: harvested.body.data.id },
    });
    expect(harvestLot.code).toMatch(/^HL-2026-\d{4}$/);
    expect(harvestLot.traceCode).toMatch(/^[A-HJ-NP-Z2-9]{10}$/);
    const balance = await prisma.$queryRaw<[{ quantity: string }]>(Prisma.sql`
      SELECT quantity FROM stock_balances
      WHERE "itemId" = ${produceItemId} AND "warehouseId" = ${fertilizerWarehouseId}`);
    expect(balance[0]?.quantity.toString()).toBe('50');

    const listed = await request(app.getHttpServer())
      .get(`/api/v1/harvest-lots?search=${harvestLot.traceCode}`)
      .set('Cookie', ownerCookies);
    expect(listed.status).toBe(200);
    expect(listed.body.total).toBe(1);

    const removed = await request(app.getHttpServer())
      .delete(`/api/v1/activities/${harvested.body.data.id}`)
      .set('Cookie', ownerCookies);
    expect(removed.status).toBe(200);
    expect(await prisma.harvestLot.findUnique({ where: { id: harvestLot.id } })).toBeNull();

    const exported = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', ownerCookies)
      .send({
        cycleId: cropCycleId,
        areaId: cropAreaId,
        type: 'HARVEST',
        data: {
          itemId: produceItemId,
          quantity: 50,
          unit: 'kg',
          warehouseId: fertilizerWarehouseId,
        },
      });
    const exportedLot = await prisma.harvestLot.findUniqueOrThrow({
      where: { activityId: exported.body.data.id },
    });
    const stockLot = await prisma.stockLot.findUniqueOrThrow({
      where: { harvestLotId: exportedLot.id },
    });
    await prisma.stockMove.create({
      data: {
        type: 'OUT',
        itemId: produceItemId,
        stockLotId: stockLot.id,
        fromWarehouseId: fertilizerWarehouseId,
        quantity: 1,
        unitCost: 0,
        refType: 'TEST',
        refId: 'TEST-EXPORT',
      },
    });
    const blocked = await request(app.getHttpServer())
      .delete(`/api/v1/activities/${exported.body.data.id}`)
      .set('Cookie', ownerCookies);
    expect(blocked.status).toBe(422);
  });

  it('HARVEST chặn mùa vụ đóng và item không phải nông sản', async () => {
    const closed = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', ownerCookies)
      .send({
        cycleId: closedCycleId,
        areaId: cropAreaId,
        type: 'HARVEST',
        data: {
          itemId: produceItemId,
          quantity: 1,
          unit: 'kg',
          warehouseId: fertilizerWarehouseId,
        },
      });
    expect(closed.status).toBe(422);
    const invalidItem = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', ownerCookies)
      .send({
        cycleId: cropCycleId,
        areaId: cropAreaId,
        type: 'HARVEST',
        data: {
          itemId: fertilizerItemId,
          quantity: 1,
          unit: 'kg',
          warehouseId: fertilizerWarehouseId,
        },
      });
    expect(invalidItem.status).toBe(422);
  });
});
