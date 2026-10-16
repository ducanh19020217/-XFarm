import { createZodDto } from 'nestjs-zod';
import { queryAlertSchema, markAlertReadSchema } from '@xfarm/shared';

export class QueryAlertDto extends createZodDto(queryAlertSchema) {}
export class MarkAlertReadDto extends createZodDto(markAlertReadSchema) {}
