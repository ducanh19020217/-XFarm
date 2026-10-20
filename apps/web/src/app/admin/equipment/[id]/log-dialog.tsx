'use client';

import * as React from 'react';
import { Button, FormDialog, Input, Label } from '@xfarm/ui';
import { MoneyInput } from '@/components/ui/money-input';
import {
  type EquipmentScheduleItem,
  type CreateLogPayload,
  MAINTENANCE_TYPE_LABELS,
} from '@/lib/equipment-api';
import { MaintenanceType } from '@xfarm/shared';

interface LogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedules: EquipmentScheduleItem[];
  onSubmit: (data: CreateLogPayload) => Promise<void>;
}

export function LogDialog({ open, onOpenChange, schedules, onSubmit }: LogDialogProps) {
  const [date, setDate] = React.useState('');
  const [type, setType] = React.useState<MaintenanceType>(MaintenanceType.ROUTINE);
  const [scheduleId, setScheduleId] = React.useState<string>('');
  const [cost, setCost] = React.useState<number>(0);
  const [notes, setNotes] = React.useState('');

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setErrors({});
      setFormError(null);
      // Default to today
      const todayStr = new Date().toISOString().slice(0, 10);
      setDate(todayStr);
      setType(MaintenanceType.ROUTINE);
      setScheduleId(schedules[0]?.id || '');
      setCost(0);
      setNotes('');
    }
  }, [open, schedules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!date) {
      newErrors.date = 'Ngày thực hiện không được để trống';
    }
    if (cost < 0) {
      newErrors.cost = 'Chi phí phải lớn hơn hoặc bằng 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      await onSubmit({
        date: new Date(date).toISOString(),
        type,
        scheduleId: scheduleId || null,
        cost: Number(cost) || 0,
        notes: notes.trim() || null,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi ghi nhật ký bảo trì';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectClass =
    'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20';

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ghi nhật ký bảo trì mới"
      description="Ghi nhận hoạt động bảo dưỡng, sửa chữa hoặc kiểm định cho thiết bị"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/50">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="log-date">Ngày thực hiện *</Label>
            <Input
              id="log-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date) setErrors((prev) => ({ ...prev, date: '' }));
              }}
              disabled={isSubmitting}
            />
            {errors.date && <p className="text-xs text-red-600">{errors.date}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="log-type">Loại bảo trì *</Label>
            <select
              id="log-type"
              value={type}
              onChange={(e) => setType(e.target.value as MaintenanceType)}
              className={selectClass}
              disabled={isSubmitting}
            >
              {Object.entries(MAINTENANCE_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="log-schedule">Lịch liên quan</Label>
          <select
            id="log-schedule"
            value={scheduleId}
            onChange={(e) => setScheduleId(e.target.value)}
            className={selectClass}
            disabled={isSubmitting}
          >
            <option value="">Không liên quan đến lịch cụ thể</option>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (mỗi {s.intervalDays} ngày)
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Khi chọn lịch, ngày đến hạn tiếp theo của lịch sẽ được tự động cập nhật lại.
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="log-cost">Chi phí bảo trì (₫) *</Label>
          <MoneyInput
            id="log-cost"
            value={cost}
            onChange={(val) => {
              setCost(val);
              if (errors.cost) setErrors((prev) => ({ ...prev, cost: '' }));
            }}
            disabled={isSubmitting}
            placeholder="0"
          />
          {errors.cost && <p className="text-xs text-red-600">{errors.cost}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="log-notes">Ghi chú</Label>
          <Input
            id="log-notes"
            placeholder="Vật tư thay thế, đơn vị sửa chữa..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Đang lưu...' : 'Lưu nhật ký'}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
