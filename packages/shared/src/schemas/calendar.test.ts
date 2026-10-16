import { describe, it, expect } from 'vitest';
import {
  buildMonthGrid,
  buildMonthGridWeeks,
  getVietnamMonthRange,
  toVietnamDateString,
  groupCalendarItemsByDay,
  queryCalendarSchema,
  CycleKind,
  ActivityType,
  CalendarActivityItem,
  CalendarCycleEvent,
} from '../index';

describe('queryCalendarSchema', () => {
  it('chấp nhận query hợp lệ với month YYYY-MM', () => {
    const parsed = queryCalendarSchema.parse({ month: '2026-10' });
    expect(parsed.month).toBe('2026-10');
    expect(parsed.areaId).toBeUndefined();
    expect(parsed.kind).toBeUndefined();
  });

  it('chấp nhận areaId và kind hợp lệ', () => {
    const parsed = queryCalendarSchema.parse({
      month: '2026-05',
      areaId: 'area-123',
      kind: CycleKind.CROP,
    });
    expect(parsed.month).toBe('2026-05');
    expect(parsed.areaId).toBe('area-123');
    expect(parsed.kind).toBe(CycleKind.CROP);
  });

  it('báo lỗi khi thiếu month hoặc month sai định dạng', () => {
    expect(() => queryCalendarSchema.parse({})).toThrow();
    expect(() => queryCalendarSchema.parse({ month: '2026' })).toThrow();
    expect(() => queryCalendarSchema.parse({ month: '2026-13' })).toThrow();
    expect(() => queryCalendarSchema.parse({ month: '2026-00' })).toThrow();
    expect(() => queryCalendarSchema.parse({ month: 'invalid' })).toThrow();
  });
});

describe('Múi giờ Asia/Ho_Chi_Minh (getVietnamMonthRange & toVietnamDateString)', () => {
  it('tính đúng khoảng thời gian UTC cho tháng 10/2026 theo giờ VN (+07:00)', () => {
    const { startUtc, endUtc } = getVietnamMonthRange('2026-10');
    // Tháng 10/2026 bắt đầu từ 2026-10-01 00:00:00 +07:00 -> 2026-09-30 17:00:00 UTC
    expect(startUtc.toISOString()).toBe('2026-09-30T17:00:00.000Z');
    // Kết thúc tại 2026-11-01 00:00:00 +07:00 -> 2026-10-31 17:00:00 UTC
    expect(endUtc.toISOString()).toBe('2026-10-31T17:00:00.000Z');
  });

  it('xử lý chuyển giao năm: tháng 12/2026 sang tháng 1/2027', () => {
    const { startUtc, endUtc } = getVietnamMonthRange('2026-12');
    expect(startUtc.toISOString()).toBe('2026-11-30T17:00:00.000Z');
    expect(endUtc.toISOString()).toBe('2026-12-31T17:00:00.000Z');
  });

  it('chuyển đổi Date sang ngày giờ VN đúng chuẩn YYYY-MM-DD', () => {
    // 2026-10-31 16:30:00 UTC là 23:30:00 ngày 31/10/2026 theo giờ VN
    const lateNightUtc = '2026-10-31T16:30:00.000Z';
    expect(toVietnamDateString(lateNightUtc)).toBe('2026-10-31');

    // 2026-10-31 17:00:00 UTC là 00:00:00 ngày 01/11/2026 theo giờ VN
    const midnightUtc = '2026-10-31T17:00:00.000Z';
    expect(toVietnamDateString(midnightUtc)).toBe('2026-11-01');

    // 2026-09-30 16:59:59 UTC là 23:59:59 ngày 30/09/2026 theo giờ VN
    const justBeforeMonthUtc = '2026-09-30T16:59:59.000Z';
    expect(toVietnamDateString(justBeforeMonthUtc)).toBe('2026-09-30');
  });

  it('activity ở biên tháng (23:30 ngày cuối tháng theo giờ VN) nằm ĐÚNG tháng', () => {
    const { startUtc, endUtc } = getVietnamMonthRange('2026-10');
    const borderActivityUtc = new Date('2026-10-31T16:30:00.000Z'); // 23:30 VN

    expect(borderActivityUtc.getTime()).toBeGreaterThanOrEqual(startUtc.getTime());
    expect(borderActivityUtc.getTime()).toBeLessThan(endUtc.getTime());
    expect(toVietnamDateString(borderActivityUtc)).toBe('2026-10-31');
  });
});

describe('Hàm dựng lưới tháng buildMonthGrid', () => {
  it('tuần luôn bắt đầu bằng thứ Hai (dayOfWeek: 0 = Mon, 6 = Sun)', () => {
    const grid = buildMonthGrid(2026, 10, '2026-10-15');
    // Mỗi khối 7 ngày phải bắt đầu bằng dayOfWeek 0 và kết thúc bằng dayOfWeek 6
    for (let i = 0; i < grid.length; i += 7) {
      expect(grid[i].dayOfWeek).toBe(0); // Thứ Hai
      expect(grid[i + 6].dayOfWeek).toBe(6); // Chủ Nhật
    }
  });

  it('tháng 2/2021 bắt đầu vào Thứ Hai và có 28 ngày -> đúng 4 hàng (28 ngày)', () => {
    const weeks = buildMonthGridWeeks(2021, 2);
    expect(weeks.length).toBe(4);
    expect(weeks.flat().length).toBe(28);
    // Ngày đầu là 2021-02-01
    expect(weeks[0][0].date).toBe('2021-02-01');
    expect(weeks[0][0].isCurrentMonth).toBe(true);
    // Ngày cuối là 2021-02-28
    expect(weeks[3][6].date).toBe('2021-02-28');
    expect(weeks[3][6].isCurrentMonth).toBe(true);
  });

  it('tháng 10/2026 bắt đầu vào Thứ Năm và có 31 ngày -> đúng 5 hàng (35 ngày)', () => {
    const weeks = buildMonthGridWeeks(2026, 10);
    expect(weeks.length).toBe(5);
    const flat = weeks.flat();
    expect(flat.length).toBe(35);

    // 3 ngày đầu là từ tháng 9 (T2, T3, T4): 28, 29, 30
    expect(flat[0].date).toBe('2026-09-28');
    expect(flat[0].isCurrentMonth).toBe(false);
    expect(flat[2].date).toBe('2026-09-30');
    expect(flat[2].isCurrentMonth).toBe(false);

    // 01/10/2026 là Thứ Năm (index 3)
    expect(flat[3].date).toBe('2026-10-01');
    expect(flat[3].isCurrentMonth).toBe(true);

    // 31/10/2026 là Thứ Bảy (index 33)
    expect(flat[33].date).toBe('2026-10-31');
    expect(flat[33].isCurrentMonth).toBe(true);

    // Ngày cuối là 01/11/2026 Chủ Nhật (index 34)
    expect(flat[34].date).toBe('2026-11-01');
    expect(flat[34].isCurrentMonth).toBe(false);
  });

  it('tháng 8/2026 bắt đầu vào Thứ Bảy và có 31 ngày -> đúng 6 hàng (42 ngày)', () => {
    const weeks = buildMonthGridWeeks(2026, 8);
    expect(weeks.length).toBe(6);
    const flat = weeks.flat();
    expect(flat.length).toBe(42);

    // 01/08/2026 rơi vào thứ Bảy (index 5)
    expect(flat[5].date).toBe('2026-08-01');
    expect(flat[5].isCurrentMonth).toBe(true);

    // 31/08/2026 rơi vào thứ Hai tuần thứ 6 (index 35)
    expect(flat[35].date).toBe('2026-08-31');
    expect(flat[35].isCurrentMonth).toBe(true);

    // Trailing days từ 01/09 đến 06/09
    expect(flat[36].date).toBe('2026-09-01');
    expect(flat[41].date).toBe('2026-09-06');
    expect(flat[41].isCurrentMonth).toBe(false);
  });

  it('đánh dấu isToday chính xác', () => {
    const grid = buildMonthGrid(2026, 10, '2026-10-15');
    const today = grid.find((d) => d.date === '2026-10-15');
    const notToday = grid.find((d) => d.date === '2026-10-16');
    expect(today?.isToday).toBe(true);
    expect(notToday?.isToday).toBe(false);
  });
});

describe('Hàm gom sự kiện theo ngày groupCalendarItemsByDay', () => {
  it('gom activity và cycle event theo ngày đúng múi giờ VN', () => {
    const activities: CalendarActivityItem[] = [
      {
        id: 'act-1',
        type: ActivityType.FEEDING,
        performedAt: '2026-10-31T16:30:00.000Z', // 23:30 VN ngày 31/10
        areaId: 'area-1',
        area: { id: 'area-1', code: 'A1', name: 'Khu A' },
      },
      {
        id: 'act-2',
        type: ActivityType.IRRIGATION,
        performedAt: '2026-10-31T17:30:00.000Z', // 00:30 VN ngày 01/11
        areaId: 'area-1',
        area: { id: 'area-1', code: 'A1', name: 'Khu A' },
      },
    ];

    const cycleEvents: CalendarCycleEvent[] = [
      {
        cycleId: 'cycle-1',
        code: 'CYC-01',
        name: 'Vụ rau muống',
        kind: 'start',
        eventKind: 'start',
        cycleKind: CycleKind.CROP,
        date: '2026-10-31T01:00:00.000Z', // 08:00 VN ngày 31/10
      },
      {
        cycleId: 'cycle-2',
        code: 'CYC-02',
        name: 'Vụ cá tra',
        kind: 'end',
        eventKind: 'end',
        cycleKind: CycleKind.AQUA,
        date: '2026-10-31T16:45:00.000Z', // 23:45 VN ngày 31/10
      },
    ];

    const grouped = groupCalendarItemsByDay(activities, cycleEvents);

    // Ngày 2026-10-31 có act-1 và cả 2 cycle events
    expect(grouped['2026-10-31']).toBeDefined();
    expect(grouped['2026-10-31'].activities.map((a) => a.id)).toEqual(['act-1']);
    expect(grouped['2026-10-31'].cycleEvents.map((c) => c.cycleId)).toEqual(['cycle-1', 'cycle-2']);

    // Ngày 2026-11-01 có act-2
    expect(grouped['2026-11-01']).toBeDefined();
    expect(grouped['2026-11-01'].activities.map((a) => a.id)).toEqual(['act-2']);
    expect(grouped['2026-11-01'].cycleEvents).toHaveLength(0);
  });
});
