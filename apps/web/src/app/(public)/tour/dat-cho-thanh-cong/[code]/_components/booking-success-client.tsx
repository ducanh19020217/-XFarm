'use client';

import * as React from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  CheckCircle2,
  Copy,
  Check,
  Calendar,
  Clock,
  Users,
  Compass,
  ArrowRight,
  Search,
  Building,
  CreditCard,
  QrCode as QrIcon,
} from 'lucide-react';
import { formatCurrency, type PublicBookingView } from '@/lib/public-api';

interface BookingSuccessClientProps {
  initialBooking: PublicBookingView | null;
  code: string;
}

export function BookingSuccessClient({ initialBooking, code }: BookingSuccessClientProps) {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('');

  const booking = initialBooking;

  const copyToClipboard = (text: string, fieldKey: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const bankTransfer = booking?.bankTransfer;
  const bankId = bankTransfer?.bankId || 'VCB';
  const accountNo = bankTransfer?.accountNo || '0123456789';
  const accountName = bankTransfer?.accountName || 'XFARM';
  const amountStr = bankTransfer?.amount || (booking?.total ? String(booking.total) : '0');
  const addInfo = bankTransfer?.addInfo || code;

  // VietQR quick link image
  const vietQrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amountStr}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accountName)}`;

  // Generate fallback QR via qrcode library
  React.useEffect(() => {
    const qrPayload = `VIETQR:${bankId}:${accountNo}:${amountStr}:${addInfo}`;
    QRCode.toDataURL(qrPayload, {
      width: 260,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [bankId, accountNo, amountStr, addInfo]);

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
    : 'Theo xác nhận đặt chỗ';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Top Banner: Success Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-10 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" aria-hidden="true" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Đặt chỗ thành công
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mt-2">
            XFarm Đã Nhận Đặt Chỗ Của Bạn!
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
            Cảm ơn bạn đã lựa chọn tour trải nghiệm nông trại sinh thái. Vui lòng lưu lại mã booking
            dưới đây để tiện tra cứu và check-in tại quầy đón tiếp.
          </p>
        </div>

        {/* Highlighted Booking Code */}
        <div className="pt-2">
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900 text-white shadow-sm">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Mã booking:
            </span>
            <span
              data-testid="booking-code"
              className="text-xl sm:text-2xl font-black tracking-widest text-emerald-400"
            >
              {code}
            </span>
            <button
              type="button"
              data-testid="copy-booking-code-button"
              onClick={() => copyToClipboard(code, 'bookingCode')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Sao chép mã"
              aria-label="Sao chép mã booking"
            >
              {copiedField === 'bookingCode' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Booking Details Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-8 space-y-6">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Compass className="w-5 h-5 text-emerald-600" aria-hidden="true" />
          <span>Thông Tin Chuyến Đi</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div className="space-y-1">
            <span className="text-xs text-slate-700 font-semibold uppercase tracking-wider">
              Tour trải nghiệm
            </span>
            <div data-testid="booking-tour-name" className="text-base font-bold text-slate-900">
              {booking?.tourName || 'Tour trải nghiệm sinh thái'}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-700 font-semibold uppercase tracking-wider">
              Thời gian khởi hành
            </span>
            <div data-testid="booking-start-at" className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>{formattedStartAt}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-700 font-semibold uppercase tracking-wider">
              Số lượng khách
            </span>
            <div data-testid="booking-guests" className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>
                {booking?.adults ?? 1} người lớn
                {(booking?.children ?? 0) > 0 ? `, ${booking?.children} trẻ em` : ''}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-700 font-semibold uppercase tracking-wider">
              Tổng tiền thanh toán
            </span>
            <div
              data-testid="booking-total"
              className="text-xl sm:text-2xl font-black text-emerald-800"
            >
              {formatCurrency(booking?.total)}
            </div>
          </div>

          {booking?.customerName && (
            <div className="space-y-1">
              <span className="text-xs text-slate-700 font-semibold uppercase tracking-wider">
                Người đặt
              </span>
              <div className="text-base font-semibold text-slate-900">
                {booking.customerName} {booking.phone ? `(${booking.phone})` : ''}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <span className="text-xs text-slate-700 font-semibold uppercase tracking-wider">
              Trạng thái đặt chỗ
            </span>
            <div>
              <span
                data-testid="booking-status-badge"
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800"
              >
                {booking?.status || 'PENDING'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* VietQR Bank Transfer Card (nếu chuyển khoản hoặc có thông tin ngân hàng) */}
      <div
        data-testid="vietqr-transfer-section"
        className="bg-white rounded-3xl border border-emerald-200/90 shadow-md p-6 sm:p-8 space-y-6 overflow-hidden relative"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Thanh Toán Chuyển Khoản Qua VietQR
              </h3>
              <p className="text-xs text-slate-700">Quét mã bằng ứng dụng ngân hàng bất kỳ để tự động điền số tiền và nội dung</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
            Nhanh chóng & An toàn
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* QR Image Column */}
          <div className="md:col-span-5 flex flex-col items-center justify-center text-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="relative w-56 h-56 bg-white p-2 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex items-center justify-center">
              {/* Try image from VietQR first */}
              <img
                data-testid="vietqr-image"
                src={vietQrUrl}
                alt="Mã QR thanh toán VietQR"
                className="w-full h-full object-contain"
                onError={(e) => {
                  // If external VietQR image fails to load, fallback to local QR
                  if (qrDataUrl) {
                    (e.target as HTMLImageElement).src = qrDataUrl;
                  }
                }}
              />
            </div>
            <span className="text-xs text-slate-700 mt-2 font-medium flex items-center gap-1">
              <QrIcon className="w-3.5 h-3.5 text-emerald-700" />
              <span>Quét mã VietQR 24/7</span>
            </span>
          </div>

          {/* Account Details Column */}
          <div className="md:col-span-7 space-y-3.5 text-sm">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs text-slate-700 font-semibold block">Ngân hàng</span>
                <span className="font-extrabold text-slate-900">{bankId}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(bankId, 'bankId')}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
              >
                {copiedField === 'bankId' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'bankId' ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs text-slate-700 font-semibold block">Số tài khoản</span>
                <span data-testid="bank-account-no" className="font-extrabold text-slate-900 text-base font-mono">
                  {accountNo}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(accountNo, 'accountNo')}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
              >
                {copiedField === 'accountNo' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'accountNo' ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs text-slate-700 font-semibold block">Tên chủ tài khoản</span>
                <span className="font-extrabold text-slate-900 uppercase">{accountName}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(accountName, 'accountName')}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
              >
                {copiedField === 'accountName' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'accountName' ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div>
                <span className="text-xs text-emerald-900 font-semibold block">Số tiền</span>
                <span data-testid="bank-amount" className="font-black text-emerald-800 text-base">
                  {formatCurrency(amountStr)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(amountStr, 'amount')}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
              >
                {copiedField === 'amount' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'amount' ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/80 border border-amber-200">
              <div>
                <span className="text-xs text-amber-900 font-semibold block">
                  Nội dung chuyển khoản (bắt buộc đúng mã)
                </span>
                <span data-testid="bank-add-info" className="font-black text-slate-950 font-mono text-base">
                  {addInfo}
                </span>
              </div>
              <button
                type="button"
                data-testid="copy-add-info-button"
                onClick={() => copyToClipboard(addInfo, 'addInfo')}
                className="text-xs text-amber-800 hover:text-amber-900 font-bold flex items-center gap-1"
              >
                {copiedField === 'addInfo' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'addInfo' ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <Link
          href={`/tour/tra-cuu?code=${encodeURIComponent(code)}${booking?.phone ? `&phone=${encodeURIComponent(booking.phone)}` : ''}`}
          data-testid="lookup-this-booking-link"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold text-sm transition-colors"
        >
          <Search className="w-4 h-4 text-emerald-700" aria-hidden="true" />
          <span>Tra cứu đặt chỗ này</span>
        </Link>

        <Link
          href="/tour"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-xs transition-colors"
        >
          <span>Xem các tour khác</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
