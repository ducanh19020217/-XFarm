import { createZodDto } from 'nestjs-zod';
import {
  generatePayrollSchema,
  createPayrollSchema,
  updatePayrollSchema,
  queryPayrollSchema,
} from '@xfarm/shared';

export class GeneratePayrollDto extends createZodDto(generatePayrollSchema) {}
export class CreatePayrollDto extends createZodDto(createPayrollSchema) {}
export class UpdatePayrollDto extends createZodDto(updatePayrollSchema) {}
export class QueryPayrollDto extends createZodDto(queryPayrollSchema) {}
