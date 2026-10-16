import { createZodDto } from 'nestjs-zod';
import {
  checkInSchema,
  checkOutSchema,
  createAttendanceSchema,
  updateAttendanceSchema,
  queryAttendanceSchema,
} from '@xfarm/shared';

export class CheckInDto extends createZodDto(checkInSchema) {}
export class CheckOutDto extends createZodDto(checkOutSchema) {}
export class CreateAttendanceDto extends createZodDto(createAttendanceSchema) {}
export class UpdateAttendanceDto extends createZodDto(updateAttendanceSchema) {}
export class QueryAttendanceDto extends createZodDto(queryAttendanceSchema) {}
