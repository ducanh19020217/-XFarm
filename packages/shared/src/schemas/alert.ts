import { z } from 'zod';
import { paginationSchema } from './pagination';
import { optionalBoolean, optionalDate, optionalString } from './helpers';

export const queryAlertSchema = paginationSchema.extend({
  type: optionalString(),
  unread: optionalBoolean(),
});
export const markAlertReadSchema = z.object({ readAt: optionalDate() }).default({});
export type QueryAlertInput = z.infer<typeof queryAlertSchema>;
export type MarkAlertReadInput = z.infer<typeof markAlertReadSchema>;
