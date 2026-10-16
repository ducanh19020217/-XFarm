import { z } from 'zod';
import { ActivityType, AreaType } from '../types';

export const traceProductSchema = z
  .object({
    name: z.string(),
    slug: z.string(),
    unit: z.string(),
  })
  .nullable();

export const traceLotSchema = z.object({
  code: z.string(),
  traceCode: z.string(),
  quantity: z.union([z.number(), z.string()]),
  unit: z.string(),
  harvestedAt: z.coerce.date(),
  qualityGrade: z.string().nullable(),
  certification: z.string().nullable(),
});

export const traceAreaSchema = z.object({
  name: z.string(),
  type: z.nativeEnum(AreaType),
});

export const traceCycleSchema = z.object({
  name: z.string(),
  species: z.string(),
  variety: z.string().nullable(),
  startDate: z.coerce.date(),
});

export const traceTimelineItemSchema = z.object({
  type: z.nativeEnum(ActivityType),
  performedAt: z.coerce.date(),
  data: z.record(z.string(), z.any()).nullable(),
  mediaUrl: z.string().nullable(),
});

export const tracePhotoSchema = z.object({
  id: z.string(),
  url: z.string(),
  alt: z.string().nullable(),
});

export const traceResponseSchema = z.object({
  product: traceProductSchema,
  lot: traceLotSchema,
  area: traceAreaSchema,
  cycle: traceCycleSchema,
  timeline: z.array(traceTimelineItemSchema),
  photos: z.array(tracePhotoSchema),
});

export type TraceProduct = z.infer<typeof traceProductSchema>;
export type TraceLot = z.infer<typeof traceLotSchema>;
export type TraceArea = z.infer<typeof traceAreaSchema>;
export type TraceCycle = z.infer<typeof traceCycleSchema>;
export type TraceTimelineItem = z.infer<typeof traceTimelineItemSchema>;
export type TracePhoto = z.infer<typeof tracePhotoSchema>;
export type TraceResponse = z.infer<typeof traceResponseSchema>;
