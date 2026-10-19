import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiModule from './api';
import {
  formatAlertDate,
  getAlertTypeInfo,
  getInventoryLink,
  getUnreadAlertCount,
  getAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
  runInventoryCheck,
  runMaintenanceCheck,
  type AlertItem,
} from './alerts-api';

vi.mock('./api', () => ({
  apiFetch: vi.fn(),
}));

describe('alerts-api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatAlertDate', () => {
    it('returns fallback for empty date', () => {
      expect(formatAlertDate(null)).toBe('—');
      expect(formatAlertDate(undefined)).toBe('—');
      expect(formatAlertDate('')).toBe('—');
    });

    it('formats a valid date string', () => {
      const result = formatAlertDate('2026-10-16T06:00:00.000Z');
      expect(result).not.toBe('—');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(5);
    });
  });

  describe('getAlertTypeInfo', () => {
    it('returns correct label and variant for known alert types', () => {
      expect(getAlertTypeInfo('LOW_STOCK')).toEqual({
        label: 'Tồn kho thấp',
        variant: 'warning',
      });
      expect(getAlertTypeInfo('LOT_EXPIRING')).toEqual({
        label: 'Lô sắp hết hạn',
        variant: 'destructive',
      });
      expect(getAlertTypeInfo('LOT_EXPIRED')).toEqual({
        label: 'Lô đã hết hạn',
        variant: 'destructive',
      });
      expect(getAlertTypeInfo('MAINTENANCE_DUE')).toEqual({
        label: 'Đến hạn bảo trì',
        variant: 'warning',
      });
    });

    it('returns fallback for unknown alert types', () => {
      expect(getAlertTypeInfo('CUSTOM_TYPE')).toEqual({
        label: 'CUSTOM_TYPE',
        variant: 'default',
      });
    });
  });

  describe('getInventoryLink', () => {
    it('returns equipment link for equipment maintenance alert', () => {
      const alert: AlertItem = {
        id: 'eq-1',
        type: 'MAINTENANCE_DUE',
        message: 'Lịch bảo trì đến hạn',
        refType: 'EQUIPMENT',
        refId: 'eq-123',
        createdAt: '2026-10-16T00:00:00Z',
      };
      const link = getInventoryLink(alert);
      expect(link.href).toBe('/admin/equipment/eq-123');
      expect(link.label).toContain('eq-123');
    });

    it('returns lot link for lot alert', () => {
      const alert: AlertItem = {
        id: '1',
        type: 'LOT_EXPIRING',
        message: 'Lô sắp hết hạn',
        refType: 'LOT',
        refId: 'lot-123',
        createdAt: '2026-10-16T00:00:00Z',
      };
      const link = getInventoryLink(alert);
      expect(link.href).toBe('/admin/inventory?lotId=lot-123');
      expect(link.label).toContain('lot-123');
    });

    it('returns item link for low stock alert', () => {
      const alert: AlertItem = {
        id: '2',
        type: 'LOW_STOCK',
        message: 'Hết hàng tồn',
        refType: 'ITEM',
        refId: 'item-456',
        createdAt: '2026-10-16T00:00:00Z',
      };
      const link = getInventoryLink(alert);
      expect(link.href).toBe('/admin/inventory?itemId=item-456');
      expect(link.label).toContain('item-456');
    });

    it('returns generic link when refId is missing', () => {
      const alert: AlertItem = {
        id: '3',
        type: 'SYSTEM',
        message: 'Cảnh báo hệ thống',
        createdAt: '2026-10-16T00:00:00Z',
      };
      const link = getInventoryLink(alert);
      expect(link.href).toBe('/admin/inventory');
    });
  });

  describe('getUnreadAlertCount', () => {
    it('handles numeric count response', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({ count: 5 });
      const count = await getUnreadAlertCount();
      expect(count).toBe(5);
    });

    it('handles nested data.count response', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({ data: { count: 3 } });
      const count = await getUnreadAlertCount();
      expect(count).toBe(3);
    });

    it('handles direct number response', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce(4);
      const count = await getUnreadAlertCount();
      expect(count).toBe(4);
    });

    it('returns 0 on error', async () => {
      vi.mocked(apiModule.apiFetch).mockRejectedValueOnce(new Error('Network error'));
      const count = await getUnreadAlertCount();
      expect(count).toBe(0);
    });
  });

  describe('getAlerts', () => {
    it('fetches alerts with query params and handles paginated response', async () => {
      const mockAlerts = [
        {
          id: '1',
          type: 'LOW_STOCK',
          message: 'Tồn kho thấp',
          createdAt: '2026-10-16T00:00:00Z',
        },
      ];
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({
        data: mockAlerts,
        total: 1,
        page: 1,
        pageSize: 10,
      });

      const res = await getAlerts({
        page: 1,
        pageSize: 10,
        unread: true,
        type: 'LOW_STOCK',
        sort: 'createdAt:desc',
      });
      expect(apiModule.apiFetch).toHaveBeenCalledWith(
        '/alerts?page=1&pageSize=10&unread=true&type=LOW_STOCK&sort=createdAt%3Adesc',
      );
      expect(res.data).toEqual(mockAlerts);
      expect(res.total).toBe(1);
    });

    it('handles array response gracefully', async () => {
      const mockAlerts = [
        {
          id: '2',
          type: 'LOT_EXPIRING',
          message: 'Lô sắp hết hạn',
          createdAt: '2026-10-16T00:00:00Z',
        },
      ];
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce(mockAlerts);

      const res = await getAlerts();
      expect(res.data).toEqual(mockAlerts);
      expect(res.total).toBe(1);
    });
  });

  describe('actions', () => {
    it('markAlertAsRead calls PATCH /alerts/:id/read', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({ success: true });
      await markAlertAsRead('alt-1');
      expect(apiModule.apiFetch).toHaveBeenCalledWith('/alerts/alt-1/read', { method: 'PATCH' });
    });

    it('markAllAlertsAsRead calls POST /alerts/read-all', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({ count: 10 });
      await markAllAlertsAsRead();
      expect(apiModule.apiFetch).toHaveBeenCalledWith('/alerts/read-all', { method: 'POST' });
    });

    it('runInventoryCheck calls POST /alerts/run-inventory-check', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({ status: 'ok' });
      await runInventoryCheck();
      expect(apiModule.apiFetch).toHaveBeenCalledWith('/alerts/run-inventory-check', {
        method: 'POST',
      });
    });

    it('runMaintenanceCheck calls POST /alerts/run-maintenance-check', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({ status: 'ok' });
      await runMaintenanceCheck();
      expect(apiModule.apiFetch).toHaveBeenCalledWith('/alerts/run-maintenance-check', {
        method: 'POST',
      });
    });
  });
});
