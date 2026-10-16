import { z } from 'zod';
import { ActivityType } from '../types';
import { paginationSchema } from './pagination';

export const waterTestDataSchema = z.object({
  pH: z.coerce.number().min(0, 'pH tối thiểu là 0').max(14, 'pH tối đa là 14'),
  DO: z.coerce.number().min(0, 'DO không được âm'),
  temp: z.coerce.number(),
  salinity: z.coerce.number().min(0).optional(),
  NH3: z.coerce.number().min(0).optional(),
});

export const weighingDataSchema = z.object({
  avgWeightKg: z.coerce.number().positive('Khối lượng trung bình phải lớn hơn 0'),
  sampleSize: z.coerce.number().int().positive('Cỡ mẫu phải là số nguyên dương'),
});

export const feedingDataSchema = z.object({
  feedKg: z.coerce.number().positive('Khối lượng thức ăn phải lớn hơn 0'),
});

export const mortalityDataSchema = z.object({
  count: z.coerce.number().int().min(1, 'Số lượng chết/hao hụt tối thiểu là 1'),
  cause: z.string().optional(),
});

export const stockingDataSchema = z.object({
  count: z.coerce.number().int().min(1, 'Số lượng thả giống tối thiểu là 1'),
  avgWeightG: z.coerce.number().positive('Khối lượng trung bình phải lớn hơn 0').optional(),
});

export const irrigationDataSchema = z.object({
  durationMin: z.coerce.number().positive('Thời gian tưới (phút) phải lớn hơn 0'),
  volumeL: z.coerce.number().positive('Thể tích nước (lít) phải lớn hơn 0').optional(),
});

export const sprayingDataSchema = z.object({
  product: z.string().optional(),
  dosage: z.string().optional(),
});

export const fertilizingDataSchema = z.object({
  product: z.string().optional(),
  dosage: z.string().optional(),
});

export const genericActivityDataSchema = z.record(z.string(), z.any()).optional().default({});

export const activityDataSchemas: Record<ActivityType, z.ZodTypeAny> = {
  [ActivityType.WATER_TEST]: waterTestDataSchema,
  [ActivityType.WEIGHING]: weighingDataSchema,
  [ActivityType.FEEDING]: feedingDataSchema,
  [ActivityType.MORTALITY]: mortalityDataSchema,
  [ActivityType.STOCKING]: stockingDataSchema,
  [ActivityType.IRRIGATION]: irrigationDataSchema,
  [ActivityType.SPRAYING]: sprayingDataSchema,
  [ActivityType.FERTILIZING]: fertilizingDataSchema,
  [ActivityType.SOWING]: genericActivityDataSchema,
  [ActivityType.PLANTING]: genericActivityDataSchema,
  [ActivityType.PRUNING]: genericActivityDataSchema,
  [ActivityType.WEEDING]: genericActivityDataSchema,
  [ActivityType.VACCINATION]: genericActivityDataSchema,
  [ActivityType.TREATMENT]: genericActivityDataSchema,
  [ActivityType.HARVEST]: genericActivityDataSchema,
  [ActivityType.CLEANING]: genericActivityDataSchema,
  [ActivityType.OTHER]: genericActivityDataSchema,
};

export function parseActivityData(type: ActivityType, data: unknown) {
  let parsed = data;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      // let zod handle parse errors
    }
  }
  const schema = activityDataSchemas[type] ?? genericActivityDataSchema;
  return schema.parse(parsed ?? {});
}

export const createActivitySchema = z.object({
  cycleId: z.string().nullable().optional(),
  areaId: z.string().min(1, 'Khu/lô không được để trống'),
  type: z.nativeEnum(ActivityType),
  performedAt: z.coerce
    .date()
    .optional()
    .default(() => new Date()),
  performedById: z.string().nullable().optional(),
  quantity: z.coerce.number().positive('Số lượng phải lớn hơn 0').nullable().optional(),
  unit: z.string().nullable().optional(),
  data: z.any().nullable().optional(),
  notes: z.string().nullable().optional(),
  mediaIds: z.array(z.string()).optional().default([]),
});

export const updateActivitySchema = createActivitySchema.partial();

export const queryActivitySchema = paginationSchema.extend({
  cycleId: z.string().optional(),
  areaId: z.string().optional(),
  type: z.nativeEnum(ActivityType).optional(),
  performedById: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  // Backwards-compatible aliases for clients that use the more descriptive names.
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type QueryActivityInput = z.infer<typeof queryActivitySchema>;

export type WaterTestData = z.infer<typeof waterTestDataSchema>;
export type WeighingData = z.infer<typeof weighingDataSchema>;
export type FeedingData = z.infer<typeof feedingDataSchema>;
export type MortalityData = z.infer<typeof mortalityDataSchema>;
export type StockingData = z.infer<typeof stockingDataSchema>;
export type IrrigationData = z.infer<typeof irrigationDataSchema>;
export type SprayingData = z.infer<typeof sprayingDataSchema>;
export type FertilizingData = z.infer<typeof fertilizingDataSchema>;
