import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationBell } from './notification-bell';
import * as alertsApi from '@/lib/alerts-api';

vi.mock('@/lib/alerts-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/alerts-api')>('@/lib/alerts-api');
  return {
    ...actual,
    getUnreadAlertCount: vi.fn(),
    getAlerts: vi.fn(),
    markAlertAsRead: vi.fn(),
  };
});

describe('NotificationBell Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bell icon without badge when unreadCount is 0', async () => {
    vi.mocked(alertsApi.getUnreadAlertCount).mockResolvedValueOnce(0);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(alertsApi.getUnreadAlertCount).toHaveBeenCalled();
    });

    expect(screen.getByTestId('alerts-bell-button')).toBeInTheDocument();
    expect(screen.queryByTestId('alerts-unread-badge')).not.toBeInTheDocument();
  });

  it('renders badge with correct number when unreadCount > 0', async () => {
    vi.mocked(alertsApi.getUnreadAlertCount).mockResolvedValueOnce(5);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByTestId('alerts-unread-badge')).toBeInTheDocument();
    });

    expect(screen.getByTestId('alerts-unread-badge')).toHaveTextContent('5');
  });

  it('opens dropdown and displays recent alerts when clicked', async () => {
    vi.mocked(alertsApi.getUnreadAlertCount).mockResolvedValueOnce(2);
    vi.mocked(alertsApi.getAlerts).mockResolvedValueOnce({
      data: [
        {
          id: 'alt-1',
          type: 'LOW_STOCK',
          message: 'Phân NPK tồn kho dưới mức tối thiểu',
          createdAt: '2026-10-16T06:00:00.000Z',
          readAt: null,
          refType: 'ITEM',
          refId: 'item-npk',
        },
        {
          id: 'alt-2',
          type: 'LOT_EXPIRING',
          message: 'Lô hạt giống bí đỏ sắp hết hạn',
          createdAt: '2026-10-15T08:00:00.000Z',
          readAt: '2026-10-15T09:00:00.000Z',
          refType: 'LOT',
          refId: 'lot-bi-do',
        },
      ],
      total: 2,
      page: 1,
      pageSize: 5,
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByTestId('alerts-unread-badge')).toHaveTextContent('2');
    });

    // Click bell button
    fireEvent.click(screen.getByTestId('alerts-bell-button'));

    // Dropdown should be open
    await waitFor(() => {
      expect(screen.getByTestId('alerts-dropdown')).toBeInTheDocument();
    });

    expect(screen.getByText('Phân NPK tồn kho dưới mức tối thiểu')).toBeInTheDocument();
    expect(screen.getByText('Lô hạt giống bí đỏ sắp hết hạn')).toBeInTheDocument();
    expect(screen.getAllByText('Xem tất cả').length).toBeGreaterThan(0);
    expect(alertsApi.getAlerts).toHaveBeenCalledWith({
      page: 1,
      pageSize: 5,
      sort: 'createdAt:desc',
    });
  });

  it('marks alert as read when clicking mark-read button in dropdown', async () => {
    vi.mocked(alertsApi.getUnreadAlertCount).mockResolvedValueOnce(1);
    vi.mocked(alertsApi.getAlerts).mockResolvedValueOnce({
      data: [
        {
          id: 'alt-1',
          type: 'LOW_STOCK',
          message: 'Vật tư X sắp hết',
          createdAt: '2026-10-16T06:00:00.000Z',
          readAt: null,
          refType: 'ITEM',
          refId: 'item-x',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 5,
    });
    vi.mocked(alertsApi.markAlertAsRead).mockResolvedValueOnce(undefined);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByTestId('alerts-unread-badge')).toHaveTextContent('1');
    });

    // Open dropdown
    fireEvent.click(screen.getByTestId('alerts-bell-button'));

    await waitFor(() => {
      expect(screen.getByText('Vật tư X sắp hết')).toBeInTheDocument();
    });

    // Find and click mark read button
    const markReadBtn = screen.getByRole('button', { name: 'Đánh dấu đã đọc' });
    fireEvent.click(markReadBtn);

    await waitFor(() => {
      expect(alertsApi.markAlertAsRead).toHaveBeenCalledWith('alt-1');
    });

    // Badge count should decrease
    await waitFor(() => {
      expect(screen.queryByTestId('alerts-unread-badge')).not.toBeInTheDocument();
    });
  });

  it('closes dropdown when clicking outside', async () => {
    vi.mocked(alertsApi.getUnreadAlertCount).mockResolvedValueOnce(0);
    vi.mocked(alertsApi.getAlerts).mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      pageSize: 5,
    });

    render(
      <div>
        <div data-testid="outside-element">Outside</div>
        <NotificationBell />
      </div>,
    );

    // Click to open
    fireEvent.click(screen.getByTestId('alerts-bell-button'));
    await waitFor(() => {
      expect(screen.getByTestId('alerts-dropdown')).toBeInTheDocument();
    });

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside-element'));

    await waitFor(() => {
      expect(screen.queryByTestId('alerts-dropdown')).not.toBeInTheDocument();
    });
  });
});
