import { z } from 'zod';
import { CycleKind, CycleStatus } from '../types';
import { paginationSchema } from './pagination';
import { optionalDate, optionalNullableString, optionalNumber, optionalString } from './helpers';

export const CYCLE_TRANSITIONS: Record<CycleStatus, CycleStatus[]> = {
  [CycleStatus.PLANNED]: [CycleStatus.ACTIVE, CycleStatus.CANCELLED],
  [CycleStatus.ACTIVE]: [CycleStatus.HARVESTING, CycleStatus.CANCELLED],
  [CycleStatus.HARVESTING]: [CycleStatus.CLOSED],
  [CycleStatus.CLOSED]: [],
  [CycleStatus.CANCELLED]: [],
};

export function canTransition(from: CycleStatus, to: CycleStatus): boolean {
  const allowed = CYCLE_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export const createCycleSchema = z.object({
  code: optionalString(),
  name: z.string().min(1, 'Tên mùa vụ không được để trống'),
  kind: z.nativeEnum(CycleKind),
  areaId: z.string().min(1, 'Khu/lô không được để trống'),
  species: z.string().min(1, 'Giống/loài không được để trống'),
  variety: optionalNullableString(),
  startDate: z.coerce.date(),
  expectedEndDate: optionalDate(),
  endDate: optionalDate(),
  status: z.nativeEnum(CycleStatus).optional().default(CycleStatus.PLANNED),
  expectedYield: optionalNumber(z.number().positive('Năng suất dự kiến phải lớn hơn 0')),
  yieldUnit: optionalNullableString(),
  // initialQuantity đại diện cho số lượng con giống (AQUA/LIVESTOCK) hoặc số cây/lượng gieo (CROP).
  // Viết nới lỏng: không ép buộc cứng, chỉ yêu cầu số dương nếu được cung cấp.
  initialQuantity: optionalNumber(z.number().positive('Số lượng khởi tạo phải lớn hơn 0')),
  notes: optionalNullableString(),
});

export const queryCycleSchema = paginationSchema.extend({
  areaId: z.string().optional(),
  kind: z.nativeEnum(CycleKind).optional(),
  status: z.nativeEnum(CycleStatus).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const updateCycleSchema = createCycleSchema
  .omit({ code: true, status: true, endDate: true })
  .partial();

export type CreateCycleInput = z.infer<typeof createCycleSchema>;
export type UpdateCycleInput = z.infer<typeof updateCycleSchema>;
export type QueryCycleInput = z.infer<typeof queryCycleSchema>;
