import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { prisma } from '@xfarm/db';
import type { Prisma } from '@xfarm/db';
import { Role, TaskStatus } from '@xfarm/shared';
import { ActivitiesService } from '../activities/activities.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  CompleteTaskDto,
  QueryTaskDto,
  MyTasksQueryDto,
} from './tasks.dto';

const taskInclude = {
  assignee: {
    select: {
      id: true,
      code: true,
      fullName: true,
      position: true,
    },
  },
  area: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  cycle: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  activity: {
    select: {
      id: true,
      type: true,
      performedAt: true,
    },
  },
};

interface CurrentUser {
  id: string;
  role: Role;
  employeeId?: string | null;
}

@Injectable()
export class TasksService {
  constructor(@Inject(ActivitiesService) private readonly activitiesService: ActivitiesService) {}

  async findAll(query: QueryTaskDto, user: CurrentUser) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.TaskWhereInput = {};

    if (user.role === Role.WORKER) {
      if (!user.employeeId) {
        return { data: [], total: 0, page, pageSize };
      }
      where.assigneeId = user.employeeId;
    } else if (query.assigneeId) {
      where.assigneeId = query.assigneeId;
    }

    if (query.areaId) {
      where.areaId = query.areaId;
    }

    if (query.cycleId) {
      where.cycleId = query.cycleId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.from || query.to) {
      where.dueDate = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }

    let orderBy: Prisma.TaskOrderByWithRelationInput[] = [{ dueDate: 'asc' }, { id: 'desc' }];

    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      const allowed = ['dueDate', 'status', 'createdAt', 'updatedAt', 'title'];
      if (field && allowed.includes(field)) {
        orderBy = [{ [field]: direction === 'asc' ? 'asc' : 'desc' }, { id: 'desc' }];
      }
    }

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: taskInclude,
      }),
      prisma.task.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findMyTasks(query: MyTasksQueryDto, user: CurrentUser) {
    if (!user.employeeId) {
      return { data: [] };
    }

    let startOfDay: Date;
    let endOfDay: Date;

    if (query.date) {
      const dt = new Date(query.date);
      const minStart = Math.min(
        new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0).getTime(),
        new Date(
          Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 0, 0, 0, 0),
        ).getTime(),
      );
      const maxEnd = Math.max(
        new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23, 59, 59, 999).getTime(),
        new Date(
          Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 23, 59, 59, 999),
        ).getTime(),
      );
      startOfDay = new Date(minStart);
      endOfDay = new Date(maxEnd);
    } else {
      const now = new Date();
      startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    const data = await prisma.task.findMany({
      where: {
        assigneeId: user.employeeId,
        OR: [
          {
            dueDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          {
            dueDate: {
              lt: startOfDay,
            },
            status: {
              notIn: [TaskStatus.DONE, TaskStatus.CANCELLED],
            },
          },
        ],
      },
      orderBy: [{ dueDate: 'asc' }, { id: 'desc' }],
      include: taskInclude,
    });

    return { data };
  }

  async findById(id: string, user: CurrentUser) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: taskInclude,
    });

    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc');
    }

    if (user.role === Role.WORKER && task.assigneeId !== user.employeeId) {
      throw new ForbiddenException('Bạn không có quyền truy cập công việc này');
    }

    return task;
  }

  async create(dto: CreateTaskDto) {
    if (dto.clientId) {
      const existing = await prisma.task.findUnique({
        where: { clientId: dto.clientId },
        include: taskInclude,
      });
      if (existing) {
        return existing;
      }
    }

    const assignee = await prisma.employee.findUnique({
      where: { id: dto.assigneeId },
    });
    if (!assignee) {
      throw new BadRequestException('Nhân viên không tồn tại');
    }

    if (dto.areaId) {
      const area = await prisma.area.findUnique({ where: { id: dto.areaId } });
      if (!area) {
        throw new BadRequestException('Khu vực không tồn tại');
      }
    }

    if (dto.cycleId) {
      const cycle = await prisma.cycle.findUnique({ where: { id: dto.cycleId } });
      if (!cycle) {
        throw new BadRequestException('Mùa vụ không tồn tại');
      }
    }

    const task = await prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description || null,
        assigneeId: dto.assigneeId,
        areaId: dto.areaId || null,
        cycleId: dto.cycleId || null,
        dueDate: dto.dueDate,
        status: dto.status ?? TaskStatus.TODO,
        clientId: dto.clientId || null,
      },
      include: taskInclude,
    });

    return task;
  }

  async update(id: string, dto: UpdateTaskDto) {
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy công việc');
    }

    if (dto.assigneeId) {
      const assignee = await prisma.employee.findUnique({ where: { id: dto.assigneeId } });
      if (!assignee) {
        throw new BadRequestException('Nhân viên không tồn tại');
      }
    }

    if (dto.areaId) {
      const area = await prisma.area.findUnique({ where: { id: dto.areaId } });
      if (!area) {
        throw new BadRequestException('Khu vực không tồn tại');
      }
    }

    if (dto.cycleId) {
      const cycle = await prisma.cycle.findUnique({ where: { id: dto.cycleId } });
      if (!cycle) {
        throw new BadRequestException('Mùa vụ không tồn tại');
      }
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description || null } : {}),
        ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
        ...(dto.areaId !== undefined ? { areaId: dto.areaId || null } : {}),
        ...(dto.cycleId !== undefined ? { cycleId: dto.cycleId || null } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.activityId !== undefined ? { activityId: dto.activityId || null } : {}),
        ...(dto.completedAt !== undefined ? { completedAt: dto.completedAt || null } : {}),
      },
      include: taskInclude,
    });

    return updated;
  }

  async remove(id: string) {
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy công việc');
    }

    await prisma.task.delete({ where: { id } });
    return { message: 'Đã xóa công việc thành công' };
  }

  async start(id: string, user: CurrentUser) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: taskInclude,
    });

    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc');
    }

    if (user.role === Role.WORKER && task.assigneeId !== user.employeeId) {
      throw new ForbiddenException('Bạn không có quyền thao tác trên công việc này');
    }

    if (task.status === TaskStatus.TODO) {
      const updated = await prisma.task.update({
        where: { id },
        data: { status: TaskStatus.IN_PROGRESS },
        include: taskInclude,
      });
      return updated;
    }

    return task;
  }

  async complete(id: string, dto: CompleteTaskDto, user: CurrentUser) {
    if (dto.clientId) {
      const existingByClientId = await prisma.task.findUnique({
        where: { clientId: dto.clientId },
        include: taskInclude,
      });
      if (existingByClientId && existingByClientId.status === TaskStatus.DONE) {
        return existingByClientId;
      }
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: taskInclude,
    });

    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc');
    }

    if (user.role === Role.WORKER && task.assigneeId !== user.employeeId) {
      throw new ForbiddenException('Bạn không có quyền thao tác trên công việc này');
    }

    if (task.status === TaskStatus.DONE) {
      if (dto.clientId && task.clientId === dto.clientId) {
        return task;
      }
    }

    return prisma.$transaction(async (tx) => {
      let activityId = dto.activityId || task.activityId || undefined;

      if (dto.activity) {
        const activityPayload = {
          ...dto.activity,
          areaId: dto.activity.areaId || task.areaId || '',
          cycleId: dto.activity.cycleId || task.cycleId || undefined,
          performedAt: dto.activity.performedAt || dto.completedAt || new Date(),
        };

        if (!activityPayload.areaId) {
          throw new BadRequestException('Vui lòng chọn khu/lô cho hoạt động');
        }

        const createdActivity = await this.activitiesService.create(
          activityPayload,
          user.id,
          user.role,
          tx,
        );
        activityId = createdActivity.id;
      }

      const completedAt = dto.completedAt || new Date();

      const updated = await tx.task.update({
        where: { id },
        data: {
          status: TaskStatus.DONE,
          completedAt,
          activityId: activityId ?? null,
          clientId: dto.clientId ?? task.clientId ?? null,
        },
        include: taskInclude,
      });

      return updated;
    });
  }
}
