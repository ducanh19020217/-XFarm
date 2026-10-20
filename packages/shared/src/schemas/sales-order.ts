import { z } from 'zod';
import { PaymentMethod, PaymentStatus, SalesChannel, SalesOrderStatus } from '../types';
import { optionalDate, optionalNumber, optionalString } from './helpers';
import { paginationSchema } from './pagination';

export const paymentMethodSchema = z.nativeEnum(PaymentMethod);
export const salesOrderStatusSchema = z.nativeEnum(SalesOrderStatus);
export const salesChannelSchema = z.nativeEnum(SalesChannel);
export const paymentStatusSchema = z.nativeEnum(PaymentStatus);

const salesOrderLineSchema = z.object({
  productId: optionalString(),
  itemId: z.string().min(1, 'Vật tư/sản phẩm kho không được để trống'),
  quantity: z.coerce.number().positive('Số lượng phải lớn hơn 0'),
  unitPrice: optionalNumber(z.number().nonnegative('Đơn giá không được âm')),
});

export const createSalesOrderSchema = z.object({
  customerId: z.string().min(1, 'Khách hàng không được để trống'),
  paymentMethod: paymentMethodSchema,
  shippingAddress: z.string().trim().min(1, 'Địa chỉ giao hàng không được để trống'),
  discount: optionalNumber(z.number().nonnegative('Chiết khấu không được âm')),
  shippingFee: optionalNumber(z.number().nonnegative('Phí vận chuyển không được âm')),
  notes: optionalString(),
  lines: z.array(salesOrderLineSchema).min(1, 'Đơn hàng phải có ít nhất một dòng'),
});

export const updateSalesOrderSchema = createSalesOrderSchema.partial().extend({
  status: salesOrderStatusSchema.optional(),
});

export const confirmSalesOrderSchema = z.object({
  warehouseId: z.string().min(1, 'Kho xuất không được để trống'),
});

export const transitionSalesOrderSchema = z.object({
  status: salesOrderStatusSchema,
});

export const querySalesOrderSchema = paginationSchema.extend({
  search: optionalString(),
  customerId: optionalString(),
  channel: salesChannelSchema.optional(),
  status: salesOrderStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  fromDate: optionalDate(),
  toDate: optionalDate(),
});

export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
export type UpdateSalesOrderInput = z.infer<typeof updateSalesOrderSchema>;
export type ConfirmSalesOrderInput = z.infer<typeof confirmSalesOrderSchema>;
export type TransitionSalesOrderInput = z.infer<typeof transitionSalesOrderSchema>;
export type QuerySalesOrderInput = z.infer<typeof querySalesOrderSchema>;
