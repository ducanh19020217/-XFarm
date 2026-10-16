import * as path from 'path';
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
import { CalendarActivityItem, CalendarCycleEvent } from '@xfarm/shared';
import { AppModule } from '../src/app.module';
import { cleanupDatabase } from './helpers/cleanup';

describe('Calendar API E2E Tests (GET /calendar)', () => {
  let app: INestApplication;
  let ownerCookies: string[];
  let workerCookies: string[];
  let workerId: string;
  let ownerId: string;
  let area1Id: string;
  let area2Id: string;
  let cycle1Id: string;
  let cycle2Id: string;

  beforeAll(async () => {
    const { prisma } = await import('@xfarm/db');
    const argon2 = await import('argon2');

    await cleanupDatabase(prisma);

    const passwordHash = await argon2.hash('Admin@123');

    // Create users
    const owner = await prisma.user.create({
      data: {
        email: 'cal_owner@xfarm.local',
        passwordHash,
        fullName: 'Calendar Owner',
        role: 'OWNER',
        isActive: true,
      },
    });
    ownerId = owner.id;

    const worker = await prisma.user.create({
      data: {
        email: 'cal_worker@xfarm.local',
        passwordHash,
        fullName: 'Calendar Worker',
        role: 'WORKER',
        isActive: true,
      },
    });
    workerId = worker.id;

    // Create Areas
    const area1 = await prisma.area.create({
      data: {
        code: 'AREA-CAL-1',
        name: 'Khu Trồng Trọt A',
        type: 'ZONE',
        createdById: ownerId,
      },
    });
    area1Id = area1.id;

    const area2 = await prisma.area.create({
      data: {
        code: 'AREA-CAL-2',
        name: 'Ao Thủy Sản B',
        type: 'POND',
        createdById: ownerId,
      },
    });
    area2Id = area2.id;

    // Create Cycles
    // Cycle 1: CROP in area 1.
    // Start: 2026-10-05 08:00 VN = 2026-10-05T01:00:00.000Z
    // ExpectedEnd: 2026-10-25 17:00 VN = 2026-10-25T10:00:00.000Z
    // End: 2026-11-05 10:00 VN = 2026-11-05T03:00:00.000Z
    const cycle1 = await prisma.cycle.create({
      data: {
        code: 'CYC-CAL-CROP',
        name: 'Vụ rau cải xanh vụ 1',
        kind: 'CROP',
        areaId: area1Id,
        species: 'Rau cải xanh',
        startDate: new Date('2026-10-05T01:00:00.000Z'),
        expectedEndDate: new Date('2026-10-25T10:00:00.000Z'),
        endDate: new Date('2026-11-05T03:00:00.000Z'),
        status: 'ACTIVE',
        createdById: ownerId,
      },
    });
    cycle1Id = cycle1.id;

    // Cycle 2: AQUA in area 2.
    // Start: 2026-10-15 08:00 VN = 2026-10-15T01:00:00.000Z
    // ExpectedEnd: 2026-11-20 17:00 VN = 2026-11-20T10:00:00.000Z
    // End: 2026-11-25 10:00 VN = 2026-11-25T03:00:00.000Z
    const cycle2 = await prisma.cycle.create({
      data: {
        code: 'CYC-CAL-AQUA',
        name: 'Vụ cá rô phi',
        kind: 'AQUA',
        areaId: area2Id,
        species: 'Cá rô phi',
        startDate: new Date('2026-10-15T01:00:00.000Z'),
        expectedEndDate: new Date('2026-11-20T10:00:00.000Z'),
        endDate: new Date('2026-11-25T03:00:00.000Z'),
        status: 'ACTIVE',
        createdById: ownerId,
      },
    });
    cycle2Id = cycle2.id;

    // Create Activities:
    // Act 1: performed by OWNER in Oct 2026
    await prisma.activity.create({
      data: {
        cycleId: cycle1Id,
        areaId: area1Id,
        type: 'SOWING',
        performedAt: new Date('2026-10-06T02:00:00.000Z'),
        performedById: ownerId,
        createdById: ownerId,
        notes: 'Gieo hạt cải xanh',
      },
    });

    // Act 2: performed by WORKER in Oct 2026
    await prisma.activity.create({
      data: {
        cycleId: cycle1Id,
        areaId: area1Id,
        type: 'FERTILIZING',
        performedAt: new Date('2026-10-12T03:00:00.000Z'),
        performedById: workerId,
        createdById: workerId,
        notes: 'Bón phân hữu cơ',
      },
    });

    // Act 3 (CRITICAL E2E REQUIREMENT): Activity at border:
    // 23:30 ngày cuối tháng 10 theo giờ VN (2026-10-31 23:30:00 +07:00 -> 2026-10-31T16:30:00.000Z)
    await prisma.activity.create({
      data: {
        cycleId: cycle2Id,
        areaId: area2Id,
        type: 'WATER_TEST',
        performedAt: new Date('2026-10-31T16:30:00.000Z'),
        performedById: ownerId,
        createdById: ownerId,
        notes: 'Kiểm tra nước ao cuối tháng lúc 23:30 VN',
      },
    });

    // Act 4: Activity just after border:
    // 00:30 ngày đầu tháng 11 theo giờ VN (2026-11-01 00:30:00 +07:00 -> 2026-10-31T17:30:00.000Z)
    await prisma.activity.create({
      data: {
        cycleId: cycle2Id,
        areaId: area2Id,
        type: 'FEEDING',
        performedAt: new Date('2026-10-31T17:30:00.000Z'),
        performedById: ownerId,
        createdById: ownerId,
        notes: 'Cho cá ăn rạng sáng 01/11',
      },
    });

    // Init app
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();

    // Login OWNER
    const ownerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'cal_owner@xfarm.local', password: 'Admin@123' });
    const rawOwnerCookies = ownerLoginRes.headers['set-cookie'];
    ownerCookies = Array.isArray(rawOwnerCookies) ? rawOwnerCookies : [rawOwnerCookies];

    // Login WORKER
    const workerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'cal_worker@xfarm.local', password: 'Admin@123' });
    const rawWorkerCookies = workerLoginRes.headers['set-cookie'];
    workerCookies = Array.isArray(rawWorkerCookies) ? rawWorkerCookies : [rawWorkerCookies];
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('chưa đăng nhập gọi GET /calendar trả về 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/calendar?month=2026-10');
    expect(res.status).toBe(401);
  });

  it('thiếu month hoặc month sai định dạng trả về 400', async () => {
    const res1 = await request(app.getHttpServer())
      .get('/api/v1/calendar')
      .set('Cookie', ownerCookies);
    expect(res1.status).toBe(400);

    const res2 = await request(app.getHttpServer())
      .get('/api/v1/calendar?month=2026-13')
      .set('Cookie', ownerCookies);
    expect(res2.status).toBe(400);
  });

  it('lấy calendar tháng 10/2026: activity biên 23:30 ngày cuối tháng nằm ĐÚNG tháng 10', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/calendar?month=2026-10')
      .set('Cookie', ownerCookies);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('activities');
    expect(res.body).toHaveProperty('cycleEvents');

    const activityNotes = res.body.activities.map((a: CalendarActivityItem) => a.notes);
    // Phải chứa Act 1, Act 2 và Act 3 (23:30 VN cuối tháng)
    expect(activityNotes).toContain('Gieo hạt cải xanh');
    expect(activityNotes).toContain('Bón phân hữu cơ');
    expect(activityNotes).toContain('Kiểm tra nước ao cuối tháng lúc 23:30 VN');
    // KHÔNG được chứa Act 4 (00:30 VN ngày 01/11)
    expect(activityNotes).not.toContain('Cho cá ăn rạng sáng 01/11');

    // Kiểm tra cycleEvents trong tháng 10
    // Cycle 1 có startDate (05/10) và expectedEndDate (25/10) trong tháng 10
    // Cycle 2 có startDate (15/10) trong tháng 10
    const events: CalendarCycleEvent[] = res.body.cycleEvents;
    const c1Start = events.find(
      (e: CalendarCycleEvent) => e.cycleId === cycle1Id && e.kind === 'start',
    );
    const c1Expected = events.find(
      (e: CalendarCycleEvent) => e.cycleId === cycle1Id && e.kind === 'expectedEnd',
    );
    const c2Start = events.find(
      (e: CalendarCycleEvent) => e.cycleId === cycle2Id && e.kind === 'start',
    );
    const c1End = events.find(
      (e: CalendarCycleEvent) => e.cycleId === cycle1Id && e.kind === 'end',
    );

    expect(c1Start).toBeDefined();
    expect(c1Expected).toBeDefined();
    expect(c2Start).toBeDefined();
    expect(c1End).toBeUndefined(); // end rơi vào tháng 11
  });

  it('lấy calendar tháng 11/2026: chứa activity lúc 00:30 ngày 01/11 và các mốc cycle tháng 11', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/calendar?month=2026-11')
      .set('Cookie', ownerCookies);

    expect(res.status).toBe(200);
    const activityNotes = res.body.activities.map((a: CalendarActivityItem) => a.notes);
    expect(activityNotes).toContain('Cho cá ăn rạng sáng 01/11');
    expect(activityNotes).not.toContain('Kiểm tra nước ao cuối tháng lúc 23:30 VN');

    // Cycle 1 end (05/11), Cycle 2 expectedEnd (20/11) và end (25/11)
    const events: CalendarCycleEvent[] = res.body.cycleEvents;
    const c1End = events.find(
      (e: CalendarCycleEvent) => e.cycleId === cycle1Id && e.kind === 'end',
    );
    const c2Expected = events.find(
      (e: CalendarCycleEvent) => e.cycleId === cycle2Id && e.kind === 'expectedEnd',
    );
    const c2End = events.find(
      (e: CalendarCycleEvent) => e.cycleId === cycle2Id && e.kind === 'end',
    );

    expect(c1End).toBeDefined();
    expect(c2Expected).toBeDefined();
    expect(c2End).toBeDefined();
  });

  it('lọc theo areaId trả về đúng activities và cycle events của khu/lô đó', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/calendar?month=2026-10&areaId=${area1Id}`)
      .set('Cookie', ownerCookies);

    expect(res.status).toBe(200);
    // Chỉ có các activity của area1
    for (const act of res.body.activities) {
      expect(act.areaId).toBe(area1Id);
    }
    // Chỉ có cycle events của area1 (cycle1)
    for (const evt of res.body.cycleEvents) {
      expect(evt.cycleId).toBe(cycle1Id);
    }
  });

  it('lọc theo kind=AQUA trả về đúng mùa vụ và nhật ký thủy sản', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/calendar?month=2026-10&kind=AQUA')
      .set('Cookie', ownerCookies);

    expect(res.status).toBe(200);
    // Cycle events chỉ thuộc AQUA
    for (const evt of res.body.cycleEvents) {
      expect(evt.cycleKind).toBe('AQUA');
    }
    // Activities gắn với mùa vụ AQUA
    for (const act of res.body.activities) {
      expect(act.cycleKind).toBe('AQUA');
    }
  });

  it('WORKER chỉ thấy activity của mình, nhưng vẫn xem được cycleEvents', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/calendar?month=2026-10')
      .set('Cookie', workerCookies);

    expect(res.status).toBe(200);
    // Worker chỉ thấy Act 2 (Bón phân hữu cơ)
    expect(res.body.activities).toHaveLength(1);
    expect(res.body.activities[0].notes).toBe('Bón phân hữu cơ');
    // CycleEvents vẫn xem được đầy đủ
    expect(res.body.cycleEvents.length).toBeGreaterThan(0);
  });
});
