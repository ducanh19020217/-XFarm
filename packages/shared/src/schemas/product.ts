import { z } from 'zod';
import { optionalBoolean, optionalNumber, optionalString } from './helpers';
import { paginationSchema } from './pagination';

export const createProductSchema = z.object({
  slug: optionalString(),
  name: z.string().min(1, 'Tên sản phẩm không được để trống'),
  itemId: z.string().min(1, 'Sản phẩm kho không được để trống'),
  description: z.string().min(1, 'Mô tả không được để trống'),
  price: z.coerce.number().nonnegative('Giá không được âm'),
  unit: z.string().min(1, 'Đơn vị tính không được để trống'),
  mediaIds: z.array(z.string()).optional().default([]),
  isPublished: z.boolean().optional().default(false),
  sortOrder: z.coerce.number().int().optional().default(0),
});
export const updateProductSchema = createProductSchema.partial();
export const queryProductSchema = paginationSchema.extend({
  search: optionalString(),
  itemId: optionalString(),
  isPublished: optionalBoolean(),
  sortOrder: optionalNumber(z.number().int()),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type QueryProductInput = z.infer<typeof queryProductSchema>;
