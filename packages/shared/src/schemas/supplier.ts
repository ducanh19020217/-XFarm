import { z } from 'zod';
import { optionalString } from './helpers';
import { paginationSchema } from './pagination';

export const createSupplierSchema = z.object({
  code: optionalString(),
  name: z.string().min(1, 'Tên nhà cung cấp không được để trống'),
  phone: optionalString(),
  address: optionalString(),
  taxCode: optionalString(),
  isActive: z.boolean().optional(),
});
export const updateSupplierSchema = createSupplierSchema.partial();
export const querySupplierSchema = paginationSchema;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
