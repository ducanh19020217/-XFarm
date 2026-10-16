import path from 'path';
import * as dotenv from 'dotenv';

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
import { Prisma, prisma } from '@xfarm/db';
import { PayrollStatus, PayType, Role } from '@xfarm/shared';
import { AppModule } from '../src/app.module';
import { PayrollPaidEvent, payrollEvents } from '../src/modules/payrolls/events/payroll-paid.event';

describe('Payrolls API E2E', () => {
  let app: INestApplication;
  let ownerCookies: string[];
  let accountantCookies: string[];
  let managerCookies: string[];
  let workerCookies: string[];

  let cycleId: string;
  let empDailyId: string;
  let empPieceId: string;
  let empMonthlyId: string;

  const users = [
    ['payroll-owner@xfarm.local', Role.OWNER],
    ['payroll-accountant@xfarm.local', Role.ACCOUNTANT],
    ['payroll-manager@xfarm.local', Role.MANAGER],
    ['payroll-worker@xfarm.local', Role.WORKER],
  ] as const;

  async function login(email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Admin@123' });
    const rawCookies = response.headers['set-cookie'];
    return Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];
  }

  beforeAll(async () => {
    const argon2 = await import('argon2');

    // Clean up test database
    await prisma.payroll.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.task.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.animalEvent.deleteMany();
    await prisma.animal.deleteMany();
    await prisma.animalGroup.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.cycle.deleteMany();
    await prisma.area.deleteMany();
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: users.map(([email]) => email) } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: users.map(([email]) => email) } },
    });

    const passwordHash = await argon2.hash('Admin@123');
    for (const [email, role] of users) {
      await prisma.user.create({
        data: { email, fullName: role, role, passwordHash },
      });
    }

    const area = await prisma.area.create({
      data: { code: 'PAYROLL-FIELD', name: 'Lô thử nghiệm lương', type: 'FIELD' },
    });

    const cycle = await prisma.cycle.create({
      data: {
        code: 'CYCLE-PAYROLL-1',
        name: 'Vụ mùa thử nghiệm lương',
        kind: 'CROP',
        species: 'Cải xanh',
        areaId: area.id,
        startDate: new Date('2026-10-01T00:00:00Z'),
      },
    });
    cycleId = cycle.id;

    // Create test employees
    const empDaily = await prisma.employee.create({
      data: {
        code: 'EMP-DAILY-TEST',
        fullName: 'Nguyễn Văn Công Nhật',
        position: 'Công nhân nhật',
        payType: PayType.DAILY,
        baseRate: new Prisma.Decimal('300000'),
        isActive: true,
      },
    });
    empDailyId = empDaily.id;

    const empPiece = await prisma.employee.create({
      data: {
        code: 'EMP-PIECE-TEST',
        fullName: 'Trần Thị Khoán',
        position: 'Công nhân khoán',
        payType: PayType.PIECE,
        baseRate: new Prisma.Decimal('2000'),
        isActive: true,
      },
    });
    empPieceId = empPiece.id;

    const empMonthly = await prisma.employee.create({
      data: {
        code: 'EMP-MONTHLY-TEST',
        fullName: 'Lê Văn Tháng',
        position: 'Kỹ thuật viên tháng',
        payType: PayType.MONTHLY,
        baseRate: new Prisma.Decimal('26000000'),
        isActive: true,
      },
    });
    empMonthlyId = empMonthly.id;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();

    ownerCookies = await login('payroll-owner@xfarm.local');
    accountantCookies = await login('payroll-accountant@xfarm.local');
    managerCookies = await login('payroll-manager@xfarm.local');
    workerCookies = await login('payroll-worker@xfarm.local');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('1. Chấm công 3 ngày cho nhân viên DAILY 300.000đ thì lương 900.000đ, details đủ 3 dòng', async () => {
    // Tạo 3 ngày chấm công cho empDaily gắn cycleId
    const dates = ['2026-10-01', '2026-10-02', '2026-10-03'];
    for (const d of dates) {
      await prisma.attendance.create({
        data: {
          employeeId: empDailyId,
          date: new Date(`${d}T00:00:00Z`),
          hours: new Prisma.Decimal('8.00'),
          cycleId,
          notes: `Chấm công ngày ${d}`,
        },
      });
    }

    const response = await request(app.getHttpServer())
      .post('/api/v1/payrolls/generate')
      .set('Cookie', accountantCookies)
      .send({
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        employeeIds: [empDailyId],
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toBeDefined();
    const payrolls = response.body.data;
    expect(Array.isArray(payrolls)).toBe(true);
    expect(payrolls.length).toBe(1);

    const payroll = payrolls[0];
    expect(payroll.employeeId).toBe(empDailyId);
    expect(Number(payroll.amount)).toBe(900000);
    expect(payroll.status).toBe(PayrollStatus.DRAFT);

    // Details đủ 3 dòng ghi từng ngày
    expect(Array.isArray(payroll.details)).toBe(true);
    expect(payroll.details).toHaveLength(3);

    for (let i = 0; i < 3; i++) {
      const line = payroll.details[i];
      expect(line.date).toBe(dates[i]);
      expect(line.hours).toBe(8);
      expect(line.cycleId).toBe(cycleId);
      expect(line.amount).toBe(300000);
    }
  });

  it('2. PIECE: 150 đơn vị × 2.000đ = 300.000đ', async () => {
    // Chấm công cho empPiece 150 đơn vị gắn cycleId
    await prisma.attendance.create({
      data: {
        employeeId: empPieceId,
        date: new Date('2026-10-05T00:00:00Z'),
        hours: new Prisma.Decimal('6.00'),
        pieceQty: new Prisma.Decimal('150.000'),
        cycleId,
        notes: 'Thu hoạch 150 kg rau',
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/payrolls/generate')
      .set('Cookie', ownerCookies)
      .send({
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        employeeIds: [empPieceId],
      });

    expect(response.status).toBe(201);
    const payrolls = response.body.data;
    expect(payrolls.length).toBe(1);

    const payroll = payrolls[0];
    expect(payroll.employeeId).toBe(empPieceId);
    expect(Number(payroll.amount)).toBe(300000);
    expect(payroll.details).toHaveLength(1);
    expect(payroll.details[0].pieceQty).toBe(150);
    expect(payroll.details[0].amount).toBe(300000);
    expect(payroll.details[0].cycleId).toBe(cycleId);
  });

  it('3. MONTHLY tính tỷ lệ đúng (13/26 ngày chuẩn × 26.000.000đ = 13.000.000đ)', async () => {
    // Chấm công 13 ngày cho empMonthly (từ ngày 01 đến 13)
    for (let day = 1; day <= 13; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      await prisma.attendance.create({
        data: {
          employeeId: empMonthlyId,
          date: new Date(`2026-10-${dayStr}T00:00:00Z`),
          hours: new Prisma.Decimal('8.00'),
          notes: `Ngày công ${day}`,
        },
      });
    }

    const response = await request(app.getHttpServer())
      .post('/api/v1/payrolls/generate')
      .set('Cookie', accountantCookies)
      .send({
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        employeeIds: [empMonthlyId],
      });

    expect(response.status).toBe(201);
    const payrolls = response.body.data;
    expect(payrolls.length).toBe(1);

    const payroll = payrolls[0];
    expect(payroll.employeeId).toBe(empMonthlyId);
    expect(Number(payroll.amount)).toBe(13000000);
    expect(payroll.details).toHaveLength(13);
  });

  it('4. approve rồi generate lại thì 422', async () => {
    // Lấy bảng lương của empDaily đã tạo ở test 1
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/payrolls?employeeId=${empDailyId}`)
      .set('Cookie', accountantCookies);

    expect(getRes.status).toBe(200);
    const payroll = getRes.body.data[0];
    expect(payroll.status).toBe(PayrollStatus.DRAFT);

    // Kế toán duyệt bảng lương
    const approveRes = await request(app.getHttpServer())
      .post(`/api/v1/payrolls/${payroll.id}/approve`)
      .set('Cookie', accountantCookies);

    expect(approveRes.status).toBe(201);
    expect(approveRes.body.data.status).toBe(PayrollStatus.APPROVED);
    expect(approveRes.body.data.approvedById).toBeDefined();

    // Thử generate lại kỳ đó cho nhân viên đã approved -> 422
    const reGenerateRes = await request(app.getHttpServer())
      .post('/api/v1/payrolls/generate')
      .set('Cookie', accountantCookies)
      .send({
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        employeeIds: [empDailyId],
      });

    expect(reGenerateRes.status).toBe(422);
  });

  it('5. POST /payrolls/:id/pay (OWNER) chuyển PAID, set paidAt và phát PayrollPaidEvent', async () => {
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/payrolls?employeeId=${empDailyId}`)
      .set('Cookie', accountantCookies);

    const payroll = getRes.body.data[0];
    expect(payroll.status).toBe(PayrollStatus.APPROVED);

    // ACCOUNTANT không có quyền thanh toán -> 403
    const forbiddenRes = await request(app.getHttpServer())
      .post(`/api/v1/payrolls/${payroll.id}/pay`)
      .set('Cookie', accountantCookies);

    expect(forbiddenRes.status).toBe(403);

    // Bắt sự kiện PayrollPaidEvent
    let capturedEvent: PayrollPaidEvent | null = null;
    const eventHandler = (event: PayrollPaidEvent) => {
      capturedEvent = event;
    };
    payrollEvents.once('payroll.paid', eventHandler);

    // OWNER thanh toán bảng lương
    const payRes = await request(app.getHttpServer())
      .post(`/api/v1/payrolls/${payroll.id}/pay`)
      .set('Cookie', ownerCookies);

    expect(payRes.status).toBe(201);
    expect(payRes.body.data.status).toBe(PayrollStatus.PAID);
    expect(payRes.body.data.paidAt).toBeDefined();

    // Kiểm tra hook PayrollPaidEvent đã nhận đúng thông tin
    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent!.payrollId).toBe(payroll.id);
    expect(capturedEvent!.employeeId).toBe(empDailyId);
    expect(capturedEvent!.amount).toBe(900000);

    // Thử thanh toán lại bảng lương đã PAID -> 422
    const payAgainRes = await request(app.getHttpServer())
      .post(`/api/v1/payrolls/${payroll.id}/pay`)
      .set('Cookie', ownerCookies);

    expect(payAgainRes.status).toBe(422);
  });

  it('6. labor-cost của cycle bằng tổng phần gắn cycle', async () => {
    // Trên cycle:
    // empDaily: 3 ngày công × 300.000 = 900.000đ
    // empPiece: 150 đơn vị × 2.000 = 300.000đ
    // empMonthly: không gắn cycle -> 0đ
    // Tổng chi phí công của cycle = 900.000 + 300.000 = 1.200.000đ

    const response = await request(app.getHttpServer())
      .get(`/api/v1/cycles/${cycleId}/labor-cost`)
      .set('Cookie', managerCookies);

    expect(response.status).toBe(200);

    const body = response.body;
    const totalLaborCost = body.totalLaborCost ?? body.data?.totalLaborCost ?? body.total;
    expect(totalLaborCost).toBe(1200000);

    const employees = body.employees ?? body.data?.employees ?? body.byEmployee;
    expect(employees).toBeDefined();
    expect(Array.isArray(employees)).toBe(true);
    expect(employees.length).toBe(2);

    interface LaborCostItem {
      employeeId: string;
      totalCost: number;
      totalDays?: number;
      totalPieceQty?: number;
    }

    const dailyEntry = employees.find((e: LaborCostItem) => e.employeeId === empDailyId);
    expect(dailyEntry).toBeDefined();
    expect(dailyEntry.totalCost).toBe(900000);
    expect(dailyEntry.totalDays).toBe(3);

    const pieceEntry = employees.find((e: LaborCostItem) => e.employeeId === empPieceId);
    expect(pieceEntry).toBeDefined();
    expect(pieceEntry.totalCost).toBe(300000);
    expect(pieceEntry.totalPieceQty).toBe(150);

    // Tổng labor cost của cycle đúng bằng tổng phần chi phí gắn cycle của 2 nhân viên
    expect(dailyEntry.totalCost + pieceEntry.totalCost).toBe(totalLaborCost);
  });

  it('7. GET /payrolls hỗ trợ lọc và xem chi tiết theo ID', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/payrolls?status=PAID')
      .set('Cookie', accountantCookies);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toBeDefined();
    expect(listRes.body.total).toBeGreaterThanOrEqual(1);
    expect(listRes.body.data[0].status).toBe(PayrollStatus.PAID);

    const id = listRes.body.data[0].id;
    const detailRes = await request(app.getHttpServer())
      .get(`/api/v1/payrolls/${id}`)
      .set('Cookie', ownerCookies);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.id).toBe(id);
    expect(detailRes.body.data.employee).toBeDefined();
    expect(detailRes.body.data.approvedBy).toBeDefined();
  });

  it('8. WORKER không được xem danh sách bảng lương (403 Forbidden)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/payrolls')
      .set('Cookie', workerCookies);

    expect(res.status).toBe(403);
  });
});
