import path from 'path';
import * as dotenv from 'dotenv';

const rootEnvPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnvPath });
const testDbUrl =
  process.env.DATABASE_URL_TEST ||
  'postgresql://xfarm:xfarm_secret@localhost:5442/xfarm_test?schema=public';
process.env.DATABASE_URL = testDbUrl;
process.env.NODE_ENV = 'test';

import { execSync } from 'child_process';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanupDatabase } from './helpers/cleanup';
import { getVNDateKey } from '../src/modules/alerts/alerts.service';

describe('Equipment and Maintenance API E2E', () => {
  let app: INestApplication;
  let ownerCookies: string[];
  let managerCookies: string[];
  let workerCookies: string[];
  let accountantCookies: string[];
  let salesCookies: string[];

  async function login(email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Admin@123' });
    const rawCookies = response.headers['set-cookie'];
    return Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];
  }

  beforeAll(async () => {
    const { prisma } = await import('@xfarm/db');
    await cleanupDatabase(prisma);

    execSync(
      `DATABASE_URL="${testDbUrl}" pnpm --filter @xfarm/db exec prisma db push --skip-generate --accept-data-loss`,
      { stdio: 'pipe' },
    );
    execSync(`DATABASE_URL="${testDbUrl}" pnpm --filter @xfarm/db exec tsx prisma/seed.ts`, {
      stdio: 'pipe',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();

    ownerCookies = await login('admin@xfarm.local');
    managerCookies = await login('manager@xfarm.local');
    workerCookies = await login('worker@xfarm.local');
    accountantCookies = await login('accountant@xfarm.local');
    salesCookies = await login('sales@xfarm.local');
  }, 90000);

  afterAll(async () => {
    await app?.close();
  });

  describe('Equipment CRUD', () => {
    const suffix = Date.now();
    let createdEquipmentId: string;
    let autoCodeEquipmentId: string;

    it('tạo thiết bị với mã tự sinh EQ-xxxx', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/equipment')
        .set('Cookie', ownerCookies)
        .send({
          name: `Máy cày đa năng ${suffix}`,
          type: 'TRACTOR',
          value: 120000000,
          purchaseDate: '2026-01-15T00:00:00.000Z',
          notes: 'Dùng cho khu ruộng lớn',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.code).toMatch(/^EQ-\d{4}$/);
      expect(res.body.data.name).toBe(`Máy cày đa năng ${suffix}`);
      expect(res.body.data.status).toBe('ACTIVE');
      expect(res.body.data.isActive).toBe(true);

      autoCodeEquipmentId = res.body.data.id;
    });

    it('tạo thiết bị với mã tùy chỉnh', async () => {
      const customCode = `EQ-CUSTOM-${suffix}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/equipment')
        .set('Cookie', managerCookies)
        .send({
          code: customCode,
          name: `Máy phát điện dự phòng ${suffix}`,
          type: 'GENERATOR',
          value: 35000000,
          status: 'ACTIVE',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe(customCode);
      createdEquipmentId = res.body.data.id;
    });

    it('báo lỗi 409 khi tạo trùng mã thiết bị', async () => {
      const customCode = `EQ-CUSTOM-${suffix}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/equipment')
        .set('Cookie', ownerCookies)
        .send({
          code: customCode,
          name: `Máy trùng mã ${suffix}`,
          type: 'PUMP',
        });

      expect(res.status).toBe(409);
    });

    it('lấy danh sách thiết bị có phân trang và lọc theo type / status / search', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/equipment')
        .set('Cookie', workerCookies)
        .query({ search: `Máy cày đa năng ${suffix}`, type: 'TRACTOR' });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(autoCodeEquipmentId);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('lấy chi tiết thiết bị kèm lịch, 20 log gần nhất và tổng chi phí bảo trì', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/equipment/${createdEquipmentId}`)
        .set('Cookie', accountantCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdEquipmentId);
      expect(res.body.data.maintenanceSchedules).toBeInstanceOf(Array);
      expect(res.body.data.maintenanceLogs).toBeInstanceOf(Array);
      expect(typeof res.body.data.totalMaintenanceCost).toBe('number');
      expect(res.body.data.totalMaintenanceCost).toBe(0);
    });

    it('cập nhật thông tin thiết bị', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/equipment/${createdEquipmentId}`)
        .set('Cookie', ownerCookies)
        .send({
          name: `Máy phát điện nâng cấp ${suffix}`,
          notes: 'Đã bảo dưỡng định kỳ',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe(`Máy phát điện nâng cấp ${suffix}`);
      expect(res.body.data.notes).toBe('Đã bảo dưỡng định kỳ');
    });

    it('xóa mềm thiết bị bằng isActive thay vì xóa cứng', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/equipment/${createdEquipmentId}`)
        .set('Cookie', managerCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);

      const check = await request(app.getHttpServer())
        .get(`/api/v1/equipment/${createdEquipmentId}`)
        .set('Cookie', ownerCookies);

      expect(check.status).toBe(200);
      expect(check.body.data.isActive).toBe(false);
    });
  });

  describe('Maintenance Schedules CRUD', () => {
    let testEquipmentId: string;
    let scheduleId: string;

    beforeAll(async () => {
      const eqRes = await request(app.getHttpServer())
        .post('/api/v1/equipment')
        .set('Cookie', ownerCookies)
        .send({
          name: `Thiết bị bảo trì ${Date.now()}`,
          type: 'IRRIGATION',
        });
      testEquipmentId = eqRes.body.data.id;
    });

    it('từ chối intervalDays <= 0', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/equipment/${testEquipmentId}/maintenance-schedules`)
        .set('Cookie', ownerCookies)
        .send({
          name: 'Lịch lỗi',
          intervalDays: 0,
          nextDueDate: '2026-11-01T00:00:00.000Z',
        });

      expect(res.status).toBe(400);
    });

    it('tạo lịch bảo trì thành công với intervalDays >= 1', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/equipment/${testEquipmentId}/maintenance-schedules`)
        .set('Cookie', managerCookies)
        .send({
          name: 'Kiểm tra đường ống',
          intervalDays: 14,
          nextDueDate: '2026-11-10T00:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.equipmentId).toBe(testEquipmentId);
      expect(res.body.data.intervalDays).toBe(14);
      scheduleId = res.body.data.id;
    });

    it('lấy danh sách lịch bảo trì', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/maintenance-schedules')
        .set('Cookie', accountantCookies)
        .query({ equipmentId: testEquipmentId });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].id).toBe(scheduleId);
    });

    it('cập nhật lịch bảo trì', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/maintenance-schedules/${scheduleId}`)
        .set('Cookie', ownerCookies)
        .send({
          intervalDays: 21,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.intervalDays).toBe(21);
    });

    it('khóa mềm lịch bảo trì', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/maintenance-schedules/${scheduleId}`)
        .set('Cookie', managerCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });
  });

  describe('Maintenance Logs Transaction & State Transitions', () => {
    let brokenEquipmentId: string;
    let scheduleId: string;

    beforeAll(async () => {
      const eqRes = await request(app.getHttpServer())
        .post('/api/v1/equipment')
        .set('Cookie', ownerCookies)
        .send({
          name: `Máy bơm hỏng ${Date.now()}`,
          type: 'PUMP',
          status: 'BROKEN',
        });
      brokenEquipmentId = eqRes.body.data.id;

      const schRes = await request(app.getHttpServer())
        .post(`/api/v1/equipment/${brokenEquipmentId}/maintenance-schedules`)
        .set('Cookie', ownerCookies)
        .send({
          name: 'Thay bi bạc đạn máy bơm',
          intervalDays: 30,
          nextDueDate: '2026-10-20T00:00:00.000Z',
        });
      scheduleId = schRes.body.data.id;
    });

    it('ghi log theo lịch trong 1 transaction: dời nextDueDate và chuyển BROKEN -> ACTIVE khi REPAIR', async () => {
      const logDate = '2026-10-25T08:00:00.000Z';
      const cost = 750000;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/equipment/${brokenEquipmentId}/maintenance-logs`)
        .set('Cookie', workerCookies)
        .send({
          scheduleId,
          date: logDate,
          type: 'REPAIR',
          cost,
          notes: 'Đã thay bi và quấn lại dây đồng, máy chạy êm',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.equipmentId).toBe(brokenEquipmentId);
      expect(res.body.data.scheduleId).toBe(scheduleId);
      expect(Number(res.body.data.cost)).toBe(cost);

      // 1. Kiểm tra thiết bị đã chuyển sang ACTIVE
      const eqCheck = await request(app.getHttpServer())
        .get(`/api/v1/equipment/${brokenEquipmentId}`)
        .set('Cookie', ownerCookies);

      expect(eqCheck.status).toBe(200);
      expect(eqCheck.body.data.status).toBe('ACTIVE');
      expect(eqCheck.body.data.totalMaintenanceCost).toBe(cost);
      expect(eqCheck.body.data.maintenanceLogs.length).toBe(1);

      // 2. Kiểm tra nextDueDate đã dời đúng (2026-10-25 + 30 ngày = 2026-11-24)
      const schCheck = await request(app.getHttpServer())
        .get(`/api/v1/maintenance-schedules/${scheduleId}`)
        .set('Cookie', ownerCookies);

      expect(schCheck.status).toBe(200);
      const nextDueVN = getVNDateKey(new Date(schCheck.body.data.nextDueDate));
      expect(nextDueVN).toBe('2026-11-24');
    });

    it('ghi log không theo lịch (không có scheduleId) vẫn thành công và cộng dồn chi phí', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/equipment/${brokenEquipmentId}/maintenance-logs`)
        .set('Cookie', workerCookies)
        .send({
          date: '2026-10-26T09:00:00.000Z',
          type: 'INSPECTION',
          cost: 150000,
          notes: 'Kiểm tra độ rung định kỳ',
        });

      expect(res.status).toBe(201);

      const eqCheck = await request(app.getHttpServer())
        .get(`/api/v1/equipment/${brokenEquipmentId}`)
        .set('Cookie', ownerCookies);

      expect(eqCheck.status).toBe(200);
      expect(eqCheck.body.data.totalMaintenanceCost).toBe(750000 + 150000);
      expect(eqCheck.body.data.maintenanceLogs.length).toBe(2);
    });
  });

  describe('Maintenance Due Alerts Job & Deduplication', () => {
    let dueScheduleId: string;
    let dueEquipmentId: string;
    const today = new Date();

    beforeAll(async () => {
      const eqRes = await request(app.getHttpServer())
        .post('/api/v1/equipment')
        .set('Cookie', ownerCookies)
        .send({
          name: `Máy cắt cỏ sắp đến hạn ${Date.now()}`,
          type: 'MOWER',
        });
      dueEquipmentId = eqRes.body.data.id;

      // Lịch đến hạn trong 2 ngày tới (≤ hôm nay + 3 ngày)
      const inTwoDays = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
      const schRes = await request(app.getHttpServer())
        .post(`/api/v1/equipment/${dueEquipmentId}/maintenance-schedules`)
        .set('Cookie', ownerCookies)
        .send({
          name: 'Bảo dưỡng định kỳ máy cắt cỏ',
          intervalDays: 30,
          nextDueDate: inTwoDays.toISOString(),
        });
      dueScheduleId = schRes.body.data.id;
    });

    it('chạy POST /alerts/run-maintenance-check tạo Alert MAINTENANCE_DUE', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/alerts/run-maintenance-check')
        .set('Cookie', ownerCookies);

      expect([200, 201]).toContain(res.status);
      expect(res.body.data.dueCount).toBeGreaterThanOrEqual(1);

      const { prisma } = await import('@xfarm/db');
      const alerts = await prisma.alert.findMany({
        where: { type: 'MAINTENANCE_DUE' },
      });

      expect(alerts.length).toBeGreaterThanOrEqual(1);
      const foundAlert = alerts.find((a) => a.dedupeKey?.includes(dueScheduleId));
      expect(foundAlert).toBeDefined();
      expect(foundAlert?.dedupeKey).toMatch(new RegExp(`^maint:${dueScheduleId}:`));
      expect(foundAlert?.refType).toBe('EQUIPMENT');
      expect(foundAlert?.refId).toBe(dueEquipmentId);
      expect(foundAlert?.message).toContain('Bảo dưỡng định kỳ máy cắt cỏ');
    });

    it('job chạy lần 2 không tạo trùng Alert nhờ dedupeKey', async () => {
      const { prisma } = await import('@xfarm/db');
      const countBefore = await prisma.alert.count({
        where: { type: 'MAINTENANCE_DUE' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/alerts/run-maintenance-check')
        .set('Cookie', managerCookies);

      expect([200, 201]).toContain(res.status);

      const countAfter = await prisma.alert.count({
        where: { type: 'MAINTENANCE_DUE' },
      });

      expect(countAfter).toBe(countBefore);
    });
  });

  describe('RBAC Permissions', () => {
    it('chặn vai trò SALES truy cập các endpoint thiết bị và bảo trì (403)', async () => {
      const getEq = await request(app.getHttpServer())
        .get('/api/v1/equipment')
        .set('Cookie', salesCookies);
      expect(getEq.status).toBe(403);

      const getSch = await request(app.getHttpServer())
        .get('/api/v1/maintenance-schedules')
        .set('Cookie', salesCookies);
      expect(getSch.status).toBe(403);

      const postLog = await request(app.getHttpServer())
        .post('/api/v1/equipment/dummy-id/maintenance-logs')
        .set('Cookie', salesCookies)
        .send({
          date: '2026-10-20',
          type: 'ROUTINE',
        });
      expect(postLog.status).toBe(403);

      const runJob = await request(app.getHttpServer())
        .post('/api/v1/alerts/run-maintenance-check')
        .set('Cookie', salesCookies);
      expect(runJob.status).toBe(403);
    });

    it('chặn WORKER tạo thiết bị và chạy check bảo trì (403)', async () => {
      const postEq = await request(app.getHttpServer())
        .post('/api/v1/equipment')
        .set('Cookie', workerCookies)
        .send({
          name: 'Máy thử',
          type: 'PUMP',
        });
      expect(postEq.status).toBe(403);

      const runJob = await request(app.getHttpServer())
        .post('/api/v1/alerts/run-maintenance-check')
        .set('Cookie', workerCookies);
      expect(runJob.status).toBe(403);
    });

    it('ACCOUNTANT xem được thiết bị nhưng không được tạo thiết bị (403)', async () => {
      const getEq = await request(app.getHttpServer())
        .get('/api/v1/equipment')
        .set('Cookie', accountantCookies);
      expect(getEq.status).toBe(200);

      const postEq = await request(app.getHttpServer())
        .post('/api/v1/equipment')
        .set('Cookie', accountantCookies)
        .send({
          name: 'Máy thử accountant',
          type: 'PUMP',
        });
      expect(postEq.status).toBe(403);
    });
  });
});
