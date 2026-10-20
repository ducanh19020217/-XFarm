'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Role, buildMonthGrid, toVietnamDateString, type Paginated } from '@xfarm/shared';
import { Button, Badge, Input, Label, FormDialog, ConfirmDialog } from '@xfarm/ui';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Ticket,
} from 'lucide-react';
import { apiFetch, ApiError, isAbortError } from '@/lib/api';
import { useAdminUser } from '../../admin-user-context';
import type { TourItem } from '../page';

export interface TourSlotItem {
  id: string;
  tourId: string;
  startAt: string;
  capacity: number;
  bookedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function formatMoney(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '0 ₫';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

function formatVietnamTime(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(d);
}

const WEEKDAY_LABELS = [
  { day: 1, label: 'Thứ 2' },
  { day: 2, label: 'Thứ 3' },
  { day: 3, label: 'Thứ 4' },
  { day: 4, label: 'Thứ 5' },
  { day: 5, label: 'Thứ 6' },
  { day: 6, label: 'Thứ 7' },
  { day: 0, label: 'Chủ nhật' },
];

export default function TourDetailPage() {
  const params = useParams();
  const tourId = typeof params?.id === 'string' ? params.id : '';

  const user = useAdminUser();
  const canEdit = user?.role === Role.OWNER || user?.role === Role.MANAGER;

  const [tour, setTour] = React.useState<TourItem | null>(null);
  const [slots, setSlots] = React.useState<TourSlotItem[]>([]);
  const [isLoadingTour, setIsLoadingTour] = React.useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(true);

  // View mode
  const [viewMode, setViewMode] = React.useState<'MONTH' | 'WEEK'>('WEEK');

  // Calendar anchor date
  const [currentDate, setCurrentDate] = React.useState<Date>(() => new Date());

  // Bulk create dialog states
  const [bulkDialogOpen, setBulkDialogOpen] = React.useState(false);
  const [bulkFrom, setBulkFrom] = React.useState('');
  const [bulkTo, setBulkTo] = React.useState('');
  const [bulkWeekdays, setBulkWeekdays] = React.useState<number[]>([6, 0]); // Default weekends (T7, CN)
  const [bulkTimes, setBulkTimes] = React.useState<string[]>(['08:00', '14:00']);
  const [bulkCapacity, setBulkCapacity] = React.useState<number>(20);
  const [newTimeInput, setNewTimeInput] = React.useState('10:00');
  const [bulkError, setBulkError] = React.useState<string | null>(null);
  const [bulkSuccessMsg, setBulkSuccessMsg] = React.useState<string | null>(null);
  const [isSubmittingBulk, setIsSubmittingBulk] = React.useState(false);

  // Single slot dialog
  const [singleDialogOpen, setSingleDialogOpen] = React.useState(false);
  const [singleDate, setSingleDate] = React.useState('');
  const [singleTime, setSingleTime] = React.useState('08:00');
  const [singleCapacity, setSingleCapacity] = React.useState<number>(20);
  const [singleError, setSingleError] = React.useState<string | null>(null);
  const [isSubmittingSingle, setIsSubmittingSingle] = React.useState(false);

  // Edit slot dialog
  const [editingSlot, setEditingSlot] = React.useState<TourSlotItem | null>(null);
  const [editCapacity, setEditCapacity] = React.useState<number>(20);
  const [editIsActive, setEditIsActive] = React.useState<boolean>(true);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false);

  // Delete slot confirm
  const [deletingSlot, setDeletingSlot] = React.useState<TourSlotItem | null>(null);

  // Fetch tour details
  const fetchTour = React.useCallback(
    async (signal?: AbortSignal) => {
      if (!tourId) return;
      setIsLoadingTour(true);
      try {
        const res = await apiFetch<{ data: TourItem }>(`/tours/${tourId}`, { signal });
        setTour(res.data);
        setBulkCapacity(res.data.capacity || 20);
        setSingleCapacity(res.data.capacity || 20);
      } catch (err) {
        if (!isAbortError(err)) {
          console.error('Lỗi khi tải thông tin tour:', err);
        }
      } finally {
        setIsLoadingTour(false);
      }
    },
    [tourId],
  );

  // Calculate start & end range for query
  const { queryFrom, queryTo } = React.useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();

    if (viewMode === 'MONTH') {
      const firstOfMonth = new Date(y, m, 1);
      const dayOfWeek = firstOfMonth.getDay();
      const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
      const startGrid = new Date(y, m, 1 + diffToMon);
      const endGrid = new Date(startGrid);
      endGrid.setDate(startGrid.getDate() + 41);
      return {
        queryFrom: toVietnamDateString(startGrid),
        queryTo: toVietnamDateString(endGrid),
      };
    } else {
      const dayOfWeek = currentDate.getDay();
      const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
      const mon = new Date(y, m, currentDate.getDate() + diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return {
        queryFrom: toVietnamDateString(mon),
        queryTo: toVietnamDateString(sun),
      };
    }
  }, [currentDate, viewMode]);

  // Fetch slots
  const fetchSlots = React.useCallback(
    async (signal?: AbortSignal) => {
      if (!tourId || !queryFrom || !queryTo) return;
      setIsLoadingSlots(true);
      try {
        const params = new URLSearchParams({
          from: queryFrom,
          to: queryTo,
          pageSize: '500',
        });
        const res = await apiFetch<Paginated<TourSlotItem>>(
          `/tours/${tourId}/slots?${params.toString()}`,
          { signal },
        );
        setSlots(res.data || []);
      } catch (err) {
        if (!isAbortError(err)) {
          console.error('Lỗi khi tải lịch suất:', err);
        }
      } finally {
        setIsLoadingSlots(false);
      }
    },
    [tourId, queryFrom, queryTo],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchTour(controller.signal);
    return () => controller.abort();
  }, [fetchTour]);

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchSlots(controller.signal);
    return () => controller.abort();
  }, [fetchSlots]);

  // Calendar navigation
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'MONTH') {
        d.setMonth(d.getMonth() - 1);
      } else {
        d.setDate(d.getDate() - 7);
      }
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'MONTH') {
        d.setMonth(d.getMonth() + 1);
      } else {
        d.setDate(d.getDate() + 7);
      }
      return d;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Group slots by date string YYYY-MM-DD
  const slotsByDate = React.useMemo(() => {
    const map: Record<string, TourSlotItem[]> = {};
    for (const slot of slots) {
      const dateKey = toVietnamDateString(slot.startAt);
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(slot);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return map;
  }, [slots]);

  // Dialog actions
  const openBulkDialog = () => {
    setBulkError(null);
    setBulkSuccessMsg(null);
    const now = new Date();
    const nextMon = new Date(now);
    const daysToMon = (1 - now.getDay() + 7) % 7 || 7;
    nextMon.setDate(now.getDate() + daysToMon);
    const nextSun = new Date(nextMon);
    nextSun.setDate(nextMon.getDate() + 13);

    setBulkFrom(toVietnamDateString(nextMon));
    setBulkTo(toVietnamDateString(nextSun));
    setBulkWeekdays([6, 0]);
    setBulkTimes(['08:00', '14:00']);
    setBulkCapacity(tour?.capacity || 20);
    setBulkDialogOpen(true);
  };

  const toggleBulkWeekday = (day: number) => {
    setBulkWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const addBulkTime = () => {
    if (!newTimeInput) return;
    if (!bulkTimes.includes(newTimeInput)) {
      setBulkTimes((prev) => [...prev, newTimeInput].sort());
    }
  };

  const removeBulkTime = (time: string) => {
    setBulkTimes((prev) => prev.filter((t) => t !== time));
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFrom || !bulkTo) {
      setBulkError('Vui lòng chọn khoảng ngày bắt đầu và kết thúc.');
      return;
    }
    if (bulkWeekdays.length === 0) {
      setBulkError('Vui lòng chọn ít nhất một thứ trong tuần.');
      return;
    }
    if (bulkTimes.length === 0) {
      setBulkError('Vui lòng thêm ít nhất một khung giờ.');
      return;
    }

    setIsSubmittingBulk(true);
    setBulkError(null);
    setBulkSuccessMsg(null);

    try {
      const res = await apiFetch<{ created: number; skipped: number }>(
        `/tours/${tourId}/slots/bulk`,
        {
          method: 'POST',
          body: JSON.stringify({
            from: bulkFrom,
            to: bulkTo,
            weekdays: bulkWeekdays,
            times: bulkTimes,
            capacity: bulkCapacity,
          }),
        },
      );

      setBulkSuccessMsg(
        `Tạo slot thành công: đã tạo ${res.created} suất, bỏ qua ${res.skipped} suất đã tồn tại.`,
      );
      void fetchSlots();
      setTimeout(() => {
        setBulkDialogOpen(false);
      }, 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        setBulkError(err.message || 'Không thể tạo slot hàng loạt.');
      } else {
        setBulkError('Đã xảy ra lỗi không xác định.');
      }
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  const openSingleDialog = (dateStr?: string) => {
    setSingleError(null);
    setSingleDate(dateStr || toVietnamDateString(new Date()));
    setSingleTime('08:00');
    setSingleCapacity(tour?.capacity || 20);
    setSingleDialogOpen(true);
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleDate || !singleTime) {
      setSingleError('Vui lòng điền đầy đủ ngày và giờ bắt đầu.');
      return;
    }

    setIsSubmittingSingle(true);
    setSingleError(null);

    try {
      const startAt = new Date(`${singleDate}T${singleTime}:00+07:00`).toISOString();
      await apiFetch(`/tours/${tourId}/slots`, {
        method: 'POST',
        body: JSON.stringify({
          startAt,
          capacity: singleCapacity,
        }),
      });

      setSingleDialogOpen(false);
      void fetchSlots();
    } catch (err) {
      if (err instanceof ApiError) {
        setSingleError(err.message || 'Không thể tạo suất trải nghiệm.');
      } else {
        setSingleError('Đã xảy ra lỗi không xác định.');
      }
    } finally {
      setIsSubmittingSingle(false);
    }
  };

  const openEditSlot = (slot: TourSlotItem) => {
    setEditingSlot(slot);
    setEditCapacity(slot.capacity);
    setEditIsActive(slot.isActive);
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    setIsSubmittingEdit(true);
    setEditError(null);

    try {
      await apiFetch(`/tour-slots/${editingSlot.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          capacity: editCapacity,
          isActive: editIsActive,
        }),
      });

      setEditingSlot(null);
      void fetchSlots();
    } catch (err) {
      if (err instanceof ApiError) {
        setEditError(err.message || 'Không thể cập nhật suất trải nghiệm.');
      } else {
        setEditError('Đã xảy ra lỗi không xác định.');
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleToggleSlotActive = async (slot: TourSlotItem) => {
    try {
      await apiFetch(`/tour-slots/${slot.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          isActive: !slot.isActive,
        }),
      });
      void fetchSlots();
    } catch (err) {
      console.error('Lỗi khi đổi trạng thái slot:', err);
    }
  };

  const handleDeleteSlot = async () => {
    if (!deletingSlot) return;
    try {
      await apiFetch(`/tour-slots/${deletingSlot.id}`, { method: 'DELETE' });
      setDeletingSlot(null);
      void fetchSlots();
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Không thể xóa suất đã có khách đặt.');
      }
    }
  };

  const monthGridDays = React.useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    return buildMonthGrid(y, m);
  }, [currentDate]);

  const monthLabel = React.useMemo(() => {
    const m = currentDate.getMonth() + 1;
    const y = currentDate.getFullYear();
    return `Tháng ${m}/${y}`;
  }, [currentDate]);

  const currentWeekDays = React.useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const dayOfWeek = currentDate.getDay();
    const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const mon = new Date(y, m, currentDate.getDate() + diffToMon);

    const days = [];
    const todayStr = toVietnamDateString(new Date());

    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const dateStr = toVietnamDateString(d);
      const weekdayItem = WEEKDAY_LABELS.find((w) => w.day === d.getDay());

      days.push({
        date: d,
        dateStr,
        label: weekdayItem?.label || '',
        dateNum: d.getDate(),
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, [currentDate]);

  const weekLabel = React.useMemo(() => {
    if (currentWeekDays.length === 0) return '';
    const first = currentWeekDays[0].dateStr;
    const last = currentWeekDays[6].dateStr;
    const [, fm, fd] = first.split('-');
    const [ly, lm, ld] = last.split('-');
    return `${fd}/${fm} - ${ld}/${lm}/${ly}`;
  }, [currentWeekDays]);

  if (isLoadingTour && !tour) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-2" />
        <div className="h-64 rounded-xl border border-line bg-surface p-6 shadow-xs" />
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/tours"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách tour
        </Link>
        <div className="rounded-xl border border-crit/20 bg-crit-bg p-6 text-crit">
          Không tìm thấy thông tin tour du lịch.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/admin/tours"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Danh sách tour
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-fg">{tour.name}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {tour.durationMinutes} phút
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Chuẩn {tour.capacity} khách
            </span>
            <span>•</span>
            <span>
              Người lớn: <b className="text-accent">{formatMoney(tour.priceAdult)}</b>
            </span>
            <span>•</span>
            <span>
              Trẻ em: <b className="text-fg">{formatMoney(tour.priceChild)}</b>
            </span>
            <span>•</span>
            {tour.isPublished ? (
              <Badge variant="default" className="bg-ok-bg text-ok border-ok/20 text-[10px] h-5">
                Đã xuất bản
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-surface-2 text-muted border-line text-[10px] h-5"
              >
                Bản nháp
              </Badge>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openSingleDialog()}
              className="gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm suất đơn
            </Button>
            <Button size="sm" onClick={openBulkDialog} className="gap-1.5 text-xs">
              <CalendarIcon className="h-3.5 w-3.5" />
              Tạo slot hàng loạt
            </Button>
          </div>
        )}
      </div>

      {/* Calendar Control Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between text-fg">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrev} className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday} className="h-8 px-2.5 text-xs">
            Hôm nay
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext} className="h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>

          <span className="ml-2 font-semibold text-fg text-sm sm:text-base flex items-center gap-2">
            {viewMode === 'MONTH' ? monthLabel : weekLabel}
            {isLoadingSlots && (
              <span className="text-xs text-muted font-normal">(Đang tải...)</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" />
              Còn chỗ
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-crit" />
              Đầy chỗ
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-muted" />
              Đã tắt
            </span>
          </div>

          {/* View mode toggle */}
          <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('WEEK')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === 'WEEK' ? 'bg-surface text-fg shadow-xs' : 'text-muted hover:text-fg'
              }`}
            >
              Theo tuần
            </button>
            <button
              type="button"
              onClick={() => setViewMode('MONTH')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === 'MONTH' ? 'bg-surface text-fg shadow-xs' : 'text-muted hover:text-fg'
              }`}
            >
              Theo tháng
            </button>
          </div>
        </div>
      </div>

      {/* WEEK VIEW */}
      {viewMode === 'WEEK' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {currentWeekDays.map((day) => {
            const daySlots = slotsByDate[day.dateStr] || [];
            return (
              <div
                key={day.dateStr}
                className={`flex flex-col rounded-xl border bg-surface p-3 shadow-xs transition-all text-fg ${
                  day.isToday ? 'border-accent ring-1 ring-accent/30' : 'border-line'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between border-b border-line/60 pb-2 mb-2">
                  <div>
                    <span className="block text-xs font-medium text-muted">{day.label}</span>
                    <span
                      className={`text-base font-bold ${day.isToday ? 'text-accent' : 'text-fg'}`}
                    >
                      {day.dateNum}
                    </span>
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openSingleDialog(day.dateStr)}
                      className="h-6 w-6 p-0 text-muted hover:text-accent hover:bg-hover"
                      title="Thêm suất vào ngày này"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Day Slots List */}
                <div className="flex-1 space-y-2 overflow-y-auto max-h-[500px]">
                  {daySlots.length === 0 ? (
                    <p className="text-center py-6 text-xs text-muted italic">Không có suất</p>
                  ) : (
                    daySlots.map((slot) => {
                      const timeStr = formatVietnamTime(slot.startAt);
                      const isFull = slot.bookedCount >= slot.capacity;
                      const isInactive = !slot.isActive;

                      return (
                        <div
                          key={slot.id}
                          className={`rounded-lg border p-2 text-xs transition-all ${
                            isInactive
                              ? 'border-line bg-surface-2 opacity-60 text-muted'
                              : isFull
                                ? 'border-crit/30 bg-crit-bg text-crit'
                                : 'border-accent/30 bg-accent-bg/40 text-accent hover:border-accent'
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span className="flex items-center gap-1 text-fg">
                              <Clock className="h-3 w-3 text-muted" />
                              {timeStr}
                            </span>
                            {isInactive ? (
                              <span className="text-[10px] text-muted font-normal">Tắt</span>
                            ) : isFull ? (
                              <span className="text-[10px] font-bold text-crit">Đầy</span>
                            ) : (
                              <span className="text-[10px] font-bold text-accent">
                                Còn {slot.capacity - slot.bookedCount}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                            <span>
                              Đã đặt: <b className="text-fg">{slot.bookedCount}</b>/{slot.capacity}
                            </span>
                          </div>

                          {/* Slot Actions */}
                          {canEdit && (
                            <div className="mt-2 flex items-center justify-end gap-1 border-t border-line/60 pt-1.5">
                              <Link href={`/admin/tours/bookings?slotId=${slot.id}`}>
                                <button
                                  type="button"
                                  className="rounded p-1 text-muted hover:text-accent hover:bg-hover transition-colors"
                                  title="Xem danh sách khách đặt suất này"
                                >
                                  <Ticket className="h-3 w-3" />
                                </button>
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleToggleSlotActive(slot)}
                                className={`rounded p-1 transition-colors ${
                                  slot.isActive
                                    ? 'text-muted hover:text-warn hover:bg-hover'
                                    : 'text-warn hover:text-accent hover:bg-hover'
                                }`}
                                title={slot.isActive ? 'Tắt suất này' : 'Bật lại suất này'}
                              >
                                {slot.isActive ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditSlot(slot)}
                                className="rounded p-1 text-muted hover:text-fg hover:bg-hover transition-colors"
                                title="Sửa sức chứa"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              {slot.bookedCount === 0 && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingSlot(slot)}
                                  className="rounded p-1 text-crit hover:bg-crit-bg transition-colors"
                                  title="Xóa suất này"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MONTH VIEW */}
      {viewMode === 'MONTH' && (
        <div className="rounded-xl border border-line bg-surface shadow-xs overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-line bg-surface-2 text-center text-xs font-semibold text-fg-2">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w.day} className="py-2.5">
                {w.label}
              </div>
            ))}
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-line/60">
            {monthGridDays.map((cell) => {
              const daySlots = slotsByDate[cell.date] || [];
              return (
                <div
                  key={cell.date}
                  className={`min-h-[110px] p-2 transition-colors ${
                    !cell.isCurrentMonth
                      ? 'bg-surface-2/40 text-muted/60'
                      : cell.isToday
                        ? 'bg-accent-bg/20'
                        : 'bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-semibold ${
                        cell.isToday
                          ? 'flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white'
                          : cell.isCurrentMonth
                            ? 'text-fg'
                            : 'text-muted'
                      }`}
                    >
                      {cell.day}
                    </span>
                    {canEdit && cell.isCurrentMonth && (
                      <button
                        type="button"
                        onClick={() => openSingleDialog(cell.date)}
                        className="h-4 w-4 rounded text-muted hover:text-accent transition-colors"
                        title="Thêm suất"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Slot chips */}
                  <div className="space-y-1">
                    {daySlots.map((slot) => {
                      const timeStr = formatVietnamTime(slot.startAt);
                      const isFull = slot.bookedCount >= slot.capacity;
                      const isInactive = !slot.isActive;

                      return (
                        <div
                          key={slot.id}
                          onClick={() => canEdit && openEditSlot(slot)}
                          className={`cursor-pointer rounded px-1.5 py-0.5 text-[11px] font-medium flex items-center justify-between transition-colors ${
                            isInactive
                              ? 'bg-surface-2 text-muted line-through border border-line'
                              : isFull
                                ? 'bg-crit-bg text-crit hover:opacity-90'
                                : 'bg-accent-bg text-accent hover:opacity-90'
                          }`}
                          title={`${timeStr}: ${slot.bookedCount}/${slot.capacity} khách ${
                            isInactive ? '(Đã tắt)' : isFull ? '(Đầy)' : ''
                          }`}
                        >
                          <span className="font-semibold">{timeStr}</span>
                          <span className="text-[10px]">
                            {slot.bookedCount}/{slot.capacity}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bulk Create Slots Dialog */}
      <FormDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        title="Tạo Suất Trải Nghiệm Hàng Loạt"
        description="Tạo nhanh các suất trải nghiệm theo thứ trong tuần và nhiều khung giờ trong khoảng thời gian xác định."
        className="max-w-xl max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={handleBulkSubmit} className="space-y-4 py-2">
          {bulkError && (
            <div className="rounded-md border border-crit/20 bg-crit-bg p-3 text-xs text-crit flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{bulkError}</span>
            </div>
          )}

          {bulkSuccessMsg && (
            <div className="rounded-md border border-ok/20 bg-ok-bg p-3 text-xs text-ok flex items-center gap-2">
              <Check className="h-4 w-4 flex-shrink-0" />
              <span>{bulkSuccessMsg}</span>
            </div>
          )}

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="bulk-from">
                Từ ngày <span className="text-crit">*</span>
              </Label>
              <Input
                id="bulk-from"
                type="date"
                value={bulkFrom}
                onChange={(e) => setBulkFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bulk-to">
                Đến ngày <span className="text-crit">*</span>
              </Label>
              <Input
                id="bulk-to"
                type="date"
                value={bulkTo}
                onChange={(e) => setBulkTo(e.target.value)}
              />
            </div>
          </div>

          {/* Weekday selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>
                Các thứ trong tuần <span className="text-crit">*</span>
              </Label>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setBulkWeekdays([6, 0])}
                  className="text-accent hover:underline font-medium"
                >
                  Cuối tuần (T7, CN)
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setBulkWeekdays([1, 2, 3, 4, 5])}
                  className="text-accent hover:underline font-medium"
                >
                  Ngày trong tuần (T2-T6)
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setBulkWeekdays([1, 2, 3, 4, 5, 6, 0])}
                  className="text-accent hover:underline font-medium"
                >
                  Tất cả các ngày
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAY_LABELS.map((w) => {
                const selected = bulkWeekdays.includes(w.day);
                return (
                  <button
                    key={w.day}
                    type="button"
                    onClick={() => toggleBulkWeekday(w.day)}
                    className={`rounded-md py-2 text-xs font-medium transition-all ${
                      selected
                        ? 'bg-accent text-white shadow-xs'
                        : 'border border-line bg-surface-2 text-fg-2 hover:bg-hover'
                    }`}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Times selector */}
          <div className="space-y-1.5">
            <Label>
              Khung giờ trải nghiệm <span className="text-crit">*</span>
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {bulkTimes.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-md bg-accent-bg px-2.5 py-1 text-xs font-semibold text-accent border border-accent/30"
                >
                  <Clock className="h-3 w-3" />
                  {t}
                  <button
                    type="button"
                    onClick={() => removeBulkTime(t)}
                    className="hover:text-crit text-muted"
                    title="Xóa giờ này"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Input
                type="time"
                value={newTimeInput}
                onChange={(e) => setNewTimeInput(e.target.value)}
                className="w-36 h-9"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBulkTime}
                className="h-9 text-xs"
              >
                + Thêm giờ
              </Button>
            </div>
          </div>

          {/* Capacity */}
          <div className="space-y-1">
            <Label htmlFor="bulk-capacity">
              Sức chứa mỗi suất (khách) <span className="text-crit">*</span>
            </Label>
            <Input
              id="bulk-capacity"
              type="number"
              min={1}
              value={bulkCapacity}
              onChange={(e) => setBulkCapacity(parseInt(e.target.value, 10) || 0)}
            />
            <p className="text-[11px] text-muted">
              Mặc định lấy theo sức chứa chuẩn của tour ({tour?.capacity} khách).
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-line">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkDialogOpen(false)}
              disabled={isSubmittingBulk}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmittingBulk}>
              {isSubmittingBulk ? 'Đang tạo...' : 'Tạo hàng loạt suất'}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Single Slot Create Dialog */}
      <FormDialog
        open={singleDialogOpen}
        onOpenChange={setSingleDialogOpen}
        title="Thêm Suất Trải Nghiệm Mới"
        description="Tạo một khung giờ trải nghiệm đơn lẻ cho tour."
      >
        <form onSubmit={handleSingleSubmit} className="space-y-4 py-2">
          {singleError && (
            <div className="rounded-md border border-crit/20 bg-crit-bg p-3 text-xs text-crit">
              {singleError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="single-date">
                Ngày <span className="text-crit">*</span>
              </Label>
              <Input
                id="single-date"
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="single-time">
                Giờ bắt đầu <span className="text-crit">*</span>
              </Label>
              <Input
                id="single-time"
                type="time"
                value={singleTime}
                onChange={(e) => setSingleTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="single-capacity">
              Sức chứa (khách) <span className="text-crit">*</span>
            </Label>
            <Input
              id="single-capacity"
              type="number"
              min={1}
              value={singleCapacity}
              onChange={(e) => setSingleCapacity(parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-line">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSingleDialogOpen(false)}
              disabled={isSubmittingSingle}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmittingSingle}>
              {isSubmittingSingle ? 'Đang tạo...' : 'Tạo suất'}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Edit Slot Dialog */}
      <FormDialog
        open={!!editingSlot}
        onOpenChange={(open) => !open && setEditingSlot(null)}
        title="Chỉnh Sửa Suất Trải Nghiệm"
        description={
          editingSlot
            ? `Ngày ${toVietnamDateString(editingSlot.startAt)} lúc ${formatVietnamTime(
                editingSlot.startAt,
              )}`
            : ''
        }
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
          {editError && (
            <div className="rounded-md border border-crit/20 bg-crit-bg p-3 text-xs text-crit">
              {editError}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="edit-capacity">
              Sức chứa tối đa (khách) <span className="text-crit">*</span>
            </Label>
            <Input
              id="edit-capacity"
              type="number"
              min={editingSlot?.bookedCount || 1}
              value={editCapacity}
              onChange={(e) => setEditCapacity(parseInt(e.target.value, 10) || 0)}
            />
            {editingSlot && (
              <p className="text-[11px] text-muted">
                Đã có <b className="text-fg">{editingSlot.bookedCount}</b> khách đặt chỗ cho suất
                này.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="edit-active"
              type="checkbox"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
            />
            <Label htmlFor="edit-active" className="cursor-pointer font-normal text-fg">
              Cho phép khách hàng đặt chỗ suất trải nghiệm này (Hoạt động)
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-line">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingSlot(null)}
              disabled={isSubmittingEdit}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmittingEdit}>
              {isSubmittingEdit ? 'Đang cập nhật...' : 'Cập nhật suất'}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Delete Slot Confirm Dialog */}
      <ConfirmDialog
        open={!!deletingSlot}
        onOpenChange={(open) => !open && setDeletingSlot(null)}
        title="Xác nhận xóa suất trải nghiệm"
        description={`Bạn có chắc muốn xóa suất lúc ${
          deletingSlot ? formatVietnamTime(deletingSlot.startAt) : ''
        } ngày ${
          deletingSlot ? toVietnamDateString(deletingSlot.startAt) : ''
        }? Thao tác này chỉ thực hiện được khi chưa có khách đặt chỗ.`}
        confirmText="Xóa suất"
        isDanger
        onConfirm={handleDeleteSlot}
      />
    </div>
  );
}
