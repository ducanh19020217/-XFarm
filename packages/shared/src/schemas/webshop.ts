import { z } from 'zod';
import { PaymentMethod } from '../types';
import { optionalString } from './helpers';

const vietnamesePhoneSchema = z
  .string()
  .trim()
  .regex(/^(0|\+84)(3|5|7|8|9)\d{8}$/, 'Số điện thoại Việt Nam không hợp lệ');

export const webshopCheckoutSchema = z.object({
  fullName: z.string().trim().min(1, 'Họ tên không được để trống'),
  phone: vietnamesePhoneSchema,
  address: z.string().trim().min(1, 'Địa chỉ không được để trống'),
  notes: optionalString(),
  paymentMethod: z.enum([PaymentMethod.COD, PaymentMethod.BANK_TRANSFER]),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().positive('Số lượng phải lớn hơn 0'),
      }),
    )
    .min(1, 'Giỏ hàng phải có ít nhất một sản phẩm')
    .max(30, 'Giỏ hàng không được quá 30 sản phẩm'),
});

export const webshopOrderLookupSchema = z.object({
  code: z.string().trim().min(1, 'Mã đơn hàng không được để trống'),
  phone: vietnamesePhoneSchema,
});

export type WebshopCheckoutInput = z.infer<typeof webshopCheckoutSchema>;
export type WebshopOrderLookupInput = z.infer<typeof webshopOrderLookupSchema>;
