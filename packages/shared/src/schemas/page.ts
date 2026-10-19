import { z } from 'zod';
import { optionalString } from './helpers';
import { paginationSchema } from './pagination';

export const createPageSchema = z.object({
  slug: optionalString(),
  title: z.string().min(1, 'Tiêu đề không được để trống'),
  content: z.string().min(1, 'Nội dung không được để trống'),
});
export const updatePageSchema = createPageSchema.partial();
export const queryPageSchema = paginationSchema.extend({ search: optionalString() });

export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
export type QueryPageInput = z.infer<typeof queryPageSchema>;
