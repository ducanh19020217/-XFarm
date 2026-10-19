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
  let cycleBId: string;
  let empDailyId: string;
  let empPieceId: string;
  let empMonthlyId: string;
  let empMultiCycleId: string;

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
    await prisma.harvestLot.deleteMany();
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

    const cycleB = await prisma.cycle.create({
      data: {
        code: 'CYCLE-PAYROLL-2',
        name: 'Vụ mùa thử nghiệm lương B',
        kind: 'CROP',
        species: 'Rau muống',
        areaId: area.id,
        startDate: new Date('2026-10-01T00:00:00Z'),
      },
    });
    cycleBId = cycleB.id;

    const empMulti = await prisma.employee.create({
      data: {
        code: 'EMP-MULTI-CYCLE-TEST',
        fullName: 'Lê Đa Vụ',
        position: 'Công nhân làm nhiều vụ',
        payType: PayType.DAILY,
        baseRate: new Prisma.Decimal('300000'),
        isActive: true,
      },
    });
    empMultiCycleId = empMulti.id;

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
    const sumLines = payroll.details.reduce(
      (sum: number, l: { amount: number }) => sum + l.amount,
      0,
    );
    expect(sumLines).toBe(Number(payroll.amount));
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

  it('9. Nhân viên DAILY làm 2 mùa vụ trong cùng 1 ngày (3h cycle A, 3h cycle B): lương 300.000đ (không trùng công), labor-cost A = B = 150.000đ', async () => {
    const d = '2026-10-20';
    // Chấm công 3h cycle A và 3h cycle B cùng ngày 2026-10-20
    await prisma.attendance.create({
      data: {
        employeeId: empMultiCycleId,
        date: new Date(`${d}T00:00:00Z`),
        hours: new Prisma.Decimal('3.00'),
        cycleId,
        notes: '3h tại cycle A',
      },
    });

    await prisma.attendance.create({
      data: {
        employeeId: empMultiCycleId,
        date: new Date(`${d}T00:00:00Z`),
        hours: new Prisma.Decimal('3.00'),
        cycleId: cycleBId,
        notes: '3h tại cycle B',
      },
    });

    // Generate payroll cho nhân viên
    const genRes = await request(app.getHttpServer())
      .post('/api/v1/payrolls/generate')
      .set('Cookie', accountantCookies)
      .send({
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        employeeIds: [empMultiCycleId],
      });

    expect(genRes.status).toBe(201);
    const payroll = genRes.body.data[0];
    expect(payroll.employeeId).toBe(empMultiCycleId);
    // Tổng 6 giờ >= 4 giờ => 1 công => 300.000đ (KHÔNG trùng công thành 600.000đ hay 450.000đ)
    expect(Number(payroll.amount)).toBe(300000);
    expect(payroll.details).toHaveLength(2);

    const lineA = payroll.details.find((l: { cycleId: string }) => l.cycleId === cycleId);
    const lineB = payroll.details.find((l: { cycleId: string }) => l.cycleId === cycleBId);
    expect(lineA).toBeDefined();
    expect(lineB).toBeDefined();
    expect(lineA.hours).toBe(3);
    expect(lineB.hours).toBe(3);
    expect(lineA.amount).toBe(150000);
    expect(lineB.amount).toBe(150000);

    // Kiểm tra labor-cost cycle A
    const costARes = await request(app.getHttpServer())
      .get(`/api/v1/cycles/${cycleId}/labor-cost`)
      .set('Cookie', managerCookies);
    expect(costARes.status).toBe(200);
    const empInA = costARes.body.employees.find(
      (e: { employeeId: string }) => e.employeeId === empMultiCycleId,
    );
    expect(empInA).toBeDefined();
    expect(empInA.totalCost).toBe(150000);

    // Kiểm tra labor-cost cycle B
    const costBRes = await request(app.getHttpServer())
      .get(`/api/v1/cycles/${cycleBId}/labor-cost`)
      .set('Cookie', managerCookies);
    expect(costBRes.status).toBe(200);
    const empInB = costBRes.body.employees.find(
      (e: { employeeId: string }) => e.employeeId === empMultiCycleId,
    );
    expect(empInB).toBeDefined();
    expect(empInB.totalCost).toBe(150000);
  });

  it('10. Sửa amount tay chỉ cho khi DRAFT, bắt buộc có lý do và ghi AuditLog', async () => {
    // Tạo bản lương nháp thủ công
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/payrolls')
      .set('Cookie', accountantCookies)
      .send({
        employeeId: empDailyId,
        periodStart: '2026-11-01',
        periodEnd: '2026-11-30',
        amount: 500000,
      });

    expect(createRes.status).toBe(201);
    const payrollId = createRes.body.data.id;
    expect(createRes.body.data.status).toBe(PayrollStatus.DRAFT);

    // Thử sửa amount không có reason => 400/422
    const failUpdate = await request(app.getHttpServer())
      .patch(`/api/v1/payrolls/${payrollId}`)
      .set('Cookie', accountantCookies)
      .send({
        amount: 600000,
      });
    expect([400, 422]).toContain(failUpdate.status);

    // Sửa amount có lý do => thành công
    const successUpdate = await request(app.getHttpServer())
      .patch(`/api/v1/payrolls/${payrollId}`)
      .set('Cookie', accountantCookies)
      .send({
        amount: 600000,
        reason: 'Thưởng làm việc ngoài giờ đặc biệt',
      });
    expect(successUpdate.status).toBe(200);
    expect(Number(successUpdate.body.data.amount)).toBe(600000);

    // Kiểm tra AuditLog được ghi lại
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entity: 'payrolls',
        entityId: payrollId,
        action: 'UPDATE_AMOUNT',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditLog).toBeDefined();
    const diff = auditLog?.diff as Record<string, unknown>;
    expect(diff?.reason).toBe('Thưởng làm việc ngoài giờ đặc biệt');
    expect(diff?.oldAmount).toBe(500000);
    expect(diff?.newAmount).toBe(600000);

    // Duyệt bảng lương
    await request(app.getHttpServer())
      .post(`/api/v1/payrolls/${payrollId}/approve`)
      .set('Cookie', accountantCookies);

    // Thử sửa bảng lương khi đã APPROVED => 422
    const approvedUpdate = await request(app.getHttpServer())
      .patch(`/api/v1/payrolls/${payrollId}`)
      .set('Cookie', accountantCookies)
      .send({
        amount: 700000,
        reason: 'Cố sửa sau khi duyệt',
      });
    expect(approvedUpdate.status).toBe(422);
  });

  it('11. Bản lương mới LUÔN là DRAFT (POST/PATCH với status PAID không thể vượt quyền duyệt)', async () => {
    // Gửi POST tạo bảng lương kèm status: 'PAID'
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/payrolls')
      .set('Cookie', accountantCookies)
      .send({
        employeeId: empPieceId,
        periodStart: '2026-12-01',
        periodEnd: '2026-12-31',
        amount: 400000,
        status: PayrollStatus.PAID,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe(PayrollStatus.DRAFT);
    const payrollId = createRes.body.data.id;

    // Gửi PATCH thử chuyển status sang PAID trực tiếp
    const patchRes = await request(app.getHttpServer())
      .patch(`/api/v1/payrolls/${payrollId}`)
      .set('Cookie', accountantCookies)
      .send({
        status: PayrollStatus.PAID,
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.status).toBe(PayrollStatus.DRAFT);
  });

  it('12. MONTHLY lẻ ngày và lẻ tỷ lệ luôn có tổng amount bằng tổng details (không lệch đồng nào)', async () => {
    const empOddMonthly = await prisma.employee.create({
      data: {
        code: 'EMP-ODD-MONTHLY',
        fullName: 'Phạm Lẻ Tiền',
        position: 'Kỹ thuật viên',
        payType: PayType.MONTHLY,
        baseRate: new Prisma.Decimal('10000000'), // 10.000.000đ / 26 ngày = 384.615,38đ/ngày
        isActive: true,
      },
    });

    // Chấm công 7 ngày
    for (let day = 1; day <= 7; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      await prisma.attendance.create({
        data: {
          employeeId: empOddMonthly.id,
          date: new Date(`2026-10-${dayStr}T00:00:00Z`),
          hours: new Prisma.Decimal('8.00'),
          notes: `Ngày ${day}`,
        },
      });
    }

    const genRes = await request(app.getHttpServer())
      .post('/api/v1/payrolls/generate')
      .set('Cookie', accountantCookies)
      .send({
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        employeeIds: [empOddMonthly.id],
      });

    expect(genRes.status).toBe(201);
    const payroll = genRes.body.data[0];
    // 10.000.000 * 7 / 26 = 2.692.307,69... làm tròn HALF_UP => 2.692.308đ
    expect(Number(payroll.amount)).toBe(2692308);
    expect(payroll.details).toHaveLength(7);

    // Tổng details đúng bằng 2.692.308đ
    const totalDetailAmount = payroll.details.reduce(
      (sum: number, line: { amount: number }) => sum + line.amount,
      0,
    );
    expect(totalDetailAmount).toBe(2692308);
    expect(totalDetailAmount).toBe(Number(payroll.amount));
  });

  it('13. Kỳ có 1 bảng lương APPROVED + 1 nhân viên mới: generate thành công, bảng APPROVED không đổi, nhân viên mới có DRAFT đúng tiền', async () => {
    const periodStart = '2027-01-01';
    const periodEnd = '2027-01-31';

    // Tạo nhân viên 1: đã có bảng lương APPROVED
    const empApproved = await prisma.employee.create({
      data: {
        code: 'EMP-APP-TEST-13',
        fullName: 'Nguyễn Văn Đã Duyệt',
        position: 'Công nhân',
        payType: PayType.DAILY,
        baseRate: new Prisma.Decimal('400000'),
        isActive: true,
      },
    });

    await prisma.attendance.create({
      data: {
        employeeId: empApproved.id,
        date: new Date('2027-01-05T00:00:00Z'),
        hours: new Prisma.Decimal('8.00'),
        notes: 'Công nhân 1 làm 1 ngày',
      },
    });

    // Tạo bảng lương DRAFT cho empApproved
    const genRes1 = await request(app.getHttpServer())
      .post('/api/v1/payrolls/generate')
      .set('Cookie', accountantCookies)
      .send({
        periodStart,
        periodEnd,
        employeeIds: [empApproved.id],
      });
    expect(genRes1.status).toBe(201);
    const approvedPayrollId = genRes1.body.data[0].id;

    // Duyệt bảng lương của empApproved -> APPROVED
    const appRes = await request(app.getHttpServer())
      .post(`/api/v1/payrolls/${approvedPayrollId}/approve`)
      .set('Cookie', accountantCookies);
    expect(appRes.status).toBe(201);
    expect(appRes.body.data.status).toBe(PayrollStatus.APPROVED);

    const approvedPayrollBefore = await prisma.payroll.findUnique({
      where: { id: approvedPayrollId },
    });

    // Tạo nhân viên 2: nhân viên mới trong cùng kỳ
    const empNew = await prisma.employee.create({
      data: {
        code: 'EMP-NEW-TEST-13',
        fullName: 'Trần Văn Mới',
        position: 'Công nhân mới',
        payType: PayType.DAILY,
        baseRate: new Prisma.Decimal('350000'),
        isActive: true,
      },
    });

    // Chấm công 2 ngày cho empNew (2 x 350.000 = 700.000)
    for (const day of ['2027-01-06', '2027-01-07']) {
      await prisma.attendance.create({
        data: {
          employeeId: empNew.id,
          date: new Date(`${day}T00:00:00Z`),
          hours: new Prisma.Decimal('8.00'),
          notes: `Chấm công ngày ${day}`,
        },
      });
    }

    // Generate cho cả 2 nhân viên (truyền employeeIds: [empApproved.id, empNew.id])
    const genRes2 = await request(app.getHttpServer())
      .post('/api/v1/payrolls/generate')
      .set('Cookie', accountantCookies)
      .send({
        periodStart,
        periodEnd,
        employeeIds: [empApproved.id, empNew.id],
      });

    expect(genRes2.status).toBe(201);
    expect(genRes2.body.data).toHaveLength(1);
    expect(genRes2.body.data[0].employeeId).toBe(empNew.id);
    expect(genRes2.body.data[0].status).toBe(PayrollStatus.DRAFT);
    expect(Number(genRes2.body.data[0].amount)).toBe(700000);
    expect(genRes2.body.skipped).toHaveLength(1);
    expect(genRes2.body.skipped[0].id).toBe(approvedPayrollId);

    // Bảng lương APPROVED giữ nguyên, không bị đổi hay tạo đè
    const approvedPayrollAfter = await prisma.payroll.findUnique({
      where: { id: approvedPayrollId },
    });
    expect(approvedPayrollAfter?.status).toBe(PayrollStatus.APPROVED);
    expect(Number(approvedPayrollAfter?.amount)).toBe(Number(approvedPayrollBefore?.amount));
    expect(approvedPayrollAfter?.approvedById).toBe(approvedPayrollBefore?.approvedById);
    expect(approvedPayrollAfter?.updatedAt.getTime()).toBe(
      approvedPayrollBefore?.updatedAt.getTime(),
    );

    // Thử generate chỉ định riêng [empApproved.id] -> vẫn ném 422 vì tất cả nhân viên chỉ định đều đã khóa
    const reGenLockedRes = await request(app.getHttpServer())
      .post('/api/v1/payrolls/generate')
      .set('Cookie', accountantCookies)
      .send({
        periodStart,
        periodEnd,
        employeeIds: [empApproved.id],
      });
    expect(reGenLockedRes.status).toBe(422);
  });
});
