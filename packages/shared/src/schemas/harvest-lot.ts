import { z } from 'zod';
import { optionalBoolean, optionalString } from './helpers';
import { paginationSchema } from './pagination';

export const queryHarvestLotSchema = paginationSchema.extend({
  cycleId: optionalString(),
  itemId: optionalString(),
  warehouseId: optionalString(),
  traceCode: optionalString(),
  isPublic: optionalBoolean(),
});

export const updateHarvestLotSchema = z.object({
  isPublic: optionalBoolean(),
  certification: optionalString(),
  qualityGrade: optionalString(),
});

export type QueryHarvestLotInput = z.infer<typeof queryHarvestLotSchema>;
export type UpdateHarvestLotInput = z.infer<typeof updateHarvestLotSchema>;
