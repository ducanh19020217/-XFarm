import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const presignMediaSchema = z.object({
  filename: z.string().min(1, 'Tên tệp không được để trống'),
  mime: z.string().refine((val) => ALLOWED_MIME_TYPES.includes(val), {
    message: 'Định dạng tệp không được hỗ trợ (chỉ chấp nhận ảnh hoặc PDF)',
  }),
  size: z.number().int().positive().max(MAX_FILE_SIZE, {
    message: 'Kích thước tệp tối đa 10MB',
  }),
});

export const createMediaSchema = z.object({
  key: z.string().regex(/^uploads\/\d+-[0-9a-f]{16}\.[a-z0-9]{1,5}$/),
  alt: z.string().optional(),
});

export class PresignMediaDto extends createZodDto(presignMediaSchema) {}
export class CreateMediaDto extends createZodDto(createMediaSchema) {}
