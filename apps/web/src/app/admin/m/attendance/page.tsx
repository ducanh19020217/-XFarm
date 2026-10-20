'use client';

import * as React from 'react';
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  History,
  Timer,
} from 'lucide-react';
import { Button, Toast, useToast } from '@xfarm/ui';
import { mobileApi } from '@/lib/mobile-api';
import type { AttendanceItem } from '@/app/admin/hr/common/types';

export default function MobileAttendancePage() {
  const { message, showToast, closeToast } = useToast();

  const [todayAttendance, setTodayAttendance] = React.useState<AttendanceItem | null>(null);
  const [history, setHistory] = React.useState<AttendanceItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);

  const loadData = React.useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const [todayRes, historyRes] = await Promise.all([
          mobileApi.getTodayAttendance(signal),
          mobileApi.getRecentAttendance(7, signal),
        ]);
        setTodayAttendance(todayRes);
        setHistory(historyRes || []);
      } catch {
        showToast('Không thể tải dữ liệu chấm công. Vui lòng thử lại!');
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const hasCheckedIn = Boolean(todayAttendance?.checkIn);
  const hasCheckedOut = Boolean(todayAttendance?.checkOut);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const clientId = crypto.randomUUID?.() || String(Date.now());
      const res = await mobileApi.checkIn({
        clientId,
        at: new Date().toISOString(),
      });
      setTodayAttendance(res);
      showToast('Chấm công VÀO CA thành công!');
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi chấm công vào ca!');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const clientId = crypto.randomUUID?.() || String(Date.now());
      const res = await mobileApi.checkOut({
        clientId,
        at: new Date().toISOString(),
      });
      setTodayAttendance(res);
      showToast('Chấm công RA CA thành công!');
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi chấm công ra ca!');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-4">
      {message && <Toast message={message} onClose={closeToast} />}

      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h1 className="text-xl font-extrabold text-fg tracking-tight">Chấm công vào / ra ca</h1>
          <p className="text-xs font-medium text-muted">Ghi nhận giờ làm việc hằng ngày của bạn</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadData()}
          disabled={loading || actionLoading}
          className="h-10 px-3 flex items-center gap-1.5 rounded-xl border-line bg-surface text-fg hover:bg-hover active:scale-95 transition-transform"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-accent' : ''}`} />
          <span className="text-xs font-semibold">Cập nhật</span>
        </Button>
      </div>

      {/* Card Trạng thái hôm nay */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-4 text-fg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-accent" />
            <h2 className="text-sm font-bold text-fg-2 uppercase tracking-wider">
              Trạng thái hôm nay
            </h2>
          </div>
          <span className="text-xs font-semibold text-muted">
            {new Date().toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Live Status Banner */}
        <div
          className={`p-4 rounded-xl flex items-center gap-3.5 border transition-colors ${
            hasCheckedOut
              ? 'bg-ok-bg text-ok border-ok/20'
              : hasCheckedIn
                ? 'bg-info-bg text-info border-info/20'
                : 'bg-warn-bg text-warn border-warn/20'
          }`}
        >
          {hasCheckedOut ? (
            <CheckCircle2 className="h-8 w-8 text-ok shrink-0" />
          ) : hasCheckedIn ? (
            <Clock className="h-8 w-8 text-info shrink-0 animate-pulse" />
          ) : (
            <AlertCircle className="h-8 w-8 text-warn shrink-0" />
          )}

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold leading-tight">
                {hasCheckedOut
                  ? 'Đã kết thúc ca làm việc'
                  : hasCheckedIn
                    ? 'Đang trong ca làm việc'
                    : 'Chưa chấm công vào ca'}
              </h3>
              {todayAttendance?.pendingSync && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-warn-bg text-warn border border-warn/20">
                  Chờ đồng bộ
                </span>
              )}
            </div>
            <p className="text-xs opacity-80">
              {hasCheckedOut
                ? `Vào ca: ${formatTime(todayAttendance?.checkIn)} · Ra ca: ${formatTime(todayAttendance?.checkOut)} (${todayAttendance?.hours || 0} giờ)`
                : hasCheckedIn
                  ? `Vào lúc: ${formatTime(todayAttendance?.checkIn)} · Đừng quên ra ca khi kết thúc`
                  : 'Hãy bấm nút Vào ca bên dưới để bắt đầu tính giờ'}
            </p>
          </div>
        </div>

        {/* Big Action Buttons (Optimized for thumb tap & high contrast in sunlight) */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button
            type="button"
            variant="default"
            size="lg"
            disabled={loading || hasCheckedIn || actionLoading}
            onClick={handleCheckIn}
            className={`h-16 text-base font-extrabold rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-sm ${
              hasCheckedIn
                ? 'bg-surface-2 text-muted border border-line cursor-not-allowed opacity-60'
                : 'bg-accent hover:bg-accent-hover text-surface shadow-md'
            }`}
          >
            <LogIn className="h-6 w-6" />
            <span>VÀO CA</span>
          </Button>

          <Button
            type="button"
            variant="default"
            size="lg"
            disabled={loading || !hasCheckedIn || hasCheckedOut || actionLoading}
            onClick={handleCheckOut}
            className={`h-16 text-base font-extrabold rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-sm ${
              !hasCheckedIn || hasCheckedOut
                ? 'bg-surface-2 text-muted border border-line cursor-not-allowed opacity-60'
                : 'bg-warn-fill hover:bg-warn text-surface shadow-md'
            }`}
          >
            <LogOut className="h-6 w-6" />
            <span>RA CA</span>
          </Button>
        </div>
      </div>

      {/* Lịch sử 7 ngày gần nhất */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-3 text-fg">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-bold text-fg-2 uppercase tracking-wider">
              Lịch sử 7 ngày qua
            </h2>
          </div>
          <span className="text-xs text-muted font-medium">{history.length} bản ghi</span>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-muted text-center py-6 italic">
            Chưa có lịch sử chấm công trong 7 ngày gần đây.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {history.map((record) => (
              <div
                key={record.id}
                className="py-3 flex items-center justify-between gap-3 first:pt-1 last:pb-1"
              >
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-fg capitalize">
                    {formatDate(record.date || record.checkIn)}
                  </div>
                  <div className="text-xs text-muted flex items-center gap-2">
                    <span>Vào: {formatTime(record.checkIn)}</span>
                    <span>·</span>
                    <span>Ra: {formatTime(record.checkOut)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-extrabold text-accent font-mono">
                    {record.hours != null ? `${Number(record.hours).toFixed(2)}h` : '0h'}
                  </div>
                  {record.cycle?.name && (
                    <div className="text-[11px] text-muted max-w-[120px] truncate">
                      {record.cycle.name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
