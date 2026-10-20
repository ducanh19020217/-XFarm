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

  // Edit slot dialog states
  const [editingSlot, setEditingSlot] = React.useState<TourSlotItem | null>(null);
  const [editCapacity, setEditCapacity] = React.useState<number>(20);
  const [editIsActive, setEditIsActive] = React.useState(true);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false);

  // Delete slot confirm
  const [deletingSlot, setDeletingSlot] = React.useState<TourSlotItem | null>(null);

  // Fetch tour
  React.useEffect(() => {
    if (!tourId) return;
    let isMounted = true;
    setIsLoadingTour(true);

    apiFetch<{ data: TourItem }>(`/tours/${tourId}`)
      .then((res) => {
        if (isMounted) {
          setTour(res.data);
          setBulkCapacity(res.data.capacity);
          setSingleCapacity(res.data.capacity);
        }
      })
      .catch((err) => {
        if (!isAbortError(err)) console.error('Lỗi khi tải thông tin tour:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingTour(false);
      });

    return () => {
      isMounted = false;
    };
  }, [tourId]);

  // Fetch slots based on date range
  const fetchSlots = React.useCallback(
    async (signal?: AbortSignal) => {
      if (!tourId) return;
      setIsLoadingSlots(true);
      try {
        let fromDate: Date;
        let toDate: Date;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        if (viewMode === 'MONTH') {
          fromDate = new Date(Date.UTC(year, month - 1, 20));
          toDate = new Date(Date.UTC(year, month + 1, 15));
        } else {
          const dayOfWeek = (currentDate.getDay() + 6) % 7;
          fromDate = new Date(currentDate);
          fromDate.setDate(currentDate.getDate() - dayOfWeek - 7);
          toDate = new Date(currentDate);
          toDate.setDate(currentDate.getDate() + (6 - dayOfWeek) + 7);
        }

        const res = await apiFetch<Paginated<TourSlotItem>>(
          `/tours/${tourId}/slots?from=${fromDate.toISOString()}&to=${toDate.toISOString()}&pageSize=500`,
          { signal },
        );
        setSlots(res.data);
      } catch (err) {
        if (!isAbortError(err)) {
          console.error('Lỗi khi tải danh sách suất trải nghiệm:', err);
          setSlots([]);
        }
      } finally {
        setIsLoadingSlots(false);
      }
    },
    [tourId, currentDate, viewMode],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchSlots(controller.signal);
    return () => controller.abort();
  }, [fetchSlots]);

  // Calendar navigation
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'MONTH') {
        next.setMonth(next.getMonth() - 1);
      } else {
        next.setDate(next.getDate() - 7);
      }
      return next;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'MONTH') {
        next.setMonth(next.getMonth() + 1);
      } else {
        next.setDate(next.getDate() + 7);
      }
      return next;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Group slots by Vietnam date string
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

  // Bulk dialog open
  const openBulkDialog = () => {
    const today = new Date();
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(today.getDate() + 14);

    setBulkFrom(toVietnamDateString(today));
    setBulkTo(toVietnamDateString(twoWeeksLater));
    setBulkWeekdays([6, 0]); // Saturday, Sunday
    setBulkTimes(['08:00', '14:00']);
    setBulkCapacity(tour?.capacity || 20);
    setBulkError(null);
    setBulkSuccessMsg(null);
    setBulkDialogOpen(true);
  };

  const toggleBulkWeekday = (day: number) => {
    setBulkWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const addBulkTime = () => {
    const trimmed = newTimeInput.trim();
    if (!trimmed) return;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) {
      setBulkError('Định dạng giờ không hợp lệ. Vui lòng dùng định dạng HH:mm (ví dụ 08:30)');
      return;
    }
    if (!bulkTimes.includes(trimmed)) {
      setBulkTimes([...bulkTimes, trimmed].sort());
    }
    setNewTimeInput('');
  };

  const removeBulkTime = (time: string) => {
    setBulkTimes(bulkTimes.filter((t) => t !== time));
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError(null);
    setBulkSuccessMsg(null);

    if (!bulkFrom || !bulkTo) {
      setBulkError('Vui lòng chọn khoảng ngày bắt đầu và kết thúc');
      return;
    }
    if (bulkWeekdays.length === 0) {
      setBulkError('Vui lòng chọn ít nhất một thứ trong tuần');
      return;
    }
    if (bulkTimes.length === 0) {
      setBulkError('Vui lòng nhập ít nhất một khung giờ');
      return;
    }

    setIsSubmittingBulk(true);
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

  // Open single slot dialog
  const openSingleDialog = (dateStr?: string) => {
    setSingleDate(dateStr || toVietnamDateString(new Date()));
    setSingleTime('08:00');
    setSingleCapacity(tour?.capacity || 20);
    setSingleError(null);
    setSingleDialogOpen(true);
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleError(null);

    if (!singleDate || !singleTime) {
      setSingleError('Vui lòng chọn ngày và giờ');
      return;
    }

    setIsSubmittingSingle(true);
    try {
      const [year, month, day] = singleDate.split('-').map(Number);
      const [hour, min] = singleTime.split(':').map(Number);
      const startAt = new Date(Date.UTC(year, month - 1, day, hour - 7, min, 0, 0));

      await apiFetch(`/tours/${tourId}/slots`, {
        method: 'POST',
        body: JSON.stringify({
          tourId,
          startAt: startAt.toISOString(),
          capacity: singleCapacity,
          isActive: true,
        }),
      });

      setSingleDialogOpen(false);
      void fetchSlots();
    } catch (err) {
      if (err instanceof ApiError) {
        setSingleError(err.message || 'Không thể tạo suất trải nghiệm này.');
      } else {
        setSingleError('Đã xảy ra lỗi khi tạo suất.');
      }
    } finally {
      setIsSubmittingSingle(false);
    }
  };

  // Open edit slot dialog
  const openEditSlot = (slot: TourSlotItem) => {
    setEditingSlot(slot);
    setEditCapacity(slot.capacity);
    setEditIsActive(slot.isActive);
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;
    setEditError(null);

    if (editCapacity < editingSlot.bookedCount) {
      setEditError(`Sức chứa không được nhỏ hơn số vé đã đặt (${editingSlot.bookedCount} vé)`);
      return;
    }

    setIsSubmittingEdit(true);
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
        setEditError('Đã xảy ra lỗi khi cập nhật.');
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleToggleSlotActive = async (slot: TourSlotItem) => {
    try {
      await apiFetch(`/tour-slots/${slot.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !slot.isActive }),
      });
      void fetchSlots();
    } catch (err) {
      console.error('Lỗi khi đổi trạng thái slot:', err);
      alert('Không thể thay đổi trạng thái suất trải nghiệm.');
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
        alert('Không thể xóa suất đã có người đặt vé.');
      }
    }
  };

  // Calculate current week days (Monday to Sunday)
  const currentWeekDays = React.useMemo(() => {
    const days: { dateStr: string; label: string; dateNum: number; isToday: boolean }[] = [];
    const todayStr = toVietnamDateString(new Date());

    const dayOfWeek = (currentDate.getDay() + 6) % 7;
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = toVietnamDateString(d);
      const weekdayName = WEEKDAY_LABELS.find((w) => w.day === (i + 1) % 7)?.label || '';
      days.push({
        dateStr,
        label: weekdayName,
        dateNum: d.getDate(),
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, [currentDate]);

  // Calculate month grid days
  const monthGridDays = React.useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    return buildMonthGrid(year, month);
  }, [currentDate]);

  const monthLabel = React.useMemo(() => {
    return `Tháng ${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
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
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-64 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" />
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/tours"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách tour
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
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
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Danh sách tour
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {tour.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
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
              Người lớn:{' '}
              <b className="text-emerald-600 dark:text-emerald-400">
                {formatMoney(tour.priceAdult)}
              </b>
            </span>
            <span>•</span>
            <span>
              Trẻ em: <b>{formatMoney(tour.priceChild)}</b>
            </span>
            <span>•</span>
            {tour.isPublished ? (
              <Badge
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] h-5"
              >
                Đã xuất bản
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] h-5">
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
            <Button
              size="sm"
              onClick={openBulkDialog}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs text-white"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              Tạo slot hàng loạt
            </Button>
          </div>
        )}
      </div>

      {/* Calendar Control Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950">
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

          <span className="ml-2 font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base flex items-center gap-2">
            {viewMode === 'MONTH' ? monthLabel : weekLabel}
            {isLoadingSlots && (
              <span className="text-xs text-slate-400 font-normal">(Đang tải...)</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Còn chỗ
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              Đầy chỗ
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
              Đã tắt
            </span>
          </div>

          {/* View mode toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setViewMode('WEEK')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === 'WEEK'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Theo tuần
            </button>
            <button
              type="button"
              onClick={() => setViewMode('MONTH')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === 'MONTH'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
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
                className={`flex flex-col rounded-xl border bg-white p-3 shadow-sm transition-all dark:bg-slate-950 ${
                  day.isToday
                    ? 'border-emerald-500 ring-1 ring-emerald-500/30'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 dark:border-slate-900">
                  <div>
                    <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                      {day.label}
                    </span>
                    <span
                      className={`text-base font-bold ${
                        day.isToday
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {day.dateNum}
                    </span>
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openSingleDialog(day.dateStr)}
                      className="h-6 w-6 p-0 text-slate-400 hover:text-emerald-600"
                      title="Thêm suất vào ngày này"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Day Slots List */}
                <div className="flex-1 space-y-2 overflow-y-auto max-h-[500px]">
                  {daySlots.length === 0 ? (
                    <p className="text-center py-6 text-xs text-slate-400 italic">Không có suất</p>
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
                              ? 'border-slate-200 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-900'
                              : isFull
                                ? 'border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20'
                                : 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400 dark:border-emerald-900 dark:bg-emerald-950/20'
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {timeStr}
                            </span>
                            {isInactive ? (
                              <span className="text-[10px] text-slate-500 font-normal">Tắt</span>
                            ) : isFull ? (
                              <span className="text-[10px] font-bold text-red-600">Đầy</span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600">
                                Còn {slot.capacity - slot.bookedCount}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                            <span>
                              Đã đặt: <b>{slot.bookedCount}</b>/{slot.capacity}
                            </span>
                          </div>

                          {/* Slot Actions */}
                          {canEdit && (
                            <div className="mt-2 flex items-center justify-end gap-1 border-t border-slate-100 pt-1.5 dark:border-slate-800/60">
                              <Link href={`/admin/tours/bookings?slotId=${slot.id}`}>
                                <button
                                  type="button"
                                  className="rounded p-1 text-slate-500 hover:text-emerald-600 transition-colors"
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
                                    ? 'text-slate-400 hover:text-amber-600'
                                    : 'text-amber-600 hover:text-emerald-600'
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
                                className="rounded p-1 text-slate-500 hover:text-slate-900 transition-colors dark:hover:text-slate-100"
                                title="Sửa sức chứa"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              {slot.bookedCount === 0 && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingSlot(slot)}
                                  className="rounded p-1 text-red-400 hover:text-red-600 transition-colors"
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
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-950">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w.day} className="py-2.5">
                {w.label}
              </div>
            ))}
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/60">
            {monthGridDays.map((cell) => {
              const daySlots = slotsByDate[cell.date] || [];
              return (
                <div
                  key={cell.date}
                  className={`min-h-[110px] p-2 transition-colors ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-50/50 text-slate-400 dark:bg-slate-900/30'
                      : cell.isToday
                        ? 'bg-emerald-50/20'
                        : 'bg-white dark:bg-slate-950'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-semibold ${
                        cell.isToday
                          ? 'flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white'
                          : cell.isCurrentMonth
                            ? 'text-slate-800 dark:text-slate-200'
                            : 'text-slate-400'
                      }`}
                    >
                      {cell.day}
                    </span>
                    {canEdit && cell.isCurrentMonth && (
                      <button
                        type="button"
                        onClick={() => openSingleDialog(cell.date)}
                        className="h-4 w-4 rounded text-slate-300 hover:text-emerald-600 transition-colors"
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
                              ? 'bg-slate-100 text-slate-400 line-through dark:bg-slate-800'
                              : isFull
                                ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/60 dark:text-red-300'
                                : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
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
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{bulkError}</span>
            </div>
          )}

          {bulkSuccessMsg && (
            <div className="rounded-md bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center gap-2">
              <Check className="h-4 w-4 flex-shrink-0" />
              <span>{bulkSuccessMsg}</span>
            </div>
          )}

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="bulk-from">
                Từ ngày <span className="text-red-500">*</span>
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
                Đến ngày <span className="text-red-500">*</span>
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
                Các thứ trong tuần <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setBulkWeekdays([6, 0])}
                  className="text-emerald-600 hover:underline"
                >
                  Cuối tuần (T7, CN)
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setBulkWeekdays([1, 2, 3, 4, 5])}
                  className="text-emerald-600 hover:underline"
                >
                  Ngày trong tuần (T2-T6)
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setBulkWeekdays([1, 2, 3, 4, 5, 6, 0])}
                  className="text-emerald-600 hover:underline"
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
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
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
              Khung giờ trải nghiệm <span className="text-red-500">*</span>
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {bulkTimes.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                >
                  <Clock className="h-3 w-3" />
                  {t}
                  <button
                    type="button"
                    onClick={() => removeBulkTime(t)}
                    className="hover:text-red-600"
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
              Sức chứa mỗi suất (khách) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="bulk-capacity"
              type="number"
              min={1}
              value={bulkCapacity}
              onChange={(e) => setBulkCapacity(parseInt(e.target.value, 10) || 0)}
            />
            <p className="text-[11px] text-slate-500">
              Mặc định lấy theo sức chứa chuẩn của tour ({tour?.capacity} khách).
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkDialogOpen(false)}
              disabled={isSubmittingBulk}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingBulk}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
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
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
              {singleError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="single-date">
                Ngày <span className="text-red-500">*</span>
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
                Giờ bắt đầu <span className="text-red-500">*</span>
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
              Sức chứa (khách) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="single-capacity"
              type="number"
              min={1}
              value={singleCapacity}
              onChange={(e) => setSingleCapacity(parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSingleDialogOpen(false)}
              disabled={isSubmittingSingle}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingSingle}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
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
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
              {editError}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="edit-capacity">
              Sức chứa tối đa (khách) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-capacity"
              type="number"
              min={editingSlot?.bookedCount || 1}
              value={editCapacity}
              onChange={(e) => setEditCapacity(parseInt(e.target.value, 10) || 0)}
            />
            {editingSlot && (
              <p className="text-[11px] text-slate-500">
                Đã có <b>{editingSlot.bookedCount}</b> khách đặt chỗ cho suất này.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="edit-active"
              type="checkbox"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <Label htmlFor="edit-active" className="cursor-pointer font-normal">
              Cho phép khách hàng đặt chỗ suất trải nghiệm này (Hoạt động)
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingSlot(null)}
              disabled={isSubmittingEdit}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingEdit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
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
