import { z } from 'zod';
import { optionalDate, optionalNumber, optionalString } from './helpers';
import { StockMoveDirection } from '../types';

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
export const stockAdjustSchema = z.object({
  warehouseId: z.string().min(1),
  direction: z.nativeEnum(StockMoveDirection),
  movedAt: optionalDate(),
  notes: optionalString(),
  lines: z.array(stockLineSchema).min(1),
});
export type StockInInput = z.infer<typeof stockInSchema>;
export type StockOutInput = z.infer<typeof stockOutSchema>;
export type StockTransferInput = z.infer<typeof stockTransferSchema>;
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;

export const createStockInSchema = stockInSchema;
export const createStockOutSchema = stockOutSchema;
export const createStockTransferSchema = stockTransferSchema;
export const createStockAdjustSchema = stockAdjustSchema;
