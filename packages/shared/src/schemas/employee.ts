import { z } from 'zod';
import { PayType } from '../types';
import { paginationSchema } from './pagination';
import { optionalString, optionalBoolean } from './helpers';

export const createEmployeeSchema = z.object({
  code: optionalString(),
  fullName: z.string().min(1, 'Họ tên không được để trống'),
  phone: optionalString(),
  position: z.string().min(1, 'Vị trí công việc không được để trống'),
  payType: z.nativeEnum(PayType, {
    errorMap: () => ({ message: 'Vui lòng chọn hình thức trả lương' }),
  }),
  baseRate: z.coerce.number().min(0, 'Mức lương cơ bản không được âm'),
  isActive: z.boolean().optional().default(true),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const queryEmployeeSchema = paginationSchema.extend({
  payType: z.nativeEnum(PayType).optional(),
  isActive: optionalBoolean(),
  search: optionalString(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type QueryEmployeeInput = z.infer<typeof queryEmployeeSchema>;
