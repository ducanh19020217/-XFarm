'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, Check, Cpu, ExternalLink, Loader2, Package, Wrench } from 'lucide-react';
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
    const interval = setInterval(fetchCount, 10000);

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
        className="relative rounded-lg p-2 text-fg-2 hover:bg-hover hover:text-fg focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            data-testid="alerts-unread-badge"
            className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-crit px-1 text-[11px] font-bold text-white shadow-xs ring-2 ring-surface"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          data-testid="alerts-dropdown"
          className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-xl border border-line bg-surface shadow-xl text-fg overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-surface-2/50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-fg">Cảnh báo</span>
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
              className="text-xs text-accent hover:text-accent-hover font-medium transition-colors"
            >
              Xem tất cả
            </Link>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-line">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Đang tải cảnh báo...
              </div>
            ) : recentAlerts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">Không có cảnh báo nào</div>
            ) : (
              recentAlerts.map((alert) => {
                const typeInfo = getAlertTypeInfo(alert.type);
                const inv = getInventoryLink(alert);
                const isUnread = !alert.readAt;

                return (
                  <div
                    key={alert.id}
                    data-testid={`alert-item-${alert.id}`}
                    className={`p-3 transition-colors hover:bg-hover ${
                      isUnread ? 'bg-warn-bg/40' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={typeInfo.variant} className="text-[10px] px-1.5 py-0">
                            {typeInfo.label}
                          </Badge>
                          {isUnread && (
                            <span className="h-1.5 w-1.5 rounded-full bg-crit shrink-0" />
                          )}
                          <span className="text-[11px] text-muted">
                            {formatAlertDate(alert.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-fg line-clamp-2">{alert.message}</p>
                        <div className="pt-1">
                          <Link
                            href={inv.href}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:text-accent-hover hover:underline"
                          >
                            {alert.refType === 'Sensor' ||
                            alert.refType === 'SENSOR' ||
                            alert.type === 'SENSOR_THRESHOLD' ? (
                              <Cpu className="h-3 w-3" />
                            ) : alert.refType === 'EQUIPMENT' ||
                              alert.type === 'MAINTENANCE_DUE' ? (
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
                          className="h-7 w-7 p-0 shrink-0 text-muted hover:text-accent"
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

          <div className="border-t border-line bg-surface-2 p-2 text-center">
            <Link
              href="/admin/alerts"
              onClick={() => setIsOpen(false)}
              className="block w-full py-1 text-center text-xs font-medium text-accent hover:text-accent-hover"
            >
              Xem tất cả cảnh báo &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
