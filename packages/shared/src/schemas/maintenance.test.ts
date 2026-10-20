import { describe, it, expect } from 'vitest';
import {
  createMaintenanceScheduleSchema,
  updateMaintenanceScheduleSchema,
  queryMaintenanceScheduleSchema,
  createMaintenanceLogSchema,
  updateMaintenanceLogSchema,
  queryMaintenanceLogSchema,
} from './maintenance';
import { MaintenanceType } from '../types';

describe('Maintenance schemas', () => {
  describe('createMaintenanceScheduleSchema', () => {
    it('validates a valid maintenance schedule', () => {
      const payload = {
        equipmentId: 'eq-1',
        name: 'Thay dầu nhớt',
        intervalDays: 30,
        nextDueDate: '2026-11-01T00:00:00.000Z',
      };
      const parsed = createMaintenanceScheduleSchema.parse(payload);
      expect(parsed.equipmentId).toBe('eq-1');
      expect(parsed.intervalDays).toBe(30);
      expect(parsed.isActive).toBe(true);
      expect(parsed.nextDueDate).toBeInstanceOf(Date);
    });

    it('rejects non-positive intervalDays', () => {
      expect(() =>
        createMaintenanceScheduleSchema.parse({
          equipmentId: 'eq-1',
          name: 'Bảo trì',
          intervalDays: 0,
          nextDueDate: '2026-11-01',
        }),
      ).toThrow();
    });
  });

  describe('updateMaintenanceScheduleSchema', () => {
    it('allows updating nextDueDate and isActive', () => {
      const parsed = updateMaintenanceScheduleSchema.parse({
        nextDueDate: '2026-12-01',
        isActive: false,
      });
      expect(parsed.nextDueDate).toBeInstanceOf(Date);
      expect(parsed.isActive).toBe(false);
    });
  });

  describe('queryMaintenanceScheduleSchema', () => {
    it('parses maintenance schedule queries', () => {
      const parsed = queryMaintenanceScheduleSchema.parse({
        equipmentId: 'eq-1',
        isActive: 'true',
        dueBefore: '2026-12-31',
        page: '1',
        pageSize: '10',
      });
      expect(parsed.equipmentId).toBe('eq-1');
      expect(parsed.isActive).toBe(true);
      expect(parsed.dueBefore).toBeInstanceOf(Date);
    });
  });

  describe('createMaintenanceLogSchema', () => {
    it('validates a valid maintenance log', () => {
      const payload = {
        equipmentId: 'eq-1',
        scheduleId: 'sch-1',
        date: '2026-10-18T10:00:00.000Z',
        type: MaintenanceType.ROUTINE,
        cost: 350000,
        notes: 'Thay dầu và lọc gió',
        performedById: 'user-worker-1',
      };
      const parsed = createMaintenanceLogSchema.parse(payload);
      expect(parsed.equipmentId).toBe('eq-1');
      expect(parsed.type).toBe(MaintenanceType.ROUTINE);
      expect(parsed.cost).toBe(350000);
      expect(parsed.date).toBeInstanceOf(Date);
    });

    it('defaults cost to 0 when empty or missing', () => {
      const payload = {
        equipmentId: 'eq-1',
        date: '2026-10-18T10:00:00.000Z',
        type: MaintenanceType.INSPECTION,
      };
      const parsed = createMaintenanceLogSchema.parse(payload);
      expect(parsed.cost).toBe(0);
    });

    it('rejects invalid maintenance type', () => {
      expect(() =>
        createMaintenanceLogSchema.parse({
          equipmentId: 'eq-1',
          date: '2026-10-18',
          type: 'INVALID_TYPE',
        }),
      ).toThrow();
    });
  });

  describe('updateMaintenanceLogSchema and queries', () => {
    it('allows partial log updates', () => {
      const parsed = updateMaintenanceLogSchema.parse({
        notes: 'Đã bổ sung mỡ bò',
        cost: 50000,
      });
      expect(parsed.notes).toBe('Đã bổ sung mỡ bò');
      expect(parsed.cost).toBe(50000);
    });

    it('parses queryMaintenanceLogSchema', () => {
      const parsed = queryMaintenanceLogSchema.parse({
        equipmentId: 'eq-1',
        type: MaintenanceType.REPAIR,
        page: '1',
        pageSize: '10',
      });
      expect(parsed.equipmentId).toBe('eq-1');
      expect(parsed.type).toBe(MaintenanceType.REPAIR);
      expect(parsed.page).toBe(1);
    });
  });
});
