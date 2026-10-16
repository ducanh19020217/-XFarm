import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminUserProvider } from '../admin-user-context';
import HarvestLotsPage from './page';
import HarvestLotDetailPage from './[id]/page';
import HarvestLotPrintPage from './[id]/print/page';
import type { HarvestLotRecord } from './types';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'hl-test-1' }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams('layout=a4&copies=24'),
  usePathname: () => '/admin/harvest-lots',
}));

const mockLot: HarvestLotRecord = {
  id: 'hl-test-1',
  code: 'HL-2026-0001',
  traceCode: 'TR12345678',
  cycleId: 'cycle-1',
  cycle: {
    id: 'cycle-1',
    code: 'VU-DUA-01',
    name: 'Vụ Dưa Lưới 2026',
  },
  activityId: 'act-1',
  activity: {
    id: 'act-1',
    performedAt: '2026-10-16T08:00:00.000Z',
    area: { id: 'area-1', code: 'A1', name: 'Nhà màng 1' },
  },
  itemId: 'item-1',
  item: {
    id: 'item-1',
    sku: 'DUA-HL',
    name: 'Dưa lưới Huỳnh Long',
    unit: 'kg',
    category: 'PRODUCE',
  },
  quantity: 100,
  remainingQuantity: 95,
  unit: 'kg',
  harvestedAt: '2026-10-16T08:00:00.000Z',
  warehouseId: 'wh-1',
  warehouse: {
    id: 'wh-1',
    code: 'KHO-NS',
    name: 'Kho nông sản lạnh',
  },
  stockLot: {
    id: 'sl-1',
    code: 'SL-HL-0001',
    quantity: 100,
    remainingQuantity: 95,
  },
  qualityGrade: 'Hạng A',
  certification: 'VietGAP',
  isPublic: true,
  createdAt: '2026-10-16T08:00:00.000Z',
  updatedAt: '2026-10-16T08:00:00.000Z',
};

describe('Harvest Lots Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('HarvestLotsPage', () => {
    it('renders page header, filters, and harvest lots table', async () => {
      const { apiFetch } = await import('@/lib/api');
      vi.mocked(apiFetch).mockImplementation(async (url: string) => {
        if (url.startsWith('/cycles')) {
          return { data: [{ id: 'cycle-1', code: 'VU-1', name: 'Mùa vụ 1' }] };
        }
        if (url.startsWith('/items')) {
          return { data: [{ id: 'item-1', name: 'Dưa lưới Huỳnh Long' }] };
        }
        if (url.startsWith('/harvest-lots')) {
          return { data: [mockLot], total: 1, page: 1, pageSize: 10 };
        }
        return { data: [] };
      });

      render(
        <AdminUserProvider
          user={{ id: 'u1', email: 'owner@xfarm.local', fullName: 'Chủ trại', role: 'OWNER' }}
        >
          <HarvestLotsPage />
        </AdminUserProvider>,
      );

      expect(screen.getByText('Lô thu hoạch & Truy xuất')).toBeInTheDocument();
      expect(screen.getByLabelText('Tìm kiếm mã lô hoặc mã truy xuất')).toBeInTheDocument();
      expect(screen.getByLabelText('Lọc theo mùa vụ')).toBeInTheDocument();
      expect(screen.getByLabelText('Lọc theo sản phẩm')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('HL-2026-0001')).toBeInTheDocument();
        expect(screen.getByText('TR12345678')).toBeInTheDocument();
        expect(screen.getAllByText('Dưa lưới Huỳnh Long').length).toBeGreaterThan(0);
        expect(screen.getByText('100 kg')).toBeInTheDocument();
        expect(screen.getByText('95 kg')).toBeInTheDocument();
        expect(screen.getAllByText('Công khai').length).toBeGreaterThan(0);
      });
    });
  });

  describe('HarvestLotDetailPage', () => {
    it('renders lot detail information, QR code, and trace link', async () => {
      const { apiFetch } = await import('@/lib/api');
      vi.mocked(apiFetch).mockResolvedValueOnce({ data: mockLot });

      render(
        <AdminUserProvider
          user={{ id: 'u1', email: 'owner@xfarm.local', fullName: 'Chủ trại', role: 'OWNER' }}
        >
          <HarvestLotDetailPage />
        </AdminUserProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Lô thu hoạch HL-2026-0001')).toBeInTheDocument();
        expect(screen.getAllByText('TR12345678').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Dưa lưới Huỳnh Long/).length).toBeGreaterThan(0);
        expect(screen.getByText(/Kho nông sản lạnh/)).toBeInTheDocument();
        expect(screen.getAllByText('Hạng A').length).toBeGreaterThan(0);
        expect(screen.getAllByText('VietGAP').length).toBeGreaterThan(0);
      });

      // QR Code
      await waitFor(() => {
        const qrImg = screen.getByTestId('harvest-lot-qr');
        expect(qrImg).toBeInTheDocument();
        expect(qrImg).toHaveAttribute('src');
      });

      // Link to trace page
      const traceLink = screen.getByRole('link', { name: /Xem trang truy xuất/i });
      expect(traceLink).toBeInTheDocument();
      expect(traceLink).toHaveAttribute('href', '/trace/TR12345678');

      // Toggle public button
      expect(screen.getByRole('button', { name: /Ẩn công khai/i })).toBeInTheDocument();
    });

    it('toggles public state with confirmation dialog', async () => {
      const { apiFetch } = await import('@/lib/api');
      vi.mocked(apiFetch)
        .mockResolvedValueOnce({ data: mockLot })
        .mockResolvedValueOnce({ data: { ...mockLot, isPublic: false } });

      const user = userEvent.setup();
      render(
        <AdminUserProvider
          user={{ id: 'u1', email: 'owner@xfarm.local', fullName: 'Chủ trại', role: 'OWNER' }}
        >
          <HarvestLotDetailPage />
        </AdminUserProvider>,
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Ẩn công khai/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Ẩn công khai/i }));

      // Confirmation dialog opens
      expect(screen.getByText('Xác nhận ẩn công khai lô thu hoạch?')).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: 'Ẩn công khai' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(vi.mocked(apiFetch)).toHaveBeenCalledWith(
          '/harvest-lots/hl-test-1',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ isPublic: false }),
          }),
        );
      });
    });
  });

  describe('HarvestLotPrintPage', () => {
    it('renders print labels with QR, product name, lot code, harvest date, and farm name', async () => {
      const { apiFetch } = await import('@/lib/api');
      vi.mocked(apiFetch).mockImplementation(async (url: string) => {
        if (url.includes('/site-settings')) {
          return { data: { key: 'farm.name', value: 'Nông trại sinh thái XFarm' } };
        }
        if (url.includes('/harvest-lots')) {
          return { data: mockLot };
        }
        return { data: [] };
      });

      render(
        <AdminUserProvider
          user={{ id: 'u1', email: 'owner@xfarm.local', fullName: 'Chủ trại', role: 'OWNER' }}
        >
          <HarvestLotPrintPage />
        </AdminUserProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('In tem nhãn lô HL-2026-0001')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Chọn khổ tem')).toBeInTheDocument();
      expect(screen.getByLabelText('Số lượng tem')).toBeInTheDocument();

      // Check print labels rendered
      await waitFor(() => {
        const labelsContainer = screen.getByTestId('print-sheet-a4');
        expect(labelsContainer).toBeInTheDocument();
      });

      expect(screen.getAllByText('Dưa lưới Huỳnh Long').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/HL-2026-0001/).length).toBeGreaterThan(0);
      expect(screen.getAllByText('Nông trại sinh thái XFarm').length).toBeGreaterThan(0);

      // Print button triggers window.print
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      const printBtn = screen.getByRole('button', { name: /In tem ngay/i });
      await userEvent.click(printBtn);
      expect(printSpy).toHaveBeenCalled();
    });
  });
});
