'use client';

import * as React from 'react';
import { Button, FormDialog, Input, Label } from '@xfarm/ui';
import type { EquipmentScheduleItem, CreateSchedulePayload } from '@/lib/equipment-api';

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: EquipmentScheduleItem | null;
  onSubmit: (data: CreateSchedulePayload) => Promise<void>;
}

export function ScheduleDialog({
  open,
  onOpenChange,
  schedule,
  onSubmit,
}: ScheduleDialogProps) {
  const isEdit = Boolean(schedule);

  const [name, setName] = React.useState('');
  const [intervalDays, setIntervalDays] = React.useState<number>(30);
  const [nextDueDate, setNextDueDate] = React.useState('');
  const [isActive, setIsActive] = React.useState(true);

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setErrors({});
      setFormError(null);
      if (schedule) {
        setName(schedule.name || '');
        setIntervalDays(schedule.intervalDays || 30);
        setNextDueDate(
          schedule.nextDueDate
            ? new Date(schedule.nextDueDate).toISOString().slice(0, 10)
            : '',
        );
        setIsActive(schedule.isActive ?? true);
      } else {
        setName('');
        setIntervalDays(30);
        // Default nextDueDate to today + 30 days
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 30);
        setNextDueDate(defaultDue.toISOString().slice(0, 10));
        setIsActive(true);
      }
    }
  }, [open, schedule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Tên lịch bảo trì không được để trống';
    }
    if (!intervalDays || intervalDays < 1) {
      newErrors.intervalDays = 'Chu kỳ bảo trì phải lớn hơn 0 ngày';
    }
    if (!nextDueDate) {
      newErrors.nextDueDate = 'Ngày đến hạn tiếp theo không được để trống';
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
        name: name.trim(),
        intervalDays: Number(intervalDays),
        nextDueDate: new Date(nextDueDate).toISOString(),
        isActive,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu lịch bảo trì';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Chỉnh sửa lịch bảo trì' : 'Thêm lịch bảo trì mới'}
      description={
        isEdit
          ? 'Cập nhật chu kỳ và ngày đến hạn tiếp theo của lịch bảo trì'
          : 'Thiết lập chu kỳ bảo dưỡng định kỳ cho thiết bị'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/50">
            {formError}
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="schedule-name">Tên lịch bảo trì *</Label>
          <Input
            id="schedule-name"
            placeholder="VD: Thay nhớt & lọc dầu định kỳ"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
            }}
            disabled={isSubmitting}
          />
          {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="schedule-intervalDays">Chu kỳ lặp lại (ngày) *</Label>
            <Input
              id="schedule-intervalDays"
              type="number"
              min="1"
              value={intervalDays}
              onChange={(e) => {
                setIntervalDays(parseInt(e.target.value, 10) || 0);
                if (errors.intervalDays) setErrors((prev) => ({ ...prev, intervalDays: '' }));
              }}
              disabled={isSubmitting}
            />
            {errors.intervalDays && (
              <p className="text-xs text-red-600">{errors.intervalDays}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="schedule-nextDueDate">Ngày đến hạn tiếp theo *</Label>
            <Input
              id="schedule-nextDueDate"
              type="date"
              value={nextDueDate}
              onChange={(e) => {
                setNextDueDate(e.target.value);
                if (errors.nextDueDate) setErrors((prev) => ({ ...prev, nextDueDate: '' }));
              }}
              disabled={isSubmitting}
            />
            {errors.nextDueDate && (
              <p className="text-xs text-red-600">{errors.nextDueDate}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            id="schedule-isActive"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={isSubmitting}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <Label htmlFor="schedule-isActive" className="cursor-pointer text-sm font-normal">
            Kích hoạt lịch bảo trì này
          </Label>
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
            {isSubmitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo lịch'}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
