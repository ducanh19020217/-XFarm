import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { PayrollStatus, PayType } from '@xfarm/shared';
import {
  CreatePayrollDto,
  GeneratePayrollDto,
  QueryPayrollDto,
  UpdatePayrollDto,
} from './payrolls.dto';
import { PayrollPaidEvent, payrollEvents } from './events/payroll-paid.event';

function toDateOnly(val: Date | string): Date {
  if (typeof val === 'string') {
    const s = val.split('T')[0];
    const [y, m, d] = s.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  return new Date(Date.UTC(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate()));
}

const payrollInclude = {
  employee: true,
  approvedBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  },
};

@Injectable()
export class PayrollsService {
  async generate(dto: GeneratePayrollDto) {
    const start = toDateOnly(dto.periodStart);
    const end = toDateOnly(dto.periodEnd);

    const whereEmployee =
      dto.employeeIds && dto.employeeIds.length > 0
        ? { id: { in: dto.employeeIds } }
        : { isActive: true };

    const employees = await prisma.employee.findMany({
      where: whereEmployee,
      orderBy: { code: 'asc' },
    });

    if (employees.length === 0) {
      return [];
    }

    const existingPayrolls = await prisma.payroll.findMany({
      where: {
        employeeId: { in: employees.map((e) => e.id) },
        periodStart: start,
        periodEnd: end,
      },
    });

    const approved = existingPayrolls.find(
      (p) => p.status === PayrollStatus.APPROVED || p.status === PayrollStatus.PAID,
    );
    if (approved) {
      throw new UnprocessableEntityException(
        'Bảng lương trong kỳ đã được phê duyệt hoặc thanh toán, không thể tạo đè',
      );
    }

    const results = [];

    for (const emp of employees) {
      const attendances = await prisma.attendance.findMany({
        where: {
          employeeId: emp.id,
          date: {
            gte: start,
            lte: end,
          },
        },
        include: {
          cycle: {
            select: { id: true, code: true, name: true },
          },
        },
        orderBy: [{ date: 'asc' }, { id: 'asc' }],
      });

      const lines: Array<{
        date: string;
        hours: number;
        cycleId: string | null;
        cycle?: string | null;
        pieceQty: number | null;
        dayWork?: number;
        amount: number;
      }> = [];

      let totalAmount = 0;

      if (emp.payType === PayType.DAILY) {
        for (const att of attendances) {
          const hours = Number(att.hours ?? 0);
          const dayWork = hours >= 4 ? 1 : 0.5;
          const lineAmount = Math.round(dayWork * Number(emp.baseRate));
          totalAmount += lineAmount;
          lines.push({
            date: att.date.toISOString().split('T')[0],
            hours,
            cycleId: att.cycleId ?? null,
            cycle: att.cycle?.name ?? null,
            pieceQty: att.pieceQty != null ? Number(att.pieceQty) : null,
            dayWork,
            amount: lineAmount,
          });
        }
      } else if (emp.payType === PayType.PIECE) {
        for (const att of attendances) {
          const hours = Number(att.hours ?? 0);
          const pieceQty = att.pieceQty != null ? Number(att.pieceQty) : 0;
          const lineAmount = Math.round(pieceQty * Number(emp.baseRate));
          totalAmount += lineAmount;
          lines.push({
            date: att.date.toISOString().split('T')[0],
            hours,
            cycleId: att.cycleId ?? null,
            cycle: att.cycle?.name ?? null,
            pieceQty,
            amount: lineAmount,
          });
        }
      } else if (emp.payType === PayType.MONTHLY) {
        let actualDays = 0;
        const dailyRate = Number(emp.baseRate) / 26;
        for (const att of attendances) {
          const hours = Number(att.hours ?? 0);
          const dayWork = hours >= 4 ? 1 : 0.5;
          actualDays += dayWork;
          const lineAmount = Math.round(dayWork * dailyRate);
          lines.push({
            date: att.date.toISOString().split('T')[0],
            hours,
            cycleId: att.cycleId ?? null,
            cycle: att.cycle?.name ?? null,
            pieceQty: att.pieceQty != null ? Number(att.pieceQty) : null,
            dayWork,
            amount: lineAmount,
          });
        }
        totalAmount = Math.round(Number(emp.baseRate) * (actualDays / 26));
      }

      const existing = existingPayrolls.find((p) => p.employeeId === emp.id);
      let saved;
      if (existing) {
        saved = await prisma.payroll.update({
          where: { id: existing.id },
          data: {
            amount: new Prisma.Decimal(totalAmount),
            details: lines,
            status: PayrollStatus.DRAFT,
          },
          include: payrollInclude,
        });
      } else {
        saved = await prisma.payroll.create({
          data: {
            employeeId: emp.id,
            periodStart: start,
            periodEnd: end,
            amount: new Prisma.Decimal(totalAmount),
            details: lines,
            status: PayrollStatus.DRAFT,
          },
          include: payrollInclude,
        });
      }
      results.push(saved);
    }

    return results;
  }

  async findAll(query: QueryPayrollDto) {
    const { page, pageSize, search, sort, status, employeeId, periodStart, periodEnd, period } =
      query;

    const where: Prisma.PayrollWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (periodStart || periodEnd) {
      where.periodStart = periodStart ? { gte: toDateOnly(periodStart) } : undefined;
      where.periodEnd = periodEnd ? { lte: toDateOnly(periodEnd) } : undefined;
    } else if (period) {
      const match = period.match(/^(\d{4})-(\d{2})$/);
      if (match) {
        const year = Number(match[1]);
        const month = Number(match[2]);
        const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
        const endOfMonth = new Date(Date.UTC(year, month, 0));
        where.periodStart = { gte: startOfMonth, lte: endOfMonth };
      } else {
        const pDate = toDateOnly(period);
        where.periodStart = { lte: pDate };
        where.periodEnd = { gte: pDate };
      }
    }

    if (search) {
      where.employee = {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const orderBy = this.parseSort(sort);

    const [data, total] = await Promise.all([
      prisma.payroll.findMany({
        where,
        include: payrollInclude,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      prisma.payroll.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string) {
    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: payrollInclude,
    });
    if (!payroll) {
      throw new NotFoundException('Không tìm thấy bảng lương');
    }
    return payroll;
  }

  async approve(id: string, userId: string) {
    const payroll = await this.findById(id);

    if (payroll.status !== PayrollStatus.DRAFT) {
      throw new UnprocessableEntityException('Bảng lương đã được duyệt hoặc đã thanh toán');
    }

    return prisma.payroll.update({
      where: { id },
      data: {
        status: PayrollStatus.APPROVED,
        approvedById: userId,
        approvedAt: new Date(),
      },
      include: payrollInclude,
    });
  }

  async pay(id: string, _userId: string) {
    const payroll = await this.findById(id);

    if (payroll.status === PayrollStatus.DRAFT) {
      throw new UnprocessableEntityException('Bảng lương phải được duyệt trước khi thanh toán');
    }
    if (payroll.status === PayrollStatus.PAID) {
      throw new UnprocessableEntityException('Bảng lương đã được thanh toán');
    }

    const paidAt = new Date();
    const updated = await prisma.payroll.update({
      where: { id },
      data: {
        status: PayrollStatus.PAID,
        paidAt,
      },
      include: payrollInclude,
    });

    payrollEvents.emit(
      'payroll.paid',
      new PayrollPaidEvent(
        updated.id,
        updated.employeeId,
        Number(updated.amount),
        updated.periodStart,
        updated.periodEnd,
        paidAt,
      ),
    );

    return updated;
  }

  async create(dto: CreatePayrollDto) {
    const employee = await prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    const start = toDateOnly(dto.periodStart);
    const end = toDateOnly(dto.periodEnd);

    const existing = await prisma.payroll.findUnique({
      where: {
        employeeId_periodStart_periodEnd: {
          employeeId: dto.employeeId,
          periodStart: start,
          periodEnd: end,
        },
      },
    });

    if (existing) {
      throw new UnprocessableEntityException('Bảng lương cho nhân viên trong kỳ này đã tồn tại');
    }

    return prisma.payroll.create({
      data: {
        employeeId: dto.employeeId,
        periodStart: start,
        periodEnd: end,
        amount: new Prisma.Decimal(dto.amount),
        details: (dto.details as Prisma.InputJsonValue) ?? [],
        status: dto.status ?? PayrollStatus.DRAFT,
      },
      include: payrollInclude,
    });
  }

  async update(id: string, dto: UpdatePayrollDto) {
    const payroll = await this.findById(id);

    if (payroll.status !== PayrollStatus.DRAFT) {
      throw new UnprocessableEntityException(
        'Chỉ có thể chỉnh sửa bảng lương khi đang ở trạng thái nháp',
      );
    }

    return prisma.payroll.update({
      where: { id },
      data: {
        amount: dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : undefined,
        details: dto.details !== undefined ? (dto.details as Prisma.InputJsonValue) : undefined,
        status: dto.status,
      },
      include: payrollInclude,
    });
  }

  async remove(id: string) {
    const payroll = await this.findById(id);

    if (payroll.status !== PayrollStatus.DRAFT) {
      throw new UnprocessableEntityException(
        'Chỉ có thể xóa bảng lương khi đang ở trạng thái nháp',
      );
    }

    await prisma.payroll.delete({ where: { id } });
    return { success: true };
  }

  private parseSort(sort?: string): Prisma.PayrollOrderByWithRelationInput[] {
    const field = sort?.split(':')[0];
    const direction = sort?.split(':')[1] === 'asc' ? 'asc' : 'desc';

    if (field && ['amount', 'periodStart', 'periodEnd', 'createdAt', 'status'].includes(field)) {
      return [{ [field]: direction }, { id: 'desc' }];
    }

    return [{ periodStart: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }];
  }
}
