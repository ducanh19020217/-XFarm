import { z } from 'zod';
import { SensorType } from '../types';
import { paginationSchema } from './pagination';
import { optionalBoolean, optionalString } from './helpers';

export const createSensorSchema = z.object({
  code: optionalString(),
  name: z.string().min(1, 'Tên cảm biến không được để trống'),
  type: z.nativeEnum(SensorType, { required_error: 'Loại cảm biến không được để trống' }),
  unit: z.string().min(1, 'Đơn vị đo không được để trống'),
  areaId: z.string().min(1, 'Khu/lô không được để trống'),
  isActive: z.boolean().optional().default(true),
});

export const updateSensorSchema = createSensorSchema.partial();

export const querySensorSchema = paginationSchema.extend({
  areaId: optionalString(),
  type: z.nativeEnum(SensorType).optional(),
  isActive: optionalBoolean(),
});

export type CreateSensorInput = z.infer<typeof createSensorSchema>;
export type UpdateSensorInput = z.infer<typeof updateSensorSchema>;
export type QuerySensorInput = z.infer<typeof querySensorSchema>;
