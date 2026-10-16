import { describe, it, expect } from 'vitest';
import { createAreaSchema, updateAreaSchema, queryAreaSchema, geojsonSchema } from './area';
import { AreaType } from '../types';

describe('Area schemas', () => {
  describe('geojsonSchema', () => {
    it('accepts valid Polygon geometry', () => {
      const validPolygon = {
        type: 'Polygon',
        coordinates: [
          [
            [105.8, 21.0],
            [105.9, 21.0],
            [105.9, 21.1],
            [105.8, 21.1],
            [105.8, 21.0],
          ],
        ],
      };
      expect(geojsonSchema.safeParse(validPolygon).success).toBe(true);
    });

    it('accepts valid MultiPolygon geometry', () => {
      const validMultiPolygon = {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [105.8, 21.0],
              [105.9, 21.0],
              [105.9, 21.1],
              [105.8, 21.0],
            ],
          ],
        ],
      };
      expect(geojsonSchema.safeParse(validMultiPolygon).success).toBe(true);
    });

    it('accepts valid Feature wrapping Polygon', () => {
      const feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [105.8, 21.0],
              [105.9, 21.0],
              [105.9, 21.1],
              [105.8, 21.0],
            ],
          ],
        },
        properties: { name: 'Zone A' },
      };
      expect(geojsonSchema.safeParse(feature).success).toBe(true);
    });

    it('rejects Point, LineString or invalid structures', () => {
      expect(
        geojsonSchema.safeParse({
          type: 'Point',
          coordinates: [105.8, 21.0],
        }).success,
      ).toBe(false);

      expect(
        geojsonSchema.safeParse({
          type: 'LineString',
          coordinates: [
            [105.8, 21.0],
            [105.9, 21.0],
          ],
        }).success,
      ).toBe(false);

      expect(
        geojsonSchema.safeParse({
          type: 'Polygon',
          coordinates: 'not-an-array',
        }).success,
      ).toBe(false);

      expect(
        geojsonSchema.safeParse({
          type: 'Polygon',
          coordinates: [],
        }).success,
      ).toBe(false);
    });
  });

  describe('createAreaSchema', () => {
    it('validates a correct area payload with or without code', () => {
      const parsedWithCode = createAreaSchema.safeParse({
        code: 'AR-0001',
        name: 'Khu A',
        type: AreaType.FIELD,
        areaM2: 1250.5,
      });
      expect(parsedWithCode.success).toBe(true);

      const parsedWithoutCode = createAreaSchema.safeParse({
        name: 'Khu B',
        type: AreaType.GREENHOUSE,
      });
      expect(parsedWithoutCode.success).toBe(true);
    });

    it('fails when name is missing or areaM2 <= 0', () => {
      const invalidName = createAreaSchema.safeParse({
        name: '',
        type: AreaType.POND,
      });
      expect(invalidName.success).toBe(false);

      const invalidArea = createAreaSchema.safeParse({
        name: 'Ao 1',
        type: AreaType.POND,
        areaM2: -10,
      });
      expect(invalidArea.success).toBe(false);
    });
  });

  describe('updateAreaSchema', () => {
    it('allows partial updates with valid fields', () => {
      const partialUpdate = updateAreaSchema.safeParse({
        name: 'Tên khu mới',
        isActive: false,
      });
      expect(partialUpdate.success).toBe(true);
    });
  });

  describe('queryAreaSchema', () => {
    it('correctly handles boolean strings for isActive', () => {
      const parseTrue = queryAreaSchema.parse({ isActive: 'true' });
      expect(parseTrue.isActive).toBe(true);

      const parseFalse = queryAreaSchema.parse({ isActive: 'false' });
      expect(parseFalse.isActive).toBe(false);

      const parseUndef = queryAreaSchema.parse({});
      expect(parseUndef.isActive).toBeUndefined();
    });
  });
});
