'use client';

import * as React from 'react';
import { Button, Input, Label } from '@xfarm/ui';
import { apiFetch, ApiError } from '@/lib/api';
import type { ItemRecord, WarehouseItem } from '../../types';
import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';

export interface TransferLine {
  id: string;
  itemId: string;
  quantity: number | '';
}

interface TransferFormProps {
  warehouses: WarehouseItem[];
  items: ItemRecord[];
  onSuccess: (code?: string) => void;
  onCancel: () => void;
}

export function TransferForm({ warehouses, items, onSuccess, onCancel }: TransferFormProps) {
  const [fromWarehouseId, setFromWarehouseId] = React.useState('');
  const [toWarehouseId, setToWarehouseId] = React.useState('');
  const [movedAt, setMovedAt] = React.useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = React.useState('');

  const [lines, setLines] = React.useState<TransferLine[]>([
    {
      id: '1',
      itemId: '',
      quantity: 1,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [lineErrors, setLineErrors] = React.useState<Record<number, string>>({});

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        itemId: '',
        quantity: 1,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
    setLineErrors((prev) => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  const updateLine = (index: number, field: keyof TransferLine, value: string | number) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    if (lineErrors[index]) {
      setLineErrors((prev) => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLineErrors({});

    if (!fromWarehouseId) {
      setFormError('Vui lòng chọn kho chuyển đi');
      return;
    }

    if (!toWarehouseId) {
      setFormError('Vui lòng chọn kho chuyển đến');
      return;
    }

    if (fromWarehouseId === toWarehouseId) {
      setFormError('Kho chuyển đến phải khác kho chuyển đi');
      return;
    }

    if (lines.length === 0) {
      setFormError('Phiếu điều chuyển phải có ít nhất một dòng hàng');
      return;
    }

    const newLineErrors: Record<number, string> = {};
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.itemId) {
        newLineErrors[i] = 'Vui lòng chọn vật tư';
      } else if (typeof line.quantity === 'number' && line.quantity <= 0) {
        newLineErrors[i] = 'Số lượng phải lớn hơn 0';
      } else if (line.quantity === '') {
        newLineErrors[i] = 'Số lượng không được để trống';
      }
    }

    if (Object.keys(newLineErrors).length > 0) {
      setLineErrors(newLineErrors);
      setFormError('Vui lòng kiểm tra lại các dòng điều chuyển');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        fromWarehouseId,
        toWarehouseId,
        movedAt: movedAt ? new Date(movedAt).toISOString() : undefined,
        notes: notes.trim() || undefined,
        lines: lines.map((l) => ({
          itemId: l.itemId,
          quantity: Number(l.quantity),
        })),
      };

      const res = await apiFetch<{ code?: string; data?: { code?: string } }>('/stock/transfers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const code = res?.code || res?.data?.code;
      onSuccess(code);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const msg = err.message || 'Lỗi điều chuyển';
        setFormError(
          err.statusCode === 422
            ? `Lỗi điều chuyển kho (422): ${msg || 'Không đủ tồn kho để chuyển'}`
            : msg,
        );
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Có lỗi xảy ra khi tạo phiếu điều chuyển');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      {/* Warehouses Selection */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="transfer-from-warehouse">Từ kho (Kho xuất) *</Label>
          <select
            id="transfer-from-warehouse"
            value={fromWarehouseId}
            onChange={(e) => setFromWarehouseId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-emerald-600 focus:outline-none"
          >
            <option value="">Chọn kho chuyển đi</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="transfer-to-warehouse">Đến kho (Kho nhập) *</Label>
          <select
            id="transfer-to-warehouse"
            value={toWarehouseId}
            onChange={(e) => setToWarehouseId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-emerald-600 focus:outline-none"
          >
            <option value="">Chọn kho chuyển đến</option>
            {warehouses
              .filter((w) => w.id !== fromWarehouseId)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="transfer-date">Ngày điều chuyển</Label>
          <Input
            id="transfer-date"
            type="date"
            value={movedAt}
            onChange={(e) => setMovedAt(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="transfer-notes">Ghi chú</Label>
          <Input
            id="transfer-notes"
            type="text"
            placeholder="Lý do điều chuyển..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Multi-line table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Danh sách mặt hàng điều chuyển</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLine}
            className="text-emerald-700 hover:text-emerald-800"
          >
            <Plus className="h-4 w-4 mr-1" />
            Thêm dòng
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 w-10">STT</th>
                <th className="px-3 py-2 min-w-[260px]">Vật tư *</th>
                <th className="px-3 py-2 w-48">Số lượng chuyển *</th>
                <th className="px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {lines.map((line, idx) => {
                const selectedItem = items.find((it) => it.id === line.itemId);

                return (
                  <tr key={line.id} className="align-top">
                    <td className="px-3 py-2.5 text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <select
                        aria-label={`Vật tư dòng ${idx + 1}`}
                        value={line.itemId}
                        onChange={(e) => updateLine(idx, 'itemId', e.target.value)}
                        className="flex h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm focus:border-emerald-600 focus:outline-none"
                      >
                        <option value="">Chọn vật tư</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name} ({it.sku})
                          </option>
                        ))}
                      </select>
                      {selectedItem && (
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          ĐVT: {selectedItem.unit}
                        </span>
                      )}
                      {lineErrors[idx] && (
                        <span className="text-xs text-red-600 block mt-0.5">{lineErrors[idx]}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        aria-label={`Số lượng dòng ${idx + 1}`}
                        type="number"
                        min="0.001"
                        step="any"
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
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        aria-label={`Xóa dòng ${idx + 1}`}
                        disabled={lines.length <= 1}
                        onClick={() => removeLine(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Hủy
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Tạo phiếu điều chuyển
        </Button>
      </div>
    </form>
  );
}
