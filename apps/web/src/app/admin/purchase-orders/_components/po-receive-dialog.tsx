'use client';

import * as React from 'react';
import { Button, FormDialog, Input, Label } from '@xfarm/ui';
import { Loader2 } from 'lucide-react';
import type { PurchaseOrderDetail, WarehouseOption } from './types';

export interface ReceiveSubmitPayload {
  warehouseId: string;
  lines: {
    lineId: string;
    quantity: number;
    lotCode?: string;
    expiryDate?: string;
    unitCost?: number;
  }[];
}

interface POReceiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrderDetail;
  warehouses: WarehouseOption[];
  onSubmit: (payload: ReceiveSubmitPayload) => Promise<void>;
  isSubmitting?: boolean;
}

interface LineReceiveState {
  lineId: string;
  quantity: number | '';
  lotCode: string;
  expiryDate: string;
  unitCost: number | '';
}

export function POReceiveDialog({
  open,
  onOpenChange,
  purchaseOrder,
  warehouses,
  onSubmit,
  isSubmitting = false,
}: POReceiveDialogProps) {
  const [warehouseId, setWarehouseId] = React.useState('');
  const [receiveLines, setReceiveLines] = React.useState<LineReceiveState[]>([]);
  const [errors, setErrors] = React.useState<{
    warehouseId?: string;
    general?: string;
    lineErrors?: Record<string, string>;
  }>({});

  // Initialize or reset line receive state when dialog opens or purchaseOrder changes
  React.useEffect(() => {
    if (open && purchaseOrder) {
      setWarehouseId(warehouses[0]?.id || '');
      setErrors({});
      const initial = purchaseOrder.lines.map((line) => {
        const ordered = Number(line.quantity) || 0;
        const received = Number(line.receivedQty) || 0;
        const remaining = Math.max(0, ordered - received);
        return {
          lineId: line.id,
          quantity: remaining,
          lotCode: '',
          expiryDate: '',
          unitCost: '' as number | '',
        };
      });
      setReceiveLines(initial);
    }
  }, [open, purchaseOrder, warehouses]);

  const updateLineState = (
    lineId: string,
    field: keyof LineReceiveState,
    value: string | number,
  ) => {
    setReceiveLines((prev) =>
      prev.map((l) => (l.lineId === lineId ? { ...l, [field]: value } : l)),
    );
    if (errors.lineErrors?.[lineId]) {
      setErrors((prev) => {
        if (!prev.lineErrors) return prev;
        const next = { ...prev.lineErrors };
        delete next[lineId];
        return { ...prev, lineErrors: next };
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: typeof errors = {};
    const lineErrors: Record<string, string> = {};

    if (!warehouseId) {
      newErrors.warehouseId = 'Vui lòng chọn kho nhận hàng';
    }

    let hasAnyQuantity = false;
    const linesToSubmit: ReceiveSubmitPayload['lines'] = [];

    for (const poLine of purchaseOrder.lines) {
      const rec = receiveLines.find((l) => l.lineId === poLine.id);
      const ordered = Number(poLine.quantity) || 0;
      const received = Number(poLine.receivedQty) || 0;
      const remaining = Math.max(0, ordered - received);

      const qty = rec?.quantity === '' || rec?.quantity === undefined ? 0 : Number(rec.quantity);

      if (Number.isNaN(qty) || qty < 0) {
        lineErrors[poLine.id] = 'Số lượng nhận không được âm';
        continue;
      }

      if (qty > remaining) {
        lineErrors[poLine.id] = `Số lượng nhận không được vượt quá số lượng còn lại (${remaining})`;
        continue;
      }

      if (qty > 0) {
        hasAnyQuantity = true;
        const itemPayload: ReceiveSubmitPayload['lines'][number] = {
          lineId: poLine.id,
          quantity: qty,
        };
        if (rec?.lotCode?.trim()) {
          itemPayload.lotCode = rec.lotCode.trim();
        }
        if (rec?.expiryDate) {
          itemPayload.expiryDate = rec.expiryDate;
        }
        if (rec?.unitCost !== '' && rec?.unitCost !== undefined) {
          const cost = Number(rec.unitCost);
          if (!Number.isNaN(cost) && cost >= 0) {
            itemPayload.unitCost = cost;
          }
        }
        linesToSubmit.push(itemPayload);
      }
    }

    if (Object.keys(lineErrors).length > 0) {
      newErrors.lineErrors = lineErrors;
    }

    if (!hasAnyQuantity && Object.keys(lineErrors).length === 0) {
      newErrors.general = 'Vui lòng nhập số lượng nhận cho ít nhất một dòng';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    await onSubmit({
      warehouseId,
      lines: linesToSubmit,
    });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nhận hàng vào kho"
      description={`Đơn mua: ${purchaseOrder.code} · ${purchaseOrder.supplier?.name || ''}`}
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {errors.general && (
          <p
            role="alert"
            className="rounded-md border border-crit/30 bg-crit-bg p-3 text-sm text-crit"
          >
            {errors.general}
          </p>
        )}

        <div className="space-y-1">
          <Label htmlFor="receive-warehouse" className="text-fg">
            Kho nhận hàng *
          </Label>
          <select
            id="receive-warehouse"
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value);
              if (errors.warehouseId) {
                setErrors((prev) => ({ ...prev, warehouseId: undefined }));
              }
            }}
            className="flex h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="">Chọn kho nhận</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} - {w.name}
              </option>
            ))}
          </select>
          {errors.warehouseId && <p className="text-xs text-crit">{errors.warehouseId}</p>}
        </div>

        <div className="space-y-2">
          <Label className="font-semibold text-fg">Chi tiết dòng nhận hàng</Label>
          <div className="rounded-md border border-line bg-surface-2 p-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-muted">
                  <th className="p-2 min-w-[160px]">Vật tư</th>
                  <th className="p-2 text-center w-20">Đã đặt</th>
                  <th className="p-2 text-center w-20">Đã nhận</th>
                  <th className="p-2 text-center w-20 font-semibold text-ok">Còn lại</th>
                  <th className="p-2 w-28">Số lượng nhận *</th>
                  <th className="p-2 w-32">Mã lô</th>
                  <th className="p-2 w-36">Hạn dùng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {purchaseOrder.lines.map((line) => {
                  const rec = receiveLines.find((l) => l.lineId === line.id);
                  const ordered = Number(line.quantity) || 0;
                  const received = Number(line.receivedQty) || 0;
                  const remaining = Math.max(0, ordered - received);
                  const lineErr = errors.lineErrors?.[line.id];

                  return (
                    <tr key={line.id} className="bg-surface">
                      <td className="p-2 align-top font-medium text-fg">
                        <div>{line.item?.name || 'Vật tư'}</div>
                        <div className="text-xs text-muted">
                          {line.item?.sku || ''} ({line.item?.unit || ''})
                        </div>
                      </td>
                      <td className="p-2 align-top text-center text-fg-2">{ordered}</td>
                      <td className="p-2 align-top text-center text-fg-2">{received}</td>
                      <td className="p-2 align-top text-center font-semibold text-ok">
                        {remaining}
                      </td>
                      <td className="p-2 align-top">
                        <Input
                          id={`receive-qty-${line.id}`}
                          aria-label={`Số nhận dòng ${line.item?.name || line.id}`}
                          type="number"
                          min="0"
                          max={remaining}
                          step="any"
                          value={rec?.quantity ?? ''}
                          disabled={remaining === 0}
                          onChange={(e) =>
                            updateLineState(
                              line.id,
                              'quantity',
                              e.target.value === '' ? '' : Number(e.target.value),
                            )
                          }
                          className="h-9"
                        />
                        {lineErr && <p className="mt-1 text-xs text-crit">{lineErr}</p>}
                      </td>
                      <td className="p-2 align-top">
                        <Input
                          id={`receive-lot-${line.id}`}
                          aria-label={`Mã lô ${line.item?.name || line.id}`}
                          placeholder="Tùy chọn"
                          value={rec?.lotCode ?? ''}
                          disabled={remaining === 0}
                          onChange={(e) => updateLineState(line.id, 'lotCode', e.target.value)}
                          className="h-9"
                        />
                      </td>
                      <td className="p-2 align-top">
                        <Input
                          id={`receive-expiry-${line.id}`}
                          aria-label={`Hạn dùng ${line.item?.name || line.id}`}
                          type="date"
                          value={rec?.expiryDate ?? ''}
                          disabled={remaining === 0}
                          onChange={(e) => updateLineState(line.id, 'expiryDate', e.target.value)}
                          className="h-9"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-line">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Đóng
          </Button>
          <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang nhận...
              </>
            ) : (
              'Xác nhận nhận hàng'
            )}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
