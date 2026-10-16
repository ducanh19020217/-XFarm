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
        const parsedUrl = new URL(url, 'http://localhost');
        const reqPageSize = Number(parsedUrl.searchParams.get('pageSize'));
        // Schema phân trang giới hạn tối đa 100, tuyệt đối không gửi > 100
        expect(reqPageSize).toBeLessThanOrEqual(100);

        if (reqPageSize === 100) {
          return {
            data: all30Items,
            total: 30,
            page: 1,
            pageSize: 100,
          };
        }
        // Query trang 1 bình thường (pageSize=20)
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

  it('tự tính tổng qua nhiều trang khi tổng số dòng vượt quá 100 và API chưa có totalAmount', async () => {
    const page1Items: StockBalanceItem[] = [
      {
        itemId: 'i-1',
        itemName: 'Vật tư 1',
        category: 'FERTILIZER',
        unit: 'kg',
        warehouseId: 'wh-1',
        quantity: 1,
        unitCost: 100000,
        totalValue: 100000,
      },
    ];

    const first100Items: StockBalanceItem[] = Array.from({ length: 100 }, (_, index) => ({
      itemId: `i-${index}`,
      itemName: `Vật tư ${index}`,
      category: 'FERTILIZER',
      unit: 'kg',
      warehouseId: 'wh-1',
      quantity: 1,
      unitCost: 100000,
      totalValue: 100000,
    })); // 100 * 100,000 = 10,000,000 ₫

    const next50Items: StockBalanceItem[] = Array.from({ length: 50 }, (_, index) => ({
      itemId: `i-${index + 100}`,
      itemName: `Vật tư ${index + 100}`,
      category: 'FERTILIZER',
      unit: 'kg',
      warehouseId: 'wh-1',
      quantity: 1,
      unitCost: 100000,
      totalValue: 100000,
    })); // 50 * 100,000 = 5,000,000 ₫
    // Total: 15,000,000 ₫

    vi.mocked(apiModule.apiFetch).mockImplementation(async (url: string) => {
      if (url.startsWith('/warehouses')) {
        return { data: mockWarehouses, total: 1 };
      }
      if (url.startsWith('/stock/balances')) {
        const parsedUrl = new URL(url, 'http://localhost');
        const reqPage = Number(parsedUrl.searchParams.get('page'));
        const reqPageSize = Number(parsedUrl.searchParams.get('pageSize'));
        expect(reqPageSize).toBeLessThanOrEqual(100);

        if (reqPageSize === 100 && reqPage === 1) {
          return {
            data: first100Items,
            total: 150,
            page: 1,
            pageSize: 100,
          };
        }
        if (reqPageSize === 100 && reqPage === 2) {
          return {
            data: next50Items,
            total: 150,
            page: 2,
            pageSize: 100,
          };
        }
        return {
          data: page1Items,
          total: 150,
          page: 1,
          pageSize: 20,
        };
      }
      throw new Error(`Unexpected url: ${url}`);
    });

    render(<InventoryBalancesPage />);

    await waitFor(() => {
      expect(screen.getByText('15.000.000 ₫')).toBeInTheDocument();
    });

    expect(screen.getAllByText('150').length).toBeGreaterThanOrEqual(1);
  });

  it('không hiển thị tổng của trang hiện tại như tổng toàn bộ khi việc tổng hợp thất bại', async () => {
    const page1Items: StockBalanceItem[] = [
      {
        itemId: 'i-1',
        itemName: 'Vật tư 1',
        category: 'FERTILIZER',
        unit: 'kg',
        warehouseId: 'wh-1',
        quantity: 2,
        unitCost: 1000000,
        totalValue: 2000000, // 2 triệu cho trang 1
      },
    ];

    vi.mocked(apiModule.apiFetch).mockImplementation(async (url: string) => {
      if (url.startsWith('/warehouses')) {
        return { data: mockWarehouses, total: 1 };
      }
      if (url.startsWith('/stock/balances')) {
        const parsedUrl = new URL(url, 'http://localhost');
        const reqPageSize = Number(parsedUrl.searchParams.get('pageSize'));
        // Khi gọi fetchAggregatedTotals (pageSize=100), giả lập lỗi
        if (reqPageSize === 100) {
          throw new Error('Network error during aggregation');
        }
        // Trang 1 bình thường
        return {
          data: page1Items,
          total: 50,
          page: 1,
          pageSize: 20,
        };
      }
      throw new Error(`Unexpected url: ${url}`);
    });

    render(<InventoryBalancesPage />);

    await waitFor(() => {
      expect(screen.getAllByText('50').length).toBeGreaterThanOrEqual(1);
    });

    // Tuyệt đối không hiển thị 2.000.000 ₫ của riêng trang 1 như tổng toàn bộ ở card thống kê
    const summaryCard = screen.getByTestId('summary-total-value');
    expect(summaryCard).not.toHaveTextContent('2.000.000 ₫');
    // Thay vào đó, ô tổng thành tiền hiển thị dấu "—"
    expect(summaryCard).toHaveTextContent('—');
    expect(screen.getByTestId('summary-expiring-count')).toHaveTextContent('—');
    expect(screen.getAllByTitle('Không thể tổng hợp toàn bộ các trang')).toHaveLength(2);
  });
});
