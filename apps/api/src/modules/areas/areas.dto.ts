import { createZodDto } from 'nestjs-zod';
import { createAreaSchema, updateAreaSchema, queryAreaSchema } from '@xfarm/shared';

export class CreateAreaDto extends createZodDto(createAreaSchema) {}
export class UpdateAreaDto extends createZodDto(updateAreaSchema) {}
export class QueryAreasDto extends createZodDto(queryAreaSchema) {}
