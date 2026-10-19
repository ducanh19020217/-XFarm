import { createZodDto } from 'nestjs-zod';
import {
  createProductSchema,
  updateProductSchema,
  queryProductSchema,
  createPostSchema,
  updatePostSchema,
  queryPostSchema,
  createPageSchema,
  updatePageSchema,
  queryPageSchema,
  createSiteSettingSchema,
  updateSiteSettingSchema,
  querySiteSettingSchema,
  paginationSchema,
  optionalString,
} from '@xfarm/shared';

export class CreateProductDto extends createZodDto(createProductSchema) {}
export class UpdateProductDto extends createZodDto(updateProductSchema) {}
export class QueryProductDto extends createZodDto(queryProductSchema) {}

export class CreatePostDto extends createZodDto(createPostSchema) {}
export class UpdatePostDto extends createZodDto(updatePostSchema) {}
export class QueryPostDto extends createZodDto(queryPostSchema) {}

export class CreatePageDto extends createZodDto(createPageSchema) {}
export class UpdatePageDto extends createZodDto(updatePageSchema) {}
export class QueryPageDto extends createZodDto(queryPageSchema) {}

export class CreateSiteSettingDto extends createZodDto(createSiteSettingSchema) {}
export class UpdateSiteSettingDto extends createZodDto(updateSiteSettingSchema) {}
export class QuerySiteSettingDto extends createZodDto(querySiteSettingSchema) {}

export const publicQueryProductSchema = paginationSchema.extend({
  search: optionalString(),
});
export class PublicQueryProductDto extends createZodDto(publicQueryProductSchema) {}

export const publicQueryPostSchema = paginationSchema.extend({
  search: optionalString(),
});
export class PublicQueryPostDto extends createZodDto(publicQueryPostSchema) {}
