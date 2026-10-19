import { z } from 'zod';
import { optionalBoolean, optionalString } from './helpers';
import { paginationSchema } from './pagination';

export const createTourSchema = z.object({
  slug: optionalString(),
  name: z.string().trim().min(1, 'Tên tour không được để trống'),
  description: z.string().trim().min(1, 'Mô tả không được để trống'),
  durationMinutes: z.coerce.number().int().positive('Thời lượng phải lớn hơn 0'),
  priceAdult: z.coerce.number().nonnegative('Giá vé người lớn không được âm'),
  priceChild: z.coerce.number().nonnegative('Giá vé trẻ em không được âm'),
  capacity: z.coerce.number().int().positive('Sức chứa phải lớn hơn 0'),
  mediaIds: z.array(z.string()).optional().default([]),
  isPublished: z.boolean().optional().default(false),
  sortOrder: z.coerce.number().int().optional().default(0),
});

export const updateTourSchema = createTourSchema.partial();

export const queryTourSchema = paginationSchema.extend({
  search: optionalString(),
  isPublished: optionalBoolean(),
});

export type CreateTourInput = z.infer<typeof createTourSchema>;
export type UpdateTourInput = z.infer<typeof updateTourSchema>;
export type QueryTourInput = z.infer<typeof queryTourSchema>;
