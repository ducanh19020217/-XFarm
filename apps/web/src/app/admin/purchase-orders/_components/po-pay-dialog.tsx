'use client';

import * as React from 'react';
import { PaymentMethod } from '@xfarm/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@xfarm/ui';
import MoneyInput from '@/components/ui/money-input';
import { formatCurrency } from './constants';
import type { PurchaseOrderDetail } from './types';

export interface POPayPayload {
  amount?: number;
  method: PaymentMethod;
  notes?: string;
}

interface POPayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrderDetail;
  onSubmit: (payload: POPayPayload) => Promise<void>;
  isSubmitting?: boolean;
}

export function POPayDialog({
  open,
  onOpenChange,
  purchaseOrder,
  onSubmit,
  isSubmitting = false,
}: POPayDialogProps) {
  const total = Number(purchaseOrder.total) || 0;
  const paid = Number(purchaseOrder.paidAmount) || 0;
  const remaining = Math.max(0, total - paid);

  const [amount, setAmount] = React.useState<number>(remaining);
  const [method, setMethod] = React.useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [notes, setNotes] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setAmount(remaining);
      setMethod(PaymentMethod.BANK_TRANSFER);
      setNotes(`Thanh toán đơn mua hàng ${purchaseOrder.code}`);
      setError(null);
    }
  }, [open, remaining, purchaseOrder.code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amount <= 0) {
      setError('Số tiền thanh toán phải lớn hơn 0');
      return;
    }

    if (amount > remaining) {
      setError(`Số tiền thanh toán không được vượt quá số tiền còn lại (${formatCurrency(remaining)})`);
      return;
    }

    await onSubmit({
      amount,
      method,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Trả tiền đơn mua hàng</DialogTitle>
          <DialogDescription>
            Ghi nhận thanh toán tiền cho nhà cung cấp theo đơn {purchaseOrder.code}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1.5 border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500">Tổng tiền đơn:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Đã thanh toán:</span>
              <span className="font-semibold text-emerald-700">{formatCurrency(paid)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5">
              <span className="text-slate-700 font-medium">Còn lại cần trả:</span>
              <span className="font-bold text-amber-600">{formatCurrency(remaining)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-amount">Số tiền thanh toán (₫) *</Label>
            <MoneyInput
              id="pay-amount"
              value={amount}
              onChange={(val) => setAmount(val)}
              placeholder="Nhập số tiền"
            />
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-method">Phương thức thanh toán *</Label>
            <select
              id="pay-method"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-slate-800"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            >
              <option value={PaymentMethod.BANK_TRANSFER}>Chuyển khoản</option>
              <option value={PaymentMethod.CASH}>Tiền mặt</option>
              <option value={PaymentMethod.COD}>COD</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-notes">Ghi chú</Label>
            <Input
              id="pay-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Chi đợt 1..."
            />
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || remaining <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận trả tiền'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
