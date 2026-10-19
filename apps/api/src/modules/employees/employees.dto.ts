import { createZodDto } from 'nestjs-zod';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  queryEmployeeSchema,
  linkEmployeeUserSchema,
} from '@xfarm/shared';

export class CreateEmployeeDto extends createZodDto(createEmployeeSchema) {}
export class UpdateEmployeeDto extends createZodDto(updateEmployeeSchema) {}
export class QueryEmployeeDto extends createZodDto(queryEmployeeSchema) {}
export class LinkEmployeeUserDto extends createZodDto(linkEmployeeUserSchema) {}
