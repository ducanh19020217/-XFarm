'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button, ConfirmDialog } from '@xfarm/ui';
import {
  getOutbox,
  removeOutboxItem,
  clearOutbox,
  syncOutbox,
  subscribeOutbox,
  subscribeSyncStatus,
  type OutboxItem,
} from '@/lib/offline-queue';

export default function OutboxPage() {
  const [items, setItems] = React.useState<OutboxItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const loadItems = React.useCallback(async () => {
    try {
      const all = await getOutbox();
      setItems(all);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadItems();

    const unsubOutbox = subscribeOutbox((count, newItems) => {
      setItems(newItems);
    });

    const unsubSync = subscribeSyncStatus((status) => {
      setIsSyncing(status.isSyncing);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubOutbox();
      unsubSync();
    };
  }, [loadItems]);

  const handleDeleteItem = async (clientId: string) => {
    setDeletingId(clientId);
    try {
      await removeOutboxItem(clientId);
      setStatusMessage('Đã xóa thao tác khỏi hàng đợi!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage('Không thể xóa thao tác. Vui lòng thử lại.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearOutbox();
      setShowClearConfirm(false);
      setStatusMessage('Đã làm trống toàn bộ hàng đợi!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage('Lỗi khi xóa hàng đợi.');
    }
  };

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setStatusMessage('Đang tiến hành đồng bộ dữ liệu...');
    try {
      const res = await syncOutbox({ force: true });
      if (res.syncedCount > 0 || res.duplicateCount > 0) {
        setStatusMessage(`Đã đồng bộ thành công ${res.syncedCount + res.duplicateCount} thao tác!`);
      } else if (res.errorCount > 0) {
        setStatusMessage(`Đồng bộ có ${res.errorCount} thao tác gặp lỗi.`);
      } else {
        setStatusMessage('Không có thao tác nào cần đồng bộ.');
      }
      await loadItems();
    } catch (err: unknown) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Đồng bộ thất bại. Vui lòng thử lại sau!',
      );
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const getKindBadge = (kind: string) => {
    switch (kind) {
      case 'activity':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-ok-bg text-ok border border-ok/20">
            Nhật ký nông trại
          </span>
        );
      case 'check-in':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-info-bg text-info border border-info/20">
            Chấm công Vào ca
          </span>
        );
      case 'check-out':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-selected text-accent border border-accent/20">
            Chấm công Ra ca
          </span>
        );
      case 'task-complete':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-warn-bg text-warn border border-warn/20">
            Hoàn thành việc
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-surface-2 text-muted border border-line">
            {kind}
          </span>
        );
    }
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/m"
            className="p-2 rounded-xl text-muted hover:text-fg hover:bg-hover active:scale-95 transition-colors"
            title="Quay lại"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-extrabold text-fg tracking-tight">
              Hàng đợi ngoại tuyến
            </h1>
            <p className="text-xs font-medium text-muted">
              Quản lý các thao tác chưa đồng bộ lên máy chủ
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="p-2 text-xs font-bold text-crit hover:bg-crit-bg rounded-xl flex items-center gap-1 active:scale-95 transition-colors"
            title="Xóa tất cả"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Xóa hết</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="p-3 text-xs font-semibold rounded-xl bg-info-bg text-info border border-info/20 animate-in fade-in">
          {statusMessage}
        </div>
      )}

      {/* Sync Action Card */}
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs flex items-center justify-between text-fg">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-fg-2">
              {items.length} thao tác trong hàng đợi
            </span>
          </div>
          <p className="text-xs text-muted">
            {isOnline
              ? 'Máy chủ sẵn sàng, có thể đồng bộ ngay'
              : 'Thiết bị đang offline. Dữ liệu an toàn trong máy.'}
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          disabled={isSyncing || items.length === 0}
          onClick={handleSyncNow}
          className="h-10 px-4 text-xs font-bold bg-accent hover:bg-accent-hover text-surface rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
        </Button>
      </div>

      {/* Item List */}
      {loading ? (
        <div className="py-12 text-center text-sm font-medium text-muted flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-accent" />
          <span>Đang tải dữ liệu hàng đợi...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-xs space-y-3 text-fg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok-bg text-ok">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-fg-2">Hàng đợi trống</h3>
          <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
            Toàn bộ thao tác bạn thực hiện đã được đồng bộ hoàn tất lên hệ thống máy chủ XFarm.
          </p>
          <div className="pt-2">
            <Link href="/admin/m">
              <Button variant="outline" size="sm" className="h-10 rounded-xl text-xs font-bold border-line bg-surface text-fg hover:bg-hover">
                Quay về trang chính
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const isDeleting = deletingId === item.clientId;
            const payload = (item.payload || {}) as Record<string, unknown>;

            return (
              <div
                key={item.clientId}
                className="rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-2.5 transition-all text-fg"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-muted">#{index + 1}</span>
                    {getKindBadge(item.kind)}
                  </div>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDeleteItem(item.clientId)}
                    className="p-1.5 text-muted hover:text-crit hover:bg-crit-bg rounded-lg transition-colors active:scale-95"
                    title="Xóa thao tác này"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Details */}
                <div className="text-xs space-y-1 text-muted">
                  {Boolean(payload.notes) && (
                    <p className="font-medium text-fg">
                      Ghi chú: {String(payload.notes)}
                    </p>
                  )}
                  {Boolean(payload.type) && (
                    <p>
                      Loại: <span className="font-semibold text-fg-2">{String(payload.type)}</span>
                    </p>
                  )}
                  {Boolean(payload.at) && (
                    <p>
                      Thời điểm:{' '}
                      <span className="font-medium text-fg-2">{formatDateTime(String(payload.at))}</span>
                    </p>
                  )}
                  {Array.isArray(payload.mediaIds) && payload.mediaIds.length > 0 && (
                    <p className="text-accent font-medium">
                      📷 Kèm {payload.mediaIds.length} ảnh hiện trường
                    </p>
                  )}
                </div>

                {/* Last Error if any */}
                {item.lastError && (
                  <div className="p-2 rounded-xl bg-crit-bg text-crit border border-crit/20 text-[11px] font-medium flex items-start gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-crit" />
                    <span>Lỗi lần thử trước: {item.lastError}</span>
                  </div>
                )}

                {/* Footer metadata */}
                <div className="pt-1 flex items-center justify-between text-[11px] text-muted font-mono border-t border-line">
                  <span title={item.clientId}>ID: {item.clientId.slice(0, 8)}...</span>
                  <div className="flex items-center gap-2 font-sans">
                    {item.attempts > 0 && (
                      <span className="text-warn font-medium">Thử: {item.attempts} lần</span>
                    )}
                    <span>{formatDateTime(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clear All Confirm Dialog */}
      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="Xóa toàn bộ hàng đợi ngoại tuyến?"
        description="Các thao tác chưa được đồng bộ lên máy chủ sẽ bị xóa vĩnh viễn và không thể khôi phục lại. Bạn có chắc chắn muốn xóa không?"
        confirmText="Xóa tất cả"
        cancelText="Hủy"
        isDanger={true}
        onConfirm={handleClearAll}
      />
    </div>
  );
}
