import { describe, it, expect } from 'vitest';
import { createEquipmentSchema, updateEquipmentSchema, queryEquipmentSchema } from './equipment';
import { EquipmentStatus } from '../types';

describe('Equipment schemas', () => {
  describe('createEquipmentSchema', () => {
    it('validates a valid equipment payload with defaults', () => {
      const payload = {
        name: 'Máy bơm tưới nhỏ giọt',
        type: 'PUMP',
      };
      const parsed = createEquipmentSchema.parse(payload);
      expect(parsed.name).toBe('Máy bơm tưới nhỏ giọt');
      expect(parsed.type).toBe('PUMP');
      expect(parsed.status).toBe(EquipmentStatus.ACTIVE);
      expect(parsed.isActive).toBe(true);
      expect(parsed.code).toBeUndefined();
    });

    it('validates a complete equipment payload', () => {
      const payload = {
        code: 'EQ-0001',
        name: 'Máy sục khí',
        type: 'AERATOR',
        areaId: 'area-123',
        purchaseDate: '2026-01-15T00:00:00.000Z',
        value: 12500000,
        status: EquipmentStatus.MAINTENANCE,
        notes: 'Cần thay cánh quạt',
        isActive: true,
      };
      const parsed = createEquipmentSchema.parse(payload);
      expect(parsed.code).toBe('EQ-0001');
      expect(parsed.value).toBe(12500000);
      expect(parsed.status).toBe(EquipmentStatus.MAINTENANCE);
      expect(parsed.purchaseDate).toBeInstanceOf(Date);
    });

    it('rejects missing or empty name', () => {
      expect(() => createEquipmentSchema.parse({ name: '', type: 'PUMP' })).toThrow();
      expect(() => createEquipmentSchema.parse({ type: 'PUMP' })).toThrow();
    });

    it('rejects negative value', () => {
      expect(() =>
        createEquipmentSchema.parse({ name: 'Máy cày', type: 'TRACTOR', value: -500 }),
      ).toThrow();
    });
  });

  describe('updateEquipmentSchema', () => {
    it('allows partial updates', () => {
      const parsed = updateEquipmentSchema.parse({
        status: EquipmentStatus.BROKEN,
        notes: 'Hỏng động cơ',
      });
      expect(parsed.status).toBe(EquipmentStatus.BROKEN);
      expect(parsed.notes).toBe('Hỏng động cơ');
      expect(parsed.name).toBeUndefined();
    });
  });

  describe('queryEquipmentSchema', () => {
    it('parses pagination and filters', () => {
      const parsed = queryEquipmentSchema.parse({
        page: '1',
        pageSize: '20',
        status: EquipmentStatus.ACTIVE,
        type: 'PUMP',
        isActive: 'true',
      });
      expect(parsed.page).toBe(1);
      expect(parsed.pageSize).toBe(20);
      expect(parsed.status).toBe(EquipmentStatus.ACTIVE);
      expect(parsed.type).toBe('PUMP');
      expect(parsed.isActive).toBe(true);
    });
  });
});
