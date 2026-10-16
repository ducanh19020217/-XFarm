import { z } from 'zod';
import { paginationSchema } from './pagination';
import { optionalDate, optionalNumber, optionalString } from './helpers';

export const checkInSchema = z.object({
  clientId: optionalString(),
  at: optionalDate(),
  cycleId: optionalString(),
  employeeId: optionalString(),
  notes: optionalString(),
});

export const checkOutSchema = z.object({
  clientId: optionalString(),
  at: optionalDate(),
  cycleId: optionalString(),
  employeeId: optionalString(),
  pieceQty: optionalNumber(z.number().min(0, 'Số lượng khoán không được âm')),
  notes: optionalString(),
});

export const createAttendanceSchema = z.object({
  employeeId: z.string().min(1, 'Nhân viên không được để trống'),
  date: z.coerce.date({
    errorMap: () => ({ message: 'Ngày chấm công không hợp lệ' }),
  }),
  checkIn: optionalDate(),
  checkOut: optionalDate(),
  hours: optionalNumber(z.number().min(0, 'Số giờ không được âm').max(24, 'Số giờ tối đa là 24')),
  cycleId: optionalString(),
  pieceQty: optionalNumber(z.number().min(0, 'Số lượng khoán không được âm')),
  notes: optionalString(),
  clientId: optionalString(),
});

export const updateAttendanceSchema = createAttendanceSchema.partial();

export const queryAttendanceSchema = paginationSchema.extend({
  employeeId: optionalString(),
  cycleId: optionalString(),
  date: optionalDate(),
  from: optionalDate(),
  to: optionalDate(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
export type QueryAttendanceInput = z.infer<typeof queryAttendanceSchema>;
