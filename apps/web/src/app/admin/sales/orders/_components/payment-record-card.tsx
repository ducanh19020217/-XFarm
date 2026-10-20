'use client';

import * as React from 'react';
import Link from 'next/link';
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
    <div className="rounded-lg border border-line bg-surface p-5 shadow-xs text-fg space-y-5">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-accent" />
          <h2 className="text-base font-semibold text-fg">
            Thanh toán & Thu tiền
          </h2>
        </div>
        <div className="text-xs">
          <span className="text-muted">Đã thu: </span>
          <span className="font-semibold text-fg">
            {formatCurrency(totalPaid)}
          </span>
          <span className="text-muted mx-1">/</span>
          <span className="text-muted">Còn lại: </span>
          <span
            className={`font-semibold ${
              remaining > 0 ? 'text-crit' : 'text-ok'
            }`}
          >
            {formatCurrency(remaining)}
          </span>
        </div>
      </div>

      {/* Lịch sử thanh toán */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase text-muted tracking-wider">
          Lịch sử các lần thu ({order.payments?.length || 0})
        </h3>
        {!order.payments || order.payments.length === 0 ? (
          <div className="rounded-md border border-dashed border-line p-4 text-center text-xs text-muted">
            Chưa có ghi nhận thanh toán nào cho đơn hàng này
          </div>
        ) : (
          <div className="rounded-md border border-line overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2 font-semibold text-muted border-b border-line">
                <tr>
                  <th className="py-2 px-3">Thời gian</th>
                  <th className="py-2 px-3">Phương thức</th>
                  <th className="py-2 px-3">Ghi chú / Mã GD</th>
                  <th className="py-2 px-3 text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {order.payments.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-hover">
                    <td className="py-2 px-3 text-muted">
                      {formatDate(p.paidAt)}
                    </td>
                    <td className="py-2 px-3 font-medium text-fg">
                      {paymentMethodLabels[p.method] || p.method}
                    </td>
                    <td className="py-2 px-3 text-muted">
                      {p.notes ? (
                        <div>
                          <div>{p.notes}</div>
                          {p.transactionId && (
                            <div className="text-[10px] text-muted">
                              GD:{' '}
                              <Link
                                href="/admin/finance/transactions"
                                className="text-accent hover:underline"
                              >
                                {p.transactionId}
                              </Link>
                            </div>
                          )}
                        </div>
                      ) : p.transactionId ? (
                        <div className="text-xs">
                          <Link
                            href="/admin/finance/transactions"
                            className="text-accent hover:underline"
                          >
                            {p.transactionId}
                          </Link>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-accent">
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
          className="pt-4 border-t border-line space-y-3"
        >
          <h3 className="text-xs font-semibold uppercase text-muted tracking-wider">
            Ghi nhận thu tiền mới
          </h3>

          {error && (
            <div className="p-3 text-xs rounded bg-crit-bg text-crit border border-crit/20">
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-1.5 p-3 text-xs rounded bg-ok-bg text-ok border border-ok/20">
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
                className="flex h-9 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm shadow-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
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
                className="bg-surface border-line text-fg"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-accent hover:bg-accent-hover text-white">
              {isSubmitting ? 'Đang ghi nhận...' : 'Ghi nhận thanh toán'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
