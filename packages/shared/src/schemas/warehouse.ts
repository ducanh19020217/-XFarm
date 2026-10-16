import { z } from 'zod';
import { optionalString } from './helpers';
import { paginationSchema } from './pagination';

export const createWarehouseSchema = z.object({
  code: z.string().min(1, 'Mã kho không được để trống'),
  name: z.string().min(1, 'Tên kho không được để trống'),
  areaId: optionalString(),
});
export const updateWarehouseSchema = createWarehouseSchema.partial();
export const queryWarehouseSchema = paginationSchema;
export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
