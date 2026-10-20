import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { prisma, EquipmentStatus, MaintenanceType, Prisma } from '@xfarm/db';
import { calculateNextDueDateVN } from './equipment.helper';
import {
  CreateMaintenanceScheduleDto,
  UpdateMaintenanceScheduleDto,
  QueryMaintenanceScheduleDto,
  CreateMaintenanceLogDto,
  CreateEquipmentMaintenanceLogDto,
  UpdateMaintenanceLogDto,
  QueryMaintenanceLogDto,
} from './equipment.dto';

@Injectable()
export class MaintenanceService {
  async findAllSchedules(query: QueryMaintenanceScheduleDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MaintenanceScheduleWhereInput = {};

    if (query.equipmentId) {
      where.equipmentId = query.equipmentId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.dueBefore) {
      where.nextDueDate = { lte: new Date(query.dueBefore) };
    }

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    let orderBy: Prisma.MaintenanceScheduleOrderByWithRelationInput[] = [
      { nextDueDate: 'asc' },
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
      prisma.maintenanceSchedule.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          equipment: {
            select: { id: true, code: true, name: true, status: true },
          },
        },
      }),
      prisma.maintenanceSchedule.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findScheduleById(id: string) {
    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: { id },
      include: {
        equipment: {
          select: { id: true, code: true, name: true, status: true },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Không tìm thấy lịch bảo trì');
    }

    return { data: schedule };
  }

  async createSchedule(dto: CreateMaintenanceScheduleDto, userId?: string) {
    const equipment = await prisma.equipment.findUnique({
      where: { id: dto.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException('Không tìm thấy thiết bị');
    }

    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        equipmentId: dto.equipmentId,
        name: dto.name,
        intervalDays: dto.intervalDays,
        nextDueDate: new Date(dto.nextDueDate),
        isActive: dto.isActive ?? true,
        createdById: userId || null,
      },
      include: {
        equipment: {
          select: { id: true, code: true, name: true, status: true },
        },
      },
    });

    return { data: schedule };
  }

  async updateSchedule(id: string, dto: UpdateMaintenanceScheduleDto) {
    const existing = await prisma.maintenanceSchedule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy lịch bảo trì');
    }

    if (dto.equipmentId && dto.equipmentId !== existing.equipmentId) {
      const eq = await prisma.equipment.findUnique({
        where: { id: dto.equipmentId },
      });
      if (!eq) {
        throw new NotFoundException('Không tìm thấy thiết bị');
      }
    }

    const updated = await prisma.maintenanceSchedule.update({
      where: { id },
      data: {
        ...(dto.equipmentId !== undefined ? { equipmentId: dto.equipmentId } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.intervalDays !== undefined ? { intervalDays: dto.intervalDays } : {}),
        ...(dto.nextDueDate !== undefined ? { nextDueDate: new Date(dto.nextDueDate) } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        equipment: {
          select: { id: true, code: true, name: true, status: true },
        },
      },
    });

    return { data: updated };
  }

  async removeSchedule(id: string) {
    const existing = await prisma.maintenanceSchedule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy lịch bảo trì');
    }

    const updated = await prisma.maintenanceSchedule.update({
      where: { id },
      data: { isActive: false },
      include: {
        equipment: {
          select: { id: true, code: true, name: true, status: true },
        },
      },
    });

    return {
      data: updated,
      message: 'Đã khóa lịch bảo trì thành công',
    };
  }

  async createLogTransaction(
    equipmentId: string,
    dto: CreateMaintenanceLogDto | CreateEquipmentMaintenanceLogDto,
    userId?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const equipment = await tx.equipment.findUnique({
        where: { id: equipmentId },
      });

      if (!equipment) {
        throw new NotFoundException('Không tìm thấy thiết bị');
      }

      if (dto.scheduleId) {
        const schedule = await tx.maintenanceSchedule.findUnique({
          where: { id: dto.scheduleId },
        });

        if (!schedule || schedule.equipmentId !== equipmentId) {
          throw new UnprocessableEntityException(
            'Lịch bảo trì không tồn tại hoặc không thuộc thiết bị này',
          );
        }

        const nextDueDate = calculateNextDueDateVN(dto.date, schedule.intervalDays);
        await tx.maintenanceSchedule.update({
          where: { id: schedule.id },
          data: { nextDueDate },
        });
      }

      if (dto.type === MaintenanceType.REPAIR && equipment.status === EquipmentStatus.BROKEN) {
        await tx.equipment.update({
          where: { id: equipmentId },
          data: { status: EquipmentStatus.ACTIVE },
        });
      }

      const log = await tx.maintenanceLog.create({
        data: {
          equipmentId,
          scheduleId: dto.scheduleId || null,
          date: new Date(dto.date),
          type: dto.type,
          cost: new Prisma.Decimal(dto.cost ?? 0),
          notes: dto.notes || null,
          performedById: dto.performedById || userId || null,
          createdById: userId || null,
        },
        include: {
          equipment: {
            select: { id: true, code: true, name: true, status: true },
          },
          schedule: {
            select: { id: true, name: true, intervalDays: true, nextDueDate: true },
          },
          performedBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      return { data: log };
    });
  }

  async findAllLogs(query: QueryMaintenanceLogDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MaintenanceLogWhereInput = {};

    if (query.equipmentId) {
      where.equipmentId = query.equipmentId;
    }

    if (query.scheduleId) {
      where.scheduleId = query.scheduleId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.from || query.to) {
      where.date = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    let orderBy: Prisma.MaintenanceLogOrderByWithRelationInput[] = [
      { date: 'desc' },
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
      prisma.maintenanceLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          equipment: {
            select: { id: true, code: true, name: true },
          },
          schedule: {
            select: { id: true, name: true },
          },
          performedBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
      prisma.maintenanceLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findLogById(id: string) {
    const log = await prisma.maintenanceLog.findUnique({
      where: { id },
      include: {
        equipment: {
          select: { id: true, code: true, name: true, status: true },
        },
        schedule: {
          select: { id: true, name: true, intervalDays: true, nextDueDate: true },
        },
        performedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!log) {
      throw new NotFoundException('Không tìm thấy nhật ký bảo trì');
    }

    return { data: log };
  }

  async updateLog(id: string, dto: UpdateMaintenanceLogDto) {
    const existing = await prisma.maintenanceLog.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy nhật ký bảo trì');
    }

    const updated = await prisma.maintenanceLog.update({
      where: { id },
      data: {
        ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
        ...(dto.cost !== undefined ? { cost: new Prisma.Decimal(dto.cost) } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.performedById !== undefined ? { performedById: dto.performedById || null } : {}),
      },
      include: {
        equipment: {
          select: { id: true, code: true, name: true },
        },
        schedule: {
          select: { id: true, name: true },
        },
        performedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    return { data: updated };
  }
}
