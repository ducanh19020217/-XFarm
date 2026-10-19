import { z } from 'zod';
import { MaintenanceType } from '../types';
import { paginationSchema } from './pagination';
import { optionalBoolean, optionalDate, optionalNullableString, optionalString } from './helpers';

export const createMaintenanceScheduleSchema = z.object({
  equipmentId: z.string().min(1, 'Thiết bị không được để trống'),
  name: z.string().min(1, 'Tên lịch bảo trì không được để trống'),
  intervalDays: z
    .number({ required_error: 'Chu kỳ bảo trì (ngày) không được để trống' })
    .int('Chu kỳ bảo trì phải là số nguyên')
    .positive('Chu kỳ bảo trì phải là số ngày dương'),
  nextDueDate: z.coerce.date({ required_error: 'Ngày đến hạn tiếp theo không được để trống' }),
  isActive: z.boolean().optional().default(true),
});

export const updateMaintenanceScheduleSchema = createMaintenanceScheduleSchema.partial();

export const queryMaintenanceScheduleSchema = paginationSchema.extend({
  equipmentId: optionalString(),
  isActive: optionalBoolean(),
  dueBefore: optionalDate(),
});

export const createMaintenanceLogSchema = z.object({
  equipmentId: z.string().min(1, 'Thiết bị không được để trống'),
  scheduleId: optionalNullableString(),
  date: z.coerce.date({ required_error: 'Ngày thực hiện không được để trống' }),
  type: z.nativeEnum(MaintenanceType, { required_error: 'Loại bảo trì không được để trống' }),
  cost: z.preprocess(
    (val) =>
      val === undefined || val === null || val === ''
        ? 0
        : typeof val === 'string'
          ? Number(val)
          : val,
    z.number().min(0, 'Chi phí phải lớn hơn hoặc bằng 0'),
  ),
  notes: optionalNullableString(),
  performedById: optionalNullableString(),
});

export const updateMaintenanceLogSchema = createMaintenanceLogSchema.partial();

export const queryMaintenanceLogSchema = paginationSchema.extend({
  equipmentId: optionalString(),
  scheduleId: optionalString(),
  type: z.nativeEnum(MaintenanceType).optional(),
  from: optionalDate(),
  to: optionalDate(),
});

export type CreateMaintenanceScheduleInput = z.infer<typeof createMaintenanceScheduleSchema>;
export type UpdateMaintenanceScheduleInput = z.infer<typeof updateMaintenanceScheduleSchema>;
export type QueryMaintenanceScheduleInput = z.infer<typeof queryMaintenanceScheduleSchema>;

export type CreateMaintenanceLogInput = z.infer<typeof createMaintenanceLogSchema>;
export type UpdateMaintenanceLogInput = z.infer<typeof updateMaintenanceLogSchema>;
export type QueryMaintenanceLogInput = z.infer<typeof queryMaintenanceLogSchema>;
