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
import { prisma, type User, type Area, type Cycle } from '@xfarm/db';
import { ActivityType, PayType, TaskStatus } from '@xfarm/shared';
import { AppModule } from '../src/app.module';

describe('HR API E2E (Employee, Task, Attendance)', () => {
  let app: INestApplication;
  let ownerCookies: string[];
  let managerCookies: string[];
  let workerCookies: string[];
  let managerUser: User;
  let workerUser: User;
  let defaultArea: Area;
  let defaultCycle: Cycle;

  async function login(email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Admin@123' });
    expect(response.status).toBe(200);
    const rawCookies = response.headers['set-cookie'];
    return Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];
  }

  beforeAll(async () => {
    // 1. Sync and seed test database
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

    managerUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'manager@xfarm.local' },
    });
    workerUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'worker@xfarm.local' },
    });

    defaultCycle = await prisma.cycle.findFirstOrThrow({
      where: { status: 'ACTIVE' },
    });
    defaultArea = await prisma.area.findUniqueOrThrow({
      where: { id: defaultCycle.areaId },
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('Employee Management', () => {
    let createdEmployeeId: string;

    it('tạo nhân viên tự động sinh mã NV-xxxx qua nextCode', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/employees')
        .set('Cookie', ownerCookies)
        .send({
          fullName: 'Lê Văn Kiểm',
          position: 'Kỹ thuật viên tưới',
          payType: PayType.DAILY,
          baseRate: 350000,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.code).toMatch(/^NV-\d{4}$/);
      expect(res.body.data.fullName).toBe('Lê Văn Kiểm');
      expect(res.body.data.isActive).toBe(true);
      createdEmployeeId = res.body.data.id;
    });

    it('khóa mềm nhân viên (DELETE /employees/:id)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/employees/${createdEmployeeId}`)
        .set('Cookie', ownerCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);

      const inDb = await prisma.employee.findUnique({
        where: { id: createdEmployeeId },
      });
      expect(inDb?.isActive).toBe(false);
    });

    it('liên kết và gỡ liên kết nhân viên với User (PATCH /employees/:id/user)', async () => {
      // 1. Link to workerUser
      const linkRes = await request(app.getHttpServer())
        .patch(`/api/v1/employees/${createdEmployeeId}/user`)
        .set('Cookie', ownerCookies)
        .send({ userId: workerUser.id });

      expect(linkRes.status).toBe(200);
      const userAfterLink = await prisma.user.findUnique({
        where: { id: workerUser.id },
      });
      expect(userAfterLink?.employeeId).toBe(createdEmployeeId);

      // 2. Unlink
      const unlinkRes = await request(app.getHttpServer())
        .patch(`/api/v1/employees/${createdEmployeeId}/user`)
        .set('Cookie', ownerCookies)
        .send({ userId: null });

      expect(unlinkRes.status).toBe(200);
      const userAfterUnlink = await prisma.user.findUnique({
        where: { id: workerUser.id },
      });
      expect(userAfterUnlink?.employeeId).toBeNull();

      // Restore workerUser link to NV-0001
      const emp1 = await prisma.employee.findUniqueOrThrow({ where: { code: 'NV-0001' } });
      await prisma.user.update({
        where: { id: workerUser.id },
        data: { employeeId: emp1.id },
      });
    });
  });

  describe('Tasks & RBAC', () => {
    let workerEmployeeId: string;
    let otherEmployeeId: string;
    let workerTaskId: string;
    let otherTaskId: string;

    beforeAll(async () => {
      const emp1 = await prisma.employee.findUniqueOrThrow({ where: { code: 'NV-0001' } });
      const emp2 = await prisma.employee.findUniqueOrThrow({ where: { code: 'NV-0002' } });
      workerEmployeeId = emp1.id;
      otherEmployeeId = emp2.id;

      // Ensure workerUser is linked to emp1
      await prisma.user.update({
        where: { id: workerUser.id },
        data: { employeeId: workerEmployeeId },
      });
    });

    it('tạo công việc cho 2 nhân viên khác nhau', async () => {
      const today = new Date();
      const res1 = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Cookie', managerCookies)
        .send({
          title: 'Tưới cây sáng',
          assigneeId: workerEmployeeId,
          areaId: defaultArea.id,
          cycleId: defaultCycle.id,
          dueDate: today.toISOString(),
          status: TaskStatus.TODO,
        });
      expect(res1.status).toBe(201);
      workerTaskId = res1.body.data.id;

      const res2 = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Cookie', managerCookies)
        .send({
          title: 'Kiểm tra chuồng trại',
          assigneeId: otherEmployeeId,
          areaId: defaultArea.id,
          cycleId: defaultCycle.id,
          dueDate: today.toISOString(),
          status: TaskStatus.TODO,
        });
      expect(res2.status).toBe(201);
      otherTaskId = res2.body.data.id;
    });

    it('WORKER chỉ thấy việc của mình khi gọi GET /tasks và GET /tasks/my', async () => {
      // 1. GET /tasks as WORKER
      const resTasks = await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Cookie', workerCookies);

      expect(resTasks.status).toBe(200);
      expect(resTasks.body.data.length).toBeGreaterThan(0);
      for (const t of resTasks.body.data) {
        expect(t.assigneeId).toBe(workerEmployeeId);
      }

      // 2. GET /tasks/my as WORKER
      const resMy = await request(app.getHttpServer())
        .get('/api/v1/tasks/my')
        .set('Cookie', workerCookies);

      expect(resMy.status).toBe(200);
      expect(resMy.body.data.length).toBeGreaterThan(0);
      for (const t of resMy.body.data) {
        expect(t.assigneeId).toBe(workerEmployeeId);
      }

      // 3. WORKER không xem được việc của nhân viên khác (GET /tasks/:id khác -> 403)
      const resForbidden = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${otherTaskId}`)
        .set('Cookie', workerCookies);

      expect(resForbidden.status).toBe(403);
    });

    it('WORKER bắt đầu công việc chuyển trạng thái IN_PROGRESS', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${workerTaskId}/start`)
        .set('Cookie', workerCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('Hoàn thành việc kèm activity thì có activityId; gửi lại cùng clientId không tạo activity thứ hai', async () => {
      const clientId = `task-complete-idemp-${Date.now()}`;
      const activityPayload = {
        type: ActivityType.IRRIGATION,
        areaId: defaultArea.id,
        cycleId: defaultCycle.id,
        performedAt: new Date().toISOString(),
        mediaIds: [],
        data: { durationMin: 45 },
      };

      const initialActivityCount = await prisma.activity.count();

      // First call
      const res1 = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${workerTaskId}/complete`)
        .set('Cookie', workerCookies)
        .send({
          clientId,
          activity: activityPayload,
        });

      expect(res1.status).toBe(200);
      expect(res1.body.data.status).toBe(TaskStatus.DONE);
      expect(res1.body.data.completedAt).toBeDefined();
      expect(res1.body.data.activityId).toBeDefined();

      const createdActivityId = res1.body.data.activityId;
      const countAfterFirst = await prisma.activity.count();
      expect(countAfterFirst).toBe(initialActivityCount + 1);

      // Verify activity exists in DB
      const activityInDb = await prisma.activity.findUnique({
        where: { id: createdActivityId },
      });
      expect(activityInDb).toBeDefined();
      expect(activityInDb?.type).toBe(ActivityType.IRRIGATION);

      // Second call with same clientId (idempotent test)
      const res2 = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${workerTaskId}/complete`)
        .set('Cookie', workerCookies)
        .send({
          clientId,
          activity: activityPayload,
        });

      expect(res2.status).toBe(200);
      expect(res2.body.data.id).toBe(workerTaskId);
      expect(res2.body.data.status).toBe(TaskStatus.DONE);
      expect(res2.body.data.activityId).toBe(createdActivityId);

      const countAfterSecond = await prisma.activity.count();
      // MUST NOT create a second activity!
      expect(countAfterSecond).toBe(countAfterFirst);
    });
  });

  describe('Attendance & AuditLog', () => {
    let attendanceId: string;
    const testDateStr = '2026-10-25';

    beforeAll(async () => {
      // Clear any attendance on testDateStr for workerUser's employee
      const emp1 = await prisma.employee.findUniqueOrThrow({ where: { code: 'NV-0001' } });
      await prisma.attendance.deleteMany({
        where: {
          employeeId: emp1.id,
          date: new Date(`${testDateStr}T00:00:00.000Z`),
        },
      });
    });

    it('Check-in và check-out ra đúng số giờ (trừ 1 giờ nghỉ trưa khi ca > 6h)', async () => {
      // 1. Check in at 07:30
      const checkInRes = await request(app.getHttpServer())
        .post('/api/v1/attendance/check-in')
        .set('Cookie', workerCookies)
        .send({
          at: `${testDateStr}T07:30:00.000Z`,
          cycleId: defaultCycle.id,
        });

      expect(checkInRes.status).toBe(201);
      expect(checkInRes.body.data).toBeDefined();
      expect(checkInRes.body.data.checkIn).toBeDefined();
      attendanceId = checkInRes.body.data.id;

      // 2. Check out at 16:30 (9 hours total -> minus 1h break = 8.00 hours)
      const checkOutRes = await request(app.getHttpServer())
        .post('/api/v1/attendance/check-out')
        .set('Cookie', workerCookies)
        .send({
          at: `${testDateStr}T16:30:00.000Z`,
        });

      expect(checkOutRes.status).toBe(200);
      expect(checkOutRes.body.data.checkOut).toBeDefined();
      expect(Number(checkOutRes.body.data.hours)).toBe(8);

      const inDb = await prisma.attendance.findUnique({
        where: { id: attendanceId },
      });
      expect(Number(inDb?.hours)).toBe(8);
    });

    it('Check-in trùng trong ngày thì trả về 422', async () => {
      const duplicateRes = await request(app.getHttpServer())
        .post('/api/v1/attendance/check-in')
        .set('Cookie', workerCookies)
        .send({
          at: `${testDateStr}T08:00:00.000Z`,
        });

      expect(duplicateRes.status).toBe(422);
    });

    it('Check-out khi chưa check-in thì trả về 422', async () => {
      // Worker already checked out for testDateStr; no open check-in currently exists
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/check-out')
        .set('Cookie', workerCookies)
        .send({
          at: `${testDateStr}T17:00:00.000Z`,
        });

      expect(res.status).toBe(422);
    });

    it('Ca làm việc <= 6 giờ không bị trừ nghỉ trưa và làm tròn 0.25h', async () => {
      const shortDayStr = '2026-10-26';
      const emp1 = await prisma.employee.findUniqueOrThrow({ where: { code: 'NV-0001' } });
      await prisma.attendance.deleteMany({
        where: {
          employeeId: emp1.id,
          date: new Date(`${shortDayStr}T00:00:00.000Z`),
        },
      });

      // Check-in 08:00
      await request(app.getHttpServer())
        .post('/api/v1/attendance/check-in')
        .set('Cookie', workerCookies)
        .send({
          at: `${shortDayStr}T08:00:00.000Z`,
        });

      // Check-out 12:10 (4h 10m = 4.167h -> rounded to 4.25h, no lunch break deducted)
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/check-out')
        .set('Cookie', workerCookies)
        .send({
          at: `${shortDayStr}T12:10:00.000Z`,
        });

      expect(res.status).toBe(200);
      expect(Number(res.body.data.hours)).toBe(4.25);
    });

    it('MANAGER sửa giờ thì có AuditLog', async () => {
      // Clear recent audit logs for attendance
      await prisma.auditLog.deleteMany({
        where: { entity: 'attendance', entityId: attendanceId },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/attendance/${attendanceId}`)
        .set('Cookie', managerCookies)
        .send({
          hours: 7.5,
          notes: 'Quản lý điều chỉnh do máy chấm công ghi nhận sai',
        });

      expect(res.status).toBe(200);
      expect(Number(res.body.data.hours)).toBe(7.5);

      // Verify AuditLog was recorded
      let log = null;
      for (let i = 0; i < 20; i++) {
        log = await prisma.auditLog.findFirst({
          where: {
            entity: 'attendance',
            entityId: attendanceId,
            action: 'PATCH',
            userId: managerUser.id,
          },
        });
        if (log) break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      expect(log).toBeDefined();
      expect(log?.userId).toBe(managerUser.id);
      expect(log?.action).toBe('PATCH');
    });
  });
});
