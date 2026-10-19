'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, AlertCircle, Check, Loader2, Sparkles } from 'lucide-react';
import {
  formatCurrency,
  type PublicTour,
  type PublicTourSlot,
  createPublicBooking,
  API_BASE_URL,
} from '@/lib/public-api';

interface BookingSectionProps {
  tour: PublicTour;
  initialSlots: PublicTourSlot[];
}

function getLocalDateKey(isoDateString: string): string {
  const d = new Date(isoDateString);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d); // "YYYY-MM-DD"
}

function getLocalTimeString(isoDateString: string): string {
  const d = new Date(isoDateString);
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function getLocalDateDisplay(isoDateString: string): string {
  const d = new Date(isoDateString);
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function BookingSection({ tour, initialSlots }: BookingSectionProps) {
  const router = useRouter();
  const [slots, setSlots] = React.useState<PublicTourSlot[]>(initialSlots);
  const [selectedDate, setSelectedDate] = React.useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = React.useState<string>('');
  const [adults, setAdults] = React.useState<number>(1);
  const [children, setChildren] = React.useState<number>(0);

  // Form customer info
  const [customerName, setCustomerName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<'BANK_TRANSFER' | 'CASH'>(
    'BANK_TRANSFER',
  );
  const [notes, setNotes] = React.useState('');

  // Statuses
  const [submitting, setSubmitting] = React.useState(false);
  const [refreshingSlots, setRefreshingSlots] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Group slots by date key "YYYY-MM-DD"
  const slotsByDate = React.useMemo(() => {
    const map = new Map<string, PublicTourSlot[]>();
    for (const slot of slots) {
      const dateKey = getLocalDateKey(slot.startAt);
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(slot);
    }
    // Sort slots within date by startAt
    for (const [, list] of map.entries()) {
      list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return map;
  }, [slots]);

  // Unique sorted date keys
  const dateKeys = React.useMemo(() => {
    return Array.from(slotsByDate.keys()).sort();
  }, [slotsByDate]);

  // Dates with at least one available slot
  const availableDates = React.useMemo(() => {
    return dateKeys.filter((dKey) => {
      const daySlots = slotsByDate.get(dKey) || [];
      return daySlots.some((s) => s.remaining > 0);
    });
  }, [dateKeys, slotsByDate]);

  // Auto-select first date with available slot if not selected or current date has no available slots
  React.useEffect(() => {
    if (availableDates.length > 0 && (!selectedDate || !availableDates.includes(selectedDate))) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  // Slots for currently selected date
  const slotsForSelectedDate = React.useMemo(() => {
    if (!selectedDate) return [];
    return slotsByDate.get(selectedDate) || [];
  }, [selectedDate, slotsByDate]);

  // Auto-select first available slot for the date
  React.useEffect(() => {
    if (slotsForSelectedDate.length > 0) {
      const currentValid = slotsForSelectedDate.find(
        (s) => s.id === selectedSlotId && s.remaining > 0,
      );
      if (!currentValid) {
        const firstAvailable = slotsForSelectedDate.find((s) => s.remaining > 0);
        setSelectedSlotId(firstAvailable ? firstAvailable.id : '');
      }
    } else {
      setSelectedSlotId('');
    }
  }, [slotsForSelectedDate, selectedSlotId]);

  // Selected slot object
  const selectedSlot = React.useMemo(() => {
    return slots.find((s) => s.id === selectedSlotId) || null;
  }, [slots, selectedSlotId]);

  const maxAvailable = selectedSlot ? selectedSlot.remaining : 0;
  const totalGuests = adults + children;

  // Ensure total guests don't exceed maxAvailable
  React.useEffect(() => {
    if (maxAvailable > 0 && totalGuests > maxAvailable) {
      // Adjust adults and children
      if (adults > maxAvailable) {
        setAdults(Math.max(1, maxAvailable));
        setChildren(0);
      } else {
        setChildren(Math.max(0, maxAvailable - adults));
      }
    }
  }, [maxAvailable, totalGuests, adults]);

  // Temporary calculated total
  const estimatedTotal = React.useMemo(() => {
    const adultCost = adults * (tour.priceAdult || 0);
    const childCost = children * (tour.priceChild || 0);
    return adultCost + childCost;
  }, [adults, children, tour.priceAdult, tour.priceChild]);

  // Refresh slots from API
  const reloadSlots = React.useCallback(async () => {
    setRefreshingSlots(true);
    try {
      const res = await fetch(`${API_BASE_URL}/public/tours/${encodeURIComponent(tour.slug)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const body = await res.json();
        const freshTour = body?.data ?? body;
        if (freshTour && Array.isArray(freshTour.slots)) {
          const mapped = freshTour.slots.map(
            (s: {
              remaining?: number;
              capacity: number;
              bookedCount?: number;
              [key: string]: unknown;
            }) => ({
              ...s,
              remaining: s.remaining ?? Math.max(0, s.capacity - (s.bookedCount ?? 0)),
            }),
          ) as PublicTourSlot[];
          setSlots(mapped);
        }
      }
    } catch {
      // ignore
    } finally {
      setRefreshingSlots(false);
    }
  }, [tour.slug]);

  // Submit booking
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedSlotId || !selectedSlot) {
      setErrorMessage('Vui lòng chọn ngày và giờ trải nghiệm còn chỗ.');
      return;
    }

    if (totalGuests <= 0) {
      setErrorMessage('Vui lòng chọn ít nhất 1 khách.');
      return;
    }

    if (totalGuests > maxAvailable) {
      setErrorMessage(
        `Số khách (${totalGuests}) vượt quá số chỗ còn lại của khung giờ (${maxAvailable} chỗ).`,
      );
      return;
    }

    const trimmedName = customerName.trim();
    if (!trimmedName) {
      setErrorMessage('Vui lòng nhập họ và tên của bạn.');
      return;
    }

    const trimmedPhone = phone.trim();
    if (!trimmedPhone || !/(^(03|05|07|08|09)\d{8}$)|(^\+84(3|5|7|8|9)\d{8}$)/.test(trimmedPhone)) {
      setErrorMessage('Số điện thoại không hợp lệ (ví dụ: 0901234567 hoặc +84901234567).');
      return;
    }

    setSubmitting(true);
    try {
      const booking = await createPublicBooking({
        slotId: selectedSlotId,
        customerName: trimmedName,
        phone: trimmedPhone,
        email: email.trim() || undefined,
        adults,
        children: children > 0 ? children : 0,
        notes: notes.trim() || undefined,
        paymentMethod,
      });

      // Redirect to booking success page
      router.push(`/tour/dat-cho-thanh-cong/${encodeURIComponent(booking.code)}`);
    } catch (err: unknown) {
      const anyErr = err as { statusCode?: number; message?: string };
      if (anyErr?.statusCode === 422) {
        setErrorMessage(
          anyErr.message ||
            'Khung giờ này vừa hết chỗ hoặc không đủ số lượng vé yêu cầu. Hệ thống đang tải lại danh sách suất trải nghiệm...',
        );
        // Reload slots immediately
        await reloadSlots();
      } else {
        setErrorMessage(anyErr?.message || 'Có lỗi xảy ra khi đặt chỗ. Vui lòng thử lại sau.');
      }
      setSubmitting(false);
    }
  };

  return (
    <section
      id="dat-cho"
      aria-labelledby="booking-heading"
      className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-8 lg:p-10 space-y-8"
    >
      <div className="border-b border-slate-100 pb-5 flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Đặt vé trực tuyến
          </span>
          <h2
            id="booking-heading"
            className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2"
          >
            Chọn Ngày & Đặt Chỗ
          </h2>
        </div>
        {refreshingSlots && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            <span>Đang cập nhật chỗ...</span>
          </span>
        )}
      </div>

      {slots.length === 0 ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 text-center space-y-2">
          <Calendar className="w-8 h-8 text-amber-700 mx-auto" aria-hidden="true" />
          <h3 className="font-bold text-amber-900 text-base">Hiện chưa có lịch khởi hành</h3>
          <p className="text-sm text-amber-800">
            Các suất trải nghiệm cho tour này đang được sắp xếp. Vui lòng liên hệ hotline nông trại
            để được hỗ trợ!
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 1. LỊCH CHỌN NGÀY (chỉ ngày có slot còn chỗ) */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>1. Chọn ngày trải nghiệm:</span>
            </label>
            <p className="text-xs text-slate-700">
              Chỉ các ngày có suất trải nghiệm còn chỗ mới có thể lựa chọn.
            </p>

            <div
              data-testid="date-picker-list"
              className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200"
            >
              {dateKeys.map((dateKey) => {
                const sampleSlot = slotsByDate.get(dateKey)?.[0];
                const daySlots = slotsByDate.get(dateKey) || [];
                const isAvailable = daySlots.some((s) => s.remaining > 0);
                const isSelected = selectedDate === dateKey;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    data-testid={`date-option-${dateKey}`}
                    disabled={!isAvailable}
                    onClick={() => {
                      if (isAvailable) {
                        setSelectedDate(dateKey);
                        setErrorMessage(null);
                      }
                    }}
                    className={`shrink-0 flex flex-col items-center justify-center px-4 py-3 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                        : isAvailable
                          ? 'border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/40 text-slate-800 cursor-pointer'
                          : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {sampleSlot ? getLocalDateDisplay(sampleSlot.startAt).split(',')[0] : dateKey}
                    </span>
                    <span className="text-base sm:text-lg font-extrabold mt-0.5">
                      {dateKey.split('-').reverse().slice(0, 2).join('/')}
                    </span>
                    <span className="text-[11px] mt-1 font-medium">
                      {isAvailable ? 'Còn chỗ' : 'Hết chỗ'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. CHỌN GIỜ (hiện số chỗ còn, slot đầy không chọn được) */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>2. Chọn khung giờ khởi hành:</span>
            </label>

            {slotsForSelectedDate.length === 0 ? (
              <p className="text-sm text-slate-700 italic">Vui lòng chọn ngày trước.</p>
            ) : (
              <div
                data-testid="time-slot-list"
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
              >
                {slotsForSelectedDate.map((slot) => {
                  const isFull = slot.remaining <= 0;
                  const isSelected = selectedSlotId === slot.id;
                  const timeDisplay = getLocalTimeString(slot.startAt);

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      data-testid={`slot-option-${slot.id}`}
                      disabled={isFull}
                      onClick={() => {
                        if (!isFull) {
                          setSelectedSlotId(slot.id);
                          setErrorMessage(null);
                        }
                      }}
                      className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 font-bold'
                          : isFull
                            ? 'border-slate-200 bg-slate-100/80 text-slate-700 cursor-not-allowed opacity-60'
                            : 'border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/30 text-slate-800 cursor-pointer'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-base font-extrabold">{timeDisplay}</span>
                        <span className="text-xs text-slate-700 mt-0.5">
                          {isFull ? (
                            <span className="text-rose-600 font-semibold">Hết chỗ</span>
                          ) : (
                            <span>Còn {slot.remaining} chỗ</span>
                          )}
                        </span>
                      </div>

                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. SỐ NGƯỜI LỚN & TRẺ EM (không vượt số chỗ còn) */}
          <div className="space-y-4 bg-slate-50/80 rounded-2xl p-5 sm:p-6 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                <span>3. Số lượng khách:</span>
              </label>
              {selectedSlot && (
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-full">
                  Khung giờ này còn: {maxAvailable} chỗ
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Người lớn */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">Người lớn</div>
                  <div className="text-xs text-emerald-700 font-semibold mt-0.5">
                    {formatCurrency(tour.priceAdult)} / vé
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    data-testid="decrease-adults-button"
                    disabled={adults <= 1}
                    onClick={() => setAdults((prev) => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold flex items-center justify-center transition-colors"
                    aria-label="Giảm người lớn"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    data-testid="adults-input"
                    aria-label="Số người lớn"
                    min={1}
                    max={Math.max(1, maxAvailable - children)}
                    value={adults}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1;
                      const clamped = Math.max(
                        1,
                        Math.min(val, Math.max(1, maxAvailable - children)),
                      );
                      setAdults(clamped);
                    }}
                    className="w-12 text-center font-bold text-base text-slate-900 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    data-testid="increase-adults-button"
                    disabled={totalGuests >= maxAvailable}
                    onClick={() => {
                      if (totalGuests < maxAvailable) {
                        setAdults((prev) => prev + 1);
                      }
                    }}
                    className="w-8 h-8 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold flex items-center justify-center transition-colors"
                    aria-label="Tăng người lớn"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Trẻ em */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">Trẻ em</div>
                  <div className="text-xs text-emerald-700 font-semibold mt-0.5">
                    {formatCurrency(tour.priceChild)} / vé
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    data-testid="decrease-children-button"
                    disabled={children <= 0}
                    onClick={() => setChildren((prev) => Math.max(0, prev - 1))}
                    className="w-8 h-8 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold flex items-center justify-center transition-colors"
                    aria-label="Giảm trẻ em"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    data-testid="children-input"
                    aria-label="Số trẻ em"
                    min={0}
                    max={Math.max(0, maxAvailable - adults)}
                    value={children}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      const nonNeg = isNaN(val) ? 0 : Math.max(0, val);
                      const clamped = Math.min(nonNeg, Math.max(0, maxAvailable - adults));
                      setChildren(clamped);
                    }}
                    className="w-12 text-center font-bold text-base text-slate-900 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    data-testid="increase-children-button"
                    disabled={totalGuests >= maxAvailable}
                    onClick={() => {
                      if (totalGuests < maxAvailable) {
                        setChildren((prev) => prev + 1);
                      }
                    }}
                    className="w-8 h-8 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold flex items-center justify-center transition-colors"
                    aria-label="Tăng trẻ em"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* 4. TỔNG TIỀN TẠM TÍNH */}
            <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-sm text-slate-700 font-medium">
                Tổng tiền tạm tính ({adults} người lớn, {children} trẻ em):
              </span>
              <span
                data-testid="estimated-total"
                className="text-xl sm:text-2xl font-black text-emerald-800"
              >
                {formatCurrency(estimatedTotal)}
              </span>
            </div>
          </div>

          {/* 5. FORM THÔNG TIN KHÁCH HÀNG */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              4. Thông tin người đặt chỗ:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="customerName"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Họ và tên *
                </label>
                <input
                  id="customerName"
                  data-testid="customer-name-input"
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại *
                </label>
                <input
                  id="phone"
                  data-testid="phone-input"
                  type="tel"
                  required
                  placeholder="Ví dụ: 0901234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Email (tùy chọn - nhận mã xác nhận)
                </label>
                <input
                  id="email"
                  data-testid="email-input"
                  type="email"
                  placeholder="ten@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="paymentMethod"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Phương thức thanh toán
                </label>
                <select
                  id="paymentMethod"
                  data-testid="payment-method-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'BANK_TRANSFER' | 'CASH')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-slate-900 bg-white"
                >
                  <option value="BANK_TRANSFER">Chuyển khoản VietQR</option>
                  <option value="CASH">Tiền mặt tại nông trại</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="notes" className="block text-xs font-semibold text-slate-700 mb-1">
                  Yêu cầu đặc biệt hoặc ghi chú (tùy chọn)
                </label>
                <textarea
                  id="notes"
                  data-testid="notes-input"
                  rows={2}
                  placeholder="Ví dụ: Có xe đẩy em bé, chế độ ăn chay..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* ERROR ALERT */}
          {errorMessage && (
            <div
              data-testid="booking-error-alert"
              className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 text-rose-800 text-sm"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <strong className="font-bold">Lỗi đặt chỗ: </strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              type="submit"
              data-testid="submit-booking-button"
              disabled={submitting || !selectedSlotId || maxAvailable <= 0}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-base sm:text-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang xử lý đặt chỗ...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-emerald-200" />
                  <span>Xác Nhận Đặt Chỗ ({formatCurrency(estimatedTotal)})</span>
                </>
              )}
            </button>
            <p className="text-center text-xs text-slate-700 mt-2.5">
              Sau khi đặt chỗ thành công, bạn sẽ nhận được mã đặt vé để tra cứu và thanh toán.
            </p>
          </div>
        </form>
      )}
    </section>
  );
}
