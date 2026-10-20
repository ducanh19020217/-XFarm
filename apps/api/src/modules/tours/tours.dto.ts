import { createZodDto } from 'nestjs-zod';
import {
  createTourSchema,
  updateTourSchema,
  queryTourSchema,
  createTourSlotSchema,
  updateTourSlotSchema,
  batchCreateTourSlotsSchema,
  queryTourSlotSchema,
  paginationSchema,
  optionalString,
} from '@xfarm/shared';

export class CreateTourDto extends createZodDto(createTourSchema) {}
export class UpdateTourDto extends createZodDto(updateTourSchema) {}
export class QueryTourDto extends createZodDto(queryTourSchema) {}

export class CreateTourSlotDto extends createZodDto(createTourSlotSchema) {}
export class UpdateTourSlotDto extends createZodDto(updateTourSlotSchema) {}
export class BatchCreateTourSlotsDto extends createZodDto(batchCreateTourSlotsSchema) {}
export class QueryTourSlotDto extends createZodDto(queryTourSlotSchema) {}

export const publicQueryTourSchema = paginationSchema.extend({
  search: optionalString(),
});
export class PublicQueryTourDto extends createZodDto(publicQueryTourSchema) {}
