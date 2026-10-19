'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, DollarSign, Loader2 } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  PageHeader,
  StatusBadge,
  Toast,
  useToast,
} from '@xfarm/ui';
import { PaymentMethod, PaymentStatus, SalesOrderStatus } from '@xfarm/shared';
import { apiFetch, ApiError } from '@/lib/api';
import MoneyInput from '@/components/ui/money-input';

interface PaymentItem {
  id: string;
  code: string;
  amount: number | string;
  method: PaymentMethod;
  paidAt: string;
  transactionId?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface OrderLineItem {
  id: string;
  quantity: number | string;
  unitPrice: number | string;
  product?: {
    id: string;
    name: string;
    unit: string;
  } | null;
  item?: {
    id: string;
    name: string;
    unit: string;
  } | null;
}

interface SalesOrderDetail {
  id: string;
  code: string;
  channel: string;
  status: SalesOrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  shippingAddress: string;
  subtotal: number | string;
  discount: number | string;
  shippingFee: number | string;
  total: number | string;
  notes?: string | null;
  createdAt: string;
  customer?: {
    id: string;
    code: string;
    name: string;
    phone: string;
    address?: string | null;
  };
  lines: OrderLineItem[];
  payments: PaymentItem[];
}

function formatVND(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0 ₫';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (Number.isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

const methodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.BANK_TRANSFER]: 'Chuyển khoản',
  [PaymentMethod.CASH]: 'Tiền mặt',
  [PaymentMethod.COD]: 'COD',
  [PaymentMethod.VNPAY]: 'VNPay',
};

export default function SalesOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { message, showToast, closeToast } = useToast();

  const [order, setOrder] = React.useState<SalesOrderDetail | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Form ghi thu
  const [payAmount, setPayAmount] = React.useState<number>(0);
  const [payMethod, setPayMethod] = React.useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [payNotes, setPayNotes] = React.useState<string>('');
  const [isSubmittingPay, setIsSubmittingPay] = React.useState(false);
  const [payError, setPayError] = React.useState<string | null>(null);

  const fetchOrder = React.useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ data: SalesOrderDetail } | SalesOrderDetail>(
        `/sales-orders/${params.id}`,
      );
      const data = 'data' in res ? res.data : res;
      setOrder(data);

      const totalVal = Number(data.total) || 0;
      const paidVal = (data.payments || []).reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0,
      );
      const rem = Math.max(0, totalVal - paidVal);
      setPayAmount(rem);
      setPayNotes(`Thu tiền đơn ${data.code}`);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tải thông tin đơn bán');
    } finally {
      setLoading(false);
    }
  }, [params.id, showToast]);

  React.useEffect(() => {
    void fetchOrder();
  }, [fetchOrder]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setPayError(null);

    const totalVal = Number(order.total) || 0;
    const paidVal = (order.payments || []).reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0,
    );
    const rem = Math.max(0, totalVal - paidVal);

    if (payAmount <= 0) {
      setPayError('Số tiền thu phải lớn hơn 0');
      return;
    }

    if (payAmount > rem) {
      setPayError(`Số tiền thu không được vượt quá số tiền còn lại (${formatVND(rem)})`);
      return;
    }

    setIsSubmittingPay(true);
    try {
      await apiFetch(`/sales-orders/${order.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: payAmount,
          method: payMethod,
          notes: payNotes.trim() || undefined,
        }),
      });
      showToast('Ghi nhận thanh toán thành công');
      await fetchOrder();
    } catch (error) {
      setPayError(error instanceof ApiError ? error.message : 'Không thể ghi nhận thanh toán');
      showToast(error instanceof ApiError ? error.message : 'Không thể ghi nhận thanh toán');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Đang tải thông tin đơn hàng...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Toast message={message || 'Không tìm thấy đơn bán'} onClose={closeToast} />
        <Button variant="outline" onClick={() => router.push('/admin/sales/orders')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại danh sách đơn bán
        </Button>
      </div>
    );
  }

  const totalAmount = Number(order.total) || 0;
  const paidAmount = (order.payments || []).reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0,
  );
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} />

      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push('/admin/sales/orders')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Danh sách đơn bán
      </Button>

      <PageHeader
        title={order.code}
        description={`Đơn bán hàng ngày ${formatDate(order.createdAt)}`}
      >
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.paymentStatus} />
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer & General info */}
        <div className="rounded-lg border bg-white p-5 shadow-sm space-y-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Thông tin khách hàng
          </h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Khách hàng</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {order.customer?.name || 'Khách vãng lai'}
              </p>
              {order.customer?.phone && (
                <p className="text-xs text-slate-500">SĐT: {order.customer.phone}</p>
              )}
            </div>

            <div>
              <span className="text-xs text-slate-400 block">Địa chỉ nhận hàng</span>
              <p className="text-slate-700 dark:text-slate-300">
                {order.shippingAddress || '-'}
              </p>
            </div>

            <div>
              <span className="text-xs text-slate-400 block">Kênh bán</span>
              <p className="font-medium text-slate-700 dark:text-slate-300">
                {order.channel === 'WEBSHOP' ? 'Cửa hàng trực tuyến' : 'Bán tại chỗ / Admin'}
              </p>
            </div>

            {order.notes && (
              <div className="border-t pt-2 dark:border-slate-800">
                <span className="text-xs text-slate-400 block">Ghi chú đơn</span>
                <p className="italic text-slate-600 dark:text-slate-400">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Lines table & Summary */}
        <div className="rounded-lg border bg-white p-5 shadow-sm space-y-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Sản phẩm / Mặt hàng
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Tên sản phẩm/mặt hàng</th>
                  <th className="py-2.5 px-3 text-right">Số lượng</th>
                  <th className="py-2.5 px-3 text-right">Đơn giá</th>
                  <th className="py-2.5 px-3 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {order.lines.map((line) => {
                  const qty = Number(line.quantity) || 0;
                  const price = Number(line.unitPrice) || 0;
                  const lineTotal = qty * price;
                  const name = line.product?.name || line.item?.name || 'Mặt hàng';
                  const unit = line.product?.unit || line.item?.unit || '';

                  return (
                    <tr key={line.id}>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {name}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                        {qty} {unit}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                        {formatVND(price)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {formatVND(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t pt-3 space-y-1.5 text-sm dark:border-slate-800">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Tạm tính:</span>
              <span>{formatVND(order.subtotal)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Chiết khấu:</span>
                <span>-{formatVND(order.discount)}</span>
              </div>
            )}
            {Number(order.shippingFee) > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Phí vận chuyển:</span>
                <span>+{formatVND(order.shippingFee)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-bold text-base text-slate-900 dark:text-slate-100 dark:border-slate-800">
              <span>Tổng thanh toán:</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {formatVND(order.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Section - KHU VỰC THANH TOÁN */}
      <div className="rounded-lg border bg-white p-5 shadow-sm space-y-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Thanh toán & Thu tiền
            </h2>
            <p className="text-xs text-slate-500">
              Theo dõi tình trạng thanh toán và ghi nhận các đợt thu tiền từ khách hàng
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Trạng thái:</span>
            <StatusBadge status={order.paymentStatus} />
          </div>
        </div>

        {/* Payment Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 dark:bg-slate-800/40 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-500 block">Tổng số tiền đơn</span>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {formatVND(totalAmount)}
            </p>
          </div>

          <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 block">
              Đã thanh toán
            </span>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-1">
              {formatVND(paidAmount)}
            </p>
          </div>

          <div className="rounded-lg bg-amber-50 p-4 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400 block">
              Còn lại cần thu
            </span>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-1">
              {formatVND(remainingAmount)}
            </p>
          </div>
        </div>

        {/* Form ghi thu tiền nếu chưa thanh toán đủ */}
        {order.status !== 'CANCELLED' && remainingAmount > 0 ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900 dark:bg-emerald-950/20 space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Ghi nhận thu tiền
            </h3>

            <form onSubmit={handleRecordPayment} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="record-amount">Số tiền thu (₫) *</Label>
                <MoneyInput
                  id="record-amount"
                  value={payAmount}
                  onChange={(val) => setPayAmount(val)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="record-method">Hình thức thanh toán *</Label>
                <select
                  id="record-method"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-slate-800"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                >
                  <option value={PaymentMethod.BANK_TRANSFER}>Chuyển khoản</option>
                  <option value={PaymentMethod.CASH}>Tiền mặt</option>
                  <option value={PaymentMethod.COD}>COD</option>
                  <option value={PaymentMethod.VNPAY}>VNPay</option>
                </select>
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="record-notes">Ghi chú</Label>
                <Input
                  id="record-notes"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="VD: Thu đợt 1..."
                />
              </div>

              <div className="md:col-span-1">
                <Button
                  type="submit"
                  disabled={isSubmittingPay}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSubmittingPay ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Ghi nhận thu tiền
                    </>
                  )}
                </Button>
              </div>
            </form>
            {payError && <p className="text-xs text-red-600">{payError}</p>}
          </div>
        ) : order.paymentStatus === 'PAID' ? (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Đơn hàng này đã được thanh toán đầy đủ.
          </div>
        ) : null}

        {/* Lịch sử thanh toán */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">
            Lịch sử các đợt thanh toán ({order.payments?.length || 0})
          </h3>

          {!order.payments || order.payments.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-400 dark:border-slate-800">
              Chưa có khoản thu nào được ghi nhận cho đơn này
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">Mã phiếu thu</th>
                    <th className="py-2.5 px-3">Thời gian</th>
                    <th className="py-2.5 px-3">Phương thức</th>
                    <th className="py-2.5 px-3 text-right">Số tiền</th>
                    <th className="py-2.5 px-3">Ghi chú</th>
                    <th className="py-2.5 px-3">Giao dịch sổ quỹ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {order.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                        {p.code}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-500">
                        {formatDate(p.paidAt || p.createdAt)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {methodLabels[p.method] || p.method}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                        {formatVND(p.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-xs">
                        {p.notes || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-xs">
                        {p.transactionId ? (
                          <Link
                            href="/admin/finance/transactions"
                            className="text-emerald-600 hover:underline dark:text-emerald-400"
                          >
                            Xem giao dịch
                          </Link>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
