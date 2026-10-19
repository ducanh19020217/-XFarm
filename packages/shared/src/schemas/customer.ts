import { z } from 'zod';
import { CustomerType } from '../types';
import { optionalString } from './helpers';
import { paginationSchema } from './pagination';

export const customerTypeSchema = z.nativeEnum(CustomerType);

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, 'Tên khách hàng không được để trống'),
  phone: z.string().trim().min(1, 'Số điện thoại không được để trống'),
  email: optionalString(),
  address: optionalString(),
  type: customerTypeSchema,
  userId: optionalString(),
  isActive: z.boolean().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();
export const queryCustomerSchema = paginationSchema.extend({
  search: optionalString(),
  type: customerTypeSchema.optional(),
  isActive: z.coerce.boolean().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type QueryCustomerInput = z.infer<typeof queryCustomerSchema>;
