import { createZodDto } from 'nestjs-zod';
import { createItemSchema, updateItemSchema, queryItemSchema } from '@xfarm/shared';

export class CreateItemDto extends createZodDto(createItemSchema) {}
export class UpdateItemDto extends createZodDto(updateItemSchema) {}
export class QueryItemDto extends createZodDto(queryItemSchema) {}
