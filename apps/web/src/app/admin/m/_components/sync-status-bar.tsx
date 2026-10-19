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
  let barBg =
    'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300';
  let message = '';
  let showSyncButton = false;

  if (!isOnline) {
    barBg =
      'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/70 dark:border-amber-800 dark:text-amber-300';
    if (outboxCount > 0) {
      message = `Offline – ${outboxCount} thao tác chờ đồng bộ`;
    } else {
      message = 'Offline – Đang hoạt động ngoại tuyến';
    }
  } else {
    if (isSyncing) {
      barBg =
        'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/70 dark:border-blue-800 dark:text-blue-300';
      message = `Đang đồng bộ ${outboxCount} thao tác...`;
    } else if (outboxCount > 0) {
      barBg =
        'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/70 dark:border-amber-800 dark:text-amber-300';
      message = `${outboxCount} thao tác chờ đồng bộ`;
      showSyncButton = true;
    } else if (lastSyncTime) {
      barBg =
        'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/70 dark:border-emerald-800 dark:text-emerald-300';
      message = `Đã đồng bộ lúc ${formatTime(lastSyncTime)}`;
    } else {
      barBg =
        'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/70 dark:border-emerald-800 dark:text-emerald-300';
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
          <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        ) : isSyncing ? (
          <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-600 dark:text-blue-400" />
        ) : outboxCount > 0 ? (
          <Wifi className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        )}
        <span className="truncate">{message}</span>
      </Link>

      <div className="flex items-center gap-2 shrink-0 ml-2">
        {showSyncButton && isOnline && (
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold active:scale-95 transition-all"
          >
            Đồng bộ ngay
          </button>
        )}
        <Link
          href="/admin/m/outbox"
          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          title="Xem hàng đợi ngoại tuyến"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
