import path from 'path';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

const rootEnvPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnvPath });
const testDbUrl =
  process.env.DATABASE_URL_TEST ||
  'postgresql://xfarm:xfarm_secret@localhost:5442/xfarm_test?schema=public';
process.env.DATABASE_URL = testDbUrl;
process.env.NODE_ENV = 'test';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { prisma, type User, type Area, type Cycle, type Employee } from '@xfarm/db';
import { ActivityType, PayType, Role, TaskStatus } from '@xfarm/shared';
import { AppModule } from '../src/app.module';

describe('Sync API E2E (POST /api/v1/sync/batch)', () => {
  let app: INestApplication;
  let ownerCookies: string[];
  let managerCookies: string[];
  let workerCookies: string[];
  let accountantCookies: string[];

  let ownerUser: User;
  let workerUser: User;
  let workerEmployee: Employee;
  let otherEmployee: Employee;
  let activeCycle: Cycle;
  let closedCycle: Cycle;
  let testArea: Area;

  async function login(email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Admin@123' });
    expect(response.status).toBe(200);
    const rawCookies = response.headers['set-cookie'];
    return Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];
  }

  beforeAll(async () => {
    const argon2 = await import('argon2');
    const passwordHash = await argon2.hash('Admin@123');

    // Clean up test data
    await prisma.auditLog.deleteMany();
    await prisma.activityMaterial.deleteMany();
    await prisma.harvestLot.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.task.deleteMany();
    await prisma.animalEvent.deleteMany();
    await prisma.animal.deleteMany();
    await prisma.animalGroup.deleteMany();
    await prisma.cycle.deleteMany();
    await prisma.area.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'sync-owner@xfarm.local',
            'sync-manager@xfarm.local',
            'sync-worker@xfarm.local',
            'sync-worker2@xfarm.local',
            'sync-accountant@xfarm.local',
          ],
        },
      },
    });

    // Create test employees
    workerEmployee = await prisma.employee.create({
      data: {
        code: 'EMP-SYNC-01',
        fullName: 'Worker Sync One',
        position: 'Worker',
        payType: PayType.DAILY,
        baseRate: 300000,
        isActive: true,
      },
    });

    otherEmployee = await prisma.employee.create({
      data: {
        code: 'EMP-SYNC-02',
        fullName: 'Worker Sync Two',
        position: 'Worker',
        payType: PayType.DAILY,
        baseRate: 300000,
        isActive: true,
      },
    });

    // Create test users
    ownerUser = await prisma.user.create({
      data: {
        email: 'sync-owner@xfarm.local',
        fullName: 'Sync Owner',
        role: Role.OWNER,
        passwordHash,
      },
    });

    await prisma.user.create({
      data: {
        email: 'sync-manager@xfarm.local',
        fullName: 'Sync Manager',
        role: Role.MANAGER,
        passwordHash,
      },
    });

    workerUser = await prisma.user.create({
      data: {
        email: 'sync-worker@xfarm.local',
        fullName: 'Sync Worker',
        role: Role.WORKER,
        employeeId: workerEmployee.id,
        passwordHash,
      },
    });

    await prisma.user.create({
      data: {
        email: 'sync-worker2@xfarm.local',
        fullName: 'Sync Other Worker',
        role: Role.WORKER,
        employeeId: otherEmployee.id,
        passwordHash,
      },
    });

    await prisma.user.create({
      data: {
        email: 'sync-accountant@xfarm.local',
        fullName: 'Sync Accountant',
        role: Role.ACCOUNTANT,
        passwordHash,
      },
    });

    // Create test Area and Cycles
    testArea = await prisma.area.create({
      data: {
        code: 'SYNC-AREA-01',
        name: 'Khu vực thử nghiệm Sync',
        type: 'FIELD',
      },
    });

    activeCycle = await prisma.cycle.create({
      data: {
        code: 'SYNC-CYCLE-ACT',
        name: 'Vụ mùa đang hoạt động',
        kind: 'CROP',
        species: 'Rau muống',
        areaId: testArea.id,
        startDate: new Date('2026-10-01T00:00:00Z'),
        status: 'ACTIVE',
      },
    });

    closedCycle = await prisma.cycle.create({
      data: {
        code: 'SYNC-CYCLE-CLS',
        name: 'Vụ mùa đã đóng',
        kind: 'CROP',
        species: 'Xà lách',
        areaId: testArea.id,
        startDate: new Date('2026-08-01T00:00:00Z'),
        endDate: new Date('2026-09-01T00:00:00Z'),
        status: 'CLOSED',
      },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();

    ownerCookies = await login('sync-owner@xfarm.local');
    managerCookies = await login('sync-manager@xfarm.local');
    workerCookies = await login('sync-worker@xfarm.local');
    accountantCookies = await login('sync-accountant@xfarm.local');
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  describe('1. Phân quyền truy cập (RBAC)', () => {
    it('chặn truy cập khi chưa đăng nhập (401)', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/sync/batch').send({ items: [] });
      expect(res.status).toBe(401);
    });

    it('chặn ACCOUNTANT gọi endpoint đồng bộ (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sync/batch')
        .set('Cookie', accountantCookies)
        .send({ items: [] });
      expect(res.status).toBe(403);
    });

    it('cho phép WORKER, MANAGER, OWNER truy cập', async () => {
      for (const cookies of [workerCookies, managerCookies, ownerCookies]) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/sync/batch')
          .set('Cookie', cookies)
          .send({ items: [] });
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
      }
    });
  });

  describe('2. Idempotent: Batch 2 activity rồi gửi lại y hệt', () => {
    it('lần 1 tạo mới (created), lần 2 trả 2 duplicate, DB chỉ có 2 bản ghi', async () => {
      const clientId1 = crypto.randomUUID();
      const clientId2 = crypto.randomUUID();

      const batchPayload = {
        items: [
          {
            clientId: clientId1,
            kind: 'activity' as const,
            payload: {
              areaId: testArea.id,
              cycleId: activeCycle.id,
              type: ActivityType.IRRIGATION,
              data: { durationMin: 30 },
              notes: 'Tưới nước đợt 1',
            },
            createdAt: new Date('2026-10-16T08:00:00Z').toISOString(),
          },
          {
            clientId: clientId2,
            kind: 'activity' as const,
            payload: {
              areaId: testArea.id,
              cycleId: activeCycle.id,
              type: ActivityType.WEEDING,
              notes: 'Làm cỏ luống 1',
            },
            createdAt: new Date('2026-10-16T09:00:00Z').toISOString(),
          },
        ],
      };

      // Lần 1: gửi batch
      const res1 = await request(app.getHttpServer())
        .post('/api/v1/sync/batch')
        .set('Cookie', workerCookies)
        .send(batchPayload);

      expect(res1.status).toBe(200);
      expect(res1.body.data).toHaveLength(2);
      expect(res1.body.data[0].status).toBe('created');
      expect(res1.body.data[0].id).toBeDefined();
      expect(res1.body.data[1].status).toBe('created');
      expect(res1.body.data[1].id).toBeDefined();

      const act1Id = res1.body.data[0].id;
      const act2Id = res1.body.data[1].id;

      // Lần 2: gửi lại y hệt
      const res2 = await request(app.getHttpServer())
        .post('/api/v1/sync/batch')
        .set('Cookie', workerCookies)
        .send(batchPayload);

      expect(res2.status).toBe(200);
      expect(res2.body.data).toHaveLength(2);
      expect(res2.body.data[0]).toEqual({
        clientId: clientId1,
        status: 'duplicate',
        id: act1Id,
      });
      expect(res2.body.data[1]).toEqual({
        clientId: clientId2,
        status: 'duplicate',
        id: act2Id,
      });

      // Kiểm tra DB chỉ có đúng 2 bản ghi cho 2 clientId này
      const dbCount = await prisma.activity.count({
        where: { clientId: { in: [clientId1, clientId2] } },
      });
      expect(dbCount).toBe(2);
    });
  });

  describe('3. Cô lập lỗi: Batch có 1 item lỗi (cycle CLOSED) thì item đó error, item khác created', () => {
    it('xử lý item lỗi mà không làm ảnh hưởng các item hợp lệ khác', async () => {
      const errorClientId = crypto.randomUUID();
      const validClientId = crypto.randomUUID();

      const batchPayload = {
        items: [
          {
            clientId: errorClientId,
            kind: 'activity' as const,
            payload: {
              areaId: testArea.id,
              cycleId: closedCycle.id, // Mùa vụ đã đóng -> phải ném lỗi
              type: ActivityType.PRUNING,
              notes: 'Thu hoạch mùa đã đóng',
            },
            createdAt: new Date('2026-10-16T10:00:00Z').toISOString(),
          },
          {
            clientId: validClientId,
            kind: 'activity' as const,
            payload: {
              areaId: testArea.id,
              cycleId: activeCycle.id,
              type: ActivityType.PRUNING,
              notes: 'Cắt tỉa cành',
            },
            createdAt: new Date('2026-10-16T10:30:00Z').toISOString(),
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/sync/batch')
        .set('Cookie', workerCookies)
        .send(batchPayload);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);

      // Item 1: error
      expect(res.body.data[0].clientId).toBe(errorClientId);
      expect(res.body.data[0].status).toBe('error');
      expect(res.body.data[0].error).toMatch(/Mùa vụ đã đóng/);

      // Item 2: created
      expect(res.body.data[1].clientId).toBe(validClientId);
      expect(res.body.data[1].status).toBe('created');
      expect(res.body.data[1].id).toBeDefined();

      // Kiểm tra DB
      const errorAct = await prisma.activity.findUnique({
        where: { clientId: errorClientId },
      });
      expect(errorAct).toBeNull();

      const validAct = await prisma.activity.findUnique({
        where: { clientId: validClientId },
      });
      expect(validAct).not.toBeNull();
      expect(validAct?.id).toBe(res.body.data[1].id);
    });
  });

  describe('4. Chấm công offline: check-in với at từ 2 giờ trước', () => {
    it('ghi đúng thời điểm at thực tế thay vì giờ server', async () => {
      const checkInClientId = crypto.randomUUID();
      const checkOutClientId = crypto.randomUUID();

      // Giờ quá khứ: 2 tiếng trước
      const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);
      const oneHourAgo = new Date(Date.now() - 1 * 3600 * 1000);

      // Bước 1: Đồng bộ check-in
      const checkInBatch = {
        items: [
          {
            clientId: checkInClientId,
            kind: 'check-in' as const,
            payload: {
              at: twoHoursAgo.toISOString(),
              cycleId: activeCycle.id,
              notes: 'Chấm công vào ca sáng offline',
            },
            createdAt: twoHoursAgo.toISOString(),
          },
        ],
      };

      const checkInRes = await request(app.getHttpServer())
        .post('/api/v1/sync/batch')
        .set('Cookie', workerCookies)
        .send(checkInBatch);

      expect(checkInRes.status).toBe(200);
      expect(checkInRes.body.data[0].status).toBe('created');
      const attendanceId = checkInRes.body.data[0].id;

      // Xác minh DB lưu đúng thời điểm checkIn = twoHoursAgo
      const attendance = await prisma.attendance.findUniqueOrThrow({
        where: { id: attendanceId },
      });
      expect(attendance.employeeId).toBe(workerEmployee.id);
      expect(Math.abs(attendance.checkIn!.getTime() - twoHoursAgo.getTime())).toBeLessThan(2000);

      // Bước 2: Đồng bộ check-out 1 giờ sau
      const checkOutBatch = {
        items: [
          {
            clientId: checkOutClientId,
            kind: 'check-out' as const,
            payload: {
              at: oneHourAgo.toISOString(),
              notes: 'Chấm công ra ca',
            },
            createdAt: oneHourAgo.toISOString(),
          },
        ],
      };

      const checkOutRes = await request(app.getHttpServer())
        .post('/api/v1/sync/batch')
        .set('Cookie', workerCookies)
        .send(checkOutBatch);

      expect(checkOutRes.status).toBe(200);
      expect(checkOutRes.body.data[0].status).toBe('created');

      // Xác minh số giờ được tính đúng từ checkIn đến checkOut (khoảng 1 giờ)
      const updatedAttendance = await prisma.attendance.findUniqueOrThrow({
        where: { id: attendanceId },
      });
      expect(Math.abs(updatedAttendance.checkOut!.getTime() - oneHourAgo.getTime())).toBeLessThan(
        2000,
      );
      expect(Number(updatedAttendance.hours)).toBe(1.0);

      // Bước 3: Gửi lại cả 2 item check-in và check-out -> trả duplicate
      const retryBatch = {
        items: [...checkInBatch.items, ...checkOutBatch.items],
      };
      const retryRes = await request(app.getHttpServer())
        .post('/api/v1/sync/batch')
        .set('Cookie', workerCookies)
        .send(retryBatch);

      expect(retryRes.status).toBe(200);
      expect(retryRes.body.data[0].status).toBe('duplicate');
      expect(retryRes.body.data[1].status).toBe('duplicate');
    });
  });

  describe('5. Bảo mật: WORKER gửi activity giả danh người khác thì vẫn ghi bằng chính WORKER', () => {
    it('ép performedById theo userId của WORKER', async () => {
      const spoofClientId = crypto.randomUUID();

      const batchPayload = {
        items: [
          {
            clientId: spoofClientId,
            kind: 'activity' as const,
            payload: {
              areaId: testArea.id,
              cycleId: activeCycle.id,
              type: ActivityType.CLEANING,
              performedById: ownerUser.id, // WORKER cố tình giả danh OWNER
              notes: 'Dọn dẹp khu vực',
            },
            createdAt: new Date().toISOString(),
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/sync/batch')
        .set('Cookie', workerCookies)
        .send(batchPayload);

      expect(res.status).toBe(200);
      expect(res.body.data[0].status).toBe('created');
      const activityId = res.body.data[0].id;

      // DB phải ghi bằng workerUser.id, KHÔNG PHẢI ownerUser.id
      const recorded = await prisma.activity.findUniqueOrThrow({
        where: { id: activityId },
      });
      expect(recorded.performedById).toBe(workerUser.id);
      expect(recorded.performedById).not.toBe(ownerUser.id);
    });
  });

  describe('6. Hoàn thành công việc (task-complete)', () => {
    it('WORKER hoàn thành công việc của mình thành công và idempotent', async () => {
      // Tạo công việc giao cho worker
      const task = await prisma.task.create({
        data: {
          title: 'Thu gom lá khô',
          assigneeId: workerEmployee.id,
          areaId: testArea.id,
          cycleId: activeCycle.id,
          dueDate: new Date(),
          status: TaskStatus.IN_PROGRESS,
        },
      });

      const taskClientId = crypto.randomUUID();
      const batchPayload = {
        items: [
          {
            clientId: taskClientId,
            kind: 'task-complete' as const,
            payload: {
              taskId: task.id,
              notes: 'Đã hoàn thành xong khu vực A',
            },
            createdAt: new Date().toISOString(),
          },
        ],
      };

      // Gửi lần 1 -> created
      const res1 = await request(app.getHttpServer())
        .post('/api/v1/sync/batch')
        .set('Cookie', workerCookies)
        .send(batchPayload);

      expect(res1.status).toBe(200);
      expect(res1.body.data[0].status).toBe('created');
      expect(res1.body.data[0].id).toBe(task.id);

      const dbTask = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
      expect(dbTask.status).toBe(TaskStatus.DONE);
      expect(dbTask.completedAt).not.toBeNull();

      // Gửi lại lần 2 -> duplicate
      const res2 = await request(app.getHttpServer())
        .post('/api/v1/sync/batch')
        .set('Cookie', workerCookies)
        .send(batchPayload);

      expect(res2.status).toBe(200);
      expect(res2.body.data[0].status).toBe('duplicate');
      expect(res2.body.data[0].id).toBe(task.id);
    });

    it('WORKER bị từ chối khi cố hoàn thành công việc của nhân viên khác (error)', async () => {
      // Tạo công việc giao cho otherEmployee
      const otherTask = await prisma.task.create({
        data: {
          title: 'Sửa đường ống tưới',
          assigneeId: otherEmployee.id,
          areaId: testArea.id,
          cycleId: activeCycle.id,
          dueDate: new Date(),
          status: TaskStatus.TODO,
        },
      });

      const failClientId = crypto.randomUUID();
      const batchPayload = {
        items: [
          {
            clientId: failClientId,
            kind: 'task-complete' as const,
            payload: {
              taskId: otherTask.id,
            },
            createdAt: new Date().toISOString(),
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/sync/batch')
        .set('Cookie', workerCookies)
        .send(batchPayload);

      expect(res.status).toBe(200);
      expect(res.body.data[0].status).toBe('error');
      expect(res.body.data[0].error).toMatch(/không có quyền/);

      // Task của nhân viên khác không bị đổi trạng thái
      const unaffectedTask = await prisma.task.findUniqueOrThrow({ where: { id: otherTask.id } });
      expect(unaffectedTask.status).toBe(TaskStatus.TODO);
    });
  });
});
