import { describe, expect, it } from 'vitest';
import { ItemCategory, ITEM_CATEGORY_LABELS, StockMoveDirection } from '../types';
import { createItemSchema, queryItemSchema } from './item';
import { createWarehouseSchema } from './warehouse';
import { createSupplierSchema } from './supplier';
import { stockAdjustSchema, stockTransferSchema } from './stock';
import { createPurchaseOrderSchema, receivePurchaseOrderSchema } from './purchase-order';
import { activityMaterialsSchema } from './activity-material';
import { queryAlertSchema } from './alert';

describe('inventory schemas', () => {
  it('parses item values and normalizes an empty optional minStock and sku', () => {
    const result = createItemSchema.parse({
      sku: '',
      name: 'Phân NPK',
      category: ItemCategory.FERTILIZER,
      unit: 'kg',
      minStock: '',
    });
    expect(result.sku).toBeUndefined();
    expect(result.minStock).toBeUndefined();
    expect(result.isActive).toBe(true);
  });

  it('normalizes empty optional code and fields for warehouse and supplier', () => {
    const wh = createWarehouseSchema.parse({
      code: '',
      name: 'Kho mới',
      areaId: '',
    });
    expect(wh.code).toBeUndefined();
    expect(wh.areaId).toBeUndefined();

    const sup = createSupplierSchema.parse({
      code: '  ',
      name: 'Nhà cung cấp A',
      phone: '',
      address: '',
      taxCode: '',
    });
    expect(sup.code).toBeUndefined();
    expect(sup.phone).toBeUndefined();
    expect(sup.address).toBeUndefined();
    expect(sup.taxCode).toBeUndefined();
  });

  it('parses queryItemSchema filters including belowMinStock and isSellable', () => {
    const parsed = queryItemSchema.parse({
      page: '1',
      pageSize: '10',
      category: ItemCategory.FEED,
      belowMinStock: 'true',
      isSellable: 'false',
    });
    expect(parsed.belowMinStock).toBe(true);
    expect(parsed.isSellable).toBe(false);
    expect(parsed.category).toBe(ItemCategory.FEED);
  });

  it('contains Vietnamese labels for all 11 ItemCategory values', () => {
    const categories = Object.values(ItemCategory);
    expect(categories).toHaveLength(11);
    for (const cat of categories) {
      expect(ITEM_CATEGORY_LABELS[cat]).toBeDefined();
      expect(typeof ITEM_CATEGORY_LABELS[cat]).toBe('string');
      expect(ITEM_CATEGORY_LABELS[cat].length).toBeGreaterThan(0);
    }
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
