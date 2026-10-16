import { z } from 'zod';
import { PurchaseOrderStatus } from '../types';
import { optionalDate, optionalNumber, optionalString } from './helpers';
import { paginationSchema } from './pagination';

const purchaseOrderLineSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
});
export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1),
  orderDate: optionalDate(),
  notes: optionalString(),
  lines: z.array(purchaseOrderLineSchema).min(1, 'Đơn mua phải có ít nhất một dòng'),
});

const updatePurchaseOrderLineSchema = z.object({
  id: z.string().optional(),
  itemId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
});

export const updatePurchaseOrderSchema = z.object({
  supplierId: z.string().min(1).optional(),
  orderDate: optionalDate(),
  notes: optionalString(),
  lines: z
    .array(updatePurchaseOrderLineSchema)
    .min(1, 'Đơn mua phải có ít nhất một dòng')
    .optional(),
});

export const receivePurchaseOrderSchema = z.object({
  warehouseId: z.string().min(1),
  lines: z
    .array(
      z.object({
        lineId: z.string().min(1),
        quantity: z.coerce.number().positive(),
        lotCode: optionalString(),
        expiryDate: optionalDate(),
        unitCost: optionalNumber(z.number().nonnegative()),
      }),
    )
    .min(1),
});

export const queryPurchaseOrderSchema = paginationSchema.extend({
  status: z.nativeEnum(PurchaseOrderStatus).optional(),
  supplierId: z.string().optional(),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>;
export type QueryPurchaseOrderInput = z.infer<typeof queryPurchaseOrderSchema>;
