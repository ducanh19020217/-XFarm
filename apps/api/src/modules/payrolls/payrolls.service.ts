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

    const isExplicitEmployeeList = Boolean(dto.employeeIds && dto.employeeIds.length > 0);
    const whereEmployee = isExplicitEmployeeList
      ? { id: { in: dto.employeeIds } }
      : { isActive: true };

    const employees = await prisma.employee.findMany({
      where: whereEmployee,
      orderBy: { code: 'asc' },
    });

    if (employees.length === 0) {
      return {
        data: [],
        skipped: [],
        skippedCount: 0,
      };
    }

    return prisma.$transaction(async (tx) => {
      const existingPayrolls = await tx.payroll.findMany({
        where: {
          employeeId: { in: employees.map((e) => e.id) },
          periodStart: start,
          periodEnd: end,
        },
        include: payrollInclude,
      });

      const skipped = existingPayrolls.filter(
        (p) => p.status === PayrollStatus.APPROVED || p.status === PayrollStatus.PAID,
      );
      const lockedEmployeeIds = new Set(skipped.map((p) => p.employeeId));

      if (
        isExplicitEmployeeList &&
        employees.length > 0 &&
        employees.every((e) => lockedEmployeeIds.has(e.id))
      ) {
        throw new UnprocessableEntityException(
          'Bảng lương trong kỳ đã được phê duyệt hoặc thanh toán, không thể tạo đè',
        );
      }

      const employeesToProcess = employees.filter((e) => !lockedEmployeeIds.has(e.id));
      const results = [];

      for (const emp of employeesToProcess) {
        const attendances = await tx.attendance.findMany({
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
        dailyDayWork?: number;
        amount: number;
      }> = [];

      let totalAmountDecimal = new Prisma.Decimal(0);

      if (emp.payType === PayType.PIECE) {
        for (const att of attendances) {
          const hours = att.hours != null ? Number(att.hours) : 0;
          const pieceQtyDec =
            att.pieceQty != null ? new Prisma.Decimal(att.pieceQty) : new Prisma.Decimal(0);
          const lineAmount = pieceQtyDec
            .mul(emp.baseRate)
            .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
          totalAmountDecimal = totalAmountDecimal.add(lineAmount);
          lines.push({
            date: att.date.toISOString().split('T')[0],
            hours,
            cycleId: att.cycleId ?? null,
            cycle: att.cycle?.name ?? null,
            pieceQty: att.pieceQty != null ? Number(att.pieceQty) : null,
            amount: lineAmount.toNumber(),
          });
        }
      } else if (emp.payType === PayType.DAILY) {
        // Group attendances by date to avoid duplicate dayWork across cycles
        const dateMap = new Map<string, typeof attendances>();
        for (const att of attendances) {
          const dStr = att.date.toISOString().split('T')[0];
          const list = dateMap.get(dStr) ?? [];
          list.push(att);
          dateMap.set(dStr, list);
        }

        for (const [dStr, dayAtts] of dateMap.entries()) {
          const totalDayHours = dayAtts.reduce(
            (sum, a) => sum.add(a.hours ? new Prisma.Decimal(a.hours) : new Prisma.Decimal(0)),
            new Prisma.Decimal(0),
          );

          let totalDayWork = new Prisma.Decimal(0);
          if (totalDayHours.gte(4)) {
            totalDayWork = new Prisma.Decimal(1);
          } else if (totalDayHours.gt(0)) {
            totalDayWork = new Prisma.Decimal('0.5');
          }

          const dayCost = totalDayWork
            .mul(emp.baseRate)
            .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
          totalAmountDecimal = totalAmountDecimal.add(dayCost);

          if (dayAtts.length === 1) {
            const att = dayAtts[0];
            lines.push({
              date: dStr,
              hours: att.hours != null ? Number(att.hours) : 0,
              cycleId: att.cycleId ?? null,
              cycle: att.cycle?.name ?? null,
              pieceQty: att.pieceQty != null ? Number(att.pieceQty) : null,
              dayWork: totalDayWork.toNumber(),
              dailyDayWork: totalDayWork.toNumber(),
              amount: dayCost.toNumber(),
            });
          } else {
            let accumulatedLineCost = new Prisma.Decimal(0);
            let accumulatedLineWork = new Prisma.Decimal(0);

            for (let i = 0; i < dayAtts.length; i++) {
              const att = dayAtts[i];
              const isLast = i === dayAtts.length - 1;
              const lineHours = att.hours ? new Prisma.Decimal(att.hours) : new Prisma.Decimal(0);

              let lineDayWork: Prisma.Decimal;
              let lineCost: Prisma.Decimal;

              if (isLast) {
                lineDayWork = totalDayWork.sub(accumulatedLineWork);
                lineCost = dayCost.sub(accumulatedLineCost);
              } else {
                const ratio = totalDayHours.gt(0)
                  ? lineHours.div(totalDayHours)
                  : new Prisma.Decimal(1).div(dayAtts.length);
                lineDayWork = totalDayWork.mul(ratio);
                lineCost = dayCost.mul(ratio).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
                accumulatedLineWork = accumulatedLineWork.add(lineDayWork);
                accumulatedLineCost = accumulatedLineCost.add(lineCost);
              }

              lines.push({
                date: dStr,
                hours: lineHours.toNumber(),
                cycleId: att.cycleId ?? null,
                cycle: att.cycle?.name ?? null,
                pieceQty: att.pieceQty != null ? Number(att.pieceQty) : null,
                dayWork: lineDayWork.toNumber(),
                dailyDayWork: totalDayWork.toNumber(),
                amount: lineCost.toNumber(),
              });
            }
          }
        }
      } else if (emp.payType === PayType.MONTHLY) {
        // Group attendances by date
        const dateMap = new Map<string, typeof attendances>();
        for (const att of attendances) {
          const dStr = att.date.toISOString().split('T')[0];
          const list = dateMap.get(dStr) ?? [];
          list.push(att);
          dateMap.set(dStr, list);
        }

        let actualDays = new Prisma.Decimal(0);

        for (const [dStr, dayAtts] of dateMap.entries()) {
          const totalDayHours = dayAtts.reduce(
            (sum, a) => sum.add(a.hours ? new Prisma.Decimal(a.hours) : new Prisma.Decimal(0)),
            new Prisma.Decimal(0),
          );

          let totalDayWork = new Prisma.Decimal(0);
          if (totalDayHours.gte(4)) {
            totalDayWork = new Prisma.Decimal(1);
          } else if (totalDayHours.gt(0)) {
            totalDayWork = new Prisma.Decimal('0.5');
          }

          actualDays = actualDays.add(totalDayWork);

          if (dayAtts.length === 1) {
            const att = dayAtts[0];
            lines.push({
              date: dStr,
              hours: att.hours != null ? Number(att.hours) : 0,
              cycleId: att.cycleId ?? null,
              cycle: att.cycle?.name ?? null,
              pieceQty: att.pieceQty != null ? Number(att.pieceQty) : null,
              dayWork: totalDayWork.toNumber(),
              dailyDayWork: totalDayWork.toNumber(),
              amount: 0,
            });
          } else {
            let accumulatedLineWork = new Prisma.Decimal(0);
            for (let i = 0; i < dayAtts.length; i++) {
              const att = dayAtts[i];
              const isLast = i === dayAtts.length - 1;
              const lineHours = att.hours ? new Prisma.Decimal(att.hours) : new Prisma.Decimal(0);

              let lineDayWork: Prisma.Decimal;
              if (isLast) {
                lineDayWork = totalDayWork.sub(accumulatedLineWork);
              } else {
                const ratio = totalDayHours.gt(0)
                  ? lineHours.div(totalDayHours)
                  : new Prisma.Decimal(1).div(dayAtts.length);
                lineDayWork = totalDayWork.mul(ratio);
                accumulatedLineWork = accumulatedLineWork.add(lineDayWork);
              }

              lines.push({
                date: dStr,
                hours: lineHours.toNumber(),
                cycleId: att.cycleId ?? null,
                cycle: att.cycle?.name ?? null,
                pieceQty: att.pieceQty != null ? Number(att.pieceQty) : null,
                dayWork: lineDayWork.toNumber(),
                dailyDayWork: totalDayWork.toNumber(),
                amount: 0,
              });
            }
          }
        }

        totalAmountDecimal = emp.baseRate
          .mul(actualDays)
          .div(26)
          .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);

        // Allocate rounding remainder to the last line to ensure exact consistency
        if (lines.length > 0) {
          let accumulatedLineAmount = new Prisma.Decimal(0);
          for (let i = 0; i < lines.length - 1; i++) {
            const lineDayWork = new Prisma.Decimal(lines[i].dayWork ?? 0);
            const lineAmt = emp.baseRate
              .div(26)
              .mul(lineDayWork)
              .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
            accumulatedLineAmount = accumulatedLineAmount.add(lineAmt);
            lines[i].amount = lineAmt.toNumber();
          }
          const lastLineAmt = totalAmountDecimal.sub(accumulatedLineAmount);
          lines[lines.length - 1].amount = lastLineAmt.toNumber();
        }
      }

      const existing = existingPayrolls.find((p) => p.employeeId === emp.id);
      let saved;
      if (existing) {
        saved = await tx.payroll.update({
          where: { id: existing.id },
          data: {
            amount: totalAmountDecimal,
            details: lines,
            status: PayrollStatus.DRAFT,
          },
          include: payrollInclude,
        });
      } else {
        saved = await tx.payroll.create({
          data: {
            employeeId: emp.id,
            periodStart: start,
            periodEnd: end,
            amount: totalAmountDecimal,
            details: lines,
            status: PayrollStatus.DRAFT,
          },
          include: payrollInclude,
        });
      }
      results.push(saved);
    }

    return {
      data: results,
      skipped,
      skippedCount: skipped.length,
    };
  });
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
        status: PayrollStatus.DRAFT,
      },
      include: payrollInclude,
    });
  }

  async update(id: string, dto: UpdatePayrollDto, userId?: string) {
    const payroll = await this.findById(id);

    if (payroll.status !== PayrollStatus.DRAFT) {
      throw new UnprocessableEntityException(
        'Chỉ có thể chỉnh sửa bảng lương khi đang ở trạng thái nháp',
      );
    }

    if (dto.amount !== undefined) {
      if (!dto.reason || !dto.reason.trim()) {
        throw new UnprocessableEntityException('Cần cung cấp lý do khi điều chỉnh số tiền lương');
      }
    }

    const oldAmount = Number(payroll.amount);
    const newAmount = dto.amount !== undefined ? Number(dto.amount) : undefined;

    const updated = await prisma.payroll.update({
      where: { id },
      data: {
        amount: dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : undefined,
        details: dto.details !== undefined ? (dto.details as Prisma.InputJsonValue) : undefined,
      },
      include: payrollInclude,
    });

    if (userId && dto.amount !== undefined) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'UPDATE_AMOUNT',
          entity: 'payrolls',
          entityId: id,
          diff: {
            oldAmount,
            newAmount,
            reason: dto.reason,
          },
        },
      });
    }

    return updated;
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
