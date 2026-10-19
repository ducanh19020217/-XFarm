import { describe, it, expect } from 'vitest';
import { createSensorSchema, updateSensorSchema, querySensorSchema } from './sensor';
import { SensorType } from '../types';

describe('Sensor schemas', () => {
  describe('createSensorSchema', () => {
    it('validates a valid sensor definition', () => {
      const payload = {
        name: 'Cảm biến nhiệt độ nhà màng',
        type: SensorType.TEMP,
        unit: '°C',
        areaId: 'area-gh-1',
      };
      const parsed = createSensorSchema.parse(payload);
      expect(parsed.name).toBe('Cảm biến nhiệt độ nhà màng');
      expect(parsed.type).toBe(SensorType.TEMP);
      expect(parsed.unit).toBe('°C');
      expect(parsed.areaId).toBe('area-gh-1');
      expect(parsed.isActive).toBe(true);
    });

    it('rejects missing areaId', () => {
      expect(() =>
        createSensorSchema.parse({
          name: 'Cảm biến pH',
          type: SensorType.PH,
          unit: 'pH',
        }),
      ).toThrow();
    });

    it('rejects invalid sensor type', () => {
      expect(() =>
        createSensorSchema.parse({
          name: 'Cảm biến lạ',
          type: 'UNKNOWN_TYPE',
          unit: 'x',
          areaId: 'area-1',
        }),
      ).toThrow();
    });
  });

  describe('updateSensorSchema', () => {
    it('allows updating isActive and name', () => {
      const parsed = updateSensorSchema.parse({
        name: 'Cảm biến nhiệt độ cũ',
        isActive: false,
      });
      expect(parsed.name).toBe('Cảm biến nhiệt độ cũ');
      expect(parsed.isActive).toBe(false);
    });
  });

  describe('querySensorSchema', () => {
    it('parses sensor query parameters', () => {
      const parsed = querySensorSchema.parse({
        areaId: 'area-1',
        type: SensorType.DO,
        isActive: 'true',
        page: '2',
        pageSize: '15',
      });
      expect(parsed.areaId).toBe('area-1');
      expect(parsed.type).toBe(SensorType.DO);
      expect(parsed.isActive).toBe(true);
      expect(parsed.page).toBe(2);
      expect(parsed.pageSize).toBe(15);
    });
  });
});
