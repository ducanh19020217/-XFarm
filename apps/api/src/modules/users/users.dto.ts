import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { createUserSchema, updateUserSchema, paginationSchema } from '@xfarm/shared';

export class CreateUserDto extends createZodDto(createUserSchema) {}
export class UpdateUserDto extends createZodDto(updateUserSchema) {}
export class QueryUsersDto extends createZodDto(paginationSchema) {}

export const updateStatusSchema = z.object({
  isActive: z.boolean(),
});

export class UpdateStatusDto extends createZodDto(updateStatusSchema) {}
