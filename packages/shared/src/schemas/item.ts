import { z } from 'zod';
import { ItemCategory } from '../types';
import { paginationSchema } from './pagination';
import { optionalNumber, optionalString } from './helpers';

export const createItemSchema = z.object({
  sku: optionalString(),
  name: z.string().min(1, 'Tên vật tư không được để trống'),
  category: z.nativeEnum(ItemCategory),
  unit: z.string().min(1, 'Đơn vị không được để trống'),
  minStock: optionalNumber(z.number().nonnegative('Tồn tối thiểu không được âm')),
  isSellable: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export const updateItemSchema = createItemSchema.partial();
export const queryItemSchema = paginationSchema.extend({
  category: z.nativeEnum(ItemCategory).optional(),
  isSellable: z.preprocess((val) => {
    if (typeof val === 'string') {
      if (val.toLowerCase() === 'true') return true;
      if (val.toLowerCase() === 'false') return false;
    }
    return val;
  }, z.boolean().optional()),
  isActive: z.preprocess((val) => {
    if (typeof val === 'string') {
      if (val.toLowerCase() === 'true') return true;
      if (val.toLowerCase() === 'false') return false;
    }
    return val;
  }, z.boolean().optional()),
  belowMinStock: z.preprocess((val) => {
    if (typeof val === 'string') {
      if (val.toLowerCase() === 'true') return true;
      if (val.toLowerCase() === 'false') return false;
    }
    return val;
  }, z.boolean().optional()),
});
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type QueryItemInput = z.infer<typeof queryItemSchema>;
