import { z } from 'zod';
import { PayrollStatus } from '../types';
import { paginationSchema } from './pagination';
import { optionalDate, optionalString } from './helpers';

export const generatePayrollSchema = z
  .object({
    periodStart: z.coerce.date({
      errorMap: () => ({ message: 'Ngày bắt đầu kỳ lương không hợp lệ' }),
    }),
    periodEnd: z.coerce.date({
      errorMap: () => ({ message: 'Ngày kết thúc kỳ lương không hợp lệ' }),
    }),
    employeeIds: z.array(z.string()).optional(),
  })
  .refine((data) => data.periodEnd >= data.periodStart, {
    message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
    path: ['periodEnd'],
  });

export const createPayrollSchema = z.object({
  employeeId: z.string().min(1, 'Nhân viên không được để trống'),
  periodStart: z.coerce.date({
    errorMap: () => ({ message: 'Ngày bắt đầu kỳ lương không hợp lệ' }),
  }),
  periodEnd: z.coerce.date({
    errorMap: () => ({ message: 'Ngày kết thúc kỳ lương không hợp lệ' }),
  }),
  amount: z.coerce.number().min(0, 'Số tiền lương không được âm'),
  details: z.record(z.string(), z.any()).optional().default({}),
  status: z.nativeEnum(PayrollStatus).optional().default(PayrollStatus.DRAFT),
});

export const updatePayrollSchema = z.object({
  amount: z.coerce.number().min(0, 'Số tiền lương không được âm').optional(),
  details: z.record(z.string(), z.any()).optional(),
  status: z.nativeEnum(PayrollStatus).optional(),
});

export const queryPayrollSchema = paginationSchema.extend({
  employeeId: optionalString(),
  status: z.nativeEnum(PayrollStatus).optional(),
  periodStart: optionalDate(),
  periodEnd: optionalDate(),
});

export type GeneratePayrollInput = z.infer<typeof generatePayrollSchema>;
export type CreatePayrollInput = z.infer<typeof createPayrollSchema>;
export type UpdatePayrollInput = z.infer<typeof updatePayrollSchema>;
export type QueryPayrollInput = z.infer<typeof queryPayrollSchema>;
