import { createZodDto } from 'nestjs-zod';
import { queryCalendarSchema } from '@xfarm/shared';

export class QueryCalendarDto extends createZodDto(queryCalendarSchema) {}
