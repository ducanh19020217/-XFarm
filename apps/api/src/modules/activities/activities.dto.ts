import { createZodDto } from 'nestjs-zod';
import { createActivitySchema, queryActivitySchema, updateActivitySchema } from '@xfarm/shared';

export class CreateActivityDto extends createZodDto(createActivitySchema) {}

export class UpdateActivityDto extends createZodDto(updateActivitySchema) {}

export class QueryActivityDto extends createZodDto(queryActivitySchema) {}
