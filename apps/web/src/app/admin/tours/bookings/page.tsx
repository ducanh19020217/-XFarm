'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import {
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
  Role,
  toVietnamDateString,
  type Paginated,
} from '@xfarm/shared';
import {
  DataTable,
  PageHeader,
  Button,
  Badge,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  FormDialog,
  ConfirmDialog,
} from '@xfarm/ui';
import {
  CheckCircle2,
  XCircle,
  Calendar,
  CreditCard,
  DollarSign,
  Eye,
  User,
  Users,
  Search,
  Plus,
  Ticket,
} from 'lucide-react';
import { apiFetch, ApiError, isAbortError } from '@/lib/api';
import { useAdminUser } from '../../admin-user-context';
import { MoneyInput } from '@/components/ui/money-input';
import type { TourItem } from '../page';
import type { TourSlotItem } from '../[id]/page';

export interface PaymentItem {
  id: string;
  code: string;
  amount: number | string;
  method: PaymentMethod;
  notes?: string | null;
  createdAt: string;
  createdById?: string | null;
}

export interface BookingItem {
  id: string;
  code: string;
  slotId: string;
  customerName: string;
  phone: string;
  email?: string | null;
  adults: number;
  children: number;
  total: number | string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | null;
  notes?: string | null;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  slot: TourSlotItem & {
    tour: TourItem;
  };
  payments: PaymentItem[];
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

function formatVietnamDateTime(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(d);
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Tiền mặt',
  [PaymentMethod.BANK_TRANSFER]: 'Chuyển khoản ngân hàng',
  [PaymentMethod.VNPAY]: 'VNPay',
  [PaymentMethod.COD]: 'Thu tiền khi đến (COD)',
};

export default function AdminBookingsPage() {
  const searchParams = useSearchParams();
  const initialSlotId = searchParams?.get('slotId') || '';

  const user = useAdminUser();
  const canManageBookings =
    user?.role === Role.OWNER || user?.role === Role.MANAGER || user?.role === Role.SALES;
  const canRecordPayment =
    user?.role === Role.OWNER || user?.role === Role.ACCOUNTANT || user?.role === Role.SALES;

  const [bookings, setBookings] = React.useState<BookingItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(15);
  const [isLoading, setIsLoading] = React.useState(true);

  // Filters
  const [search, setSearch] = React.useState('');
  const [tours, setTours] = React.useState<TourItem[]>([]);
  const [selectedTourId, setSelectedTourId] = React.useState<string>('ALL');
  const [slotIdFilter, setSlotIdFilter] = React.useState<string>(initialSlotId);
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = React.useState<string>('ALL');
  const [fromDate, setFromDate] = React.useState<string>('');
  const [toDate, setToDate] = React.useState<string>('');

  // Dialogs
  const [selectedBooking, setSelectedBooking] = React.useState<BookingItem | null>(null);
  const [cancellingBooking, setCancellingBooking] = React.useState<BookingItem | null>(null);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  // Record payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState<number>(0);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(
    PaymentMethod.BANK_TRANSFER,
  );
  const [paymentNotes, setPaymentNotes] = React.useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = React.useState(false);
  const [paymentError, setPaymentError] = React.useState<string | null>(null);

  // Load tours for dropdown
  React.useEffect(() => {
    apiFetch<Paginated<TourItem>>('/tours?pageSize=100')
      .then((res) => setTours(res.data || []))
      .catch(() => setTours([]));
  }, []);

  // Fetch bookings
  const fetchBookings = React.useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });

        if (search.trim()) queryParams.set('search', search.trim());
        if (selectedTourId !== 'ALL') queryParams.set('tourId', selectedTourId);
        if (slotIdFilter) queryParams.set('slotId', slotIdFilter);
        if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);
        if (paymentStatusFilter !== 'ALL') queryParams.set('paymentStatus', paymentStatusFilter);
        if (fromDate) queryParams.set('from', `${fromDate}T00:00:00+07:00`);
        if (toDate) queryParams.set('to', `${toDate}T23:59:59+07:00`);

        const res = await apiFetch<Paginated<BookingItem>>(`/bookings?${queryParams.toString()}`, {
          signal,
        });
        setBookings(res.data || []);
        setTotal(res.total || 0);
      } catch (err) {
        if (!isAbortError(err)) {
          if (!(err instanceof ApiError && err.statusCode === 404)) {
            console.error('Lỗi khi tải danh sách đặt chỗ:', err);
          }
          setBookings([]);
          setTotal(0);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      page,
      pageSize,
      search,
      selectedTourId,
      slotIdFilter,
      statusFilter,
      paymentStatusFilter,
      fromDate,
      toDate,
    ],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchBookings(controller.signal);
    return () => controller.abort();
  }, [fetchBookings]);

  // Reload selected booking detail when changed
  const refreshSelectedBooking = async (bookingId: string) => {
    try {
      const res = await apiFetch<{ data: BookingItem }>(`/bookings/${bookingId}`);
      setSelectedBooking(res.data);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? res.data : b)));
    } catch (err) {
      console.error('Lỗi khi tải lại chi tiết booking:', err);
    }
  };

  // Status actions
  const handleConfirmBooking = async (booking: BookingItem) => {
    setIsActionLoading(true);
    try {
      await apiFetch<{ data: BookingItem }>(`/bookings/${booking.id}/confirm`, {
        method: 'POST',
      });
      await refreshSelectedBooking(booking.id);
      void fetchBookings();
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert('Không thể xác nhận đặt chỗ.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteBooking = async (booking: BookingItem) => {
    setIsActionLoading(true);
    try {
      await apiFetch<{ data: BookingItem }>(`/bookings/${booking.id}/complete`, {
        method: 'POST',
      });
      await refreshSelectedBooking(booking.id);
      void fetchBookings();
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert('Không thể hoàn tất đặt chỗ.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancellingBooking) return;
    setIsCancelling(true);
    try {
      await apiFetch<{ data: BookingItem }>(`/bookings/${cancellingBooking.id}/cancel`, {
        method: 'POST',
      });
      if (selectedBooking?.id === cancellingBooking.id) {
        await refreshSelectedBooking(cancellingBooking.id);
      }
      setCancellingBooking(null);
      void fetchBookings();
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert('Không thể hủy đặt chỗ.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Payment dialog
  const openPaymentDialog = (booking: BookingItem) => {
    const totalPaid = (booking.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const remaining = Math.max(0, Number(booking.total) - totalPaid);

    setPaymentAmount(remaining);
    setPaymentMethod(PaymentMethod.BANK_TRANSFER);
    setPaymentNotes('');
    setPaymentError(null);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setPaymentError(null);

    if (paymentAmount <= 0) {
      setPaymentError('Số tiền thu phải lớn hơn 0');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await apiFetch(`/bookings/${selectedBooking.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: paymentAmount,
          method: paymentMethod,
          notes: paymentNotes || undefined,
        }),
      });

      setPaymentDialogOpen(false);
      await refreshSelectedBooking(selectedBooking.id);
      void fetchBookings();
    } catch (err) {
      if (err instanceof ApiError) {
        setPaymentError(err.message || 'Không thể ghi thu tiền.');
      } else {
        setPaymentError('Đã xảy ra lỗi khi ghi thu tiền.');
      }
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Render Status Badges
  const renderBookingStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.PENDING:
        return (
          <Badge
            variant="outline"
            className="border-warn/30 bg-warn-bg text-warn"
          >
            Chờ xác nhận
          </Badge>
        );
      case BookingStatus.CONFIRMED:
        return (
          <Badge
            variant="outline"
            className="border-info/30 bg-info-bg text-info"
          >
            Đã xác nhận
          </Badge>
        );
      case BookingStatus.COMPLETED:
        return (
          <Badge variant="default" className="bg-ok-bg text-ok border-ok/20">
            Đã hoàn tất
          </Badge>
        );
      case BookingStatus.CANCELLED:
        return <Badge variant="destructive" className="bg-crit-bg text-crit border-crit/20">Đã hủy</Badge>;
      default:
        return <Badge variant="outline" className="border-line text-muted">{status}</Badge>;
    }
  };

  const renderPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.UNPAID:
        return (
          <Badge
            variant="outline"
            className="border-crit/30 bg-crit-bg text-crit"
          >
            Chưa thanh toán
          </Badge>
        );
      case PaymentStatus.PARTIAL:
        return (
          <Badge
            variant="outline"
            className="border-warn/30 bg-warn-bg text-warn"
          >
            Một phần
          </Badge>
        );
      case PaymentStatus.PAID:
        return (
          <Badge variant="default" className="bg-ok-bg text-ok border-ok/20">
            Đã thanh toán đủ
          </Badge>
        );
      default:
        return <Badge variant="outline" className="border-line text-muted">{status}</Badge>;
    }
  };

  const pendingCount = React.useMemo(
    () => bookings.filter((b) => b.status === BookingStatus.PENDING).length,
    [bookings],
  );
  const confirmedCount = React.useMemo(
    () => bookings.filter((b) => b.status === BookingStatus.CONFIRMED).length,
    [bookings],
  );
  const paidCount = React.useMemo(
    () => bookings.filter((b) => b.paymentStatus === PaymentStatus.PAID).length,
    [bookings],
  );

  // Table Columns
  const columns = React.useMemo<ColumnDef<BookingItem>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã đặt chỗ',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <button
              type="button"
              onClick={() => setSelectedBooking(item)}
              className="font-mono text-xs font-bold text-accent hover:underline"
            >
              {item.code}
            </button>
          );
        },
      },
      {
        accessorKey: 'slot',
        header: 'Tour & Suất trải nghiệm',
        cell: ({ row }) => {
          const item = row.original;
          const tourName = item.slot?.tour?.name || 'Tour trải nghiệm';
          const startAt = item.slot?.startAt;
          return (
            <div className="space-y-0.5">
              <span className="font-medium text-fg block">
                {tourName}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted">
                <Calendar className="h-3 w-3" />
                {startAt ? toVietnamDateString(startAt) : ''} lúc{' '}
                {startAt ? formatVietnamTime(startAt) : ''}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'customerName',
        header: 'Khách hàng',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="space-y-0.5">
              <span className="font-medium text-fg block">
                {item.customerName}
              </span>
              <span className="text-xs text-muted block">{item.phone}</span>
            </div>
          );
        },
      },
      {
        id: 'guests',
        header: 'Số khách',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <span className="text-xs text-fg-2">
              <b className="text-fg">{item.adults}</b> người lớn
              {item.children > 0 && (
                <>
                  , <b className="text-fg">{item.children}</b> trẻ em
                </>
              )}
            </span>
          );
        },
      },
      {
        accessorKey: 'total',
        header: 'Tổng tiền',
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-accent">
            {formatMoney(row.original.total)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => renderBookingStatusBadge(row.original.status),
      },
      {
        accessorKey: 'paymentStatus',
        header: 'Thanh toán',
        cell: ({ row }) => renderPaymentStatusBadge(row.original.paymentStatus),
      },
      {
        id: 'actions',
        header: 'Hành động',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedBooking(item)}
              className="h-8 gap-1 px-2.5 text-xs border-line text-fg hover:bg-hover hover:text-accent"
            >
              <Eye className="h-3.5 w-3.5" />
              Chi tiết
            </Button>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Đặt chỗ Tour"
        description="Danh sách và quản lý thông tin đặt chỗ trải nghiệm du lịch nông trại"
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4 shadow-xs text-fg">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-bg text-accent">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Tổng đặt chỗ</p>
            <p className="text-xl font-bold text-fg">{total} lượt</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4 shadow-xs text-fg">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warn-bg text-warn">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Chờ xác nhận</p>
            <p className="text-xl font-bold text-fg">{pendingCount} lượt</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4 shadow-xs text-fg">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info-bg text-info">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Đã xác nhận</p>
            <p className="text-xl font-bold text-fg">{confirmedCount} lượt</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4 shadow-xs text-fg">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ok-bg text-ok">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Đã thanh toán đủ</p>
            <p className="text-xl font-bold text-fg">{paidCount} lượt</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-line bg-surface p-4 shadow-xs text-fg space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search */}
          <div className="space-y-1">
            <Label className="text-xs text-fg-2">Tìm kiếm</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
              <Input
                placeholder="Mã, tên, số ĐT..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>

          {/* Tour filter */}
          <div className="space-y-1">
            <Label className="text-xs text-fg-2">Tour du lịch</Label>
            <Select
              value={selectedTourId}
              onValueChange={(val) => {
                setSelectedTourId(val);
                setSlotIdFilter('');
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Tất cả tour" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả tour</SelectItem>
                {tours.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Booking status filter */}
          <div className="space-y-1">
            <Label className="text-xs text-fg-2">Trạng thái đặt chỗ</Label>
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value={BookingStatus.PENDING}>Chờ xác nhận</SelectItem>
                <SelectItem value={BookingStatus.CONFIRMED}>Đã xác nhận</SelectItem>
                <SelectItem value={BookingStatus.COMPLETED}>Đã hoàn tất</SelectItem>
                <SelectItem value={BookingStatus.CANCELLED}>Đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment status filter */}
          <div className="space-y-1">
            <Label className="text-xs text-fg-2">Trạng thái thanh toán</Label>
            <Select
              value={paymentStatusFilter}
              onValueChange={(val) => {
                setPaymentStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Tất cả thanh toán" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả thanh toán</SelectItem>
                <SelectItem value={PaymentStatus.UNPAID}>Chưa thanh toán</SelectItem>
                <SelectItem value={PaymentStatus.PARTIAL}>Một phần</SelectItem>
                <SelectItem value={PaymentStatus.PAID}>Đã thanh toán đủ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="space-y-1">
            <Label className="text-xs text-fg-2">Khoảng ngày suất</Label>
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="h-9 text-xs p-1.5"
                title="Từ ngày"
              />
              <span className="text-muted text-xs">-</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="h-9 text-xs p-1.5"
                title="Đến ngày"
              />
            </div>
          </div>
        </div>

        {slotIdFilter && (
          <div className="flex items-center justify-between rounded bg-accent-bg px-3 py-1.5 text-xs text-accent border border-accent/20">
            <span>Đang lọc theo một suất trải nghiệm cụ thể</span>
            <button
              type="button"
              onClick={() => {
                setSlotIdFilter('');
                setPage(1);
              }}
              className="font-semibold text-accent underline hover:opacity-80"
            >
              Bỏ lọc suất
            </button>
          </div>
        )}
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={bookings}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
      />

      {/* Detail Dialog */}
      <FormDialog
        open={!!selectedBooking}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
        title={`Chi tiết Đặt chỗ: ${selectedBooking?.code || ''}`}
        description="Thông tin chi tiết suất trải nghiệm, thông tin khách hàng và lịch sử thu tiền."
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        {selectedBooking && (
          <div className="space-y-6 py-2">
            {/* Status Summary & Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-line bg-surface-2 p-4 text-fg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Trạng thái đặt chỗ:</span>
                  {renderBookingStatusBadge(selectedBooking.status)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Trạng thái thanh toán:</span>
                  {renderPaymentStatusBadge(selectedBooking.paymentStatus)}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {canManageBookings && selectedBooking.status === BookingStatus.PENDING && (
                  <Button
                    size="sm"
                    onClick={() => handleConfirmBooking(selectedBooking)}
                    disabled={isActionLoading}
                    className="text-xs gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Xác nhận đặt chỗ
                  </Button>
                )}

                {canManageBookings && selectedBooking.status === BookingStatus.CONFIRMED && (
                  <Button
                    size="sm"
                    onClick={() => handleCompleteBooking(selectedBooking)}
                    disabled={isActionLoading}
                    className="text-xs gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Hoàn tất tham quan
                  </Button>
                )}

                {canRecordPayment && selectedBooking.paymentStatus !== PaymentStatus.PAID && (
                  <Button
                    size="sm"
                    onClick={() => openPaymentDialog(selectedBooking)}
                    className="text-xs gap-1.5"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    Ghi thu tiền
                  </Button>
                )}

                {canManageBookings &&
                  selectedBooking.status !== BookingStatus.CANCELLED &&
                  selectedBooking.status !== BookingStatus.COMPLETED && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCancellingBooking(selectedBooking)}
                      disabled={isActionLoading}
                      className="border-crit/30 text-crit hover:bg-crit-bg text-xs gap-1.5"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Hủy đặt chỗ
                    </Button>
                  )}
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Tour info */}
              <div className="space-y-3 rounded-lg border border-line p-4 bg-surface text-fg">
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                  <Calendar className="h-3.5 w-3.5" />
                  Thông tin tour & Suất trải nghiệm
                </h4>
                <div className="space-y-1.5 text-xs text-fg-2">
                  <div>
                    <span className="text-muted">Tour:</span>{' '}
                    <span className="font-semibold text-fg">
                      {selectedBooking.slot?.tour?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">Thời gian bắt đầu:</span>{' '}
                    <span className="font-semibold text-fg">
                      {formatVietnamDateTime(selectedBooking.slot?.startAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">Thời lượng:</span>{' '}
                    <span>{selectedBooking.slot?.tour?.durationMinutes} phút</span>
                  </div>
                </div>
              </div>

              {/* Customer info */}
              <div className="space-y-3 rounded-lg border border-line p-4 bg-surface text-fg">
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                  <User className="h-3.5 w-3.5" />
                  Thông tin khách hàng
                </h4>
                <div className="space-y-1.5 text-xs text-fg-2">
                  <div>
                    <span className="text-muted">Họ và tên:</span>{' '}
                    <span className="font-semibold text-fg">
                      {selectedBooking.customerName}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">Số điện thoại:</span>{' '}
                    <span className="font-mono text-fg">{selectedBooking.phone}</span>
                  </div>
                  {selectedBooking.email && (
                    <div>
                      <span className="text-muted">Email:</span>{' '}
                      <span>{selectedBooking.email}</span>
                    </div>
                  )}
                  {selectedBooking.notes && (
                    <div className="border-t border-line/60 pt-1.5 mt-1.5">
                      <span className="text-muted">Ghi chú:</span>{' '}
                      <span className="italic">{selectedBooking.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Financial & Guest summary */}
            <div className="rounded-lg border border-line p-4 bg-surface text-fg">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted mb-3">
                <Users className="h-3.5 w-3.5" />
                Số lượng khách & Chi phí
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="rounded-md bg-surface-2 p-3 border border-line">
                  <span className="text-xs text-muted block">Số người lớn</span>
                  <span className="text-lg font-bold text-fg">
                    {selectedBooking.adults}
                  </span>
                </div>
                <div className="rounded-md bg-surface-2 p-3 border border-line">
                  <span className="text-xs text-muted block">Số trẻ em</span>
                  <span className="text-lg font-bold text-fg">
                    {selectedBooking.children}
                  </span>
                </div>
                <div className="rounded-md bg-surface-2 p-3 border border-line">
                  <span className="text-xs text-muted block">Tổng tiền</span>
                  <span className="text-lg font-bold text-accent">
                    {formatMoney(selectedBooking.total)}
                  </span>
                </div>
                <div className="rounded-md bg-surface-2 p-3 border border-line">
                  <span className="text-xs text-muted block">Còn lại cần thu</span>
                  {(() => {
                    const paid = (selectedBooking.payments || []).reduce(
                      (s, p) => s + (Number(p.amount) || 0),
                      0,
                    );
                    const remaining = Math.max(0, Number(selectedBooking.total) - paid);
                    return (
                      <span
                        className={`text-lg font-bold ${
                          remaining > 0 ? 'text-warn' : 'text-ok'
                        }`}
                      >
                        {formatMoney(remaining)}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Payment history */}
            <div className="space-y-3 rounded-lg border border-line p-4 bg-surface text-fg">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                  <CreditCard className="h-3.5 w-3.5" />
                  Lịch sử thanh toán ({selectedBooking.payments?.length || 0})
                </h4>
                {canRecordPayment && selectedBooking.paymentStatus !== PaymentStatus.PAID && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openPaymentDialog(selectedBooking)}
                    className="h-7 text-xs gap-1 border-accent/30 text-accent hover:bg-accent-bg"
                  >
                    <Plus className="h-3 w-3" />
                    Thêm khoản thu
                  </Button>
                )}
              </div>

              {selectedBooking.payments && selectedBooking.payments.length > 0 ? (
                <div className="divide-y divide-line/60 overflow-hidden rounded-md border border-line text-xs">
                  <div className="grid grid-cols-4 bg-surface-2 p-2 font-semibold text-fg-2">
                    <span>Mã thanh toán</span>
                    <span>Số tiền</span>
                    <span>Phương thức</span>
                    <span>Thời gian</span>
                  </div>
                  {selectedBooking.payments.map((p) => (
                    <div
                      key={p.id}
                      className="grid grid-cols-4 p-2 items-center text-fg hover:bg-hover/30"
                    >
                      <span className="font-mono font-medium text-accent">
                        {p.code}
                      </span>
                      <span className="font-semibold text-fg">
                        {formatMoney(p.amount)}
                      </span>
                      <span>{PAYMENT_METHOD_LABELS[p.method] || p.method}</span>
                      <span className="text-muted">{formatVietnamDateTime(p.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-xs text-muted italic">
                  Chưa có giao dịch thu tiền nào cho đặt chỗ này.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-line">
              <Button type="button" variant="outline" onClick={() => setSelectedBooking(null)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </FormDialog>

      {/* Record Payment Dialog */}
      <FormDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        title="Ghi Nhận Thu Tiền Đặt Chỗ"
        description={
          selectedBooking
            ? `Thu tiền cho đặt chỗ ${selectedBooking.code} - ${selectedBooking.customerName}`
            : ''
        }
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4 py-2">
          {paymentError && (
            <div className="rounded-md border border-crit/20 bg-crit-bg p-3 text-xs text-crit">
              {paymentError}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="pay-amount">
              Số tiền thu <span className="text-crit">*</span>
            </Label>
            <MoneyInput
              id="pay-amount"
              value={paymentAmount}
              onChange={(val) => setPaymentAmount(val)}
              placeholder="0"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="pay-method">
              Hình thức thanh toán <span className="text-crit">*</span>
            </Label>
            <Select
              value={paymentMethod}
              onValueChange={(val: PaymentMethod) => setPaymentMethod(val)}
            >
              <SelectTrigger id="pay-method" className="h-9 text-xs">
                <SelectValue placeholder="Chọn hình thức" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PaymentMethod.BANK_TRANSFER}>Chuyển khoản ngân hàng</SelectItem>
                <SelectItem value={PaymentMethod.CASH}>Tiền mặt</SelectItem>
                <SelectItem value={PaymentMethod.VNPAY}>VNPay</SelectItem>
                <SelectItem value={PaymentMethod.COD}>Thu tiền khi đến (COD)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="pay-notes">Ghi chú giao dịch</Label>
            <Input
              id="pay-notes"
              placeholder="Ví dụ: Khách CK qua Vietcombank"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-line">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={isSubmittingPayment}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingPayment}
            >
              {isSubmittingPayment ? 'Đang xử lý...' : 'Xác nhận thu tiền'}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Confirm Cancel Dialog */}
      <ConfirmDialog
        open={!!cancellingBooking}
        onOpenChange={(open) => !open && setCancellingBooking(null)}
        title="Xác nhận hủy đặt chỗ"
        description={`Bạn có chắc muốn hủy đặt chỗ ${cancellingBooking?.code} của khách hàng ${cancellingBooking?.customerName}? Suất trải nghiệm sẽ được hoàn trả số chỗ trống.`}
        confirmText="Hủy đặt chỗ"
        isDanger
        isLoading={isCancelling}
        onConfirm={handleCancelBooking}
      />
    </div>
  );
}
