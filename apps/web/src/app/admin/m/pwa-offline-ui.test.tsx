import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncStatusBar } from './_components/sync-status-bar';
import OutboxPage from './outbox/page';
import { enqueue, clearOutbox, setMeta, getOutboxCount } from '@/lib/offline-queue';
import { ActivityType } from '@xfarm/shared';

// Mock next/navigation
vi.mock('next/navigation', () => {
  const push = vi.fn();
  return {
    useRouter: () => ({ push, refresh: vi.fn() }),
    usePathname: () => '/admin/m',
    useSearchParams: () => new URLSearchParams(''),
  };
});

describe('PWA Offline UI: SyncStatusBar & OutboxPage', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await clearOutbox();
  });

  describe('SyncStatusBar Component', () => {
    it('shows "Offline – 2 thao tác chờ đồng bộ" when offline with 2 items', async () => {
      // Enqueue 2 items
      await enqueue({
        kind: 'activity',
        payload: { type: ActivityType.IRRIGATION, areaId: 'area-1' },
      });
      await enqueue({
        kind: 'check-in',
        payload: { at: new Date().toISOString() },
      });

      vi.stubGlobal('navigator', { onLine: false });

      render(<SyncStatusBar />);

      await waitFor(() => {
        expect(screen.getByText(/Offline – 2 thao tác chờ đồng bộ/i)).toBeInTheDocument();
      });
    });

    it('shows "Đã đồng bộ lúc 10:42" when online and lastSyncTime is recorded', async () => {
      vi.stubGlobal('navigator', { onLine: true });
      // Set last sync time to today at 10:42:00
      const syncDate = new Date();
      syncDate.setHours(10, 42, 0, 0);
      await setMeta('lastSyncTime', syncDate.toISOString());

      render(<SyncStatusBar />);

      await waitFor(() => {
        expect(screen.getByText(/Đã đồng bộ lúc 10:42/i)).toBeInTheDocument();
      });
    });
  });

  describe('OutboxPage Component', () => {
    it('renders empty state when outbox is empty', async () => {
      render(<OutboxPage />);

      await waitFor(() => {
        expect(screen.getByText(/Hàng đợi trống/i)).toBeInTheDocument();
      });
    });

    it('lists queued items and allows deleting a specific item', async () => {
      await enqueue({
        kind: 'activity',
        payload: { type: ActivityType.IRRIGATION, notes: 'Ghi chú nhật ký 1' },
      });
      await enqueue({
        kind: 'check-in',
        payload: { notes: 'Chấm công vào ca' },
      });

      render(<OutboxPage />);

      expect(await screen.findByText(/2 thao tác trong hàng đợi/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Nhật ký nông trại/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Chấm công Vào ca/i)[0]).toBeInTheDocument();

      // Find delete buttons (trash icons)
      const deleteButtons = screen.getAllByTitle('Xóa thao tác này');
      expect(deleteButtons.length).toBe(2);

      // Delete first item
      fireEvent.click(deleteButtons[0]);

      await waitFor(async () => {
        const count = await getOutboxCount();
        expect(count).toBe(1);
      });
    });
  });
});
