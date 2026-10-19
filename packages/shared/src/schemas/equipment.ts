import { z } from 'zod';
import { EquipmentStatus } from '../types';
import { paginationSchema } from './pagination';
import {
  optionalBoolean,
  optionalDate,
  optionalNullableString,
  optionalNumber,
  optionalString,
} from './helpers';

export const createEquipmentSchema = z.object({
  code: optionalString(),
  name: z.string().min(1, 'Tên thiết bị không được để trống'),
  type: z.string().min(1, 'Loại thiết bị không được để trống'),
  areaId: optionalNullableString(),
  purchaseDate: optionalDate(),
  value: optionalNumber(z.number().min(0, 'Giá trị thiết bị phải lớn hơn hoặc bằng 0')),
  status: z.nativeEnum(EquipmentStatus).optional().default(EquipmentStatus.ACTIVE),
  notes: optionalNullableString(),
  isActive: z.boolean().optional().default(true),
});

export const updateEquipmentSchema = createEquipmentSchema.partial();

export const queryEquipmentSchema = paginationSchema.extend({
  areaId: optionalString(),
  type: optionalString(),
  status: z.nativeEnum(EquipmentStatus).optional(),
  isActive: optionalBoolean(),
});

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
export type QueryEquipmentInput = z.infer<typeof queryEquipmentSchema>;
