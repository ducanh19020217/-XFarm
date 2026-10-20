import { z } from 'zod';
import { BookingStatus, PaymentMethod, PaymentStatus } from '../types';
import { emptyToUndefined, optionalDate, optionalString, vietnamesePhoneSchema } from './helpers';
import { paginationSchema } from './pagination';

export const bookingStatusSchema = z.nativeEnum(BookingStatus);

export const publicBookingSchema = z.object({
  slotId: z.string().min(1, 'Suất trải nghiệm không được để trống'),
  customerName: z.string().trim().min(1, 'Tên khách hàng không được để trống'),
  phone: vietnamesePhoneSchema,
  email: z.preprocess(emptyToUndefined, z.string().email('Email không hợp lệ').optional()),
  adults: z.coerce.number().int().min(1, 'Số người lớn phải từ 1 trở lên'),
  children: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(0, 'Số trẻ em không được âm').optional().default(0),
  ),
  notes: optionalString(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
});

export const createBookingSchema = publicBookingSchema;

export const adminUpdateBookingStatusSchema = z.object({
  status: bookingStatusSchema,
  notes: optionalString(),
});

export const queryBookingSchema = paginationSchema.extend({
  slotId: optionalString(),
  tourId: optionalString(),
  status: bookingStatusSchema.optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  search: optionalString(),
  from: optionalDate(),
  to: optionalDate(),
});

export type PublicBookingInput = z.infer<typeof publicBookingSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type AdminUpdateBookingStatusInput = z.infer<typeof adminUpdateBookingStatusSchema>;
export type QueryBookingInput = z.infer<typeof queryBookingSchema>;
