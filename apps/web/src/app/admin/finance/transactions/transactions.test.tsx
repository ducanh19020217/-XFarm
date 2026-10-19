import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TransactionsPage, { type TransactionItem } from './page';
import * as api from '@/lib/api';
import { PaymentMethod, TransactionType } from '@xfarm/shared';

describe('Finance Transactions Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockCategories = [
    { id: 'cat-sales', name: 'Doanh thu bán hàng', type: TransactionType.INCOME },
    { id: 'cat-po', name: 'Chi phí mua hàng', type: TransactionType.EXPENSE },
    { id: 'cat-labor', name: 'Chi phí nhân công', type: TransactionType.EXPENSE },
  ];

  const mockCycles = [{ id: 'cycle-1', code: 'CY-01', name: 'Vụ Lúa Xuân 2026' }];

  const mockTransactions: TransactionItem[] = [
    {
      id: 'tx-auto-1',
      code: 'TX-2026-0001',
      type: TransactionType.INCOME,
      categoryId: 'cat-sales',
      amount: 1000000,
      date: '2026-04-10T00:00:00.000Z',
      cycleId: null,
      refType: 'SalesOrder',
      refId: 'so-1',
      method: PaymentMethod.BANK_TRANSFER,
      notes: 'Thanh toán đơn bán SO-2026-0001',
      mediaIds: [],
      createdAt: '2026-04-10T00:00:00.000Z',
      category: {
        id: 'cat-sales',
        name: 'Doanh thu bán hàng',
        type: TransactionType.INCOME,
      },
    },
    {
      id: 'tx-auto-2',
      code: 'TX-2026-0002',
      type: TransactionType.EXPENSE,
      categoryId: 'cat-po',
      amount: 500000,
      date: '2026-04-11T00:00:00.000Z',
      cycleId: null,
      refType: 'PurchaseOrder',
      refId: 'po-1',
      method: PaymentMethod.BANK_TRANSFER,
      notes: 'Thanh toán PO-2026-0001',
      mediaIds: [],
      createdAt: '2026-04-11T00:00:00.000Z',
      category: {
        id: 'cat-po',
        name: 'Chi phí mua hàng',
        type: TransactionType.EXPENSE,
      },
    },
    {
      id: 'tx-manual-1',
      code: 'TX-2026-0003',
      type: TransactionType.EXPENSE,
      categoryId: 'cat-labor',
      amount: 200000,
      date: '2026-04-12T00:00:00.000Z',
      cycleId: 'cycle-1',
      refType: null,
      refId: null,
      method: PaymentMethod.CASH,
      notes: 'Tiền công làm cỏ thủ công',
      mediaIds: ['media-1'],
      createdAt: '2026-04-12T00:00:00.000Z',
      category: {
        id: 'cat-labor',
        name: 'Chi phí nhân công',
        type: TransactionType.EXPENSE,
      },
      cycle: {
        id: 'cycle-1',
        code: 'CY-01',
        name: 'Vụ Lúa Xuân 2026',
      },
    },
  ];

  it('hiển thị danh sách giao dịch và tổng thu, tổng chi của bộ lọc', async () => {
    vi.spyOn(api, 'apiFetch').mockImplementation((url: string) => {
      if (url.includes('/finance-categories')) {
        return Promise.resolve({ data: mockCategories });
      }
      if (url.includes('/cycles')) {
        return Promise.resolve({ data: mockCycles });
      }
      return Promise.resolve({ data: mockTransactions, total: 3, page: 1, pageSize: 50 });
    });

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText('TX-2026-0001')).toBeDefined();
      expect(screen.getByText('TX-2026-0002')).toBeDefined();
      expect(screen.getByText('TX-2026-0003')).toBeDefined();
    });

    // Check totals
    expect(screen.getByText('Tổng thu (Bộ lọc)')).toBeDefined();
    expect(screen.getByText('Tổng chi (Bộ lọc)')).toBeDefined();
    expect(screen.getByText('Chênh lệch (Thu - Chi)')).toBeDefined();

    // Check values
    expect(screen.getAllByText(/1\.000\.000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/700\.000/).length).toBeGreaterThanOrEqual(1); // 500k + 200k = 700k chi
    expect(screen.getAllByText(/300\.000/).length).toBeGreaterThanOrEqual(1); // 1000k - 700k = 300k net
  });

  it('giao dịch tự động hiển thị link nguồn đơn/PO và KHÔNG có nút sửa/xóa', async () => {
    vi.spyOn(api, 'apiFetch').mockImplementation((url: string) => {
      if (url.includes('/finance-categories')) return Promise.resolve({ data: mockCategories });
      if (url.includes('/cycles')) return Promise.resolve({ data: mockCycles });
      return Promise.resolve({ data: mockTransactions, total: 3, page: 1, pageSize: 50 });
    });

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText('TX-2026-0001')).toBeDefined();
    });

    // Link nguồn
    expect(screen.getByText(/Đơn bán/)).toBeDefined();
    expect(screen.getByText(/Đơn mua PO/)).toBeDefined();

    // Hai giao dịch tự động hiển thị nhãn 'Tự động' thay vì nút thao tác
    const autoLabels = screen.getAllByText('Tự động');
    expect(autoLabels.length).toBe(2);

    // Giao dịch thủ công có nút sửa và xóa
    expect(screen.getByTitle('Sửa giao dịch')).toBeDefined();
    expect(screen.getByTitle('Xóa giao dịch')).toBeDefined();
  });

  it('mở form tạo giao dịch thủ công và gửi request POST thành công', async () => {
    const fetchSpy = vi
      .spyOn(api, 'apiFetch')
      .mockImplementation((url: string, opts?: RequestInit) => {
        if (url.includes('/finance-categories')) return Promise.resolve({ data: mockCategories });
        if (url.includes('/cycles')) return Promise.resolve({ data: mockCycles });
        if (opts?.method === 'POST') {
          return Promise.resolve({ data: { id: 'tx-new', code: 'TX-2026-0004' } });
        }
        return Promise.resolve({ data: mockTransactions, total: 3, page: 1, pageSize: 50 });
      });

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText('TX-2026-0001')).toBeDefined();
    });

    const createBtn = screen.getByRole('button', { name: /tạo giao dịch/i });
    fireEvent.click(createBtn);

    expect(screen.getByText('Tạo giao dịch thu / chi mới')).toBeDefined();

    // Select category
    const catSelect = screen.getByLabelText(/danh mục thu\/chi \*/i);
    fireEvent.change(catSelect, { target: { value: 'cat-labor' } });

    // Enter amount
    const amountInput = screen.getByPlaceholderText('0');
    fireEvent.change(amountInput, { target: { value: '150000' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /tạo giao dịch/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/transactions',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });
});
