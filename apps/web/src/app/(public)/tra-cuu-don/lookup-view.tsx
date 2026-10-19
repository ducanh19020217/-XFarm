'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Search,
  CheckCircle2,
  Clock,
  PackageCheck,
  XCircle,
  AlertCircle,
  Loader2,
  Calendar,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import { webshopOrderLookupSchema, type WebshopOrderLookupInput } from '@xfarm/shared';
import { formatCurrency, formatDate, API_BASE_URL } from '@/lib/public-api';

interface LookupOrderResult {
  code: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  lines: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  total: number;
  createdAt: string;
}

export function LookupView() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const initialPhone = searchParams.get('phone') || '';

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [order, setOrder] = useState<LookupOrderResult | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<WebshopOrderLookupInput>({
    resolver: zodResolver(webshopOrderLookupSchema),
    defaultValues: {
      code: initialCode,
      phone: initialPhone,
    },
  });

  const performLookup = useCallback(async (data: WebshopOrderLookupInput) => {
    setLoading(true);
    setErrorMsg(null);
    setOrder(null);

    try {
      const query = new URLSearchParams({
        code: data.code.trim(),
        phone: data.phone.trim(),
      });
      const res = await fetch(`${API_BASE_URL}/public/orders/lookup?${query.toString()}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(
            'Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn và số điện thoại.',
          );
        }
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Lỗi tra cứu đơn hàng (${res.status})`);
      }
      const result: LookupOrderResult = await res.json();
      setOrder(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể tra cứu đơn hàng vào lúc này. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-search if both code and phone provided in URL
  useEffect(() => {
    if (initialCode) setValue('code', initialCode);
    if (initialPhone) setValue('phone', initialPhone);
    if (initialCode && initialPhone) {
      performLookup({ code: initialCode, phone: initialPhone });
    }
  }, [initialCode, initialPhone, setValue, performLookup]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { label: 'Chờ xác nhận', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'CONFIRMED':
        return { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'COMPLETED':
        return { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'CANCELLED':
        return { label: 'Đã hủy', color: 'bg-red-100 text-red-800 border-red-200' };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const getPaymentLabel = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'UNPAID':
        return { label: 'Chưa thanh toán', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'PAID':
        return {
          label: 'Đã thanh toán',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'REFUNDED':
        return { label: 'Đã hoàn tiền', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: paymentStatus, color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="py-8 sm:py-14 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Title */}
      <div className="text-center max-w-xl mx-auto">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Tra cứu đơn hàng
        </h1>
        <p className="mt-2 text-slate-600 text-sm sm:text-base">
          Nhập mã đơn hàng và số điện thoại đặt hàng để theo dõi tiến độ xử lý và giao hàng.
        </p>
      </div>

      {/* Lookup Search Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSubmit(performLookup)} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Order Code */}
            <div>
              <label htmlFor="code" className="block text-sm font-semibold text-slate-800 mb-1.5">
                Mã đơn hàng <span className="text-red-500">*</span>
              </label>
              <input
                id="code"
                type="text"
                placeholder="Ví dụ: SO-2026-0001"
                {...register('code')}
                aria-invalid={Boolean(errors.code)}
                aria-describedby={errors.code ? 'code-error' : undefined}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-hidden focus:ring-2 ${
                  errors.code
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/30'
                    : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-100'
                }`}
              />
              {errors.code && (
                <p id="code-error" className="text-red-600 text-xs mt-1.5 font-medium">
                  {errors.code.message}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-slate-800 mb-1.5">
                Số điện thoại người nhận <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="Ví dụ: 0912345678"
                {...register('phone')}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-hidden focus:ring-2 ${
                  errors.phone
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/30'
                    : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-100'
                }`}
              />
              {errors.phone && (
                <p id="phone-error" className="text-red-600 text-xs mt-1.5 font-medium">
                  {errors.phone.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              data-testid="submit-lookup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 text-white font-bold text-sm sm:text-base hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed shadow-sm transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tra cứu...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Tra cứu ngay</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div
          role="alert"
          className="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3 shadow-xs"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{errorMsg}</div>
        </div>
      )}

      {/* Order Lookup Result Card */}
      {order && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-8 animate-in fade-in duration-200">
          {/* Header & Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                Đơn hàng
              </span>
              <h2
                data-testid="lookup-order-code"
                className="text-xl sm:text-2xl font-mono font-bold text-slate-900"
              >
                {order.code}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Ngày đặt: {formatDate(order.createdAt)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Order Status Badge */}
              <span
                data-testid="order-status-badge"
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                  getStatusLabel(order.status).color
                }`}
              >
                {order.status} – {getStatusLabel(order.status).label}
              </span>

              {/* Payment Status Badge */}
              <span
                data-testid="order-payment-status-badge"
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                  getPaymentLabel(order.paymentStatus).color
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 mr-1" />
                {getPaymentLabel(order.paymentStatus).label}
              </span>
            </div>
          </div>

          {/* Simple Timeline */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-4">
              Tiến độ đơn hàng
            </h3>

            {order.status === 'CANCELLED' ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
                <XCircle className="w-6 h-6 text-red-600 shrink-0" />
                <div>
                  <div className="font-bold text-sm">Đơn hàng đã bị hủy</div>
                  <div className="text-xs text-red-700">Đơn hàng này không còn được xử lý.</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Step 1: Placed / Pending */}
                <div
                  className={`p-4 rounded-xl border flex items-center gap-3 ${
                    order.status === 'PENDING'
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      order.status === 'PENDING'
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {order.status === 'PENDING' ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs uppercase font-semibold text-slate-500">Bước 1</div>
                    <div className="text-sm font-bold">Chờ xác nhận</div>
                  </div>
                </div>

                {/* Step 2: Confirmed */}
                <div
                  className={`p-4 rounded-xl border flex items-center gap-3 ${
                    order.status === 'CONFIRMED'
                      ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                      : order.status === 'COMPLETED'
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      order.status === 'CONFIRMED'
                        ? 'bg-blue-600 text-white'
                        : order.status === 'COMPLETED'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    <PackageCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs uppercase font-semibold text-slate-500">Bước 2</div>
                    <div className="text-sm font-bold">Đã xác nhận & đóng gói</div>
                  </div>
                </div>

                {/* Step 3: Completed */}
                <div
                  className={`p-4 rounded-xl border flex items-center gap-3 ${
                    order.status === 'COMPLETED'
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      order.status === 'COMPLETED'
                        ? 'bg-white text-emerald-700'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs uppercase font-semibold">Bước 3</div>
                    <div className="text-sm font-bold">Giao thành công</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ordered Products Table */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3">
              Danh sách sản phẩm
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Tên sản phẩm</th>
                    <th className="py-3 px-4 text-center">Số lượng</th>
                    <th className="py-3 px-4 text-right">Đơn giá</th>
                    <th className="py-3 px-4 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {line.productName}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-700">{line.quantity}</td>
                      <td className="py-3.5 px-4 text-right text-slate-600">
                        {formatCurrency(line.unitPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(line.quantity * line.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50/70 border-t border-slate-200 font-bold">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-right text-slate-700">
                      Tổng giá trị đơn hàng:
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-700 text-base">
                      {formatCurrency(order.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Action Links */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Link
              href="/san-pham"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              <span>Xem thêm nông sản khác tại XFarm</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
