import { z } from 'zod';
import { PaymentMethod, TransactionType } from '../types';
import { optionalDate, optionalString } from './helpers';
import { paginationSchema } from './pagination';

export const transactionTypeSchema = z.nativeEnum(TransactionType);

export const createFinanceCategorySchema = z.object({
  name: z.string().trim().min(1, 'Tên danh mục không được để trống'),
  type: transactionTypeSchema,
  parentId: optionalString(),
  isActive: z.boolean().optional(),
  systemKey: optionalString(),
});

export const updateFinanceCategorySchema = createFinanceCategorySchema.partial();

export const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  categoryId: z.string().min(1, 'Danh mục không được để trống'),
  amount: z.coerce.number().positive('Số tiền phải lớn hơn 0'),
  date: z.coerce.date(),
  cycleId: optionalString(),
  refType: optionalString(),
  refId: optionalString(),
  method: z.nativeEnum(PaymentMethod),
  notes: optionalString(),
  mediaIds: z.array(z.string()).optional().default([]),
});

export const financeReportQuerySchema = z.union([
  z.object({ from: z.coerce.date(), to: z.coerce.date() }),
  z.object({ year: z.coerce.number().int().min(2000).max(2200) }),
]);

export const queryFinanceCategorySchema = paginationSchema.extend({ search: optionalString() });
export const queryTransactionSchema = paginationSchema.extend({
  type: transactionTypeSchema.optional(),
  categoryId: optionalString(),
  from: optionalDate(),
  to: optionalDate(),
  cycleId: optionalString(),
});

export type CreateFinanceCategoryInput = z.infer<typeof createFinanceCategorySchema>;
export type UpdateFinanceCategoryInput = z.infer<typeof updateFinanceCategorySchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type FinanceReportQueryInput = z.infer<typeof financeReportQuerySchema>;
export type QueryFinanceCategoryInput = z.infer<typeof queryFinanceCategorySchema>;
export type QueryTransactionInput = z.infer<typeof queryTransactionSchema>;
