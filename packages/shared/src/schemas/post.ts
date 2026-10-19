import { z } from 'zod';
import { optionalDate, optionalString } from './helpers';
import { paginationSchema } from './pagination';

export const postStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);
export const createPostSchema = z.object({
  slug: optionalString(),
  title: z.string().min(1, 'Tiêu đề không được để trống'),
  excerpt: z.string().min(1, 'Tóm tắt không được để trống'),
  content: z.string().min(1, 'Nội dung không được để trống'),
  coverMediaId: optionalString(),
  publishedAt: optionalDate(),
  status: postStatusSchema.optional().default('DRAFT'),
});
export const updatePostSchema = createPostSchema.partial();
export const queryPostSchema = paginationSchema.extend({
  search: optionalString(),
  status: postStatusSchema.optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type QueryPostInput = z.infer<typeof queryPostSchema>;
