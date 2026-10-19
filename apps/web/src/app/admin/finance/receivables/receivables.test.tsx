import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReceivablesPage from './page';
import * as api from '@/lib/api';

describe('Finance Receivables Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockReceivablesData = {
    byCustomer: [
      {
        customerId: 'cust-1',
        customerCode: 'CU-0001',
        customerName: 'Nguyễn Văn An',
        customerPhone: '0901234567',
        totalOrders: 1000000,
        totalPaid: 600000,
        debt: 400000,
        orderCount: 1,
      },
    ],
    byOrder: [
      {
        orderId: 'so-1',
        orderCode: 'SO-2026-0001',
        customerId: 'cust-1',
        customerName: 'Nguyễn Văn An',
        customerPhone: '0901234567',
        status: 'COMPLETED',
        paymentStatus: 'PARTIAL',
        total: 1000000,
        paid: 600000,
        remaining: 400000,
        createdAt: '2026-04-01T00:00:00.000Z',
        confirmedAt: '2026-04-01T00:00:00.000Z',
        isOverdue: true,
        daysOverdue: 8,
      },
      {
        orderId: 'so-2',
        orderCode: 'SO-2026-0002',
        customerId: 'cust-2',
        customerName: 'Trần Thị Bình',
        customerPhone: '0988776655',
        status: 'CONFIRMED',
        paymentStatus: 'UNPAID',
        total: 500000,
        paid: 0,
        remaining: 500000,
        createdAt: '2026-04-12T00:00:00.000Z',
        confirmedAt: '2026-04-12T00:00:00.000Z',
        isOverdue: false,
        daysOverdue: 0,
      },
    ],
    summary: {
      totalReceivable: 900000,
      totalOverdue: 400000,
      customerCount: 2,
      orderCount: 2,
    },
  };

  it('hiển thị đầy đủ tổng công nợ và danh sách khách hàng nợ', async () => {
    vi.spyOn(api, 'apiFetch').mockResolvedValueOnce({ data: mockReceivablesData });

    render(<ReceivablesPage />);

    await waitFor(() => {
      expect(screen.getByText('Quản lý công nợ')).toBeDefined();
      expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
    });

    // Check summary cards
    expect(screen.getByText('Tổng nợ phải thu')).toBeDefined();
    expect(screen.getByText('Nợ quá hạn (> 7 ngày)')).toBeDefined();
    expect(screen.getAllByText(/900\.000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/400\.000/).length).toBeGreaterThanOrEqual(1);
  });

  it('chuyển sang tab Đơn nợ & Quá hạn và hiển thị badge quá hạn', async () => {
    vi.spyOn(api, 'apiFetch').mockResolvedValueOnce({ data: mockReceivablesData });

    render(<ReceivablesPage />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
    });

    const orderTabBtn = screen.getByRole('button', { name: /Đơn nợ & Quá hạn/i });
    fireEvent.click(orderTabBtn);

    await waitFor(() => {
      expect(screen.getByText('SO-2026-0001')).toBeDefined();
      expect(screen.getByText('SO-2026-0002')).toBeDefined();
    });

    // Badge quá hạn
    expect(screen.getByText(/Quá hạn 8 ngày/)).toBeDefined();
    expect(screen.getByText(/Trong hạn/)).toBeDefined();
  });

  it('lọc chỉ hiện đơn quá hạn', async () => {
    vi.spyOn(api, 'apiFetch').mockResolvedValueOnce({ data: mockReceivablesData });

    render(<ReceivablesPage />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
    });

    const orderTabBtn = screen.getByRole('button', { name: /Đơn nợ & Quá hạn/i });
    fireEvent.click(orderTabBtn);

    await waitFor(() => {
      expect(screen.getByText('SO-2026-0001')).toBeDefined();
    });

    const overdueCheckbox = screen.getByLabelText(/Chỉ hiện đơn quá hạn/i);
    fireEvent.click(overdueCheckbox);

    // SO-2026-0001 (quá hạn) vẫn còn, SO-2026-0002 (trong hạn) bị ẩn
    expect(screen.getByText('SO-2026-0001')).toBeDefined();
    expect(screen.queryByText('SO-2026-0002')).toBeNull();
  });
});
