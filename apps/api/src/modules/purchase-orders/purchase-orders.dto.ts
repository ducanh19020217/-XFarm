import { createZodDto } from 'nestjs-zod';
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  receivePurchaseOrderSchema,
  queryPurchaseOrderSchema,
  payPurchaseOrderSchema,
} from '@xfarm/shared';

export class CreatePurchaseOrderDto extends createZodDto(createPurchaseOrderSchema) {}
export class UpdatePurchaseOrderDto extends createZodDto(updatePurchaseOrderSchema) {}
export class ReceivePurchaseOrderDto extends createZodDto(receivePurchaseOrderSchema) {}
export class QueryPurchaseOrderDto extends createZodDto(queryPurchaseOrderSchema) {}
export class PayPurchaseOrderDto extends createZodDto(payPurchaseOrderSchema) {}
