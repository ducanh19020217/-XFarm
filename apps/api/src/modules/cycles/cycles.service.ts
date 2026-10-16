import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { prisma } from '@xfarm/db';
import type { Prisma } from '@xfarm/db';
import { canTransition, CycleStatus } from '@xfarm/shared';
import { SequenceService } from '../../common/sequence/sequence.service';
import { CreateCycleDto, QueryCycleDto, UpdateCycleDto } from './cycles.dto';

const cycleDetailInclude = {
  area: true,
  _count: { select: { activities: true } },
  activities: {
    select: { performedAt: true },
    orderBy: { performedAt: 'desc' as const },
    take: 1,
  },
};
type CycleWithDetails = Prisma.CycleGetPayload<{ include: typeof cycleDetailInclude }>;

@Injectable()
export class CyclesService {
  constructor(private readonly sequenceService: SequenceService) {}

  async findAll(query: QueryCycleDto) {
    const { page, pageSize } = query;
    const where: Record<string, unknown> = {};

    if (query.areaId) where.areaId = query.areaId;
    if (query.kind) where.kind = query.kind;
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.startDate = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { species: { contains: query.search, mode: 'insensitive' } },
        { variety: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy = this.parseSort(query.sort);
    const [data, total] = await Promise.all([
      prisma.cycle.findMany({
        where,
        include: cycleDetailInclude,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      prisma.cycle.count({ where }),
    ]);

    return {
      data: data.map((cycle) => this.present(cycle)),
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string) {
    const cycle = await prisma.cycle.findUnique({
      where: { id },
      include: cycleDetailInclude,
    });
    if (!cycle) throw new NotFoundException('Không tìm thấy mùa vụ');
    return this.present(cycle);
  }

  async create(dto: CreateCycleDto, createdById: string) {
    return prisma.$transaction(async (tx) => {
      const area = await tx.area.findUnique({ where: { id: dto.areaId } });
      if (!area || !area.isActive) {
        throw new UnprocessableEntityException('Khu/lô không tồn tại hoặc đã ngừng hoạt động');
      }

      const code = await this.sequenceService.nextInTransaction(tx, 'CY');
      return tx.cycle
        .create({
          data: {
            code,
            name: dto.name,
            kind: dto.kind,
            areaId: dto.areaId,
            species: dto.species,
            variety: dto.variety,
            startDate: dto.startDate,
            expectedEndDate: dto.expectedEndDate,
            status: CycleStatus.PLANNED,
            expectedYield: dto.expectedYield,
            yieldUnit: dto.yieldUnit,
            initialQuantity: dto.initialQuantity,
            notes: dto.notes,
            createdById,
          },
          include: cycleDetailInclude,
        })
        .then((cycle) => this.present(cycle));
    });
  }

  async update(id: string, dto: UpdateCycleDto) {
    await this.ensureExists(id);
    const cycle = await prisma.cycle.update({
      where: { id },
      data: dto,
      include: cycleDetailInclude,
    });
    return this.present(cycle);
  }

  async transition(id: string, to: CycleStatus, note?: string) {
    const cycle = await prisma.cycle.findUnique({ where: { id } });
    if (!cycle) throw new NotFoundException('Không tìm thấy mùa vụ');
    if (!canTransition(cycle.status as CycleStatus, to)) {
      throw new UnprocessableEntityException(
        `Không thể chuyển mùa vụ từ ${cycle.status} sang ${to}`,
      );
    }

    const result = await prisma.cycle.updateMany({
      where: { id, status: cycle.status },
      data: {
        status: to,
        ...(to === CycleStatus.CLOSED ? { endDate: new Date() } : {}),
        ...(note ? { notes: cycle.notes ? `${cycle.notes}\n${note}` : note } : {}),
      },
    });
    if (result.count === 0) {
      throw new ConflictException('Trạng thái mùa vụ vừa thay đổi, vui lòng tải lại');
    }

    const updated = await prisma.cycle.findUniqueOrThrow({
      where: { id },
      include: cycleDetailInclude,
    });
    return this.present(updated);
  }

  async getLaborCost(id: string) {
    const cycle = await prisma.cycle.findUnique({ where: { id } });
    if (!cycle) {
      throw new NotFoundException('Không tìm thấy mùa vụ');
    }

    const attendances = await prisma.attendance.findMany({
      where: { cycleId: id },
      include: {
        employee: true,
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    });

    const employeeMap = new Map<
      string,
      {
        employeeId: string;
        employeeCode: string;
        employeeName: string;
        fullName: string;
        payType: string;
        baseRate: number;
        totalHours: number;
        totalDays: number;
        totalPieceQty: number;
        totalCost: number;
        amount: number;
        laborCost: number;
        attendances: Array<{
          date: string;
          hours: number;
          pieceQty: number | null;
          amount: number;
          notes?: string | null;
        }>;
        details: Array<{
          date: string;
          hours: number;
          pieceQty: number | null;
          amount: number;
          notes?: string | null;
        }>;
      }
    >();

    for (const att of attendances) {
      const emp = att.employee;
      let empData = employeeMap.get(emp.id);
      if (!empData) {
        empData = {
          employeeId: emp.id,
          employeeCode: emp.code,
          employeeName: emp.fullName,
          fullName: emp.fullName,
          payType: emp.payType,
          baseRate: Number(emp.baseRate),
          totalHours: 0,
          totalDays: 0,
          totalPieceQty: 0,
          totalCost: 0,
          amount: 0,
          laborCost: 0,
          attendances: [],
          details: [],
        };
        employeeMap.set(emp.id, empData);
      }

      const hours = Number(att.hours ?? 0);
      const pieceQty = att.pieceQty != null ? Number(att.pieceQty) : null;
      let lineCost = 0;
      let dayWork = 0;

      if (emp.payType === 'DAILY') {
        dayWork = hours >= 4 ? 1 : 0.5;
        lineCost = Math.round(dayWork * Number(emp.baseRate));
        empData.totalDays += dayWork;
      } else if (emp.payType === 'PIECE') {
        lineCost = Math.round(Number(pieceQty ?? 0) * Number(emp.baseRate));
        empData.totalPieceQty += Number(pieceQty ?? 0);
      } else if (emp.payType === 'MONTHLY') {
        dayWork = hours >= 4 ? 1 : 0.5;
        const dailyRate = Number(emp.baseRate) / 26;
        lineCost = Math.round(dayWork * dailyRate);
        empData.totalDays += dayWork;
      }

      empData.totalHours += hours;
      empData.totalCost += lineCost;
      empData.amount += lineCost;
      empData.laborCost += lineCost;

      const detailLine = {
        date: att.date.toISOString().split('T')[0],
        hours,
        pieceQty,
        amount: lineCost,
        notes: att.notes ?? null,
      };
      empData.attendances.push(detailLine);
      empData.details.push(detailLine);
    }

    const employees = Array.from(employeeMap.values());
    const totalLaborCost = employees.reduce((sum, e) => sum + e.totalCost, 0);

    return {
      cycleId: id,
      cycleCode: cycle.code,
      cycleName: cycle.name,
      total: totalLaborCost,
      totalLaborCost,
      amount: totalLaborCost,
      employees,
      byEmployee: employees,
      details: employees,
    };
  }

  private async ensureExists(id: string) {
    const cycle = await prisma.cycle.findUnique({ where: { id } });
    if (!cycle) throw new NotFoundException('Không tìm thấy mùa vụ');
  }

  private parseSort(sort?: string): Prisma.CycleOrderByWithRelationInput[] {
    const field = sort?.split(':')[0];
    const direction = sort?.split(':')[1];
    const primary =
      field &&
      ['code', 'name', 'startDate', 'expectedEndDate', 'status', 'createdAt'].includes(field)
        ? field
        : 'startDate';
    const primaryDirection = direction === 'asc' ? 'asc' : 'desc';

    if (primary === 'createdAt') {
      return [
        { createdAt: primaryDirection as Prisma.SortOrder },
        { id: primaryDirection as Prisma.SortOrder },
      ];
    }

    return [
      { [primary]: primaryDirection as Prisma.SortOrder },
      { createdAt: 'desc' },
      { id: 'desc' },
    ];
  }

  private present(cycle: CycleWithDetails) {
    const { activities, _count, ...data } = cycle;
    return {
      ...data,
      activityCount: _count.activities,
      latestActivityAt: activities[0]?.performedAt ?? null,
    };
  }
}
