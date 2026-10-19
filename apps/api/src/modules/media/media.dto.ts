import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { getEnv } from '../../config/env.config';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export const presignMediaSchema = z.object({
  filename: z.string().min(1, 'Tên tệp không được để trống'),
  mime: z.string().refine((val) => ALLOWED_MIME_TYPES.includes(val), {
    message: 'Định dạng tệp không được hỗ trợ (chỉ chấp nhận ảnh hoặc PDF)',
  }),
  size: z
    .number()
    .int()
    .positive()
    .refine((size) => size <= getEnv().MEDIA_MAX_MB * 1024 * 1024, {
      message: 'Kích thước tệp vượt quá giới hạn cho phép',
    }),
});

export const createMediaSchema = z.object({
  key: z.string().regex(/^uploads\/\d+-[0-9a-f]{16}\.[a-z0-9]{1,5}$/),
  alt: z.string().optional(),
});

export class PresignMediaDto extends createZodDto(presignMediaSchema) {}
export class CreateMediaDto extends createZodDto(createMediaSchema) {}
