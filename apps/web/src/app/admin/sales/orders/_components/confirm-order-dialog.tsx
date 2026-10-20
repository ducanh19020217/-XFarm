'use client';

import * as React from 'react';
import { Button, FormDialog, Label } from '@xfarm/ui';
import { apiFetch, ApiError } from '@/lib/api';
import type { WarehouseOption } from '../../_components/types';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderCode?: string;
  onSuccess: () => void;
}

export function ConfirmOrderDialog({
  open,
  onOpenChange,
  orderId,
  orderCode,
  onSuccess,
}: ConfirmOrderDialogProps) {
  const [warehouses, setWarehouses] = React.useState<WarehouseOption[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = React.useState('');
  const [loadingWarehouses, setLoadingWarehouses] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setErrorMessage(null);
      return;
    }

    let active = true;
    setLoadingWarehouses(true);
    setErrorMessage(null);

    apiFetch<{ data: WarehouseOption[] } | WarehouseOption[]>('/warehouses?pageSize=100')
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res) ? res : res?.data || [];
        setWarehouses(list);
        if (list.length > 0 && !selectedWarehouseId) {
          // Pre-select first warehouse (or WH-FINISHED if found)
          const finished = list.find((w) => w.code === 'WH-FINISHED');
          setSelectedWarehouseId(finished ? finished.id : list[0].id);
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error('Lỗi khi tải danh sách kho:', err);
      })
      .finally(() => {
        if (active) setLoadingWarehouses(false);
      });

    return () => {
      active = false;
    };
  }, [open, selectedWarehouseId]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouseId) {
      setErrorMessage('Vui lòng chọn kho xuất hàng');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiFetch(`/sales-orders/${orderId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ warehouseId: selectedWarehouseId }),
      });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        // Backend returns: "Không đủ tồn kho: [tên hàng] còn X, cần Y"
        setErrorMessage(err.message || 'Lỗi khi xác nhận đơn hàng');
      } else {
        setErrorMessage('Đã có lỗi không mong muốn xảy ra');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Xác nhận đơn hàng ${orderCode || ''}`}
      description="Chọn kho xuất hàng theo nguyên tắc FIFO (vào trước xuất trước)"
      className="sm:max-w-[480px]"
    >
      <form onSubmit={handleConfirm} className="space-y-4">
        {errorMessage && (
          <div
            data-testid="confirm-order-error"
            className="flex items-start gap-2 p-3.5 text-sm rounded-lg bg-crit-bg text-crit border border-crit/20"
          >
            <AlertTriangle className="h-5 w-5 text-crit shrink-0 mt-0.5" />
            <div className="font-medium">{errorMessage}</div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="warehouse-select">
            Kho xuất hàng <span className="text-crit">*</span>
          </Label>
          <select
            id="warehouse-select"
            className="flex h-9 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm shadow-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
            value={selectedWarehouseId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setSelectedWarehouseId(e.target.value)
            }
            disabled={loadingWarehouses || isSubmitting}
          >
            <option value="">-- Chọn kho xuất --</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">
            Hệ thống sẽ tự động tìm các lô hàng có hạn sử dụng hoặc ngày nhập cũ nhất để xuất trước.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-line">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="border-line text-fg"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedWarehouseId}
            className="bg-accent hover:bg-accent-hover text-white"
          >
            {isSubmitting ? 'Đang xuất kho...' : 'Xác nhận xuất kho'}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
