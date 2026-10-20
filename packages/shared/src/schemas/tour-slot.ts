import { z } from 'zod';
import { optionalBoolean, optionalDate, optionalString } from './helpers';
import { paginationSchema } from './pagination';
import { toVietnamDateString } from './calendar';

export function calculateBatchSlotCount(
  from: Date | string,
  to: Date | string,
  weekdays: number[],
  times: string[],
): number {
  const distinctTimes = Array.from(new Set(times));
  if (weekdays.length === 0 || distinctTimes.length === 0) return 0;
  const fromStr = toVietnamDateString(from);
  const toStr = toVietnamDateString(to);
  if (fromStr > toStr) return 0;

  const [fy, fm, fd] = fromStr.split('-').map(Number);
  const [ty, tm, td] = toStr.split('-').map(Number);
  let curTime = Date.UTC(fy, fm - 1, fd);
  const endTime = Date.UTC(ty, tm - 1, td);
  const weekdaySet = new Set(weekdays);
  let count = 0;

  while (curTime <= endTime) {
    const curDate = new Date(curTime);
    if (weekdaySet.has(curDate.getUTCDay())) {
      count += distinctTimes.length;
    }
    curTime += 24 * 60 * 60 * 1000;
  }
  return count;
}

export function generateBatchSlotDates(
  from: Date | string,
  to: Date | string,
  weekdays: number[],
  times: string[],
): Date[] {
  const distinctTimes = Array.from(new Set(times)).sort();
  if (weekdays.length === 0 || distinctTimes.length === 0) return [];
  const fromStr = toVietnamDateString(from);
  const toStr = toVietnamDateString(to);
  if (fromStr > toStr) return [];

  const [fy, fm, fd] = fromStr.split('-').map(Number);
  const [ty, tm, td] = toStr.split('-').map(Number);
  let curTime = Date.UTC(fy, fm - 1, fd);
  const endTime = Date.UTC(ty, tm - 1, td);
  const weekdaySet = new Set(weekdays);
  const dates: Date[] = [];

  while (curTime <= endTime) {
    const curDate = new Date(curTime);
    if (weekdaySet.has(curDate.getUTCDay())) {
      const y = curDate.getUTCFullYear();
      const m = curDate.getUTCMonth();
      const d = curDate.getUTCDate();
      for (const time of distinctTimes) {
        const [hours, minutes] = time.split(':').map(Number);
        const slotDate = new Date(Date.UTC(y, m, d, hours - 7, minutes, 0, 0));
        dates.push(slotDate);
      }
    }
    curTime += 24 * 60 * 60 * 1000;
  }
  return dates;
}

export const createTourSlotSchema = z.object({
  tourId: z.string().min(1, 'Tour không được để trống'),
  startAt: z.coerce.date(),
  capacity: z.coerce.number().int().positive('Sức chứa phải lớn hơn 0'),
  isActive: z.boolean().optional().default(true),
});

export const updateTourSlotSchema = z.object({
  capacity: z.coerce.number().int().positive('Sức chứa phải lớn hơn 0').optional(),
  isActive: z.boolean().optional(),
});

export const batchCreateTourSlotsSchema = z
  .object({
    tourId: z.string().optional(),
    from: z.coerce.date(),
    to: z.coerce.date(),
    weekdays: z
      .array(
        z
          .number()
          .int()
          .min(0, 'Thứ phải từ 0 (CN) đến 6 (T7)')
          .max(6, 'Thứ phải từ 0 (CN) đến 6 (T7)'),
      )
      .min(1, 'Phải chọn ít nhất một thứ trong tuần'),
    times: z
      .array(
        z
          .string()
          .trim()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ không hợp lệ (HH:mm)'),
      )
      .min(1, 'Phải có ít nhất một khung giờ'),
    capacity: z.coerce.number().int().positive('Sức chứa phải lớn hơn 0').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.from > data.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc',
        path: ['to'],
      });
      return;
    }
    const count = calculateBatchSlotCount(data.from, data.to, data.weekdays, data.times);
    if (count > 500) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Số lượng slot tạo hàng loạt (${count}) vượt quá tối đa 500 slot`,
        path: ['times'],
      });
    }
  });

export const queryTourSlotSchema = paginationSchema.extend({
  tourId: optionalString(),
  from: optionalDate(),
  to: optionalDate(),
  isActive: optionalBoolean(),
});

export type CreateTourSlotInput = z.infer<typeof createTourSlotSchema>;
export type UpdateTourSlotInput = z.infer<typeof updateTourSlotSchema>;
export type BatchCreateTourSlotsInput = z.infer<typeof batchCreateTourSlotsSchema>;
export type QueryTourSlotInput = z.infer<typeof queryTourSlotSchema>;
