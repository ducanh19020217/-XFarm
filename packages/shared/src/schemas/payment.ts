import { z } from 'zod';
import { PaymentMethod } from '../types';
import { optionalString } from './helpers';
import { paginationSchema } from './pagination';

export const createPaymentSchema = z.object({
  orderId: z.string().min(1, 'Đơn hàng không được để trống'),
  amount: z.coerce.number().positive('Số tiền phải lớn hơn 0'),
  method: z.nativeEnum(PaymentMethod),
  paidAt: z.coerce.date().optional(),
  transactionId: optionalString(),
  notes: optionalString(),
});

export const queryPaymentSchema = paginationSchema.extend({
  orderId: optionalString(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type QueryPaymentInput = z.infer<typeof queryPaymentSchema>;
