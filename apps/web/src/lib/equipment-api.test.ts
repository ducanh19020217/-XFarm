import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiModule from './api';
import {
  getEquipmentMaintenanceStatus,
  formatVNDate,
  formatCurrencyVN,
  getEquipmentList,
  getEquipmentDetail,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  createEquipmentSchedule,
  updateEquipmentSchedule,
  deleteEquipmentSchedule,
  createEquipmentLog,
  type EquipmentScheduleItem,
} from './equipment-api';
import { EquipmentStatus, MaintenanceType } from '@xfarm/shared';

vi.mock('./api', () => ({
  apiFetch: vi.fn(),
}));

describe('equipment-api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatVNDate', () => {
    it('returns fallback for empty date', () => {
      expect(formatVNDate(null)).toBe('—');
      expect(formatVNDate(undefined)).toBe('—');
      expect(formatVNDate('')).toBe('—');
    });

    it('formats valid date string', () => {
      const res = formatVNDate('2026-10-19T00:00:00.000Z');
      expect(res).not.toBe('—');
      expect(res).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe('formatCurrencyVN', () => {
    it('formats number correctly with VND symbol', () => {
      expect(formatCurrencyVN(150000)).toMatch(/150\.000\s?₫/);
      expect(formatCurrencyVN(0)).toMatch(/0\s?₫/);
      expect(formatCurrencyVN(null)).toBe('0 ₫');
      expect(formatCurrencyVN(undefined)).toBe('0 ₫');
    });
  });

  describe('getEquipmentMaintenanceStatus', () => {
    const referenceDate = new Date('2026-10-19T10:00:00.000Z');

    it('returns false for overdue and dueSoon when no schedules exist', () => {
      const res = getEquipmentMaintenanceStatus([], referenceDate);
      expect(res.isOverdue).toBe(false);
      expect(res.isDueSoon).toBe(false);
      expect(res.earliestDueDate).toBeNull();
    });

    it('ignores inactive schedules', () => {
      const schedules: EquipmentScheduleItem[] = [
        {
          id: '1',
          equipmentId: 'eq-1',
          name: 'Lịch cũ đã tắt',
          intervalDays: 30,
          nextDueDate: '2026-10-15T00:00:00.000Z', // overdue
          isActive: false,
          createdAt: '2026-09-01T00:00:00.000Z',
        },
      ];
      const res = getEquipmentMaintenanceStatus(schedules, referenceDate);
      expect(res.isOverdue).toBe(false);
      expect(res.isDueSoon).toBe(false);
    });

    it('detects overdue schedule (nextDueDate < today)', () => {
      const schedules: EquipmentScheduleItem[] = [
        {
          id: '1',
          equipmentId: 'eq-1',
          name: 'Lịch quá hạn',
          intervalDays: 30,
          nextDueDate: '2026-10-15T00:00:00.000Z',
          isActive: true,
          createdAt: '2026-09-01T00:00:00.000Z',
        },
      ];
      const res = getEquipmentMaintenanceStatus(schedules, referenceDate);
      expect(res.isOverdue).toBe(true);
      expect(res.isDueSoon).toBe(false);
      expect(res.daysRemaining).toBeLessThan(0);
    });

    it('detects due soon schedule (within 3 days)', () => {
      const schedules: EquipmentScheduleItem[] = [
        {
          id: '2',
          equipmentId: 'eq-1',
          name: 'Lịch đến hạn trong 2 ngày',
          intervalDays: 30,
          nextDueDate: '2026-10-21T00:00:00.000Z',
          isActive: true,
          createdAt: '2026-09-01T00:00:00.000Z',
        },
      ];
      const res = getEquipmentMaintenanceStatus(schedules, referenceDate);
      expect(res.isOverdue).toBe(false);
      expect(res.isDueSoon).toBe(true);
      expect(res.daysRemaining).toBe(2);
    });

    it('detects schedule due today (0 days) as dueSoon', () => {
      const schedules: EquipmentScheduleItem[] = [
        {
          id: '2',
          equipmentId: 'eq-1',
          name: 'Lịch đến hạn hôm nay',
          intervalDays: 30,
          nextDueDate: '2026-10-19T00:00:00.000Z',
          isActive: true,
          createdAt: '2026-09-01T00:00:00.000Z',
        },
      ];
      const res = getEquipmentMaintenanceStatus(schedules, referenceDate);
      expect(res.isOverdue).toBe(false);
      expect(res.isDueSoon).toBe(true);
      expect(res.daysRemaining).toBe(0);
    });

    it('returns not due soon when nextDueDate > 3 days', () => {
      const schedules: EquipmentScheduleItem[] = [
        {
          id: '3',
          equipmentId: 'eq-1',
          name: 'Lịch còn xa',
          intervalDays: 30,
          nextDueDate: '2026-10-30T00:00:00.000Z',
          isActive: true,
          createdAt: '2026-09-01T00:00:00.000Z',
        },
      ];
      const res = getEquipmentMaintenanceStatus(schedules, referenceDate);
      expect(res.isOverdue).toBe(false);
      expect(res.isDueSoon).toBe(false);
      expect(res.daysRemaining).toBe(11);
    });
  });

  describe('API calls', () => {
    it('getEquipmentList builds query string and returns data', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({
        data: [{ id: 'eq-1', name: 'Máy cày' }],
        total: 1,
        page: 1,
        pageSize: 10,
      });

      const res = await getEquipmentList({
        page: 1,
        pageSize: 10,
        search: 'Máy cày',
        type: 'TRACTOR',
        status: 'ACTIVE',
      });

      expect(apiModule.apiFetch).toHaveBeenCalledWith(
        '/equipment?page=1&pageSize=10&search=M%C3%A1y+c%C3%A0y&type=TRACTOR&status=ACTIVE',
        { signal: undefined },
      );
      expect(res.data.length).toBe(1);
      expect(res.total).toBe(1);
    });

    it('getEquipmentDetail fetches single equipment with details', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({
        data: { id: 'eq-1', name: 'Máy bơm nước' },
      });

      const res = await getEquipmentDetail('eq-1');
      expect(apiModule.apiFetch).toHaveBeenCalledWith('/equipment/eq-1', { signal: undefined });
      expect(res.name).toBe('Máy bơm nước');
    });

    it('createEquipment sends POST /equipment', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({
        data: { id: 'eq-new', name: 'Máy cắt cỏ' },
      });

      const res = await createEquipment({
        name: 'Máy cắt cỏ',
        type: 'MOWER',
        status: EquipmentStatus.ACTIVE,
      });

      expect(apiModule.apiFetch).toHaveBeenCalledWith('/equipment', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Máy cắt cỏ',
          type: 'MOWER',
          status: EquipmentStatus.ACTIVE,
        }),
      });
      expect(res.id).toBe('eq-new');
    });

    it('createEquipmentSchedule sends POST /equipment/:id/maintenance-schedules', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({
        data: { id: 'sch-1', name: 'Thay dầu' },
      });

      const res = await createEquipmentSchedule('eq-1', {
        name: 'Thay dầu',
        intervalDays: 30,
        nextDueDate: '2026-11-01',
      });

      expect(apiModule.apiFetch).toHaveBeenCalledWith('/equipment/eq-1/maintenance-schedules', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Thay dầu',
          intervalDays: 30,
          nextDueDate: '2026-11-01',
        }),
      });
      expect(res.id).toBe('sch-1');
    });

    it('createEquipmentLog sends POST /equipment/:id/maintenance-logs', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({
        data: { id: 'log-1', cost: 150000 },
      });

      const res = await createEquipmentLog('eq-1', {
        date: '2026-10-19',
        type: MaintenanceType.ROUTINE,
        cost: 150000,
        scheduleId: 'sch-1',
        notes: 'Đã thay nhớt',
      });

      expect(apiModule.apiFetch).toHaveBeenCalledWith('/equipment/eq-1/maintenance-logs', {
        method: 'POST',
        body: JSON.stringify({
          date: '2026-10-19',
          type: MaintenanceType.ROUTINE,
          cost: 150000,
          scheduleId: 'sch-1',
          notes: 'Đã thay nhớt',
        }),
      });
      expect(res.id).toBe('log-1');
    });
  });
});
