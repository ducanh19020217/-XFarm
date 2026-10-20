import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@xfarm/db';
import {
  AlertsService,
  formatVNDate,
  getVNDateKey,
  getVNInventoryCheckBoundaries,
  getVNMaintenanceCheckBoundaries,
} from './alerts.service';

jest.mock('@xfarm/db', () => ({
  prisma: {
    item: {
      findMany: jest.fn(),
    },
    stockLot: {
      findMany: jest.fn(),
    },
    stockMove: {
      findMany: jest.fn(),
    },
    maintenanceSchedule: {
      findMany: jest.fn(),
    },
    alert: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  },
  Prisma: {
    Decimal: class MockDecimal {
      private val: number;
      constructor(v: number | string | MockDecimal) {
        if (v instanceof MockDecimal) this.val = v.val;
        else this.val = Number(v);
      }
      add(other: MockDecimal) {
        return new MockDecimal(this.val + other.val);
      }
      sub(other: MockDecimal) {
        return new MockDecimal(this.val - other.val);
      }
      lessThan(other: MockDecimal) {
        return this.val < other.val;
      }
      lte(other: number | MockDecimal) {
        const o = other instanceof MockDecimal ? other.val : other;
        return this.val <= o;
      }
      greaterThan(other: number | MockDecimal) {
        const o = other instanceof MockDecimal ? other.val : other;
        return this.val > o;
      }
      toString() {
        return String(this.val);
      }
    },
  },
}));

import { prisma } from '@xfarm/db';

describe('AlertsService', () => {
  let service: AlertsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AlertsService();
  });

  describe('Date Helpers', () => {
    it('getVNDateKey trả về chuỗi YYYY-MM-DD theo giờ VN', () => {
      const date = new Date('2026-10-16T00:00:00Z');
      const key = getVNDateKey(date);
      expect(key).toBe('2026-10-16');
    });

    it('formatVNDate định dạng DD/MM/YYYY theo giờ VN', () => {
      const date = new Date('2026-10-30T00:00:00Z');
      const formatted = formatVNDate(date);
      expect(formatted).toBe('30/10/2026');
    });

    const testTimezones = ['UTC', 'America/New_York', 'Asia/Ho_Chi_Minh'];

    it.each(testTimezones)(
      'getVNInventoryCheckBoundaries tính boundary chuẩn theo giờ VN khi process.env.TZ là %s',
      (tz) => {
        const originalTz = process.env.TZ;
        try {
          process.env.TZ = tz;
          // 06:00 VN ngày 2026-10-16 tương ứng 2026-10-15T23:00:00.000Z
          const refDate = new Date('2026-10-15T23:00:00.000Z');
          const { todayStart, thirtyDaysLater } = getVNInventoryCheckBoundaries(refDate);

          // Đầu ngày 2026-10-16 00:00:00+07:00 -> UTC 2026-10-15T17:00:00.000Z
          expect(todayStart.toISOString()).toBe('2026-10-15T17:00:00.000Z');

          // Cuối ngày thứ 30 (2026-11-15 23:59:59.999+07:00) -> UTC 2026-11-15T16:59:59.999Z
          expect(thirtyDaysLater.toISOString()).toBe('2026-11-15T16:59:59.999Z');
        } finally {
          process.env.TZ = originalTz;
        }
      },
    );

    it.each(testTimezones)(
      'getVNInventoryCheckBoundaries xử lý đúng qua bước chuyển tháng và năm khi process.env.TZ là %s',
      (tz) => {
        const originalTz = process.env.TZ;
        try {
          process.env.TZ = tz;
          // Ngày 2026-12-15 06:00 VN (UTC 2026-12-14T23:00:00.000Z) -> 30 ngày sau là 2027-01-14
          const refDate = new Date('2026-12-14T23:00:00.000Z');
          const { todayStart, thirtyDaysLater } = getVNInventoryCheckBoundaries(refDate);

          expect(todayStart.toISOString()).toBe('2026-12-14T17:00:00.000Z');
          expect(thirtyDaysLater.toISOString()).toBe('2027-01-14T16:59:59.999Z');
        } finally {
          process.env.TZ = originalTz;
        }
      },
    );

    it.each(testTimezones)(
      'getVNDateKey và formatVNDate nhất quán bất kể process.env.TZ là %s',
      (tz) => {
        const originalTz = process.env.TZ;
        try {
          process.env.TZ = tz;
          const date = new Date('2026-10-15T23:00:00.000Z'); // 06:00 VN ngày 2026-10-16
          expect(getVNDateKey(date)).toBe('2026-10-16');
          expect(formatVNDate(date)).toBe('16/10/2026');
        } finally {
          process.env.TZ = originalTz;
        }
      },
    );
  });

  describe('runInventoryCheck', () => {
    it('tạo cảnh báo LOW_STOCK cho item có minStock mà tổng tồn < minStock', async () => {
      const refDate = new Date('2026-10-16T06:00:00Z');
      const mockItems = [
        {
          id: 'item-1',
          name: 'Phân NPK',
          sku: 'NPK-01',
          unit: 'kg',
          minStock: new Prisma.Decimal(10),
          isActive: true,
        },
      ];
      const mockMoves = [
        {
          itemId: 'item-1',
          type: 'IN',
          quantity: new Prisma.Decimal(4),
          direction: null,
          toWarehouseId: 'wh-1',
          fromWarehouseId: null,
        },
      ];

      (prisma.item.findMany as jest.Mock).mockResolvedValue(mockItems);
      (prisma.stockMove.findMany as jest.Mock)
        .mockResolvedValueOnce(mockMoves) // itemMoves
        .mockResolvedValueOnce([]); // lotMoves
      (prisma.stockLot.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.alert.upsert as jest.Mock).mockResolvedValue({ id: 'alert-1' });

      const result = await service.runInventoryCheck(refDate);

      expect(result.lowStockCount).toBe(1);
      expect(prisma.alert.upsert).toHaveBeenCalledWith({
        where: { dedupeKey: 'LOW_STOCK:item-1:2026-10-16' },
        create: expect.objectContaining({
          type: 'LOW_STOCK',
          refType: 'ITEM',
          refId: 'item-1',
          dedupeKey: 'LOW_STOCK:item-1:2026-10-16',
          message: expect.stringContaining('Phân NPK'),
        }),
        update: {},
      });
    });

    it('tạo cảnh báo LOT_EXPIRING khi lô còn tồn và hết hạn trong 30 ngày', async () => {
      const refDate = new Date('2026-10-16T06:00:00Z');
      const mockLots = [
        {
          id: 'lot-1',
          lotCode: 'LOT-2026-A',
          expiryDate: new Date('2026-10-30T00:00:00Z'),
          item: {
            id: 'item-1',
            name: 'Phân vi sinh',
            sku: 'PVS',
            unit: 'bao',
            isActive: true,
          },
        },
      ];
      const mockLotMoves = [
        {
          stockLotId: 'lot-1',
          type: 'IN',
          quantity: new Prisma.Decimal(5),
          direction: null,
          toWarehouseId: 'wh-1',
          fromWarehouseId: null,
        },
      ];

      (prisma.item.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.stockLot.findMany as jest.Mock).mockResolvedValue(mockLots);
      (prisma.stockMove.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // itemMoves
        .mockResolvedValueOnce(mockLotMoves); // lotMoves
      (prisma.alert.upsert as jest.Mock).mockResolvedValue({ id: 'alert-2' });

      const result = await service.runInventoryCheck(refDate);

      expect(result.expiringCount).toBe(1);
      expect(prisma.alert.upsert).toHaveBeenCalledWith({
        where: { dedupeKey: 'LOT_EXPIRING:lot-1:2026-10-16' },
        create: expect.objectContaining({
          type: 'LOT_EXPIRING',
          refType: 'STOCK_LOT',
          refId: 'lot-1',
          dedupeKey: 'LOT_EXPIRING:lot-1:2026-10-16',
          message: expect.stringContaining('sẽ hết hạn vào ngày 30/10/2026'),
        }),
        update: {},
      });
    });

    it('tạo cảnh báo LOT_EXPIRED khi lô đã quá hạn mà vẫn còn tồn kho', async () => {
      const refDate = new Date('2026-10-16T06:00:00Z');
      const mockLots = [
        {
          id: 'lot-expired',
          lotCode: 'LOT-OLD-99',
          expiryDate: new Date('2026-10-10T00:00:00Z'),
          item: {
            id: 'item-2',
            name: 'Thuốc trừ sâu',
            sku: 'PEST-01',
            unit: 'chai',
            isActive: true,
          },
        },
      ];
      const mockLotMoves = [
        {
          stockLotId: 'lot-expired',
          type: 'IN',
          quantity: new Prisma.Decimal(2),
          direction: null,
          toWarehouseId: 'wh-1',
          fromWarehouseId: null,
        },
      ];

      (prisma.item.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.stockLot.findMany as jest.Mock).mockResolvedValue(mockLots);
      (prisma.stockMove.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockLotMoves);
      (prisma.alert.upsert as jest.Mock).mockResolvedValue({ id: 'alert-3' });

      const result = await service.runInventoryCheck(refDate);

      expect(result.expiredCount).toBe(1);
      expect(prisma.alert.upsert).toHaveBeenCalledWith({
        where: { dedupeKey: 'LOT_EXPIRED:lot-expired:2026-10-16' },
        create: expect.objectContaining({
          type: 'LOT_EXPIRED',
          refType: 'STOCK_LOT',
          refId: 'lot-expired',
          dedupeKey: 'LOT_EXPIRED:lot-expired:2026-10-16',
          message: expect.stringContaining('đã hết hạn vào ngày 10/10/2026'),
        }),
        update: {},
      });
    });

    it('không tạo cảnh báo cho lô đã hết tồn (tồn = 0)', async () => {
      const refDate = new Date('2026-10-16T06:00:00Z');
      const mockLots = [
        {
          id: 'lot-empty',
          lotCode: 'LOT-EMPTY',
          expiryDate: new Date('2026-10-20T00:00:00Z'),
          item: {
            id: 'item-1',
            name: 'Hạt giống',
            sku: 'SEED-01',
            unit: 'gói',
            isActive: true,
          },
        },
      ];
      const mockLotMoves = [
        {
          stockLotId: 'lot-empty',
          type: 'IN',
          quantity: new Prisma.Decimal(5),
          direction: null,
          toWarehouseId: 'wh-1',
          fromWarehouseId: null,
        },
        {
          stockLotId: 'lot-empty',
          type: 'OUT',
          quantity: new Prisma.Decimal(5),
          direction: null,
          toWarehouseId: null,
          fromWarehouseId: 'wh-1',
        },
      ];

      (prisma.item.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.stockLot.findMany as jest.Mock).mockResolvedValue(mockLots);
      (prisma.stockMove.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockLotMoves);

      const result = await service.runInventoryCheck(refDate);

      expect(result.expiringCount).toBe(0);
      expect(result.expiredCount).toBe(0);
      expect(prisma.alert.upsert).not.toHaveBeenCalled();
    });

    it.each(['UTC', 'America/New_York', 'Asia/Ho_Chi_Minh'])(
      'phân loại chính xác LOT_EXPIRED và LOT_EXPIRING gần ranh giới ngày độc lập với timezone process (TZ=%s)',
      async (tz) => {
        const originalTz = process.env.TZ;
        try {
          process.env.TZ = tz;
          // Giả sử job chạy lúc 06:00 VN ngày 2026-10-16 (UTC: 2026-10-15T23:00:00.000Z)
          const refDate = new Date('2026-10-15T23:00:00.000Z');

          const mockLots = [
            {
              id: 'lot-expired-edge',
              lotCode: 'LOT-EXP-EDGE',
              // Hết hạn lúc 23:59:59 ngày hôm trước theo giờ VN (2026-10-15 23:59:59+07:00 = 2026-10-15T16:59:59.000Z)
              // Lô này đã hết hạn trước khi ngày 2026-10-16 bắt đầu -> LOT_EXPIRED
              expiryDate: new Date('2026-10-15T16:59:59.000Z'),
              item: {
                id: 'item-1',
                name: 'Phân bón A',
                sku: 'PB-A',
                unit: 'bao',
                isActive: true,
              },
            },
            {
              id: 'lot-expiring-start-edge',
              lotCode: 'LOT-ING-START',
              // Hết hạn lúc 00:00:00 ngày hôm nay theo giờ VN (2026-10-16 00:00:00+07:00 = 2026-10-15T17:00:00.000Z)
              // Lô này chưa quá hạn trước hôm nay, thuộc ngày hôm nay -> LOT_EXPIRING
              expiryDate: new Date('2026-10-15T17:00:00.000Z'),
              item: {
                id: 'item-2',
                name: 'Phân bón B',
                sku: 'PB-B',
                unit: 'bao',
                isActive: true,
              },
            },
            {
              id: 'lot-expiring-end-edge',
              lotCode: 'LOT-ING-END',
              // Hết hạn vào đúng 23:59:59.999 ngày thứ 30 theo giờ VN (2026-11-15 23:59:59.999+07:00 = 2026-11-15T16:59:59.999Z)
              // Nằm trọn trong 30 ngày tới -> LOT_EXPIRING
              expiryDate: new Date('2026-11-15T16:59:59.999Z'),
              item: {
                id: 'item-3',
                name: 'Thuốc C',
                sku: 'TC-01',
                unit: 'chai',
                isActive: true,
              },
            },
            {
              id: 'lot-future-out-of-range',
              lotCode: 'LOT-FUTURE',
              // Hết hạn vào 00:00:00 ngày thứ 31 theo giờ VN (2026-11-16 00:00:00+07:00 = 2026-11-15T17:00:00.000Z)
              // Không thuộc 30 ngày tới -> không sinh alert
              expiryDate: new Date('2026-11-15T17:00:00.000Z'),
              item: {
                id: 'item-4',
                name: 'Thuốc D',
                sku: 'TD-01',
                unit: 'chai',
                isActive: true,
              },
            },
          ];

          const mockLotMoves = [
            { stockLotId: 'lot-expired-edge', type: 'IN', quantity: new Prisma.Decimal(10) },
            { stockLotId: 'lot-expiring-start-edge', type: 'IN', quantity: new Prisma.Decimal(10) },
            { stockLotId: 'lot-expiring-end-edge', type: 'IN', quantity: new Prisma.Decimal(10) },
            { stockLotId: 'lot-future-out-of-range', type: 'IN', quantity: new Prisma.Decimal(10) },
          ];

          (prisma.item.findMany as jest.Mock).mockResolvedValue([]);
          (prisma.stockLot.findMany as jest.Mock).mockResolvedValue(mockLots);
          (prisma.stockMove.findMany as jest.Mock)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(mockLotMoves);
          (prisma.alert.upsert as jest.Mock).mockResolvedValue({ id: 'alert-ok' });

          const result = await service.runInventoryCheck(refDate);

          expect(result.expiredCount).toBe(1);
          expect(result.expiringCount).toBe(2);

          expect(prisma.alert.upsert).toHaveBeenCalledWith({
            where: { dedupeKey: 'LOT_EXPIRED:lot-expired-edge:2026-10-16' },
            create: expect.objectContaining({
              type: 'LOT_EXPIRED',
              refId: 'lot-expired-edge',
              dedupeKey: 'LOT_EXPIRED:lot-expired-edge:2026-10-16',
            }),
            update: {},
          });

          expect(prisma.alert.upsert).toHaveBeenCalledWith({
            where: { dedupeKey: 'LOT_EXPIRING:lot-expiring-start-edge:2026-10-16' },
            create: expect.objectContaining({
              type: 'LOT_EXPIRING',
              refId: 'lot-expiring-start-edge',
              dedupeKey: 'LOT_EXPIRING:lot-expiring-start-edge:2026-10-16',
            }),
            update: {},
          });

          expect(prisma.alert.upsert).toHaveBeenCalledWith({
            where: { dedupeKey: 'LOT_EXPIRING:lot-expiring-end-edge:2026-10-16' },
            create: expect.objectContaining({
              type: 'LOT_EXPIRING',
              refId: 'lot-expiring-end-edge',
              dedupeKey: 'LOT_EXPIRING:lot-expiring-end-edge:2026-10-16',
            }),
            update: {},
          });

          expect(prisma.alert.upsert).not.toHaveBeenCalledWith(
            expect.objectContaining({
              where: { dedupeKey: expect.stringContaining('lot-future-out-of-range') },
            }),
          );
        } finally {
          process.env.TZ = originalTz;
        }
      },
    );

    it.each(['UTC', 'America/New_York'])(
      'runInventoryCheck với default date (new Date()) chạy đồng nhất khi process.env.TZ là %s',
      async (tz) => {
        const originalTz = process.env.TZ;
        jest.useFakeTimers();
        try {
          process.env.TZ = tz;
          // Set system time: 06:00 VN ngày 2026-10-16
          jest.setSystemTime(new Date('2026-10-15T23:00:00.000Z'));

          const mockLots = [
            {
              id: 'lot-exp-1',
              lotCode: 'LOT-EXP-1',
              expiryDate: new Date('2026-10-15T16:59:59.000Z'),
              item: { id: 'item-1', name: 'Phân bón A', sku: 'PB-A', unit: 'bao', isActive: true },
            },
          ];
          const mockMoves = [
            { stockLotId: 'lot-exp-1', type: 'IN', quantity: new Prisma.Decimal(5) },
          ];

          (prisma.item.findMany as jest.Mock).mockResolvedValue([]);
          (prisma.stockLot.findMany as jest.Mock).mockResolvedValue(mockLots);
          (prisma.stockMove.findMany as jest.Mock)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(mockMoves);
          (prisma.alert.upsert as jest.Mock).mockResolvedValue({ id: 'alert-ok' });

          const result = await service.runInventoryCheck();

          expect(result.expiredCount).toBe(1);
          expect(prisma.alert.upsert).toHaveBeenCalledWith({
            where: { dedupeKey: 'LOT_EXPIRED:lot-exp-1:2026-10-16' },
            create: expect.objectContaining({
              type: 'LOT_EXPIRED',
              refId: 'lot-exp-1',
              dedupeKey: 'LOT_EXPIRED:lot-exp-1:2026-10-16',
            }),
            update: {},
          });
        } finally {
          jest.useRealTimers();
          process.env.TZ = originalTz;
        }
      },
    );
  });

  describe('findAll, findById, markRead, markAllRead, getUnreadCount', () => {
    it('findAll trả về danh sách phân trang và lọc unread/type', async () => {
      const mockAlerts = [{ id: 'a1', message: 'Tồn thấp', type: 'LOW_STOCK', readAt: null }];
      (prisma.alert.findMany as jest.Mock).mockResolvedValue(mockAlerts);
      (prisma.alert.count as jest.Mock).mockResolvedValue(1);

      const res = await service.findAll({ unread: true, type: 'LOW_STOCK', page: 1, pageSize: 10 });
      expect(res.data).toEqual(mockAlerts);
      expect(res.total).toBe(1);
      expect(prisma.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'LOW_STOCK', readAt: null },
        }),
      );
    });

    it('findById ném lỗi NotFoundException khi không tìm thấy', async () => {
      (prisma.alert.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('markRead cập nhật readAt của cảnh báo', async () => {
      (prisma.alert.findUnique as jest.Mock).mockResolvedValue({ id: 'a1', readAt: null });
      (prisma.alert.update as jest.Mock).mockResolvedValue({ id: 'a1', readAt: new Date() });

      const updated = await service.markRead('a1');
      expect(updated.id).toBe('a1');
      expect(prisma.alert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'a1' },
        }),
      );
    });

    it('markAllRead đánh dấu tất cả cảnh báo chưa đọc', async () => {
      (prisma.alert.updateMany as jest.Mock).mockResolvedValue({ count: 5 });
      const res = await service.markAllRead();
      expect(res.count).toBe(5);
      expect(prisma.alert.updateMany).toHaveBeenCalledWith({
        where: { readAt: null },
        data: expect.objectContaining({ readAt: expect.any(Date) }),
      });
    });

    it('getUnreadCount đếm cảnh báo có readAt là null', async () => {
      (prisma.alert.count as jest.Mock).mockResolvedValue(3);
      const count = await service.getUnreadCount();
      expect(count).toBe(3);
      expect(prisma.alert.count).toHaveBeenCalledWith({ where: { readAt: null } });
    });
  });

  describe('runMaintenanceCheck & boundaries', () => {
    it('getVNMaintenanceCheckBoundaries tính toán đúng ngày kết thúc sau 3 ngày theo giờ VN', () => {
      const ref = new Date('2026-10-19T03:00:00.000Z'); // 10:00 VN
      const boundaries = getVNMaintenanceCheckBoundaries(ref);
      expect(boundaries.todayStart).toBeInstanceOf(Date);
      expect(boundaries.threeDaysLaterEnd).toBeInstanceOf(Date);
      expect(boundaries.threeDaysLaterEnd.getTime()).toBeGreaterThan(
        boundaries.todayStart.getTime(),
      );
    });

    it('runMaintenanceCheck tạo cảnh báo MAINTENANCE_DUE cho lịch đến hạn trong 3 ngày', async () => {
      const nextDue = new Date('2026-10-21T00:00:00.000Z');
      const mockSchedules = [
        {
          id: 'sch-1',
          name: 'Bảo dưỡng máy bơm',
          nextDueDate: nextDue,
          equipment: {
            id: 'eq-1',
            code: 'EQ-0001',
            name: 'Máy bơm khu rau',
          },
        },
      ];

      (prisma.maintenanceSchedule.findMany as jest.Mock).mockResolvedValue(mockSchedules);
      (prisma.alert.upsert as jest.Mock).mockResolvedValue({ id: 'alert-1' });

      const res = await service.runMaintenanceCheck(new Date('2026-10-19T00:00:00.000Z'));
      expect(res.dueCount).toBe(1);
      expect(res.totalAlertsCreated).toBe(1);

      expect(prisma.alert.upsert).toHaveBeenCalledWith({
        where: { dedupeKey: 'maint:sch-1:2026-10-21' },
        create: {
          type: 'MAINTENANCE_DUE',
          message: expect.stringContaining('Máy bơm khu rau'),
          refType: 'EQUIPMENT',
          refId: 'eq-1',
          dedupeKey: 'maint:sch-1:2026-10-21',
        },
        update: {},
      });
    });
  });
});
