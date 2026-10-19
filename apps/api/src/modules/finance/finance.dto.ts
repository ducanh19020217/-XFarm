import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  createFinanceCategorySchema,
  updateFinanceCategorySchema,
  queryFinanceCategorySchema,
  createTransactionSchema,
  updateTransactionSchema,
  queryTransactionSchema,
  queryReceivablesSchema,
  createPaymentSchema,
  queryPaymentSchema,
  optionalDate,
  optionalNumber,
} from '@xfarm/shared';

export class CreateFinanceCategoryDto extends createZodDto(createFinanceCategorySchema) {}
export class UpdateFinanceCategoryDto extends createZodDto(updateFinanceCategorySchema) {}
export class QueryFinanceCategoryDto extends createZodDto(queryFinanceCategorySchema) {}

export class CreateTransactionDto extends createZodDto(createTransactionSchema) {}
export class UpdateTransactionDto extends createZodDto(updateTransactionSchema) {}
export class QueryTransactionDto extends createZodDto(queryTransactionSchema) {}

const financeReportDtoSchema = z.object({
  from: optionalDate(),
  to: optionalDate(),
  year: optionalNumber(),
});

export class FinanceReportQueryDto extends createZodDto(financeReportDtoSchema) {}
export class QueryReceivablesDto extends createZodDto(queryReceivablesSchema) {}

export class CreatePaymentDto extends createZodDto(createPaymentSchema) {}
export class QueryPaymentDto extends createZodDto(queryPaymentSchema) {}
