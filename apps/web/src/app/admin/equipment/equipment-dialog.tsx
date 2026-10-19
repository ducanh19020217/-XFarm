'use client';

import * as React from 'react';
import { Button, FormDialog, Input, Label } from '@xfarm/ui';
import { MoneyInput } from '@/components/ui/money-input';
import {
  type EquipmentItem,
  type CreateEquipmentPayload,
  EQUIPMENT_STATUS_LABELS,
} from '@/lib/equipment-api';
import { EquipmentStatus } from '@xfarm/shared';

interface AreaOption {
  id: string;
  code: string;
  name: string;
}

interface EquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment?: EquipmentItem | null;
  areas: AreaOption[];
  onSubmit: (data: CreateEquipmentPayload) => Promise<void>;
}

export function EquipmentDialog({
  open,
  onOpenChange,
  equipment,
  areas,
  onSubmit,
}: EquipmentDialogProps) {
  const isEdit = Boolean(equipment);

  const [code, setCode] = React.useState('');
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState('');
  const [areaId, setAreaId] = React.useState<string>('');
  const [purchaseDate, setPurchaseDate] = React.useState('');
  const [value, setValue] = React.useState<number | null>(null);
  const [status, setStatus] = React.useState<EquipmentStatus>(EquipmentStatus.ACTIVE);
  const [notes, setNotes] = React.useState('');

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setErrors({});
      setFormError(null);
      if (equipment) {
        setCode(equipment.code || '');
        setName(equipment.name || '');
        setType(equipment.type || '');
        setAreaId(equipment.areaId || '');
        setPurchaseDate(
          equipment.purchaseDate
            ? new Date(equipment.purchaseDate).toISOString().slice(0, 10)
            : '',
        );
        setValue(
          equipment.value !== null && equipment.value !== undefined
            ? Number(equipment.value)
            : null,
        );
        setStatus(equipment.status || EquipmentStatus.ACTIVE);
        setNotes(equipment.notes || '');
      } else {
        setCode('');
        setName('');
        setType('');
        setAreaId('');
        setPurchaseDate('');
        setValue(null);
        setStatus(EquipmentStatus.ACTIVE);
        setNotes('');
      }
    }
  }, [open, equipment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Tên thiết bị không được để trống';
    }
    if (!type.trim()) {
      newErrors.type = 'Loại thiết bị không được để trống';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload: CreateEquipmentPayload = {
        name: name.trim(),
        type: type.trim(),
        code: code.trim() || undefined,
        areaId: areaId || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : null,
        value: typeof value === 'number' ? value : null,
        status,
        notes: notes.trim() || null,
      };

      await onSubmit(payload);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu thiết bị';
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
      title={isEdit ? 'Chỉnh sửa thiết bị' : 'Thêm thiết bị mới'}
      description={
        isEdit
          ? 'Cập nhật thông tin chi tiết của thiết bị'
          : 'Đăng ký thiết bị hoặc công cụ máy móc vào hệ thống'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/50">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="equipment-code">Mã thiết bị</Label>
            <Input
              id="equipment-code"
              placeholder="Tự sinh (EQ-xxxx) nếu để trống"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isSubmitting}
            />
            {errors.code && <p className="text-xs text-red-600">{errors.code}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="equipment-type">Loại thiết bị *</Label>
            <Input
              id="equipment-type"
              placeholder="VD: Máy cày, Máy bơm..."
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                if (errors.type) setErrors((prev) => ({ ...prev, type: '' }));
              }}
              disabled={isSubmitting}
            />
            {errors.type && <p className="text-xs text-red-600">{errors.type}</p>}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="equipment-name">Tên thiết bị *</Label>
          <Input
            id="equipment-name"
            placeholder="VD: Máy bơm nước tưới khu A"
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
            <Label htmlFor="equipment-area">Khu vực quản lý</Label>
            <select
              id="equipment-area"
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className={selectClass}
              disabled={isSubmitting}
            >
              <option value="">Không gắn khu vực</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="equipment-status">Trạng thái</Label>
            <select
              id="equipment-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
              className={selectClass}
              disabled={isSubmitting}
            >
              {Object.entries(EQUIPMENT_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="equipment-purchaseDate">Ngày mua</Label>
            <Input
              id="equipment-purchaseDate"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="equipment-value">Giá trị thiết bị (₫)</Label>
            <MoneyInput
              id="equipment-value"
              value={value}
              onChange={(val) => setValue(val)}
              disabled={isSubmitting}
              placeholder="0"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="equipment-notes">Ghi chú</Label>
          <Input
            id="equipment-notes"
            placeholder="Thông số kỹ thuật, bảo hành..."
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
            {isSubmitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo mới'}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
