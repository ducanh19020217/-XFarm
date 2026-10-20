import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
  Inject,
} from '@nestjs/common';
import { prisma, EquipmentStatus, Prisma } from '@xfarm/db';
import { SequenceService } from '../../common/sequence/sequence.service';
import { CreateEquipmentDto, UpdateEquipmentDto, QueryEquipmentDto } from './equipment.dto';

@Injectable()
export class EquipmentService {
  constructor(@Inject(SequenceService) private readonly sequenceService: SequenceService) {}

  async findAll(query: QueryEquipmentDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.EquipmentWhereInput = {};

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.areaId) {
      where.areaId = query.areaId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    let orderBy: Prisma.EquipmentOrderByWithRelationInput[] = [
      { createdAt: 'desc' },
      { id: 'desc' },
    ];
    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      if (field) {
        orderBy = [
          { [field]: direction === 'asc' ? 'asc' : 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ];
      }
    }

    const [data, total] = await Promise.all([
      prisma.equipment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          area: {
            select: { id: true, code: true, name: true },
          },
          maintenanceSchedules: {
            where: { isActive: true },
            orderBy: { nextDueDate: 'asc' },
          },
          _count: {
            select: {
              maintenanceSchedules: true,
              maintenanceLogs: true,
            },
          },
        },
      }),
      prisma.equipment.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string) {
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        area: {
          select: { id: true, code: true, name: true },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!equipment) {
      throw new NotFoundException('Không tìm thấy thiết bị');
    }

    const [maintenanceSchedules, maintenanceLogs, costAgg] = await Promise.all([
      prisma.maintenanceSchedule.findMany({
        where: { equipmentId: id },
        orderBy: [{ nextDueDate: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.maintenanceLog.findMany({
        where: { equipmentId: id },
        take: 20,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: {
          performedBy: {
            select: { id: true, fullName: true, email: true },
          },
          schedule: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.maintenanceLog.aggregate({
        where: { equipmentId: id },
        _sum: { cost: true },
      }),
    ]);

    const totalMaintenanceCost = costAgg._sum.cost ? Number(costAgg._sum.cost) : 0;

    return {
      data: {
        ...equipment,
        maintenanceSchedules,
        maintenanceLogs,
        totalMaintenanceCost,
        totalCost: totalMaintenanceCost,
      },
    };
  }

  async create(dto: CreateEquipmentDto, userId?: string) {
    let code = dto.code?.trim();
    if (!code) {
      let attempts = 0;
      while (attempts < 20) {
        attempts++;
        const candidate = await this.sequenceService.nextCode('EQ');
        const exists = await prisma.equipment.findUnique({
          where: { code: candidate },
        });
        if (!exists) {
          code = candidate;
          break;
        }
      }
      if (!code) {
        code = await this.sequenceService.nextCode('EQ');
      }
    } else {
      const existing = await prisma.equipment.findUnique({
        where: { code },
      });
      if (existing) {
        throw new ConflictException('Mã thiết bị đã tồn tại');
      }
    }

    if (dto.areaId) {
      const area = await prisma.area.findUnique({
        where: { id: dto.areaId },
      });
      if (!area) {
        throw new UnprocessableEntityException('Khu vực không tồn tại');
      }
    }

    const equipment = await prisma.equipment.create({
      data: {
        code,
        name: dto.name,
        type: dto.type,
        areaId: dto.areaId || null,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        value: dto.value !== undefined && dto.value !== null ? new Prisma.Decimal(dto.value) : null,
        status: dto.status ?? EquipmentStatus.ACTIVE,
        notes: dto.notes || null,
        isActive: dto.isActive ?? true,
        createdById: userId || null,
      },
      include: {
        area: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    return { data: equipment };
  }

  async update(id: string, dto: UpdateEquipmentDto) {
    const existing = await prisma.equipment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy thiết bị');
    }

    if (dto.code && dto.code.trim() !== existing.code) {
      const codeDuplicate = await prisma.equipment.findUnique({
        where: { code: dto.code.trim() },
      });
      if (codeDuplicate) {
        throw new ConflictException('Mã thiết bị đã tồn tại');
      }
    }

    if (dto.areaId && dto.areaId !== existing.areaId) {
      const area = await prisma.area.findUnique({
        where: { id: dto.areaId },
      });
      if (!area) {
        throw new UnprocessableEntityException('Khu vực không tồn tại');
      }
    }

    const updated = await prisma.equipment.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code.trim() } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.areaId !== undefined ? { areaId: dto.areaId || null } : {}),
        ...(dto.purchaseDate !== undefined
          ? { purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null }
          : {}),
        ...(dto.value !== undefined
          ? { value: dto.value !== null ? new Prisma.Decimal(dto.value) : null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        area: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    return { data: updated };
  }

  async remove(id: string) {
    const existing = await prisma.equipment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy thiết bị');
    }

    const updated = await prisma.equipment.update({
      where: { id },
      data: { isActive: false },
      include: {
        area: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    return {
      data: updated,
      message: 'Đã khóa thiết bị thành công',
    };
  }
}
