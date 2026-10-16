import { HttpException, Injectable } from '@nestjs/common';
import { ZodError } from 'zod';
import { prisma, Prisma } from '@xfarm/db';
import {
  ActivityType,
  Role,
  TaskStatus,
  type SyncItem,
  type SyncBatchInput,
  type SyncResultItem,
  createActivitySchema,
  checkInSchema,
  checkOutSchema,
  completeTaskSchema,
} from '@xfarm/shared';
import { ActivitiesService } from '../activities/activities.service';
import { AttendanceService } from '../attendance/attendance.service';
import { TasksService } from '../tasks/tasks.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class SyncService {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly attendanceService: AttendanceService,
    private readonly tasksService: TasksService,
  ) {}

  async syncBatch(dto: SyncBatchInput, user: CurrentUserPayload): Promise<SyncResultItem[]> {
    if (!dto.items || dto.items.length === 0) {
      return [];
    }

    // Process sequentially ordered by createdAt
    const sortedItems = [...dto.items].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const results: SyncResultItem[] = [];
    for (const item of sortedItems) {
      const result = await this.processSyncItem(item, user);
      results.push(result);
    }

    return results;
  }

  private async processSyncItem(item: SyncItem, user: CurrentUserPayload): Promise<SyncResultItem> {
    try {
      return await this.handleItem(item, user);
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const duplicateResult = await this.findDuplicate(item);
        if (duplicateResult) {
          return duplicateResult;
        }
      }

      return {
        clientId: item.clientId,
        status: 'error',
        error: this.extractErrorMessage(error),
      };
    }
  }

  private async findDuplicate(item: SyncItem): Promise<SyncResultItem | null> {
    const audit = await prisma.auditLog.findFirst({
      where: { entity: 'SyncItem', entityId: item.clientId },
      select: { entityId: true, diff: true },
    });
    if (audit) {
      const diff = audit.diff as Record<string, unknown> | null;
      return {
        clientId: item.clientId,
        status: 'duplicate',
        id: (diff?.id as string | undefined) ?? audit.entityId,
      };
    }

    if (item.kind === 'activity') {
      const act = await prisma.activity.findUnique({
        where: { clientId: item.clientId },
        select: { id: true },
      });
      if (act) return { clientId: item.clientId, status: 'duplicate', id: act.id };
    } else if (item.kind === 'check-in' || item.kind === 'check-out') {
      const att = await prisma.attendance.findUnique({
        where: { clientId: item.clientId },
        select: { id: true },
      });
      if (att) return { clientId: item.clientId, status: 'duplicate', id: att.id };
    } else if (item.kind === 'task-complete') {
      const tsk = await prisma.task.findUnique({
        where: { clientId: item.clientId },
        select: { id: true },
      });
      if (tsk) return { clientId: item.clientId, status: 'duplicate', id: tsk.id };
    }

    return null;
  }

  private async handleItem(item: SyncItem, user: CurrentUserPayload): Promise<SyncResultItem> {
    // 1. Idempotency check via AuditLog
    const auditDuplicate = await prisma.auditLog.findFirst({
      where: { entity: 'SyncItem', entityId: item.clientId },
      select: { entityId: true, diff: true },
    });
    if (auditDuplicate) {
      const diff = auditDuplicate.diff as Record<string, unknown> | null;
      return {
        clientId: item.clientId,
        status: 'duplicate',
        id: (diff?.id as string | undefined) ?? auditDuplicate.entityId,
      };
    }

    switch (item.kind) {
      case 'activity':
        return this.handleActivity(item, user);
      case 'check-in':
        return this.handleCheckIn(item, user);
      case 'check-out':
        return this.handleCheckOut(item, user);
      case 'task-complete':
        return this.handleTaskComplete(item, user);
      default: {
        const exhaustiveCheck: never = item.kind;
        throw new Error(`Loại thao tác không được hỗ trợ: ${exhaustiveCheck}`);
      }
    }
  }

  private async handleActivity(item: SyncItem, user: CurrentUserPayload): Promise<SyncResultItem> {
    const existing = await prisma.activity.findUnique({
      where: { clientId: item.clientId },
      select: { id: true },
    });
    if (existing) {
      return {
        clientId: item.clientId,
        status: 'duplicate',
        id: existing.id,
      };
    }

    const payload: Record<string, unknown> = { ...item.payload };
    payload.clientId = item.clientId;
    if (!payload.performedAt) {
      payload.performedAt = payload.date || item.createdAt;
    }
    // Security: WORKER can only record activities for themselves
    if (user.role === Role.WORKER) {
      payload.performedById = user.id;
    }
    if (payload.quantity === '' || Number.isNaN(payload.quantity)) {
      delete payload.quantity;
    }

    // Default required data for quick activities if missing
    if (payload.type === ActivityType.IRRIGATION) {
      const d = (payload.data as Record<string, unknown> | null | undefined) ?? {};
      if (!d.durationMin || Number.isNaN(Number(d.durationMin))) {
        payload.data = { ...d, durationMin: 30 };
      }
    } else if (payload.type === ActivityType.FEEDING) {
      const d = (payload.data as Record<string, unknown> | null | undefined) ?? {};
      if (!d.feedKg || Number.isNaN(Number(d.feedKg))) {
        payload.data = { ...d, feedKg: 1 };
      }
    } else if (payload.type === ActivityType.WEIGHING) {
      const d = (payload.data as Record<string, unknown> | null | undefined) ?? {};
      if (!d.avgWeightKg || !d.sampleSize) {
        payload.data = { ...d, avgWeightKg: d.avgWeightKg ?? 1, sampleSize: d.sampleSize ?? 1 };
      }
    } else if (!payload.data) {
      payload.data = {};
    }

    const dto = createActivitySchema.parse(payload);
    const created = await this.activitiesService.create(dto, user.id, user.role);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SYNC_activity',
        entity: 'SyncItem',
        entityId: item.clientId,
        diff: { id: created.id, kind: item.kind },
      },
    });

    return {
      clientId: item.clientId,
      status: 'created',
      id: created.id,
    };
  }

  private async handleCheckIn(item: SyncItem, user: CurrentUserPayload): Promise<SyncResultItem> {
    const existing = await prisma.attendance.findUnique({
      where: { clientId: item.clientId },
      select: { id: true, checkIn: true },
    });
    if (existing) {
      return {
        clientId: item.clientId,
        status: 'duplicate',
        id: existing.id,
      };
    }

    const payload: Record<string, unknown> = { ...item.payload };
    payload.clientId = item.clientId;
    // Use offline timestamp 'at' if provided, otherwise fallback to item.createdAt
    if (!payload.at) {
      payload.at = item.createdAt;
    }
    // Security: WORKER can only check in for themselves
    if (user.role === Role.WORKER) {
      delete payload.employeeId;
    }

    const dto = checkInSchema.parse(payload);
    const created = await this.attendanceService.checkIn(dto, {
      id: user.id,
      role: user.role as Role,
      employeeId: user.employeeId,
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SYNC_check-in',
        entity: 'SyncItem',
        entityId: item.clientId,
        diff: { id: created.id, kind: item.kind },
      },
    });

    return {
      clientId: item.clientId,
      status: 'created',
      id: created.id,
    };
  }

  private async handleCheckOut(item: SyncItem, user: CurrentUserPayload): Promise<SyncResultItem> {
    const existing = await prisma.attendance.findUnique({
      where: { clientId: item.clientId },
      select: { id: true, checkOut: true },
    });
    if (existing && existing.checkOut) {
      return {
        clientId: item.clientId,
        status: 'duplicate',
        id: existing.id,
      };
    }

    const payload: Record<string, unknown> = { ...item.payload };
    payload.clientId = item.clientId;
    // Use offline timestamp 'at' if provided, otherwise fallback to item.createdAt
    if (!payload.at) {
      payload.at = item.createdAt;
    }
    // Security: WORKER can only check out for themselves
    if (user.role === Role.WORKER) {
      delete payload.employeeId;
    }

    const dto = checkOutSchema.parse(payload);
    const updated = await this.attendanceService.checkOut(dto, {
      id: user.id,
      role: user.role as Role,
      employeeId: user.employeeId,
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SYNC_check-out',
        entity: 'SyncItem',
        entityId: item.clientId,
        diff: { id: updated.id, kind: item.kind },
      },
    });

    return {
      clientId: item.clientId,
      status: 'created',
      id: updated.id,
    };
  }

  private async handleTaskComplete(
    item: SyncItem,
    user: CurrentUserPayload,
  ): Promise<SyncResultItem> {
    const existing = await prisma.task.findUnique({
      where: { clientId: item.clientId },
      select: { id: true, status: true },
    });
    if (existing && existing.status === TaskStatus.DONE) {
      return {
        clientId: item.clientId,
        status: 'duplicate',
        id: existing.id,
      };
    }

    const payload: Record<string, unknown> = { ...item.payload };
    const taskId = (payload.taskId as string | undefined) || (payload.id as string | undefined);
    if (!taskId) {
      return {
        clientId: item.clientId,
        status: 'error',
        error: 'Thiếu ID công việc',
      };
    }

    payload.clientId = item.clientId;
    if (!payload.completedAt) {
      payload.completedAt = item.createdAt;
    }

    const dto = completeTaskSchema.parse(payload);
    const updated = await this.tasksService.complete(taskId, dto, {
      id: user.id,
      role: user.role as Role,
      employeeId: user.employeeId,
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SYNC_task-complete',
        entity: 'SyncItem',
        entityId: item.clientId,
        diff: { id: updated.id, kind: item.kind },
      },
    });

    return {
      clientId: item.clientId,
      status: 'created',
      id: updated.id,
    };
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (typeof response === 'object' && response !== null && 'message' in response) {
        const msg = (response as { message: unknown }).message;
        return Array.isArray(msg) ? msg.join(', ') : String(msg);
      }
      return error.message;
    }
    if (error instanceof ZodError) {
      return error.errors.map((e) => e.message).join(', ');
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Lỗi không xác định khi đồng bộ';
  }
}
