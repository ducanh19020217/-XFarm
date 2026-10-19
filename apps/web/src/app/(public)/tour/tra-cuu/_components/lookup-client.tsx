'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import {
  Search,
  Compass,
  Calendar,
  Clock,
  Users,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  CreditCard,
  QrCode as QrIcon,
  ShieldCheck,
} from 'lucide-react';
import {
  formatCurrency,
  lookupPublicBooking,
  type PublicBookingView,
} from '@/lib/public-api';

export function LookupClient() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const initialPhone = searchParams.get('phone') || '';

  const [code, setCode] = React.useState(initialCode);
  const [phone, setPhone] = React.useState(initialPhone);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [booking, setBooking] = React.useState<PublicBookingView | null>(null);
  const [searched, setSearched] = React.useState(false);

  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('');

  const copyToClipboard = (text: string, fieldKey: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleLookup = React.useCallback(
    async (codeToLookup: string, phoneToLookup: string) => {
      const trimmedCode = codeToLookup.trim();
      const trimmedPhone = phoneToLookup.trim();

      if (!trimmedCode) {
        setError('Vui lòng nhập mã đặt chỗ (ví dụ: BK-2026-0001).');
        return;
      }
      if (!trimmedPhone) {
        setError('Vui lòng nhập số điện thoại đã dùng để đặt vé.');
        return;
      }

      setLoading(true);
      setError(null);
      setSearched(true);
      try {
        const result = await lookupPublicBooking(trimmedCode, trimmedPhone);
        setBooking(result);
      } catch (err: unknown) {
        setBooking(null);
        const anyErr = err as { message?: string };
        setError(anyErr?.message || 'Không tìm thấy đặt chỗ phù hợp với mã và số điện thoại đã nhập.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Auto trigger lookup if both code and phone are provided in query params
  React.useEffect(() => {
    if (initialCode && initialPhone) {
      void handleLookup(initialCode, initialPhone);
    }
  }, [initialCode, initialPhone, handleLookup]);

  const bankTransfer = booking?.bankTransfer;
  const bankId = bankTransfer?.bankId || 'VCB';
  const accountNo = bankTransfer?.accountNo || '0123456789';
  const accountName = bankTransfer?.accountName || 'XFARM';
  const amountStr = bankTransfer?.amount || (booking?.total ? String(booking.total) : '0');
  const addInfo = bankTransfer?.addInfo || booking?.code || '';

  const vietQrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amountStr}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accountName)}`;

  React.useEffect(() => {
    if (!booking) return;
    const qrPayload = `VIETQR:${bankId}:${accountNo}:${amountStr}:${addInfo}`;
    QRCode.toDataURL(qrPayload, {
      width: 240,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [booking, bankId, accountNo, amountStr, addInfo]);

  const formattedStartAt = booking?.startAt
    ? new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(booking.startAt))
    : '';

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Search Box Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-10 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Cổng tra cứu công khai
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Tra Cứu Lịch Trình Đặt Chỗ
          </h1>
          <p className="text-sm text-slate-600">
            Nhập mã đặt chỗ (BK-...) và số điện thoại đăng ký để kiểm tra trạng thái vé và thông tin thanh toán.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleLookup(code, phone);
          }}
          className="space-y-4 max-w-2xl mx-auto"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="lookup-code" className="block text-xs font-semibold text-slate-700 mb-1">
                Mã đặt chỗ *
              </label>
              <input
                id="lookup-code"
                data-testid="lookup-code-input"
                type="text"
                required
                placeholder="Ví dụ: BK-2026-0001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-mono text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="lookup-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Số điện thoại *
              </label>
              <input
                id="lookup-phone"
                data-testid="lookup-phone-input"
                type="tel"
                required
                placeholder="Ví dụ: 0901234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-slate-900"
              />
            </div>
          </div>

          {error && (
            <div
              data-testid="lookup-error"
              className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 text-rose-800 text-sm"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            data-testid="lookup-submit-button"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-base shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang tra cứu...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>Tra Cứu Ngay</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Search Result Display */}
      {booking && (
        <div
          data-testid="lookup-result-section"
          className="space-y-8 animate-in fade-in duration-300"
        >
          {/* Main Booking Info */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs text-slate-700 font-semibold uppercase tracking-wider block">
                  Kết quả đặt chỗ
                </span>
                <span
                  data-testid="lookup-result-code"
                  className="text-2xl font-black text-slate-900 font-mono tracking-wider"
                >
                  {booking.code}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  data-testid="lookup-result-status"
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    booking.status === 'CONFIRMED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : booking.status === 'CANCELLED'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : booking.status === 'COMPLETED'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {booking.status}
                </span>

                <span
                  data-testid="lookup-result-payment-status"
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    booking.paymentStatus === 'PAID'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {booking.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-slate-700 font-semibold uppercase tracking-wider">
                  Tour trải nghiệm
                </span>
                <div
                  data-testid="lookup-result-tour"
                  className="text-base font-bold text-slate-900"
                >
                  {booking.tourName}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-700 font-semibold uppercase tracking-wider">
                  Thời gian khởi hành
                </span>
                <div
                  data-testid="lookup-result-start-at"
                  className="text-base font-bold text-slate-900 flex items-center gap-1.5"
                >
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span>{formattedStartAt}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-700 font-semibold uppercase tracking-wider">
                  Số lượng khách
                </span>
                <div
                  data-testid="lookup-result-guests"
                  className="text-base font-bold text-slate-900 flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span>
                    {booking.adults} người lớn
                    {booking.children > 0 ? `, ${booking.children} trẻ em` : ''}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-700 font-semibold uppercase tracking-wider">
                  Tổng tiền
                </span>
                <div
                  data-testid="lookup-result-total"
                  className="text-xl sm:text-2xl font-black text-emerald-800"
                >
                  {formatCurrency(booking.total)}
                </div>
              </div>

              {booking.customerName && (
                <div className="space-y-1 sm:col-span-2 border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-700 font-semibold uppercase tracking-wider">
                    Thông tin liên hệ
                  </span>
                  <div className="text-sm font-semibold text-slate-900">
                    {booking.customerName} {booking.phone ? `• ${booking.phone}` : ''}{' '}
                    {booking.email ? `• ${booking.email}` : ''}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Card if still UNPAID and transfer details are available */}
          {booking.paymentStatus !== 'PAID' && (
            <div className="bg-white rounded-3xl border border-emerald-200/90 shadow-md p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Thông Tin Thanh Toán VietQR
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                  <div className="w-48 h-48 bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
                    <img
                      src={vietQrUrl}
                      alt="VietQR code"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        if (qrDataUrl) {
                          (e.target as HTMLImageElement).src = qrDataUrl;
                        }
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-700 mt-2 font-medium flex items-center gap-1">
                    <QrIcon className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Quét mã VietQR chuyển khoản</span>
                  </span>
                </div>

                <div className="md:col-span-7 space-y-3 text-sm">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-xs text-slate-700 font-semibold block">Ngân hàng</span>
                      <span className="font-extrabold text-slate-900">{bankId}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-xs text-slate-700 font-semibold block">Số tài khoản</span>
                      <span className="font-extrabold text-slate-900 font-mono text-base">
                        {accountNo}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(accountNo, 'accountNo')}
                      className="text-xs text-emerald-700 font-semibold flex items-center gap-1"
                    >
                      {copiedField === 'accountNo' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'accountNo' ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-xs text-slate-700 font-semibold block">Chủ tài khoản</span>
                      <span className="font-extrabold text-slate-900 uppercase">{accountName}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/80 border border-amber-200">
                    <div>
                      <span className="text-xs text-amber-900 font-semibold block">Nội dung chuyển khoản</span>
                      <span className="font-black text-slate-950 font-mono text-base">{addInfo}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(addInfo, 'addInfo')}
                      className="text-xs text-amber-800 font-bold flex items-center gap-1"
                    >
                      {copiedField === 'addInfo' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'addInfo' ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
