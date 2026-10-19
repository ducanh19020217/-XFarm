import { createZodDto } from 'nestjs-zod';
import {
  confirmSalesOrderSchema,
  createPaymentSchema,
  createSalesOrderSchema,
  querySalesOrderSchema,
  transitionSalesOrderSchema,
  updateSalesOrderSchema,
} from '@xfarm/shared';

export class CreateSalesOrderDto extends createZodDto(createSalesOrderSchema) {}
export class UpdateSalesOrderDto extends createZodDto(updateSalesOrderSchema) {}
export class ConfirmSalesOrderDto extends createZodDto(confirmSalesOrderSchema) {}
export class TransitionSalesOrderDto extends createZodDto(transitionSalesOrderSchema) {}
export class QuerySalesOrderDto extends createZodDto(querySalesOrderSchema) {}
export class CreatePaymentDto extends createZodDto(createPaymentSchema) {}
