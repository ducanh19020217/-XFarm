import { describe, expect, it } from 'vitest';
import {
  createCustomerSchema,
  createSalesOrderSchema,
  financeReportQuerySchema,
  webshopCheckoutSchema,
  webshopOrderLookupSchema,
} from '../index';

describe('sales and finance schemas', () => {
  it('validates a customer and an admin order with at least one line', () => {
    expect(
      createCustomerSchema.safeParse({
        name: 'Khách lẻ mẫu',
        phone: '0912345678',
        type: 'RETAIL',
      }).success,
    ).toBe(true);
    expect(
      createSalesOrderSchema.safeParse({
        customerId: 'customer-1',
        paymentMethod: 'COD',
        shippingAddress: 'Hà Nội',
        lines: [{ itemId: 'item-1', quantity: '2', unitPrice: '35000' }],
      }).success,
    ).toBe(true);
    expect(
      createSalesOrderSchema.safeParse({
        customerId: 'customer-1',
        paymentMethod: 'COD',
        shippingAddress: 'Hà Nội',
        lines: [],
      }).success,
    ).toBe(false);
  });

  it('restricts webshop payment and validates Vietnamese phone numbers', () => {
    expect(
      webshopCheckoutSchema.safeParse({
        fullName: 'Nguyễn Văn A',
        phone: '0912345678',
        address: 'Hà Nội',
        paymentMethod: 'COD',
        items: [{ productId: 'product-1', quantity: 1 }],
      }).success,
    ).toBe(true);
    expect(
      webshopCheckoutSchema.safeParse({
        fullName: 'Nguyễn Văn A',
        phone: '123',
        address: 'Hà Nội',
        paymentMethod: 'CASH',
        items: [{ productId: 'product-1', quantity: 1 }],
      }).success,
    ).toBe(false);
    expect(
      webshopOrderLookupSchema.safeParse({ code: 'SO-2026-0001', phone: '0912345678' }).success,
    ).toBe(true);
  });

  it('accepts either a date range or a report year', () => {
    expect(financeReportQuerySchema.safeParse({ year: '2026' }).success).toBe(true);
    expect(
      financeReportQuerySchema.safeParse({ from: '2026-01-01', to: '2026-12-31' }).success,
    ).toBe(true);
    expect(financeReportQuerySchema.safeParse({}).success).toBe(false);
  });
});
