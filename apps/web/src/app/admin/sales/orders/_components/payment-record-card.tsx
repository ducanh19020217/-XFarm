'use client';

import * as React from 'react';
import { PaymentMethod } from '@xfarm/shared';
import { Button, Input, Label } from '@xfarm/ui';
import { CreditCard, CheckCircle2 } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { MoneyInput } from '@/components/ui/money-input';
import type { SalesOrderRecord } from '../../_components/types';
import { formatCurrency, formatDate, paymentMethodLabels } from '../../_components/constants';

interface PaymentRecordCardProps {
  order: SalesOrderRecord;
  onPaymentSuccess: () => void;
  userRole?: string;
}

export function PaymentRecordCard({ order, onPaymentSuccess, userRole }: PaymentRecordCardProps) {
  const canRecordPayment =
    userRole === 'OWNER' ||
    userRole === 'MANAGER' ||
    userRole === 'SALES' ||
    userRole === 'ACCOUNTANT';

  const totalPaid = (order.payments || []).reduce(
    (sum, p) => sum + (typeof p.amount === 'string' ? parseFloat(p.amount) : p.amount || 0),
    0,
  );
  const remaining = Math.max(0, Number(order.total) - totalPaid);

  const [amount, setAmount] = React.useState<number>(remaining);
  const [method, setMethod] = React.useState<PaymentMethod>(PaymentMethod.CASH);
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    setAmount(remaining);
  }, [remaining]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Số tiền thu phải lớn hơn 0');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await apiFetch(`/sales-orders/${order.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(amount),
          method,
          notes: notes.trim() || undefined,
        }),
      });
      setSuccess(true);
      setNotes('');
      onPaymentSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Lỗi khi ghi nhận thanh toán');
      } else {
        setError('Đã có lỗi không mong muốn xảy ra');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Thanh toán & Thu tiền
          </h2>
        </div>
        <div className="text-xs">
          <span className="text-slate-500">Đã thu: </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(totalPaid)}
          </span>
          <span className="text-slate-400 mx-1">/</span>
          <span className="text-slate-500">Còn lại: </span>
          <span
            className={`font-semibold ${
              remaining > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'
            }`}
          >
            {formatCurrency(remaining)}
          </span>
        </div>
      </div>

      {/* Lịch sử thanh toán */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
          Lịch sử các lần thu ({order.payments?.length || 0})
        </h3>
        {!order.payments || order.payments.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-slate-800">
            Chưa có ghi nhận thanh toán nào cho đơn hàng này
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 overflow-hidden dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-3">Thời gian</th>
                  <th className="py-2 px-3">Phương thức</th>
                  <th className="py-2 px-3">Ghi chú / Mã GD</th>
                  <th className="py-2 px-3 text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {order.payments.map((p, idx) => (
                  <tr key={p.id || idx}>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                      {formatDate(p.paidAt)}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                      {paymentMethodLabels[p.method] || p.method}
                    </td>
                    <td className="py-2 px-3 text-slate-500">
                      {p.transactionId || p.notes || '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form ghi thu tiền */}
      {canRecordPayment && order.status !== 'CANCELLED' && remaining > 0 && (
        <form
          onSubmit={handleSubmit}
          className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3"
        >
          <h3 className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Ghi nhận thu tiền mới
          </h3>

          {error && (
            <div className="p-3 text-xs rounded bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-1.5 p-3 text-xs rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
              <CheckCircle2 className="h-4 w-4" />
              <span>Ghi nhận thu tiền thành công!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="payment-amount" className="text-xs">
                Số tiền thu (₫)
              </Label>
              <MoneyInput
                id="payment-amount"
                value={amount}
                onChange={(val) => setAmount(val)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="payment-method-select" className="text-xs">
                Phương thức
              </Label>
              <select
                id="payment-method-select"
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-950 dark:border-slate-800 dark:bg-slate-900"
                value={method}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setMethod(e.target.value as PaymentMethod)
                }
                disabled={isSubmitting}
              >
                {Object.entries(paymentMethodLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="payment-notes" className="text-xs">
                Ghi chú
              </Label>
              <Input
                id="payment-notes"
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
                placeholder="VD: Chuyển khoản số GD..."
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Đang ghi nhận...' : 'Ghi nhận thanh toán'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
