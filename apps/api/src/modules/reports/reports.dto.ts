import { createZodDto } from 'nestjs-zod';
import {
  cashflowReportQuerySchema,
  cycleReportQuerySchema,
  productReportQuerySchema,
} from '@xfarm/shared';

export class CashflowReportQueryDto extends createZodDto(cashflowReportQuerySchema) {}
export class CycleReportQueryDto extends createZodDto(cycleReportQuerySchema) {}
export class ProductReportQueryDto extends createZodDto(productReportQuerySchema) {}
