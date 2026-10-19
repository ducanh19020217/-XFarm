import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AlertsPage from './page';
import { AdminUserProvider } from '../admin-user-context';
import * as alertsApi from '@/lib/alerts-api';

vi.mock('@/lib/alerts-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/alerts-api')>('@/lib/alerts-api');
  return {
    ...actual,
    getAlerts: vi.fn(),
    markAlertAsRead: vi.fn(),
    markAllAlertsAsRead: vi.fn(),
    runInventoryCheck: vi.fn(),
  };
});

const mockAlerts: alertsApi.AlertItem[] = [
  {
    id: 'alt-1',
    type: 'LOW_STOCK',
    message: 'Tồn kho phân urê dưới mức an toàn',
    createdAt: '2026-10-16T06:00:00.000Z',
    readAt: null,
    refType: 'ITEM',
    refId: 'item-ure',
  },
  {
    id: 'alt-2',
    type: 'LOT_EXPIRING',
    message: 'Lô thuốc BVTV X sắp hết hạn trong 15 ngày',
    createdAt: '2026-10-15T09:30:00.000Z',
    readAt: '2026-10-15T10:00:00.000Z',
    refType: 'LOT',
    refId: 'lot-bvtv-1',
  },
];

describe('AlertsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header and alert list', async () => {
    vi.mocked(alertsApi.getAlerts).mockResolvedValueOnce({
      data: mockAlerts,
      total: 2,
      page: 1,
      pageSize: 10,
    });

    render(
      <AdminUserProvider
        user={{ id: '1', email: 'worker@xfarm.vn', fullName: 'Worker', role: 'WORKER' }}
      >
        <AlertsPage />
      </AdminUserProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Cảnh báo' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Tồn kho phân urê dưới mức an toàn')).toBeInTheDocument();
    });

    expect(screen.getByText('Lô thuốc BVTV X sắp hết hạn trong 15 ngày')).toBeInTheDocument();
    expect(screen.getAllByText('Tồn kho thấp').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lô sắp hết hạn').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Chưa đọc').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Đã đọc').length).toBeGreaterThan(0);

    // Verify inventory link
    const itemLink = screen.getByRole('link', { name: /vật tư item-ure/i });
    expect(itemLink).toHaveAttribute('href', '/admin/inventory?itemId=item-ure');

    const lotLink = screen.getByRole('link', { name: /lô lot-bvtv-1/i });
    expect(lotLink).toHaveAttribute('href', '/admin/inventory?lotId=lot-bvtv-1');
  });

  it('shows "Chạy kiểm tra" button for OWNER and triggers runInventoryCheck', async () => {
    vi.mocked(alertsApi.getAlerts).mockResolvedValue({
      data: mockAlerts,
      total: 2,
      page: 1,
      pageSize: 10,
    });
    vi.mocked(alertsApi.runInventoryCheck).mockResolvedValueOnce({ status: 'ok' });

    render(
      <AdminUserProvider
        user={{ id: '1', email: 'owner@xfarm.vn', fullName: 'Owner', role: 'OWNER' }}
      >
        <AlertsPage />
      </AdminUserProvider>,
    );

    const checkButton = await screen.findByRole('button', { name: /chạy kiểm tra/i });
    expect(checkButton).toBeInTheDocument();

    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(alertsApi.runInventoryCheck).toHaveBeenCalled();
    });
  });

  it('does NOT show "Chạy kiểm tra" button for non-OWNER', async () => {
    vi.mocked(alertsApi.getAlerts).mockResolvedValueOnce({
      data: mockAlerts,
      total: 2,
      page: 1,
      pageSize: 10,
    });

    render(
      <AdminUserProvider
        user={{ id: '2', email: 'worker@xfarm.vn', fullName: 'Worker', role: 'WORKER' }}
      >
        <AlertsPage />
      </AdminUserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Tồn kho phân urê dưới mức an toàn')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /chạy kiểm tra/i })).not.toBeInTheDocument();
  });

  it('marks single alert as read when clicking "Đánh dấu đã đọc"', async () => {
    vi.mocked(alertsApi.getAlerts).mockResolvedValueOnce({
      data: mockAlerts,
      total: 2,
      page: 1,
      pageSize: 10,
    });
    vi.mocked(alertsApi.markAlertAsRead).mockResolvedValueOnce(undefined);

    render(
      <AdminUserProvider
        user={{ id: '1', email: 'owner@xfarm.vn', fullName: 'Owner', role: 'OWNER' }}
      >
        <AlertsPage />
      </AdminUserProvider>,
    );

    const markReadBtn = await screen.findByRole('button', { name: /đánh dấu đã đọc/i });
    fireEvent.click(markReadBtn);

    await waitFor(() => {
      expect(alertsApi.markAlertAsRead).toHaveBeenCalledWith('alt-1');
    });
  });

  it('marks all alerts as read when clicking "Đọc tất cả"', async () => {
    vi.mocked(alertsApi.getAlerts).mockResolvedValue({
      data: mockAlerts,
      total: 2,
      page: 1,
      pageSize: 10,
    });
    vi.mocked(alertsApi.markAllAlertsAsRead).mockResolvedValueOnce(undefined);

    render(
      <AdminUserProvider
        user={{ id: '1', email: 'owner@xfarm.vn', fullName: 'Owner', role: 'OWNER' }}
      >
        <AlertsPage />
      </AdminUserProvider>,
    );

    const readAllBtn = await screen.findByRole('button', { name: /đọc tất cả/i });
    fireEvent.click(readAllBtn);

    await waitFor(() => {
      expect(alertsApi.markAllAlertsAsRead).toHaveBeenCalled();
    });
  });

  it('filters by unread status and alert type', async () => {
    vi.mocked(alertsApi.getAlerts).mockResolvedValue({
      data: mockAlerts,
      total: 2,
      page: 1,
      pageSize: 10,
    });

    render(
      <AdminUserProvider
        user={{ id: '1', email: 'owner@xfarm.vn', fullName: 'Owner', role: 'OWNER' }}
      >
        <AlertsPage />
      </AdminUserProvider>,
    );

    await waitFor(() => {
      expect(alertsApi.getAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          pageSize: 10,
          unread: undefined,
          type: 'ALL',
        }),
      );
    });

    // Change unread filter to "Chưa đọc"
    const unreadSelect = screen.getByLabelText('Trạng thái đọc');
    fireEvent.change(unreadSelect, { target: { value: 'true' } });

    await waitFor(() => {
      expect(alertsApi.getAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          unread: true,
        }),
      );
    });

    // Change type filter to "LOW_STOCK"
    const typeSelect = screen.getByLabelText('Loại cảnh báo');
    fireEvent.change(typeSelect, { target: { value: 'LOW_STOCK' } });

    await waitFor(() => {
      expect(alertsApi.getAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'LOW_STOCK',
        }),
      );
    });
  });
});
