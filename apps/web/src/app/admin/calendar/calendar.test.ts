import { describe, it, expect } from 'vitest';
import {
  buildMonthGrid,
  buildMonthGridWeeks,
  groupCalendarItemsByDay,
  toVietnamDateString,
  getVietnamMonthRange,
  CycleKind,
  ActivityType,
  type CalendarActivityItem,
  type CalendarCycleEvent,
} from '@xfarm/shared';

describe('Web Calendar Grid & Vietnam Timezone Tests', () => {
  it('dựng lưới tháng có tuần bắt đầu từ Thứ Hai (index 0 là Thứ Hai, 6 là Chủ Nhật)', () => {
    const flatDays = buildMonthGrid(2026, 10);
    expect(flatDays).toHaveLength(35);
    const weeks = buildMonthGridWeeks(2026, 10);
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    expect(weeks.length).toBeLessThanOrEqual(6);

    for (const week of weeks) {
      expect(week).toHaveLength(7);
      expect(week[0].dayOfWeek).toBe(0); // Thứ Hai
      expect(week[6].dayOfWeek).toBe(6); // Chủ Nhật
    }
  });

  it('kiểm tra số hàng của lưới tháng luôn từ 4 đến 6 hàng cho các năm/tháng khác nhau', () => {
    // Tháng 2 năm 2021: 28 ngày, bắt đầu Thứ Hai -> đúng 4 hàng
    const feb2021 = buildMonthGridWeeks(2021, 2);
    expect(feb2021).toHaveLength(4);

    // Tháng 10 năm 2026: 31 ngày, bắt đầu Thứ Năm -> 5 hàng
    const oct2026 = buildMonthGridWeeks(2026, 10);
    expect(oct2026).toHaveLength(5);

    // Tháng 8 năm 2026: 31 ngày, bắt đầu Thứ Bảy -> 6 hàng
    const aug2026 = buildMonthGridWeeks(2026, 8);
    expect(aug2026).toHaveLength(6);
  });

  it('gom sự kiện theo ngày đúng múi giờ VN (Asia/Ho_Chi_Minh)', () => {
    const activities: CalendarActivityItem[] = [
      {
        id: 'act-border-1',
        type: ActivityType.FEEDING,
        // 23:30 ngày 31/10/2026 theo giờ VN (UTC+7) -> 16:30 UTC
        performedAt: '2026-10-31T16:30:00.000Z',
        areaId: 'area-1',
        area: { id: 'area-1', code: 'A1', name: 'Khu 1' },
      },
      {
        id: 'act-border-2',
        type: ActivityType.HARVEST,
        // 00:30 ngày 01/11/2026 theo giờ VN (UTC+7) -> 17:30 UTC ngày 31/10
        performedAt: '2026-10-31T17:30:00.000Z',
        areaId: 'area-1',
        area: { id: 'area-1', code: 'A1', name: 'Khu 1' },
      },
    ];

    const cycleEvents: CalendarCycleEvent[] = [
      {
        cycleId: 'cyc-1',
        code: 'CYC-01',
        name: 'Vụ Cải',
        kind: 'start',
        eventKind: 'start',
        cycleKind: CycleKind.CROP,
        // 08:00 ngày 31/10 VN -> 01:00 UTC
        date: '2026-10-31T01:00:00.000Z',
      },
    ];

    const grouped = groupCalendarItemsByDay(activities, cycleEvents);

    // Ngày 31/10 phải có act-border-1 và cyc-1
    expect(grouped['2026-10-31']).toBeDefined();
    expect(grouped['2026-10-31'].activities.map((a) => a.id)).toEqual(['act-border-1']);
    expect(grouped['2026-10-31'].cycleEvents.map((c) => c.cycleId)).toEqual(['cyc-1']);

    // Ngày 01/11 phải có act-border-2
    expect(grouped['2026-11-01']).toBeDefined();
    expect(grouped['2026-11-01'].activities.map((a) => a.id)).toEqual(['act-border-2']);
    expect(grouped['2026-11-01'].cycleEvents).toHaveLength(0);
  });

  it('getVietnamMonthRange tính đúng biên thời gian cho tháng', () => {
    const { startUtc, endUtc } = getVietnamMonthRange('2026-10');
    expect(startUtc.toISOString()).toBe('2026-09-30T17:00:00.000Z');
    expect(endUtc.toISOString()).toBe('2026-10-31T17:00:00.000Z');
  });

  it('toVietnamDateString trả về đúng YYYY-MM-DD theo giờ VN', () => {
    expect(toVietnamDateString('2026-10-31T16:30:00.000Z')).toBe('2026-10-31');
    expect(toVietnamDateString('2026-10-31T17:00:00.000Z')).toBe('2026-11-01');
  });
});
