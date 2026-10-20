'use client';

import * as React from 'react';
import Link from 'next/link';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, ChevronRight } from 'lucide-react';
import {
  subscribeSyncStatus,
  subscribeOutbox,
  getLastSyncTime,
  syncOutbox,
  setupAutoSync,
} from '@/lib/offline-queue';

export function SyncStatusBar() {
  const [isOnline, setIsOnline] = React.useState(true);
  const [outboxCount, setOutboxCount] = React.useState(0);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [lastSyncTime, setLastSyncTime] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    getLastSyncTime().then((time) => {
      if (time) setLastSyncTime(time);
    });

    const unsubOutbox = subscribeOutbox((count) => {
      setOutboxCount(count);
    });

    const unsubSync = subscribeSyncStatus((status) => {
      setIsSyncing(status.isSyncing);
      setOutboxCount(status.count);
      if (status.lastSyncTime) {
        setLastSyncTime(status.lastSyncTime);
      }
    });

    const cleanupAutoSync = setupAutoSync();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubOutbox();
      unsubSync();
      cleanupAutoSync();
    };
  }, []);

  const formatTime = (iso?: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleManualSync = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSyncing || !isOnline) return;
    try {
      await syncOutbox({ force: false });
    } catch {
      // ignore
    }
  };

  // Determine display status
  let barBg = 'bg-surface-2 border-line text-muted';
  let message = '';
  let showSyncButton = false;

  if (!isOnline) {
    barBg = 'bg-warn-bg border-warn/20 text-warn';
    if (outboxCount > 0) {
      message = `Offline – ${outboxCount} thao tác chờ đồng bộ`;
    } else {
      message = 'Offline – Đang hoạt động ngoại tuyến';
    }
  } else {
    if (isSyncing) {
      barBg = 'bg-info-bg border-info/20 text-info';
      message = `Đang đồng bộ ${outboxCount} thao tác...`;
    } else if (outboxCount > 0) {
      barBg = 'bg-warn-bg border-warn/20 text-warn';
      message = `${outboxCount} thao tác chờ đồng bộ`;
      showSyncButton = true;
    } else if (lastSyncTime) {
      barBg = 'bg-ok-bg border-ok/20 text-ok';
      message = `Đã đồng bộ lúc ${formatTime(lastSyncTime)}`;
    } else {
      barBg = 'bg-ok-bg border-ok/20 text-ok';
      message = 'Đã đồng bộ';
    }
  }

  return (
    <div
      data-testid="sync-status-bar"
      className={`border-b px-4 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${barBg}`}
    >
      <Link
        href="/admin/m/outbox"
        className="flex items-center gap-2 hover:underline select-none flex-1 truncate"
      >
        {!isOnline ? (
          <WifiOff className="h-3.5 w-3.5 shrink-0 text-warn" />
        ) : isSyncing ? (
          <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin text-info" />
        ) : outboxCount > 0 ? (
          <Wifi className="h-3.5 w-3.5 shrink-0 text-warn" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-ok" />
        )}
        <span className="truncate">{message}</span>
      </Link>

      <div className="flex items-center gap-2 shrink-0 ml-2">
        {showSyncButton && isOnline && (
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-2.5 py-1 rounded-md bg-accent hover:bg-accent-hover text-surface text-[11px] font-bold active:scale-95 transition-all shadow-xs"
          >
            Đồng bộ ngay
          </button>
        )}
        <Link
          href="/admin/m/outbox"
          className="p-1 text-muted hover:text-fg"
          title="Xem hàng đợi ngoại tuyến"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
