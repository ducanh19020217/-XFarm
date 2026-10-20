import { createZodDto } from 'nestjs-zod';
import { publicBookingSchema, queryBookingSchema, createPaymentSchema } from '@xfarm/shared';
import { z } from 'zod';

export class PublicBookingDto extends createZodDto(publicBookingSchema) {}
export class QueryBookingDto extends createZodDto(queryBookingSchema) {}
export class CreateBookingPaymentDto extends createZodDto(
  createPaymentSchema.omit({ orderId: true }),
) {}
export class LookupBookingDto extends createZodDto(
  z.object({ code: z.string().min(1), phone: z.string().min(1) }),
) {}
