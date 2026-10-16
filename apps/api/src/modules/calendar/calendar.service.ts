import { Injectable } from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import {
  Role,
  CycleKind,
  ActivityType,
  getVietnamMonthRange,
  CalendarActivityItem,
  CalendarCycleEvent,
  CalendarData,
} from '@xfarm/shared';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { QueryCalendarDto } from './calendar.dto';

@Injectable()
export class CalendarService {
  async getCalendarData(query: QueryCalendarDto, user: CurrentUserPayload): Promise<CalendarData> {
    const { startUtc, endUtc } = getVietnamMonthRange(query.month);

    // 1. Build Activity filter
    const activityWhere: Prisma.ActivityWhereInput = {
      performedAt: {
        gte: startUtc,
        lt: endUtc,
      },
    };

    if (query.areaId) {
      activityWhere.areaId = query.areaId;
    }

    if (query.kind) {
      activityWhere.cycle = {
        kind: query.kind,
      };
    }

    // WORKER only sees their own activities
    if (user.role === Role.WORKER) {
      activityWhere.OR = [{ performedById: user.id }, { createdById: user.id }];
    }

    // 2. Build Cycle filter (milestones in the month)
    const cycleWhere: Prisma.CycleWhereInput = {
      OR: [
        { startDate: { gte: startUtc, lt: endUtc } },
        { expectedEndDate: { gte: startUtc, lt: endUtc } },
        { endDate: { gte: startUtc, lt: endUtc } },
      ],
    };

    if (query.areaId) {
      cycleWhere.areaId = query.areaId;
    }

    if (query.kind) {
      cycleWhere.kind = query.kind;
    }

    // Query activities and cycles in parallel
    const [rawActivities, cycles] = await Promise.all([
      prisma.activity.findMany({
        where: activityWhere,
        select: {
          id: true,
          type: true,
          performedAt: true,
          quantity: true,
          unit: true,
          notes: true,
          cycleId: true,
          cycle: {
            select: {
              id: true,
              code: true,
              name: true,
              kind: true,
            },
          },
          area: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          performedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: { performedAt: 'asc' },
      }),
      prisma.cycle.findMany({
        where: cycleWhere,
        select: {
          id: true,
          code: true,
          name: true,
          kind: true,
          startDate: true,
          expectedEndDate: true,
          endDate: true,
        },
        orderBy: { startDate: 'asc' },
      }),
    ]);

    const activities: CalendarActivityItem[] = rawActivities.map((act) => ({
      id: act.id,
      type: act.type as unknown as ActivityType,
      performedAt: act.performedAt.toISOString(),
      cycleId: act.cycleId,
      cycleCode: act.cycle?.code ?? null,
      cycleName: act.cycle?.name ?? null,
      cycleKind: (act.cycle?.kind as unknown as CycleKind) ?? null,
      cycle: act.cycle
        ? {
            id: act.cycle.id,
            code: act.cycle.code,
            name: act.cycle.name,
            kind: act.cycle.kind as unknown as CycleKind,
          }
        : null,
      areaId: act.area.id,
      area: {
        id: act.area.id,
        code: act.area.code,
        name: act.area.name,
      },
      quantity: act.quantity ? Number(act.quantity) : null,
      unit: act.unit,
      notes: act.notes,
      performedBy: act.performedBy
        ? {
            id: act.performedBy.id,
            fullName: act.performedBy.fullName,
          }
        : null,
    }));

    const cycleEvents: CalendarCycleEvent[] = [];

    for (const cycle of cycles) {
      if (cycle.startDate >= startUtc && cycle.startDate < endUtc) {
        cycleEvents.push({
          cycleId: cycle.id,
          code: cycle.code,
          name: cycle.name,
          kind: 'start',
          eventKind: 'start',
          cycleKind: cycle.kind as unknown as CycleKind,
          date: cycle.startDate.toISOString(),
        });
      }

      if (
        cycle.expectedEndDate &&
        cycle.expectedEndDate >= startUtc &&
        cycle.expectedEndDate < endUtc
      ) {
        cycleEvents.push({
          cycleId: cycle.id,
          code: cycle.code,
          name: cycle.name,
          kind: 'expectedEnd',
          eventKind: 'expectedEnd',
          cycleKind: cycle.kind as unknown as CycleKind,
          date: cycle.expectedEndDate.toISOString(),
        });
      }

      if (cycle.endDate && cycle.endDate >= startUtc && cycle.endDate < endUtc) {
        cycleEvents.push({
          cycleId: cycle.id,
          code: cycle.code,
          name: cycle.name,
          kind: 'end',
          eventKind: 'end',
          cycleKind: cycle.kind as unknown as CycleKind,
          date: cycle.endDate.toISOString(),
        });
      }
    }

    cycleEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      activities,
      cycleEvents,
    };
  }
}
