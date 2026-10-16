import { z } from 'zod';
import { AreaType } from '../types';
import { paginationSchema } from './pagination';
import { optionalNullableString, optionalNumber, optionalString } from './helpers';

// GeoJSON Position: [longitude, latitude, elevation?]
const positionSchema = z.array(z.number()).min(2, 'Tọa độ vị trí phải có ít nhất kinh độ và vĩ độ');

// LinearRing: array of positions (at least 3 positions for polygon ring)
const linearRingSchema = z.array(positionSchema).min(3, 'Vòng tọa độ phải có ít nhất 3 điểm');

export const polygonGeometrySchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(linearRingSchema).min(1, 'Polygon phải có ít nhất 1 vòng tọa độ'),
});

export const multiPolygonGeometrySchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z
    .array(z.array(linearRingSchema).min(1))
    .min(1, 'MultiPolygon phải có ít nhất 1 polygon'),
});

export const geojsonGeometrySchema = z.discriminatedUnion('type', [
  polygonGeometrySchema,
  multiPolygonGeometrySchema,
]);

export const geojsonFeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: geojsonGeometrySchema,
  properties: z.record(z.any()).nullable().optional(),
});

export const geojsonSchema = z.union([geojsonGeometrySchema, geojsonFeatureSchema]);

export const createAreaSchema = z.object({
  code: optionalString(),
  name: z.string().min(1, 'Tên khu/lô không được để trống'),
  type: z.nativeEnum(AreaType),
  parentId: z.string().nullable().optional(),
  areaM2: optionalNumber(z.number().positive('Diện tích phải lớn hơn 0')),
  geojson: geojsonSchema.nullable().optional(),
  description: optionalNullableString(),
  isActive: z.boolean().optional().default(true),
});

export const updateAreaSchema = createAreaSchema.partial();

export const queryAreaSchema = paginationSchema.extend({
  type: z.nativeEnum(AreaType).optional(),
  parentId: z.string().nullable().optional(),
  isActive: z.preprocess((val) => {
    if (typeof val === 'string') {
      if (val.toLowerCase() === 'true') return true;
      if (val.toLowerCase() === 'false') return false;
    }
    return val;
  }, z.boolean().optional()),
});

export type CreateAreaInput = z.infer<typeof createAreaSchema>;
export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;
export type QueryAreaInput = z.infer<typeof queryAreaSchema>;
export type GeoJsonGeometry = z.infer<typeof geojsonGeometrySchema>;
export type GeoJsonInput = z.infer<typeof geojsonSchema>;
