import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FinanceReportsPage from './page';
import * as api from '@/lib/api';
import * as adminUserContext from '../../admin-user-context';

// Mock Recharts ResponsiveContainer to prevent width/height 0 in jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  };
});

describe('Finance Reports Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockCashflowData = [
    { month: 1, income: '1000000.00', expense: '400000.00', net: '600000.00' },
    { month: 2, income: '2000000.00', expense: '800000.00', net: '1200000.00' },
  ];

  const mockCyclesData = [
    {
      id: 'cycle-1',
      code: 'CY-01',
      name: 'Vụ Lúa Đông Xuân',
      status: 'IN_PROGRESS',
      area: { id: 'area-1', code: 'A1', name: 'Khu Đất Bãi' },
      outputQuantity: '500.00',
      materialCost: '300000.00',
      expenseCost: '150000.00',
      laborCost: '0.00',
      totalCost: '450000.00',
      revenue: '800000.00',
      profit: '350000.00',
      costPerUnit: '900.00',
      costDetails: [
        {
          type: 'MATERIAL' as const,
          date: '2026-04-01T00:00:00.000Z',
          description: 'Phân NPK',
          quantity: '5.00',
          unit: 'bao',
          unitCost: '60000.00',
          amount: '300000.00',
        },
        {
          type: 'TRANSACTION' as const,
          date: '2026-04-05T00:00:00.000Z',
          description: 'Thuê máy cày đất',
          amount: '150000.00',
        },
      ],
      revenueDetails: [
        {
          type: 'SALE' as const,
          salesOrderId: 'so-1',
          salesOrderCode: 'SO-2026-0001',
          quantity: '100.00',
          unit: 'kg',
          unitPrice: '8000.00',
          amount: '800000.00',
        },
      ],
    },
  ];

  const mockProductsData = [
    {
      productId: 'prod-1',
      productName: 'Gạo ST25 Hảo Hạng',
      slug: 'gao-st25',
      itemId: 'it-1',
      unit: 'kg',
      quantity: '250.00',
      revenue: '6250000.00',
    },
  ];

  it('ẩn báo cáo và hiển thị Không có quyền truy cập đối với vai trò SALES', () => {
    vi.spyOn(adminUserContext, 'useAdminUser').mockReturnValue({
      id: 'u-sales',
      email: 'sales@xfarm.local',
      fullName: 'Sales User',
      role: 'SALES',
    });

    render(<FinanceReportsPage />);

    expect(screen.getByText('Không có quyền truy cập')).toBeDefined();
    expect(
      screen.getByText(/báo cáo tài chính, giá thành và lãi lỗ mùa vụ bị ẩn đối với nhân viên bán hàng/i),
    ).toBeDefined();
  });

  it('hiển thị tab Thu chi 12 tháng với biểu đồ và bảng số liệu cho OWNER/ACCOUNTANT', async () => {
    vi.spyOn(adminUserContext, 'useAdminUser').mockReturnValue({
      id: 'u-acc',
      email: 'accountant@xfarm.local',
      fullName: 'Accountant User',
      role: 'ACCOUNTANT',
    });

    vi.spyOn(api, 'apiFetch').mockResolvedValueOnce({
      data: mockCashflowData,
      year: 2026,
    });

    render(<FinanceReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('Biểu đồ dòng tiền thu chi năm 2026')).toBeDefined();
    });

    expect(screen.getByText('Tổng thu cả năm')).toBeDefined();
    expect(screen.getByText('Tổng chi cả năm')).toBeDefined();
    expect(screen.getByText('Lãi thuần năm 2026')).toBeDefined();

    // Tháng 1 và Tháng 2 xuất hiện trong bảng
    expect(screen.getByText('Tháng 1')).toBeDefined();
    expect(screen.getByText('Tháng 2')).toBeDefined();
  });

  it('chuyển sang tab Giá thành & Lãi lỗ mùa vụ và xem chi tiết từng khoản khi bấm', async () => {
    vi.spyOn(adminUserContext, 'useAdminUser').mockReturnValue({
      id: 'u-acc',
      email: 'accountant@xfarm.local',
      fullName: 'Accountant User',
      role: 'ACCOUNTANT',
    });

    vi.spyOn(api, 'apiFetch').mockImplementation((url: string) => {
      if (url.includes('/reports/cycles')) {
        return Promise.resolve({ data: mockCyclesData, total: 1 });
      }
      return Promise.resolve({ data: mockCashflowData, year: 2026 });
    });

    render(<FinanceReportsPage />);

    const cyclesTabBtn = screen.getByRole('button', { name: /Giá thành & Lãi lỗ mùa vụ/i });
    fireEvent.click(cyclesTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Vụ Lúa Đông Xuân')).toBeDefined();
      expect(screen.getByText('CY-01')).toBeDefined();
    });

    // Bấm nút Chi tiết
    const detailBtn = screen.getByRole('button', { name: /chi tiết/i });
    fireEvent.click(detailBtn);

    await waitFor(() => {
      expect(screen.getByText(/Chi tiết giá thành & Lãi lỗ mùa vụ: Vụ Lúa Đông Xuân/i)).toBeDefined();
      expect(screen.getByText('Phân NPK')).toBeDefined();
      expect(screen.getByText('Thuê máy cày đất')).toBeDefined();
      expect(screen.getByText('SO-2026-0001')).toBeDefined();
    });
  });

  it('chuyển sang tab Doanh thu sản phẩm (Top 10)', async () => {
    vi.spyOn(adminUserContext, 'useAdminUser').mockReturnValue({
      id: 'u-acc',
      email: 'accountant@xfarm.local',
      fullName: 'Accountant User',
      role: 'ACCOUNTANT',
    });

    vi.spyOn(api, 'apiFetch').mockImplementation((url: string) => {
      if (url.includes('/reports/products')) {
        return Promise.resolve({ data: mockProductsData, total: 1, limit: 10 });
      }
      return Promise.resolve({ data: mockCashflowData, year: 2026 });
    });

    render(<FinanceReportsPage />);

    const productsTabBtn = screen.getByRole('button', { name: /Doanh thu sản phẩm/i });
    fireEvent.click(productsTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Gạo ST25 Hảo Hạng')).toBeDefined();
      expect(screen.getByText('#1')).toBeDefined();
      expect(screen.getByText(/250\.00 kg/)).toBeDefined();
    });
  });
});
