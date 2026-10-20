'use client';

import * as React from 'react';
import { Button, Input, Label } from '@xfarm/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { formatNumber } from '../../format';
import type { ItemRecord, WarehouseItem, StockBalanceItem } from '../../types';
import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';

export interface CountLine {
  id: string;
  itemId: string;
  lotCode: string;
  bookQuantity: number;
  actualQuantity: number | '';
}

interface CountFormProps {
  warehouses: WarehouseItem[];
  items: ItemRecord[];
  onSuccess: (code?: string) => void;
  onCancel: () => void;
}

export function CountForm({ warehouses, items, onSuccess, onCancel }: CountFormProps) {
  const [warehouseId, setWarehouseId] = React.useState('');
  const [movedAt, setMovedAt] = React.useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = React.useState('');

  const [lines, setLines] = React.useState<CountLine[]>([
    {
      id: '1',
      itemId: '',
      lotCode: '',
      bookQuantity: 0,
      actualQuantity: 0,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [lineErrors, setLineErrors] = React.useState<Record<number, string>>({});

  // When warehouseId and itemId/lotCode change, look up book balance
  const lookupBookQuantity = React.useCallback(async (wId: string, itId: string, lCode: string) => {
    if (!wId || !itId) return 0;
    try {
      const params = new URLSearchParams({
        warehouseId: wId,
        itemId: itId,
        includeZero: 'true',
      });
      if (lCode.trim()) params.set('lotCode', lCode.trim());
      const res = await apiFetch<{ data: StockBalanceItem[] }>(
        `/stock/balances?${params.toString()}`,
      );
      const match = res?.data?.[0];
      return match ? Number(match.quantity || 0) : 0;
    } catch {
      return 0;
    }
  }, []);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        itemId: '',
        lotCode: '',
        bookQuantity: 0,
        actualQuantity: 0,
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

  const updateLine = (index: number, field: keyof CountLine, value: string | number) => {
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

    // Auto-update bookQuantity if warehouseId and itemId are set
    if (field === 'itemId' || field === 'lotCode') {
      const current = lines[index];
      const targetItemId = field === 'itemId' ? String(value) : current.itemId;
      const targetLotCode = field === 'lotCode' ? String(value) : current.lotCode;

      if (warehouseId && targetItemId) {
        lookupBookQuantity(warehouseId, targetItemId, targetLotCode).then((bookQty) => {
          setLines((curr) => {
            const updated = [...curr];
            if (updated[index]) {
              updated[index] = { ...updated[index], bookQuantity: bookQty };
            }
            return updated;
          });
        });
      }
    }
  };

  // Re-check book balance if warehouse changes
  React.useEffect(() => {
    if (!warehouseId) return;
    lines.forEach((line, idx) => {
      if (line.itemId) {
        lookupBookQuantity(warehouseId, line.itemId, line.lotCode).then((bookQty) => {
          setLines((curr) => {
            const updated = [...curr];
            if (updated[idx]) {
              updated[idx] = { ...updated[idx], bookQuantity: bookQty };
            }
            return updated;
          });
        });
      }
    });
  }, [warehouseId, lookupBookQuantity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLineErrors({});

    if (!warehouseId) {
      setFormError('Vui lòng chọn kho kiểm kê');
      return;
    }

    if (lines.length === 0) {
      setFormError('Phiếu kiểm kê phải có ít nhất một dòng');
      return;
    }

    const newLineErrors: Record<number, string> = {};
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.itemId) {
        newLineErrors[i] = 'Vui lòng chọn vật tư';
      } else if (line.actualQuantity === '') {
        newLineErrors[i] = 'Vui lòng nhập số đếm thực tế';
      } else if (typeof line.actualQuantity === 'number' && line.actualQuantity < 0) {
        newLineErrors[i] = 'Số đếm không được âm';
      }
    }

    if (Object.keys(newLineErrors).length > 0) {
      setLineErrors(newLineErrors);
      setFormError('Vui lòng kiểm tra lại các dòng kiểm kê');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        warehouseId,
        movedAt: movedAt ? new Date(movedAt).toISOString() : undefined,
        notes: notes.trim() || undefined,
        lines: lines.map((l) => ({
          itemId: l.itemId,
          lotCode: l.lotCode.trim() || undefined,
          actualQuantity: Number(l.actualQuantity),
        })),
      };

      const res = await apiFetch<{ code?: string; data?: { code?: string } }>('/stock/counts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const code = res?.code || res?.data?.code;
      onSuccess(code);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const msg = err.message || 'Lỗi kiểm kê';
        setFormError(
          err.statusCode === 422
            ? `Lỗi kiểm kê kho (422): ${msg || 'Dữ liệu kiểm kê không hợp lệ'}`
            : msg,
        );
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Có lỗi xảy ra khi tạo phiếu kiểm kê');
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
          className="flex items-start gap-2 rounded-md bg-crit-bg p-3 text-sm text-crit border border-crit/30"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="count-warehouse">Kho kiểm kê *</Label>
          <select
            id="count-warehouse"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="">Chọn kho kiểm kê</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="count-date">Ngày kiểm kê</Label>
          <Input
            id="count-date"
            type="date"
            value={movedAt}
            onChange={(e) => setMovedAt(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="count-notes">Ghi chú</Label>
          <Input
            id="count-notes"
            type="text"
            placeholder="Kỳ kiểm kê, ghi chú thực tế..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Multi-line table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold">Danh sách kiểm kê</Label>
            <p className="text-xs text-muted">
              Nhập số lượng đếm thực tế; hệ thống hiển thị tồn sổ sách để đối chiếu.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLine}
            className="text-accent hover:text-accent/80"
          >
            <Plus className="h-4 w-4 mr-1" />
            Thêm dòng
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2 w-10">STT</th>
                <th className="px-3 py-2 min-w-[220px]">Vật tư *</th>
                <th className="px-3 py-2 w-28">Mã lô</th>
                <th className="px-3 py-2 w-32 bg-surface-2 text-right">Tồn sổ sách</th>
                <th className="px-3 py-2 w-36">Số đếm thực tế *</th>
                <th className="px-3 py-2 w-28 text-right">Chênh lệch</th>
                <th className="px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {lines.map((line, idx) => {
                const selectedItem = items.find((it) => it.id === line.itemId);
                const actual = line.actualQuantity === '' ? 0 : Number(line.actualQuantity);
                const diff = actual - Number(line.bookQuantity || 0);

                return (
                  <tr key={line.id} className="align-top">
                    <td className="px-3 py-2.5 text-muted">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <select
                        aria-label={`Vật tư dòng ${idx + 1}`}
                        value={line.itemId}
                        onChange={(e) => updateLine(idx, 'itemId', e.target.value)}
                        className="flex h-9 w-full rounded border border-line bg-surface px-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/20"
                      >
                        <option value="">Chọn vật tư</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name} ({it.sku})
                          </option>
                        ))}
                      </select>
                      {selectedItem && (
                        <span className="text-[11px] text-muted block mt-0.5">
                          ĐVT: {selectedItem.unit}
                        </span>
                      )}
                      {lineErrors[idx] && (
                        <span className="text-xs text-crit block mt-0.5">{lineErrors[idx]}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        aria-label={`Mã lô dòng ${idx + 1}`}
                        type="text"
                        placeholder="Mã lô..."
                        value={line.lotCode}
                        onChange={(e) => updateLine(idx, 'lotCode', e.target.value)}
                        className="h-9 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2.5 bg-surface-2/40 text-right font-medium text-fg-2">
                      {formatNumber(line.bookQuantity)} {selectedItem?.unit || ''}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        aria-label={`Số đếm thực tế dòng ${idx + 1}`}
                        type="number"
                        min="0"
                        step="any"
                        value={line.actualQuantity}
                        onChange={(e) =>
                          updateLine(
                            idx,
                            'actualQuantity',
                            e.target.value === '' ? '' : Number(e.target.value),
                          )
                        }
                        className="h-9 font-semibold"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold">
                      <span
                        className={
                          diff === 0
                            ? 'text-muted'
                            : diff > 0
                              ? 'text-ok'
                              : 'text-crit'
                        }
                      >
                        {diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff)}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        aria-label={`Xóa dòng ${idx + 1}`}
                        disabled={lines.length <= 1}
                        onClick={() => removeLine(idx)}
                        className="p-1 text-muted hover:text-crit disabled:opacity-30 disabled:hover:text-muted"
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
      <div className="flex justify-end gap-3 pt-2 border-t border-line">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Hủy
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-accent hover:bg-accent/90 text-white"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Tạo phiếu kiểm kê
        </Button>
      </div>
    </form>
  );
}
