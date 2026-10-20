import { describe, it, expect } from 'vitest';
import { iotReadingItemSchema, iotReadingsSchema, queryTimeseriesSchema } from './iot';

describe('IoT schemas', () => {
  describe('iotReadingItemSchema', () => {
    it('accepts valid value and optional ISO recordedAt', () => {
      const itemWithTime = iotReadingItemSchema.parse({
        value: 27.5,
        recordedAt: '2026-10-19T09:30:00.000Z',
      });
      expect(itemWithTime.value).toBe(27.5);
      expect(itemWithTime.recordedAt).toBe('2026-10-19T09:30:00.000Z');

      const itemWithoutTime = iotReadingItemSchema.parse({ value: 30 });
      expect(itemWithoutTime.value).toBe(30);
      expect(itemWithoutTime.recordedAt).toBeUndefined();
    });

    it('accepts ISO with timezone offset', () => {
      const item = iotReadingItemSchema.parse({
        value: 6.8,
        recordedAt: '2026-10-19T16:30:00+07:00',
      });
      expect(item.recordedAt).toBe('2026-10-19T16:30:00+07:00');
    });

    it('rejects invalid recordedAt format', () => {
      expect(() =>
        iotReadingItemSchema.parse({
          value: 25,
          recordedAt: 'not-a-date',
        }),
      ).toThrow();
    });
  });

  describe('iotReadingsSchema', () => {
    it('accepts array between 1 and 500 items', () => {
      const oneItem = {
        readings: [{ value: 25.5 }],
      };
      expect(iotReadingsSchema.parse(oneItem).readings).toHaveLength(1);

      const items500 = {
        readings: Array.from({ length: 500 }, (_, i) => ({ value: i })),
      };
      expect(iotReadingsSchema.parse(items500).readings).toHaveLength(500);
    });

    it('rejects empty array (0 items)', () => {
      expect(() => iotReadingsSchema.parse({ readings: [] })).toThrow();
    });

    it('rejects array over 500 items (501 items)', () => {
      const items501 = {
        readings: Array.from({ length: 501 }, (_, i) => ({ value: i })),
      };
      expect(() => iotReadingsSchema.parse(items501)).toThrow();
    });
  });

  describe('queryTimeseriesSchema', () => {
    it('accepts valid query with sensorId', () => {
      const parsed = queryTimeseriesSchema.parse({
        sensorId: 'sensor-1',
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-08T00:00:00.000Z',
        bucket: '5m',
      });
      expect(parsed.sensorId).toBe('sensor-1');
      expect(parsed.bucket).toBe('5m');
      expect(parsed.from).toBeInstanceOf(Date);
      expect(parsed.to).toBeInstanceOf(Date);
    });

    it('accepts valid query with areaId and bucket 1h or 1d', () => {
      const parsed1h = queryTimeseriesSchema.parse({
        areaId: 'area-1',
        from: '2026-10-01',
        to: '2026-10-08',
        bucket: '1h',
      });
      expect(parsed1h.areaId).toBe('area-1');
      expect(parsed1h.bucket).toBe('1h');

      const parsed1d = queryTimeseriesSchema.parse({
        areaId: 'area-1',
        from: '2026-10-01',
        to: '2026-10-08',
        bucket: '1d',
      });
      expect(parsed1d.bucket).toBe('1d');
    });

    it('rejects when neither areaId nor sensorId is provided', () => {
      expect(() =>
        queryTimeseriesSchema.parse({
          from: '2026-10-01',
          to: '2026-10-08',
          bucket: '1h',
        }),
      ).toThrow();
    });

    it('rejects invalid bucket', () => {
      expect(() =>
        queryTimeseriesSchema.parse({
          sensorId: 'sensor-1',
          from: '2026-10-01',
          to: '2026-10-08',
          bucket: '10m',
        }),
      ).toThrow();
    });

    it('rejects when from is after to', () => {
      expect(() =>
        queryTimeseriesSchema.parse({
          sensorId: 'sensor-1',
          from: '2026-10-10',
          to: '2026-10-01',
          bucket: '1h',
        }),
      ).toThrow();
    });
  });
});
