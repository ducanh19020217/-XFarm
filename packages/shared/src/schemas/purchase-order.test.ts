import { describe, expect, it } from 'vitest';
import { PurchaseOrderStatus } from '../types';
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  receivePurchaseOrderSchema,
  queryPurchaseOrderSchema,
} from './purchase-order';

describe('purchase-order schemas', () => {
  it('validates createPurchaseOrderSchema with valid data', () => {
    const parsed = createPurchaseOrderSchema.parse({
      supplierId: 'sup-123',
      orderDate: '2026-04-10T00:00:00.000Z',
      notes: 'Ghi chú đơn hàng',
      lines: [
        { itemId: 'item-1', quantity: 10, unitPrice: 50000 },
        { itemId: 'item-2', quantity: '5.5', unitPrice: '20000' },
      ],
    });

    expect(parsed.supplierId).toBe('sup-123');
    expect(parsed.notes).toBe('Ghi chú đơn hàng');
    expect(parsed.lines).toHaveLength(2);
    expect(parsed.lines[0].quantity).toBe(10);
    expect(parsed.lines[1].quantity).toBe(5.5);
  });

  it('rejects createPurchaseOrderSchema with empty lines or non-positive quantity', () => {
    expect(() =>
      createPurchaseOrderSchema.parse({
        supplierId: 'sup-123',
        lines: [],
      }),
    ).toThrow('Đơn mua phải có ít nhất một dòng');

    expect(() =>
      createPurchaseOrderSchema.parse({
        supplierId: 'sup-123',
        lines: [{ itemId: 'item-1', quantity: 0, unitPrice: 1000 }],
      }),
    ).toThrow();
  });

  it('validates updatePurchaseOrderSchema with partial data and lines', () => {
    const parsed = updatePurchaseOrderSchema.parse({
      supplierId: 'sup-456',
      lines: [{ id: 'line-1', itemId: 'item-1', quantity: 20, unitPrice: 45000 }],
    });

    expect(parsed.supplierId).toBe('sup-456');
    expect(parsed.lines).toHaveLength(1);
    expect(parsed.lines?.[0].quantity).toBe(20);

    const emptyUpdate = updatePurchaseOrderSchema.parse({});
    expect(emptyUpdate.supplierId).toBeUndefined();
    expect(emptyUpdate.lines).toBeUndefined();
  });

  it('validates receivePurchaseOrderSchema normalizing empty strings', () => {
    const parsed = receivePurchaseOrderSchema.parse({
      warehouseId: 'wh-123',
      lines: [
        {
          lineId: 'line-1',
          quantity: '5',
          lotCode: '',
          expiryDate: '',
          unitCost: '48000',
        },
      ],
    });

    expect(parsed.warehouseId).toBe('wh-123');
    expect(parsed.lines[0].quantity).toBe(5);
    expect(parsed.lines[0].lotCode).toBeUndefined();
    expect(parsed.lines[0].expiryDate).toBeUndefined();
    expect(parsed.lines[0].unitCost).toBe(48000);
  });

  it('rejects receivePurchaseOrderSchema with empty lines', () => {
    expect(() =>
      receivePurchaseOrderSchema.parse({
        warehouseId: 'wh-123',
        lines: [],
      }),
    ).toThrow();
  });

  it('validates queryPurchaseOrderSchema with status and supplierId', () => {
    const parsed = queryPurchaseOrderSchema.parse({
      page: '2',
      pageSize: '10',
      status: PurchaseOrderStatus.ORDERED,
      supplierId: 'sup-123',
      search: 'PO-2026',
    });

    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(10);
    expect(parsed.status).toBe(PurchaseOrderStatus.ORDERED);
    expect(parsed.supplierId).toBe('sup-123');
    expect(parsed.search).toBe('PO-2026');
  });
});
