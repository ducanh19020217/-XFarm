'use client';

import * as React from 'react';
import { Button, Input, Label } from '@xfarm/ui';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from './constants';
import type { ItemOption, SupplierOption } from './types';

export interface POLineDraft {
  itemId: string;
  quantity: number | '';
  unitPrice: number | '';
}

export interface POFormSubmitData {
  supplierId: string;
  orderDate?: string;
  notes?: string;
  lines: {
    itemId: string;
    quantity: number;
    unitPrice: number;
  }[];
}

interface POFormProps {
  suppliers: SupplierOption[];
  items: ItemOption[];
  onSubmit: (data: POFormSubmitData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  formError?: string | null;
}

export function POForm({
  suppliers,
  items,
  onSubmit,
  onCancel,
  isSubmitting = false,
  formError = null,
}: POFormProps) {
  const [supplierId, setSupplierId] = React.useState('');
  const [orderDate, setOrderDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = React.useState('');
  const [lines, setLines] = React.useState<POLineDraft[]>([
    { itemId: '', quantity: 1, unitPrice: 0 },
  ]);

  const [errors, setErrors] = React.useState<{
    supplierId?: string;
    lines?: string;
    lineErrors?: Record<number, { itemId?: string; quantity?: string; unitPrice?: string }>;
  }>({});

  const addLine = () => {
    setLines((prev) => [...prev, { itemId: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      if (!prev.lineErrors) return prev;
      const nextLineErrors = { ...prev.lineErrors };
      delete nextLineErrors[index];
      return { ...prev, lineErrors: nextLineErrors };
    });
  };

  const updateLine = (index: number, field: keyof POLineDraft, value: string | number) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        return { ...line, [field]: value };
      }),
    );
    // Clear specific error on edit
    setErrors((prev) => {
      if (!prev.lineErrors?.[index]?.[field as 'itemId' | 'quantity' | 'unitPrice']) return prev;
      const current = { ...prev.lineErrors[index] };
      delete current[field as 'itemId' | 'quantity' | 'unitPrice'];
      return {
        ...prev,
        lineErrors: {
          ...prev.lineErrors,
          [index]: current,
        },
      };
    });
  };

  // Calculate totals
  const lineTotals = lines.map((line) => {
    const qty = typeof line.quantity === 'number' ? line.quantity : Number(line.quantity) || 0;
    const price = typeof line.unitPrice === 'number' ? line.unitPrice : Number(line.unitPrice) || 0;
    return qty * price;
  });

  const grandTotal = lineTotals.reduce((sum, current) => sum + current, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: typeof errors = {};
    const newLineErrors: Record<
      number,
      { itemId?: string; quantity?: string; unitPrice?: string }
    > = {};

    if (!supplierId.trim()) {
      newErrors.supplierId = 'Vui lòng chọn nhà cung cấp';
    }

    if (lines.length === 0) {
      newErrors.lines = 'Đơn mua phải có ít nhất một dòng';
    }

    lines.forEach((line, index) => {
      const err: { itemId?: string; quantity?: string; unitPrice?: string } = {};
      if (!line.itemId) {
        err.itemId = 'Vui lòng chọn vật tư';
      }
      const qty = typeof line.quantity === 'number' ? line.quantity : Number(line.quantity);
      if (line.quantity === '' || Number.isNaN(qty) || qty <= 0) {
        err.quantity = 'Số lượng phải lớn hơn 0';
      }
      const price = typeof line.unitPrice === 'number' ? line.unitPrice : Number(line.unitPrice);
      if (line.unitPrice === '' || Number.isNaN(price) || price < 0) {
        err.unitPrice = 'Đơn giá không được âm';
      }

      if (Object.keys(err).length > 0) {
        newLineErrors[index] = err;
      }
    });

    if (Object.keys(newLineErrors).length > 0) {
      newErrors.lineErrors = newLineErrors;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const formattedLines = lines.map((line) => ({
      itemId: line.itemId,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
    }));

    await onSubmit({
      supplierId,
      orderDate: orderDate || undefined,
      notes: notes.trim() || undefined,
      lines: formattedLines,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {formError && (
        <p role="alert" className="rounded-md border border-crit/30 bg-crit-bg p-3 text-sm text-crit">
          {formError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="po-supplier" className="text-fg">Nhà cung cấp *</Label>
          <select
            id="po-supplier"
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              if (errors.supplierId) {
                setErrors((prev) => ({ ...prev, supplierId: undefined }));
              }
            }}
            className="flex h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="">Chọn nhà cung cấp</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
          {errors.supplierId && <p className="text-xs text-crit">{errors.supplierId}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="po-order-date" className="text-fg">Ngày đặt hàng</Label>
          <Input
            id="po-order-date"
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="po-notes" className="text-fg">Ghi chú</Label>
        <Input
          id="po-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ghi chú về đơn hàng..."
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold text-fg">Danh sách vật tư đặt hàng *</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLine}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Thêm dòng
          </Button>
        </div>

        {errors.lines && <p className="text-xs text-crit">{errors.lines}</p>}

        <div className="rounded-md border border-line bg-surface-2 p-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-muted">
                <th className="p-2 min-w-[200px]">Vật tư *</th>
                <th className="p-2 w-28">Số lượng *</th>
                <th className="p-2 w-36">Đơn giá (₫) *</th>
                <th className="p-2 w-36 text-right">Thành tiền</th>
                <th className="p-2 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lines.map((line, idx) => {
                const lineErr = errors.lineErrors?.[idx];
                const subtotal = lineTotals[idx] || 0;
                return (
                  <tr key={idx} className="bg-surface">
                    <td className="p-2 align-top">
                      <select
                        id={`po-line-item-${idx}`}
                        value={line.itemId}
                        aria-label={`Vật tư dòng ${idx + 1}`}
                        onChange={(e) => updateLine(idx, 'itemId', e.target.value)}
                        className="flex h-9 w-full rounded-md border border-line bg-surface px-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="">Chọn vật tư</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.sku} - {item.name} ({item.unit})
                          </option>
                        ))}
                      </select>
                      {lineErr?.itemId && (
                        <p className="mt-1 text-xs text-crit">{lineErr.itemId}</p>
                      )}
                    </td>

                    <td className="p-2 align-top">
                      <Input
                        id={`po-line-qty-${idx}`}
                        type="number"
                        min="0.001"
                        step="any"
                        aria-label={`Số lượng dòng ${idx + 1}`}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(
                            idx,
                            'quantity',
                            e.target.value === '' ? '' : Number(e.target.value),
                          )
                        }
                        className="h-9"
                      />
                      {lineErr?.quantity && (
                        <p className="mt-1 text-xs text-crit">{lineErr.quantity}</p>
                      )}
                    </td>

                    <td className="p-2 align-top">
                      <Input
                        id={`po-line-price-${idx}`}
                        type="number"
                        min="0"
                        step="any"
                        aria-label={`Đơn giá dòng ${idx + 1}`}
                        value={line.unitPrice}
                        onChange={(e) =>
                          updateLine(
                            idx,
                            'unitPrice',
                            e.target.value === '' ? '' : Number(e.target.value),
                          )
                        }
                        className="h-9"
                      />
                      {lineErr?.unitPrice && (
                        <p className="mt-1 text-xs text-crit">{lineErr.unitPrice}</p>
                      )}
                    </td>

                    <td className="p-2 align-top text-right font-medium pt-3">
                      <span className="text-fg">{formatCurrency(subtotal)}</span>
                    </td>

                    <td className="p-2 align-top text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={lines.length <= 1}
                        onClick={() => removeLine(idx)}
                        aria-label={`Xóa dòng ${idx + 1}`}
                        className="h-8 w-8 p-0 text-muted hover:text-crit disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line font-semibold text-fg">
                <td colSpan={3} className="p-3 text-right">
                  Tổng tiền:
                </td>
                <td className="p-3 text-right text-base text-ok font-bold">
                  {formatCurrency(grandTotal)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-line">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Hủy bỏ
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang tạo...
            </>
          ) : (
            'Tạo đơn mua hàng'
          )}
        </Button>
      </div>
    </form>
  );
}
