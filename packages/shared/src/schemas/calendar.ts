import { z } from 'zod';
import { CycleKind, ActivityType } from '../types';

export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
export const VIETNAM_OFFSET_HOURS = 7;
export const VIETNAM_OFFSET_MS = VIETNAM_OFFSET_HOURS * 60 * 60 * 1000;

export const queryCalendarSchema = z.object({
  month: z
    .string({ required_error: 'Tháng không được để trống' })
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Tháng phải có định dạng YYYY-MM'),
  areaId: z.string().optional(),
  kind: z.nativeEnum(CycleKind).optional(),
});

export type QueryCalendarInput = z.infer<typeof queryCalendarSchema>;

export type CycleEventKind = 'start' | 'expectedEnd' | 'end';

export interface CalendarCycleEvent {
  cycleId: string;
  code: string;
  name: string;
  kind: CycleEventKind;
  eventKind: CycleEventKind;
  cycleKind: CycleKind;
  date: string;
}

export interface CalendarActivityItem {
  id: string;
  type: ActivityType;
  performedAt: string;
  cycleId?: string | null;
  cycleCode?: string | null;
  cycleName?: string | null;
  cycleKind?: CycleKind | null;
  cycle?: {
    id: string;
    code: string;
    name: string;
    kind: CycleKind;
  } | null;
  areaId: string;
  area: {
    id: string;
    code: string;
    name: string;
  };
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
  performedBy?: {
    id: string;
    fullName: string;
  } | null;
}

export interface CalendarData {
  activities: CalendarActivityItem[];
  cycleEvents: CalendarCycleEvent[];
}

/**
 * Returns { startUtc, endUtc } for a given month 'YYYY-MM' in Vietnam time (Asia/Ho_Chi_Minh, UTC+7).
 * Range is [startUtc, endUtc) where startUtc is YYYY-MM-01 00:00:00 +07:00
 * and endUtc is next month 01 00:00:00 +07:00.
 */
export function getVietnamMonthRange(monthStr: string): { startUtc: Date; endUtc: Date } {
  const parts = monthStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);

  const startUtc = new Date(Date.UTC(year, month - 1, 1, -VIETNAM_OFFSET_HOURS, 0, 0, 0));
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const endUtc = new Date(Date.UTC(nextYear, nextMonth - 1, 1, -VIETNAM_OFFSET_HOURS, 0, 0, 0));

  return { startUtc, endUtc };
}

/**
 * Converts a Date or ISO string into 'YYYY-MM-DD' representation in Vietnam timezone.
 */
export function toVietnamDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const vnTime = new Date(d.getTime() + VIETNAM_OFFSET_MS);
  const y = vnTime.getUTCFullYear();
  const m = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(vnTime.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface CalendarGridDay {
  date: string; // 'YYYY-MM-DD'
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfWeek: number; // 0: Mon, 1: Tue, ..., 6: Sun
}

/**
 * Builds a month grid for a given year and month (1..12).
 * Weeks start on Monday (0: Mon, ..., 6: Sun).
 * The resulting array contains 28, 35, or 42 days (4 to 6 rows).
 */
export function buildMonthGrid(
  year: number,
  month: number,
  todayDateStr?: string,
): CalendarGridDay[] {
  const actualToday = todayDateStr ?? toVietnamDateString(new Date());

  const daysInCurrentMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrevMonth = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  // Day of week of 1st day of month: 0=Sun, 1=Mon, ..., 6=Sat
  const firstDayJs = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  // Monday-based offset (0: Monday, 6: Sunday)
  const startDayOffset = (firstDayJs + 6) % 7;

  const totalCurrentAndLeading = startDayOffset + daysInCurrentMonth;
  const rowsCount = Math.ceil(totalCurrentAndLeading / 7); // 4, 5, or 6 rows
  const totalDays = rowsCount * 7;
  const trailingDaysCount = totalDays - totalCurrentAndLeading;

  const days: CalendarGridDay[] = [];

  // 1. Leading days from previous month
  for (let i = startDayOffset - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const date = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = days.length % 7;
    days.push({
      date,
      year: prevYear,
      month: prevMonth,
      day,
      isCurrentMonth: false,
      isToday: date === actualToday,
      dayOfWeek,
    });
  }

  // 2. Days of current month
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = days.length % 7;
    days.push({
      date,
      year,
      month,
      day,
      isCurrentMonth: true,
      isToday: date === actualToday,
      dayOfWeek,
    });
  }

  // 3. Trailing days from next month
  for (let day = 1; day <= trailingDaysCount; day++) {
    const date = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = days.length % 7;
    days.push({
      date,
      year: nextYear,
      month: nextMonth,
      day,
      isCurrentMonth: false,
      isToday: date === actualToday,
      dayOfWeek,
    });
  }

  return days;
}

/**
 * Builds the month grid grouped into 4-6 rows of 7 days (weeks starting Monday).
 */
export function buildMonthGridWeeks(
  year: number,
  month: number,
  todayDateStr?: string,
): CalendarGridDay[][] {
  const days = buildMonthGrid(year, month, todayDateStr);
  const weeks: CalendarGridDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export interface DayCalendarEvents {
  date: string;
  activities: CalendarActivityItem[];
  cycleEvents: CalendarCycleEvent[];
}

/**
 * Groups activities and cycle events by date (YYYY-MM-DD) in Vietnam timezone.
 */
export function groupCalendarItemsByDay(
  activities: CalendarActivityItem[] = [],
  cycleEvents: CalendarCycleEvent[] = [],
): Record<string, DayCalendarEvents> {
  const result: Record<string, DayCalendarEvents> = {};

  const getOrCreate = (dateStr: string): DayCalendarEvents => {
    if (!result[dateStr]) {
      result[dateStr] = {
        date: dateStr,
        activities: [],
        cycleEvents: [],
      };
    }
    return result[dateStr];
  };

  for (const activity of activities) {
    const dateStr = toVietnamDateString(activity.performedAt);
    getOrCreate(dateStr).activities.push(activity);
  }

  for (const event of cycleEvents) {
    const dateStr = toVietnamDateString(event.date);
    getOrCreate(dateStr).cycleEvents.push(event);
  }

  return result;
}
