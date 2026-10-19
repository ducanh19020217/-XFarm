import { z } from 'zod';
import { optionalDate, optionalNumber, optionalString } from './helpers';
import { StockMoveDirection } from '../types';
import { paginationSchema } from './pagination';

const stockLineSchema = z.object({
  itemId: z.string().min(1),
  stockLotId: optionalString(),
  quantity: z.coerce.number().positive('Số lượng phải lớn hơn 0'),
  unitCost: optionalNumber(z.number().nonnegative()).default(0),
  lotCode: optionalString(),
  expiryDate: optionalDate(),
});

export const stockInSchema = z.object({
  warehouseId: z.string().min(1),
  movedAt: optionalDate(),
  notes: optionalString(),
  lines: z.array(stockLineSchema).min(1, 'Phiếu phải có ít nhất một dòng'),
});
export const stockOutSchema = stockInSchema.extend({
  reason: optionalString(),
  lines: z.array(stockLineSchema.omit({ unitCost: true, lotCode: true, expiryDate: true })).min(1),
});
export const stockTransferSchema = z
  .object({
    fromWarehouseId: z.string().min(1),
    toWarehouseId: z.string().min(1),
    movedAt: optionalDate(),
    notes: optionalString(),
    lines: z
      .array(stockLineSchema.omit({ unitCost: true, lotCode: true, expiryDate: true }))
      .min(1),
  })
  .refine((value) => value.fromWarehouseId !== value.toWarehouseId, {
    message: 'Kho chuyển đến phải khác kho chuyển đi',
    path: ['toWarehouseId'],
  });
export const stockAdjustSchema = z
  .object({
    warehouseId: z.string().min(1),
    direction: z.nativeEnum(StockMoveDirection).optional(),
    movedAt: optionalDate(),
    notes: optionalString(),
    lines: z
      .array(
        z.union([
          z.object({
            itemId: z.string().min(1),
            stockLotId: z.string().min(1),
            countedQuantity: z.coerce.number().nonnegative('Số đếm không được âm'),
          }),
          z.object({
            itemId: z.string().min(1),
            stockLotId: optionalString(),
            quantity: z.coerce.number().positive('Số lượng phải lớn hơn 0'),
          }),
        ]),
      )
      .min(1),
  })
  .superRefine((value, ctx) => {
    if (!value.direction && value.lines.some((line) => 'quantity' in line)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Chiều điều chỉnh là bắt buộc',
        path: ['direction'],
      });
    }
  });
export const stockBalanceQuerySchema = paginationSchema.extend({
  warehouseId: optionalString(),
  category: z.string().optional(),
  itemId: optionalString(),
  search: optionalString(),
  lotCode: optionalString(),
  includeZero: z.coerce.boolean().default(false),
});
export const stockMoveQuerySchema = paginationSchema.extend({
  itemId: optionalString(),
  warehouseId: optionalString(),
  type: z.enum(['IN', 'OUT', 'TRANSFER', 'ADJUST']).optional(),
  from: optionalDate(),
  to: optionalDate(),
});
export type StockBalanceQueryInput = z.infer<typeof stockBalanceQuerySchema>;
export type StockMoveQueryInput = z.infer<typeof stockMoveQuerySchema>;
export type StockInInput = z.infer<typeof stockInSchema>;
export type StockOutInput = z.infer<typeof stockOutSchema>;
export type StockTransferInput = z.infer<typeof stockTransferSchema>;
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;

export const createStockInSchema = stockInSchema;
export const createStockOutSchema = stockOutSchema;
export const createStockTransferSchema = stockTransferSchema;
export const createStockAdjustSchema = stockAdjustSchema;
