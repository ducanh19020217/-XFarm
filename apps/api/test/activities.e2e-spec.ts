import { execSync } from 'child_process';
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
import { prisma } from '@xfarm/db';
import { AppModule } from '../src/app.module';

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
    execSync(
      `DATABASE_URL="${testDbUrl}" pnpm --filter @xfarm/db exec prisma db push --skip-generate --accept-data-loss`,
      { stdio: 'pipe' },
    );
    await prisma.activity.deleteMany();
    await prisma.animalEvent.deleteMany();
    await prisma.animal.deleteMany();
    await prisma.animalGroup.deleteMany();
    await prisma.cycle.deleteMany();
    await prisma.area.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.media.deleteMany();
    await prisma.user.deleteMany();

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
});
