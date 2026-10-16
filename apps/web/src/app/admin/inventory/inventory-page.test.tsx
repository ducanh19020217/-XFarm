import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import InventoryBalancesPage from './page';
import * as apiModule from '@/lib/api';
import type { StockBalanceItem, StockBalancesResponse, WarehouseItem } from './types';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

// Mock Next.js navigation (usePathname) for InventoryNav
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/inventory',
}));

const mockWarehouses: WarehouseItem[] = [{ id: 'wh-1', code: 'KHO-1', name: 'Kho 1' }];

describe('InventoryBalancesPage (Giao diện tồn kho)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dùng totalAmount từ API khi API trả về trường này', async () => {
    const pageItems: StockBalanceItem[] = [
      {
        itemId: 'i-1',
        itemName: 'Phân bón NPK',
        category: 'FERTILIZER',
        unit: 'kg',
        warehouseId: 'wh-1',
        quantity: 10,
        unitCost: 100000,
        totalValue: 1000000,
      },
    ];

    vi.mocked(apiModule.apiFetch).mockImplementation(async (url: string) => {
      if (url.startsWith('/warehouses')) {
        return { data: mockWarehouses, total: 1 };
      }
      if (url.startsWith('/stock/balances')) {
        const response: StockBalancesResponse = {
          data: pageItems,
          total: 50,
          page: 1,
          pageSize: 20,
          totalAmount: 125000000, // API backend đã tính tổng toàn bộ 50 dòng
        };
        return response;
      }
      throw new Error(`Unexpected url: ${url}`);
    });

    render(<InventoryBalancesPage />);

    // Đợi tải xong và kiểm tra giá trị tổng thành tiền dùng totalAmount từ API
    await waitFor(() => {
      expect(screen.getByText('125.000.000 ₫')).toBeInTheDocument();
    });

    // Tổng số mặt hàng là 50 (xuất hiện ở card thống kê và footer phân trang)
    expect(screen.getAllByText('50').length).toBeGreaterThanOrEqual(1);
  });

  it('tự tính tổng toàn bộ tập lọc khi có nhiều hơn 20 dòng và API chưa có totalAmount', async () => {
    // Giả lập trang 1 chỉ có 2 dòng (giá trị 2 triệu), nhưng tổng có 30 dòng (tổng 15 triệu)
    const page1Items: StockBalanceItem[] = [
      {
        itemId: 'i-1',
        itemName: 'Vật tư 1',
        category: 'FERTILIZER',
        unit: 'kg',
        warehouseId: 'wh-1',
        quantity: 10,
        unitCost: 100000,
        totalValue: 1000000,
      },
      {
        itemId: 'i-2',
        itemName: 'Vật tư 2',
        category: 'FERTILIZER',
        unit: 'kg',
        warehouseId: 'wh-1',
        quantity: 10,
        unitCost: 100000,
        totalValue: 1000000,
      },
    ];

    const all30Items: StockBalanceItem[] = Array.from({ length: 30 }, (_, index) => ({
      itemId: `i-${index}`,
      itemName: `Vật tư ${index}`,
      category: 'FERTILIZER',
      unit: 'kg',
      warehouseId: 'wh-1',
      quantity: 5,
      unitCost: 100000,
      totalValue: 500000,
    })); // 30 * 500,000 = 15,000,000 ₫

    vi.mocked(apiModule.apiFetch).mockImplementation(async (url: string) => {
      if (url.startsWith('/warehouses')) {
        return { data: mockWarehouses, total: 1 };
      }
      if (url.startsWith('/stock/balances')) {
        // Nếu query có pageSize lớn (fetchAggregatedTotals)
        if (url.includes('pageSize=1000') || url.includes('pageSize=30')) {
          return {
            data: all30Items,
            total: 30,
            page: 1,
            pageSize: 1000,
          };
        }
        // Query trang 1 bình thường
        return {
          data: page1Items,
          total: 30,
          page: 1,
          pageSize: 20,
        };
      }
      throw new Error(`Unexpected url: ${url}`);
    });

    render(<InventoryBalancesPage />);

    // Kiểm tra con số tổng thành tiền phản ánh toàn bộ 30 dòng (15.000.000 ₫), không bị giới hạn ở 2 dòng của trang 1
    await waitFor(() => {
      expect(screen.getByText('15.000.000 ₫')).toBeInTheDocument();
    });

    expect(screen.getAllByText('30').length).toBeGreaterThanOrEqual(1);
  });
});
