import { createZodDto } from 'nestjs-zod';
import { createCycleSchema, queryCycleSchema, updateCycleSchema } from '@xfarm/shared';
import { z } from 'zod';

export class CreateCycleDto extends createZodDto(createCycleSchema) {}
export class UpdateCycleDto extends createZodDto(updateCycleSchema) {}
export class QueryCycleDto extends createZodDto(queryCycleSchema) {}

export const transitionCycleSchema = z.object({
  to: z.enum(['PLANNED', 'ACTIVE', 'HARVESTING', 'CLOSED', 'CANCELLED']),
  note: z.string().max(2000).optional(),
});

export class TransitionCycleDto extends createZodDto(transitionCycleSchema) {}
