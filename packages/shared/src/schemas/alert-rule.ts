import { z } from 'zod';
import { AlertOp } from '../types';
import { paginationSchema } from './pagination';
import { optionalBoolean, optionalString } from './helpers';

export const createAlertRuleSchema = z.object({
  sensorId: z.string().min(1, 'Cảm biến không được để trống'),
  op: z.nativeEnum(AlertOp, { required_error: 'Toán tử so sánh (GT|LT) không được để trống' }),
  threshold: z.number({ required_error: 'Ngưỡng cảnh báo không được để trống' }),
  isActive: z.boolean().optional().default(true),
  cooldownMinutes: z
    .number()
    .int('Thời gian chờ (cooldown) phải là số nguyên')
    .min(1, 'Thời gian chờ (cooldown) phải từ 1 phút trở lên')
    .optional()
    .default(30),
});

export const updateAlertRuleSchema = createAlertRuleSchema.partial();

export const queryAlertRuleSchema = paginationSchema.extend({
  sensorId: optionalString(),
  isActive: optionalBoolean(),
});

export type CreateAlertRuleInput = z.infer<typeof createAlertRuleSchema>;
export type UpdateAlertRuleInput = z.infer<typeof updateAlertRuleSchema>;
export type QueryAlertRuleInput = z.infer<typeof queryAlertRuleSchema>;
