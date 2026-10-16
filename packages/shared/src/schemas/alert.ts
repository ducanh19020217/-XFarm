import { z } from 'zod';
import { paginationSchema } from './pagination';
import { optionalString } from './helpers';

export const queryAlertSchema = paginationSchema.extend({
  type: optionalString(),
  unread: z.coerce.boolean().optional(),
});
export const markAlertReadSchema = z.object({ readAt: z.coerce.date().nullable().optional() });
export type QueryAlertInput = z.infer<typeof queryAlertSchema>;
