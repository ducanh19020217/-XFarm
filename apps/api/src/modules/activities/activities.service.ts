import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ActivityType, Role } from '@xfarm/shared';
import { parseActivityData } from '@xfarm/shared';
import { prisma } from '@xfarm/db';
import type { Prisma } from '@xfarm/db';
import { InventoryService } from '../inventory/inventory.service';
import { CreateActivityDto, QueryActivityDto, UpdateActivityDto } from './activities.dto';

const PREPARATION_TYPES = new Set<ActivityType>([
  ActivityType.SOWING,
  ActivityType.PLANTING,
  ActivityType.STOCKING,
  ActivityType.CLEANING,
  ActivityType.OTHER,
]);

type ActivityWithRelations = Prisma.ActivityGetPayload<{
  include: {
    performedBy: { select: { id: true; fullName: true; email: true } };
    area: true;
    cycle: { select: { id: true; code: true; name: true; areaId: true; status: true } };
    materials: {
      include: {
        item: { select: { id: true; name: true; unit: true } };
        stockLot: { select: { id: true; lotCode: true } };
      };
    };
  };
}>;

type ActivityWithMedia = ActivityWithRelations & { media: Prisma.MediaGetPayload<{}>[] };

@Injectable()
export class ActivitiesService {
  constructor(private readonly inventoryService: InventoryService) {}

  private async mediaForIds(mediaIds: string[]) {
    if (mediaIds.length === 0) return [];
    const media = await prisma.media.findMany({
      where: { id: { in: mediaIds } },
      orderBy: { createdAt: 'asc' },
    });
    if (media.length !== new Set(mediaIds).size) {
      throw new BadRequestException('Một hoặc nhiều tệp đính kèm không tồn tại');
    }
    return media;
  }

  private async isAreaWithin(areaId: string, parentAreaId: string) {
    let currentId: string | null = areaId;
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      if (currentId === parentAreaId) return true;
      visited.add(currentId);
      const area: { parentId: string | null } | null = await prisma.area.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
      currentId = area?.parentId ?? null;
    }
    return false;
  }

  private async validateContext(
    areaId: string,
    cycleId: string | null | undefined,
    type: ActivityType,
  ) {
    const area = await prisma.area.findUnique({ where: { id: areaId } });
    if (!area) throw new BadRequestException('Khu/lô không tồn tại');

    if (!cycleId) return { area, cycle: null };
    const cycle = await prisma.cycle.findUnique({ where: { id: cycleId } });
    if (!cycle) throw new BadRequestException('Mùa vụ không tồn tại');
    if (cycle.status === 'CLOSED' || cycle.status === 'CANCELLED') {
      throw new UnprocessableEntityException('Mùa vụ đã đóng, không thể ghi nhật ký');
    }
    if (cycle.status === 'PLANNED' && !PREPARATION_TYPES.has(type)) {
      throw new UnprocessableEntityException('Mùa vụ chưa bắt đầu, chỉ được ghi nhật ký chuẩn bị');
    }
    if (!(await this.isAreaWithin(areaId, cycle.areaId))) {
      throw new BadRequestException('Khu/lô của nhật ký phải thuộc khu/lô của mùa vụ');
    }
    return { area, cycle };
  }

  private async withMedia(activities: ActivityWithRelations[]): Promise<ActivityWithMedia[]> {
    const mediaIds = [...new Set(activities.flatMap((activity) => activity.mediaIds))];
    const media = mediaIds.length
      ? await prisma.media.findMany({ where: { id: { in: mediaIds } } })
      : [];
    const mediaById = new Map(media.map((item) => [item.id, item]));
    return activities.map((activity) => ({
      ...activity,
      media: activity.mediaIds.flatMap((mediaId) => {
        const item = mediaById.get(mediaId);
        return item ? [item] : [];
      }),
    }));
  }

  private async resolvePerformedById(
    dtoPerformedById: string | null | undefined,
    userId: string,
    role: string,
  ) {
    if (role === Role.OWNER || role === Role.MANAGER) {
      if (!dtoPerformedById) return userId;
      const user = await prisma.user.findFirst({
        where: { id: dtoPerformedById, isActive: true },
        select: { id: true },
      });
      if (!user)
        throw new BadRequestException('Người ghi nhật ký không tồn tại hoặc đã bị vô hiệu hóa');
      return dtoPerformedById;
    }
    return userId;
  }

  private async areaAncestors(tx: Prisma.TransactionClient, areaId: string) {
    const ids: string[] = [];
    let currentId: string | null = areaId;
    while (currentId && !ids.includes(currentId)) {
      ids.push(currentId);
      const area = await tx.area.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
      currentId = area?.parentId ?? null;
    }
    return ids;
  }

  private async resolveWarehouse(
    tx: Prisma.TransactionClient,
    areaId: string,
    warehouseId?: string,
  ) {
    if (warehouseId) {
      const warehouse = await tx.warehouse.findUnique({ where: { id: warehouseId } });
      if (!warehouse) throw new BadRequestException('Kho không tồn tại');
      return warehouse;
    }

    const areaIds = await this.areaAncestors(tx, areaId);
    const warehouse = await tx.warehouse.findFirst({
      where: { areaId: { in: areaIds } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return (
      warehouse ??
      (await tx.warehouse.findFirst({
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }))
    );
  }

  private async issueMaterials(
    tx: Prisma.TransactionClient,
    activityId: string,
    areaId: string,
    materials: NonNullable<CreateActivityDto['materials']> | undefined,
    userId: string,
    movedAt: Date,
  ) {
    if (!materials?.length) return;
    for (const material of materials) {
      const warehouse = await this.resolveWarehouse(tx, areaId, material.warehouseId);
      if (!warehouse) throw new UnprocessableEntityException('Chưa có kho để xuất vật tư');
      const issued = await this.inventoryService.issueFifo(tx, {
        itemId: material.itemId,
        warehouseId: warehouse.id,
        quantity: material.quantity,
        refType: 'ACTIVITY',
        refId: activityId,
        movedAt,
      });
      await tx.activityMaterial.createMany({
        data: issued.lots.map((lot) => ({
          activityId,
          itemId: material.itemId,
          stockLotId: lot.stockLotId,
          quantity: lot.quantity,
          unitCost: lot.unitCost,
          createdById: userId,
        })),
      });
    }
  }

  async create(dto: CreateActivityDto, userId: string, role: string) {
    const data = parseActivityData(dto.type, dto.data);
    await this.mediaForIds(dto.mediaIds);
    await this.validateContext(dto.areaId, dto.cycleId, dto.type);
    const performedById = await this.resolvePerformedById(dto.performedById, userId, role);

    const activity = await prisma.$transaction(async (tx) => {
      const created = await tx.activity.create({
        data: {
          cycleId: dto.cycleId ?? null,
          areaId: dto.areaId,
          type: dto.type,
          performedAt: dto.performedAt,
          performedById,
          quantity: dto.quantity ?? null,
          unit: dto.unit ?? null,
          data: data as Prisma.InputJsonValue,
          notes: dto.notes ?? null,
          mediaIds: dto.mediaIds,
          createdById: userId,
        },
      });
      await this.issueMaterials(
        tx,
        created.id,
        created.areaId,
        dto.materials,
        userId,
        created.performedAt,
      );
      return tx.activity.findUniqueOrThrow({
        where: { id: created.id },
        include: this.activityInclude,
      });
    });
    return (await this.withMedia([activity]))[0];
  }

  private readonly activityInclude = {
    performedBy: { select: { id: true, fullName: true, email: true } },
    area: true,
    cycle: { select: { id: true, code: true, name: true, areaId: true, status: true } },
    materials: {
      include: {
        item: { select: { id: true, name: true, unit: true } },
        stockLot: { select: { id: true, lotCode: true } },
      },
      orderBy: { createdAt: 'asc' as const },
    },
  } satisfies Prisma.ActivityInclude;

  private whereForUser(
    query: QueryActivityDto,
    userId: string,
    role: string,
  ): Prisma.ActivityWhereInput {
    const where: Prisma.ActivityWhereInput = {};
    if (query.cycleId) where.cycleId = query.cycleId;
    if (query.areaId) where.areaId = query.areaId;
    if (query.type) where.type = query.type;
    if (query.performedById) where.performedById = query.performedById;
    if (role === Role.WORKER) where.performedById = userId;
    const from = query.from ?? query.startDate;
    const to = query.to ?? query.endDate;
    if (from || to)
      where.performedAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    return where;
  }

  async findAll(query: QueryActivityDto, userId: string, role: string) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where = this.whereForUser(query, userId, role);
    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: this.activityInclude,
        orderBy: { performedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.activity.count({ where }),
    ]);
    return { data: await this.withMedia(activities), total, page, pageSize };
  }

  async findOne(id: string, userId: string, role: string) {
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: this.activityInclude,
    });
    if (!activity) throw new NotFoundException('Không tìm thấy nhật ký');
    if (role === Role.WORKER && activity.performedById !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem nhật ký này');
    }
    return (await this.withMedia([activity]))[0];
  }

  async timeline(cycleId: string, userId: string, role: string) {
    const cycle = await prisma.cycle.findUnique({ where: { id: cycleId } });
    if (!cycle) throw new NotFoundException('Không tìm thấy mùa vụ');
    const where: Prisma.ActivityWhereInput = { cycleId };
    if (role === Role.WORKER) where.performedById = userId;
    const activities = await prisma.activity.findMany({
      where,
      include: this.activityInclude,
      orderBy: { performedAt: 'desc' },
    });
    return this.withMedia(activities);
  }

  async update(id: string, dto: UpdateActivityDto, userId: string, role: string) {
    const existing = await prisma.activity.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy nhật ký');
    const manager = role === Role.OWNER || role === Role.MANAGER;
    if (
      !manager &&
      (existing.createdById !== userId ||
        Date.now() - existing.createdAt.getTime() > 24 * 60 * 60 * 1000)
    ) {
      throw new ForbiddenException('Bạn không có quyền sửa nhật ký này');
    }
    const areaId = dto.areaId ?? existing.areaId;
    const cycleId = dto.cycleId === undefined ? existing.cycleId : dto.cycleId;
    const type = (dto.type ?? existing.type) as ActivityType;
    await this.validateContext(areaId, cycleId, type);
    const mediaIds = dto.mediaIds ?? existing.mediaIds;
    await this.mediaForIds(mediaIds);
    const data = dto.data === undefined ? existing.data : parseActivityData(type, dto.data);
    const activity = await prisma.$transaction(async (tx) => {
      if (dto.materials !== undefined) {
        await this.inventoryService.reverseByRef(tx, 'ACTIVITY', id);
        await tx.activityMaterial.deleteMany({ where: { activityId: id } });
      }
      await tx.activity.update({
        where: { id },
        data: {
          cycleId,
          areaId,
          type,
          performedAt: dto.performedAt,
          quantity: dto.quantity,
          unit: dto.unit,
          data: data as Prisma.InputJsonValue,
          notes: dto.notes,
          mediaIds,
        },
      });
      await this.issueMaterials(
        tx,
        id,
        areaId,
        dto.materials,
        userId,
        dto.performedAt ?? existing.performedAt,
      );
      return tx.activity.findUniqueOrThrow({ where: { id }, include: this.activityInclude });
    });
    return (await this.withMedia([activity]))[0];
  }

  async remove(id: string, role: string) {
    if (role !== Role.OWNER && role !== Role.MANAGER) {
      throw new ForbiddenException('Bạn không có quyền xóa nhật ký');
    }
    const activity = await prisma.activity.findUnique({ where: { id }, include: { cycle: true } });
    if (!activity) throw new NotFoundException('Không tìm thấy nhật ký');
    if (activity.cycle?.status === 'CLOSED') {
      throw new ConflictException('Không thể xóa nhật ký của mùa vụ đã đóng');
    }
    await prisma.$transaction(async (tx) => {
      await this.inventoryService.reverseByRef(tx, 'ACTIVITY', id);
      await tx.activity.delete({ where: { id } });
    });
    return { message: 'Đã xóa nhật ký' };
  }
}
