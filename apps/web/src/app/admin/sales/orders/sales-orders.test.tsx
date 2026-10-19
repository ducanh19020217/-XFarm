import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SalesOrderDetailPage from './[id]/page';
import * as api from '@/lib/api';
import { AdminUserProvider, type AdminUser } from '../../admin-user-context';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'so-1' }),
  useRouter: () => ({ push: vi.fn() }),
}));

describe('Sales Order Detail & Payment Section', () => {
  const mockAdminUser: AdminUser = {
    id: 'u-owner',
    email: 'owner@xfarm.local',
    fullName: 'Owner',
    role: 'OWNER',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockOrder = {
    id: 'so-1',
    code: 'SO-2026-0001',
    channel: 'ADMIN',
    status: 'CONFIRMED',
    paymentStatus: 'UNPAID',
    paymentMethod: 'BANK_TRANSFER',
    shippingAddress: '123 Đường Nông Nghiệp, Hà Nội',
    subtotal: 1000000,
    discount: 0,
    shippingFee: 0,
    total: 1000000,
    notes: 'Giao buổi sáng',
    createdAt: '2026-04-10T08:00:00.000Z',
    customer: {
      id: 'cust-1',
      code: 'CU-0001',
      name: 'Nguyễn Văn An',
      phone: '0901234567',
    },
    lines: [
      {
        id: 'line-1',
        quantity: 10,
        unitPrice: 100000,
        item: { id: 'it-1', name: 'Gạo ST25', unit: 'kg' },
      },
    ],
    payments: [],
  };

  it('hiển thị thông tin đơn bán và khu vực thanh toán với số tiền còn lại', async () => {
    vi.spyOn(api, 'apiFetch').mockResolvedValueOnce({ data: mockOrder });

    render(
      <AdminUserProvider user={mockAdminUser}>
        <SalesOrderDetailPage />
      </AdminUserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('SO-2026-0001')).toBeDefined();
      expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
      expect(screen.getByText('Thanh toán & Thu tiền')).toBeDefined();
      expect(screen.getByRole('heading', { name: /ghi nhận thu tiền/i })).toBeDefined();
    });

    expect(screen.getByText(/chưa có (khoản thu|ghi nhận thanh toán) nào/i)).toBeDefined();
  });

  it('ghi nhận thu tiền một phần thành công', async () => {
    const fetchSpy = vi
      .spyOn(api, 'apiFetch')
      .mockResolvedValueOnce({ data: mockOrder }) // initial fetch
      .mockResolvedValueOnce({ data: { id: 'pm-1', code: 'PM-2026-0001', amount: 400000 } }) // post payment
      .mockResolvedValueOnce({
        data: {
          ...mockOrder,
          paymentStatus: 'PARTIAL',
          payments: [
            {
              id: 'pm-1',
              code: 'PM-2026-0001',
              amount: 400000,
              method: 'BANK_TRANSFER',
              paidAt: '2026-04-10T10:00:00.000Z',
              notes: 'Thu đợt 1',
              createdAt: '2026-04-10T10:00:00.000Z',
            },
          ],
        },
      }); // refetch

    render(
      <AdminUserProvider user={mockAdminUser}>
        <SalesOrderDetailPage />
      </AdminUserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /ghi nhận thu tiền/i })).toBeDefined();
    });

    const submitBtn = screen.getByRole('button', { name: /ghi nhận thanh toán/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/sales-orders/so-1/payments',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });
});
