'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, Check, ExternalLink, Loader2, Package, Wrench } from 'lucide-react';
import { Badge, Button } from '@xfarm/ui';
import {
  type AlertItem,
  formatAlertDate,
  getAlertTypeInfo,
  getInventoryLink,
  getUnreadAlertCount,
  getAlerts,
  markAlertAsRead,
} from '@/lib/alerts-api';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [recentAlerts, setRecentAlerts] = React.useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const countRequestVersion = React.useRef(0);

  const fetchCount = React.useCallback(async () => {
    const requestVersion = countRequestVersion.current;
    try {
      const count = await getUnreadAlertCount();
      if (requestVersion === countRequestVersion.current) {
        setUnreadCount(count);
      }
    } catch {
      // Ignore count fetch errors
    }
  }, []);

  const fetchRecent = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getAlerts({ page: 1, pageSize: 5, sort: 'createdAt:desc' });
      setRecentAlerts(result.data);
    } catch {
      // Ignore recent alerts fetch errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Poll unread count on mount and every 60 seconds
  React.useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60000);

    const handleAlertsUpdated = (event: Event) => {
      const delta = (event as CustomEvent<{ unreadDelta?: number }>).detail?.unreadDelta;
      if (typeof delta === 'number') {
        setUnreadCount((count) => Math.max(0, count + delta));
      } else {
        fetchCount();
      }
      if (isOpen) {
        fetchRecent();
      }
    };

    window.addEventListener('xfarm:alerts-updated', handleAlertsUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('xfarm:alerts-updated', handleAlertsUpdated);
    };
  }, [fetchCount, fetchRecent, isOpen]);

  // Load recent alerts when dropdown opens
  React.useEffect(() => {
    if (isOpen) {
      fetchRecent();
    }
  }, [isOpen, fetchRecent]);

  // Handle click outside to close dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    countRequestVersion.current += 1;
    setUnreadCount((count) => Math.max(0, count - 1));
    try {
      await markAlertAsRead(id);
      setRecentAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, readAt: new Date().toISOString() } : a)),
      );
    } catch {
      setUnreadCount((count) => count + 1);
      // Ignore mark read errors
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label="Thông báo cảnh báo"
        aria-expanded={isOpen}
        data-testid="alerts-bell-button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            data-testid="alerts-unread-badge"
            className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-950"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          data-testid="alerts-dropdown"
          className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-slate-100">Cảnh báo</span>
              {unreadCount > 0 ? (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  {unreadCount} chưa đọc
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  0 chưa đọc
                </Badge>
              )}
            </div>
            <Link
              href="/admin/alerts"
              onClick={() => setIsOpen(false)}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Xem tất cả
            </Link>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Đang tải cảnh báo...
              </div>
            ) : recentAlerts.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">Không có cảnh báo nào</div>
            ) : (
              recentAlerts.map((alert) => {
                const typeInfo = getAlertTypeInfo(alert.type);
                const inv = getInventoryLink(alert);
                const isUnread = !alert.readAt;

                return (
                  <div
                    key={alert.id}
                    data-testid={`alert-item-${alert.id}`}
                    className={`p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                      isUnread ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={typeInfo.variant} className="text-[10px] px-1.5 py-0">
                            {typeInfo.label}
                          </Badge>
                          {isUnread && (
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                          )}
                          <span className="text-[11px] text-slate-400">
                            {formatAlertDate(alert.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                          {alert.message}
                        </p>
                        <div className="pt-1">
                          <Link
                            href={inv.href}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                          >
                            {alert.refType === 'EQUIPMENT' || alert.type === 'MAINTENANCE_DUE' ? (
                              <Wrench className="h-3 w-3" />
                            ) : (
                              <Package className="h-3 w-3" />
                            )}
                            <span>{inv.label}</span>
                            <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                          </Link>
                        </div>
                      </div>

                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleMarkAsRead(alert.id, e)}
                          title="Đánh dấu đã đọc"
                          aria-label="Đánh dấu đã đọc"
                          className="h-7 w-7 p-0 shrink-0 text-slate-400 hover:text-emerald-600"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50/50 p-2 text-center dark:border-slate-800 dark:bg-slate-900/50">
            <Link
              href="/admin/alerts"
              onClick={() => setIsOpen(false)}
              className="block w-full py-1 text-center text-xs font-medium text-emerald-600 hover:text-emerald-700"
            >
              Xem tất cả cảnh báo &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
