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
