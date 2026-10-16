import { describe, expect, it } from 'vitest';
import { ItemCategory, StockMoveDirection } from '../types';
import { createItemSchema } from './item';
import { stockAdjustSchema, stockTransferSchema } from './stock';
import { createPurchaseOrderSchema, receivePurchaseOrderSchema } from './purchase-order';
import { activityMaterialsSchema } from './activity-material';
import { queryAlertSchema } from './alert';

describe('inventory schemas', () => {
  it('parses item values and normalizes an empty optional minStock', () => {
    const result = createItemSchema.parse({
      sku: 'NPK-1',
      name: 'Phân NPK',
      category: ItemCategory.FERTILIZER,
      unit: 'kg',
      minStock: '',
    });
    expect(result.minStock).toBeUndefined();
    expect(result.isActive).toBe(true);
  });

  it('requires an explicit direction for adjustments', () => {
    expect(() =>
      stockAdjustSchema.parse({
        warehouseId: 'warehouse-1',
        lines: [{ itemId: 'item-1', quantity: 2 }],
      }),
    ).toThrow();
    expect(
      stockAdjustSchema.parse({
        warehouseId: 'warehouse-1',
        direction: StockMoveDirection.IN,
        lines: [{ itemId: 'item-1', quantity: 2 }],
      }).direction,
    ).toBe(StockMoveDirection.IN);
  });

  it('rejects transfers to the same warehouse', () => {
    expect(() =>
      stockTransferSchema.parse({
        fromWarehouseId: 'warehouse-1',
        toWarehouseId: 'warehouse-1',
        lines: [{ itemId: 'item-1', quantity: 2 }],
      }),
    ).toThrow();
  });

  it('validates purchase order and receiving lines', () => {
    expect(
      createPurchaseOrderSchema.parse({
        supplierId: 'supplier-1',
        lines: [{ itemId: 'item-1', quantity: 10, unitPrice: 12000 }],
      }).lines,
    ).toHaveLength(1);
    expect(
      receivePurchaseOrderSchema.parse({
        warehouseId: 'warehouse-1',
        lines: [{ lineId: 'line-1', quantity: 3, lotCode: '' }],
      }).lines[0].lotCode,
    ).toBeUndefined();
  });

  it('requires at least one activity material and parses alert query flags', () => {
    expect(() => activityMaterialsSchema.parse({ materials: [] })).toThrow();
    expect(queryAlertSchema.parse({ page: '1', pageSize: '20', unread: 'true' }).unread).toBe(true);
  });
});
