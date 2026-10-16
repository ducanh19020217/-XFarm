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
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Chấm công vào / ra ca
          </h1>
          <p className="text-xs font-medium text-slate-500">
            Ghi nhận giờ làm việc hằng ngày của bạn
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadData()}
          disabled={loading || actionLoading}
          className="h-10 px-3 flex items-center gap-1.5 text-slate-600 rounded-xl active:scale-95 transition-transform"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          <span className="text-xs font-semibold">Cập nhật</span>
        </Button>
      </div>

      {/* Card Trạng thái hôm nay */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Trạng thái hôm nay
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {new Date().toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Live Status Banner */}
        <div
          className={`p-4 rounded-xl flex items-center gap-3.5 transition-colors ${
            hasCheckedOut
              ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
              : hasCheckedIn
                ? 'bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300'
                : 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
          }`}
        >
          {hasCheckedOut ? (
            <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
          ) : hasCheckedIn ? (
            <Clock className="h-8 w-8 text-blue-600 shrink-0 animate-pulse" />
          ) : (
            <AlertCircle className="h-8 w-8 text-amber-600 shrink-0" />
          )}

          <div className="space-y-0.5">
            <h3 className="text-base font-bold leading-tight">
              {hasCheckedOut
                ? 'Đã kết thúc ca làm việc'
                : hasCheckedIn
                  ? 'Đang trong ca làm việc'
                  : 'Chưa chấm công vào ca'}
            </h3>
            <p className="text-xs opacity-80">
              {hasCheckedOut
                ? `Vào ca: ${formatTime(todayAttendance?.checkIn)} · Ra ca: ${formatTime(todayAttendance?.checkOut)} (${todayAttendance?.hours || 0} giờ)`
                : hasCheckedIn
                  ? `Vào lúc: ${formatTime(todayAttendance?.checkIn)} · Đừng quên ra ca khi kết thúc`
                  : 'Hãy bấm nút Vào ca bên dưới để bắt đầu tính giờ'}
            </p>
          </div>
        </div>

        {/* Big Action Buttons (Optimized for thumb tap) */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button
            type="button"
            variant="default"
            size="lg"
            disabled={loading || hasCheckedIn || actionLoading}
            onClick={handleCheckIn}
            className={`h-16 text-base font-extrabold rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-sm ${
              hasCheckedIn
                ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 border border-slate-200 dark:border-slate-800 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
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
                ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 border border-slate-200 dark:border-slate-800 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            <LogOut className="h-6 w-6" />
            <span>RA CA</span>
          </Button>
        </div>
      </div>

      {/* Lịch sử 7 ngày gần nhất */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Lịch sử 7 ngày qua
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">{history.length} bản ghi</span>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6 italic">
            Chưa có lịch sử chấm công trong 7 ngày gần đây.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.map((record) => (
              <div
                key={record.id}
                className="py-3 flex items-center justify-between gap-3 first:pt-1 last:pb-1"
              >
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200 capitalize">
                    {formatDate(record.date || record.checkIn)}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span>Vào: {formatTime(record.checkIn)}</span>
                    <span>·</span>
                    <span>Ra: {formatTime(record.checkOut)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                    {record.hours != null ? `${Number(record.hours).toFixed(2)}h` : '0h'}
                  </div>
                  {record.cycle?.name && (
                    <div className="text-[11px] text-slate-400 max-w-[120px] truncate">
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
