'use client';

import * as React from 'react';
import { Button, FormDialog, Input, Label } from '@xfarm/ui';
import { ApiError } from '@/lib/api';
import {
  type SensorItem,
  type CreateSensorPayload,
  SensorType,
  AlertOp,
  SENSOR_TYPE_LABELS,
  DEFAULT_UNITS,
  ALERT_OP_LABELS,
} from '@/lib/iot-api';

interface AreaOption {
  id: string;
  code: string;
  name: string;
}

export interface SensorFormValues extends CreateSensorPayload {
  initialAlertRule?: {
    op: AlertOp;
    threshold: number;
    cooldownMinutes: number;
  };
}

interface SensorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sensor: SensorItem | null;
  areas: AreaOption[];
  onSubmit: (values: SensorFormValues) => Promise<void>;
}

export function SensorDialog({ open, onOpenChange, sensor, areas, onSubmit }: SensorDialogProps) {
  const isEditing = Boolean(sensor);

  const [code, setCode] = React.useState('');
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState<SensorType>(SensorType.TEMP);
  const [unit, setUnit] = React.useState('°C');
  const [areaId, setAreaId] = React.useState('');
  const [isActive, setIsActive] = React.useState(true);

  // Optional initial rule (only for create)
  const [enableInitialRule, setEnableInitialRule] = React.useState(false);
  const [initialOp, setInitialOp] = React.useState<AlertOp>(AlertOp.GT);
  const [initialThreshold, setInitialThreshold] = React.useState<string>('');
  const [initialCooldown, setInitialCooldown] = React.useState<string>('30');

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset form when dialog opens or sensor changes
  React.useEffect(() => {
    if (open) {
      if (sensor) {
        setCode(sensor.code || '');
        setName(sensor.name || '');
        setType(sensor.type || SensorType.TEMP);
        setUnit(sensor.unit || '°C');
        setAreaId(sensor.areaId || '');
        setIsActive(sensor.isActive ?? true);
        setEnableInitialRule(false);
      } else {
        setCode('');
        setName('');
        setType(SensorType.TEMP);
        setUnit(DEFAULT_UNITS[SensorType.TEMP] || '°C');
        setAreaId(areas[0]?.id || '');
        setIsActive(true);
        setEnableInitialRule(false);
        setInitialOp(AlertOp.GT);
        setInitialThreshold('');
        setInitialCooldown('30');
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open, sensor]);

  // Synchronize initial areaId when areas load asynchronously
  React.useEffect(() => {
    if (open && !isEditing && !areaId && areas.length > 0) {
      setAreaId(areas[0].id);
    }
  }, [open, isEditing, areaId, areas]);

  const handleTypeChange = (newType: SensorType) => {
    setType(newType);
    // Automatically set default unit if user hasn't typed a custom one or it was default
    if (!isEditing) {
      setUnit(DEFAULT_UNITS[newType] || '');
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = 'Tên cảm biến không được để trống';
    }
    if (!unit.trim()) {
      errs.unit = 'Đơn vị đo không được để trống';
    }
    if (!areaId) {
      errs.areaId = 'Vui lòng chọn khu/lô';
    }
    if (enableInitialRule && !isEditing) {
      if (!initialThreshold.trim() || Number.isNaN(Number(initialThreshold))) {
        errs.initialThreshold = 'Ngưỡng cảnh báo phải là một số hợp lệ';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload: SensorFormValues = {
        code: code.trim() || undefined,
        name: name.trim(),
        type,
        unit: unit.trim(),
        areaId,
        isActive,
      };

      if (enableInitialRule && !isEditing && initialThreshold.trim()) {
        payload.initialAlertRule = {
          op: initialOp,
          threshold: Number(initialThreshold),
          cooldownMinutes: Number(initialCooldown) || 30,
        };
      }

      await onSubmit(payload);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu';
      const newErrors: Record<string, string> = { submit: msg };
      const errorObj =
        err instanceof ApiError
          ? err
          : err && typeof err === 'object'
            ? (err as { statusCode?: number; message?: string; errors?: unknown })
            : null;

      const statusCode = errorObj?.statusCode;
      const lowerMsg = (msg || '').toLowerCase();

      if (statusCode === 409 || lowerMsg.includes('mã')) {
        newErrors.code = msg;
      } else if (statusCode === 422 || lowerMsg.includes('khu/lô') || lowerMsg.includes('area')) {
        newErrors.areaId = msg;
      } else if (lowerMsg.includes('tên') || lowerMsg.includes('name')) {
        newErrors.name = msg;
      } else if (lowerMsg.includes('đơn vị') || lowerMsg.includes('unit')) {
        newErrors.unit = msg;
      }

      if (Array.isArray(errorObj?.errors)) {
        for (const item of errorObj.errors) {
          if (typeof item === 'object' && item !== null) {
            const field =
              (item as { field?: string }).field || (item as { path?: string[] }).path?.join('.');
            const itemMsg = (item as { message?: string }).message;
            if (field && itemMsg) {
              newErrors[field] = itemMsg;
            }
          }
        }
      }

      setErrors(newErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSubmit();
  };

  const selectClass =
    'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20';

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Chỉnh sửa Cảm biến' : 'Thêm Cảm biến Mới'}
      description={
        isEditing
          ? `Cập nhật thông tin cảm biến ${sensor?.code || ''}`
          : 'Khai báo thông số kỹ thuật và khu vực lắp đặt cảm biến IoT'
      }
    >
      <form onSubmit={handleFormSubmit} className="space-y-4 py-1" data-testid="sensor-form">
        {errors.submit && (
          <div
            role="alert"
            data-testid="sensor-form-error"
            className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
          >
            {errors.submit}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mã cảm biến */}
          <div className="space-y-1.5">
            <Label htmlFor="sensor-code">Mã cảm biến (tùy chọn)</Label>
            <Input
              id="sensor-code"
              placeholder={isEditing ? sensor?.code : 'Tự động sinh (SN-0001)'}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (errors.code) setErrors((prev) => ({ ...prev, code: '' }));
              }}
              disabled={isEditing}
            />
            {errors.code ? (
              <p className="text-[11px] text-red-500" data-testid="sensor-code-error">
                {errors.code}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                {isEditing ? 'Không thể đổi mã cảm biến' : 'Để trống để hệ thống tự cấp mã'}
              </p>
            )}
          </div>

          {/* Tên cảm biến */}
          <div className="space-y-1.5">
            <Label htmlFor="sensor-name">
              Tên cảm biến <span className="text-red-500">*</span>
            </Label>
            <Input
              id="sensor-name"
              placeholder="Ví dụ: Cảm biến nhiệt độ Ao 1"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
            />
            {errors.name && (
              <p className="text-[11px] text-red-500" data-testid="sensor-name-error">
                {errors.name}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Loại cảm biến */}
          <div className="space-y-1.5">
            <Label htmlFor="sensor-type">
              Loại cảm biến <span className="text-red-500">*</span>
            </Label>
            <select
              id="sensor-type"
              value={type}
              onChange={(e) => {
                handleTypeChange(e.target.value as SensorType);
                if (errors.type) setErrors((prev) => ({ ...prev, type: '' }));
              }}
              className={selectClass}
            >
              {Object.values(SensorType).map((st) => (
                <option key={st} value={st}>
                  {SENSOR_TYPE_LABELS[st]} ({st})
                </option>
              ))}
            </select>
          </div>

          {/* Đơn vị đo */}
          <div className="space-y-1.5">
            <Label htmlFor="sensor-unit">
              Đơn vị đo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="sensor-unit"
              placeholder="°C, %, pH, mg/L, lux..."
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value);
                if (errors.unit) setErrors((prev) => ({ ...prev, unit: '' }));
              }}
            />
            {errors.unit && (
              <p className="text-[11px] text-red-500" data-testid="sensor-unit-error">
                {errors.unit}
              </p>
            )}
          </div>
        </div>

        {/* Khu/lô */}
        <div className="space-y-1.5">
          <Label htmlFor="sensor-area">
            Khu/lô lắp đặt <span className="text-red-500">*</span>
          </Label>
          <select
            id="sensor-area"
            value={areaId}
            onChange={(e) => {
              setAreaId(e.target.value);
              if (errors.areaId) setErrors((prev) => ({ ...prev, areaId: '' }));
            }}
            className={selectClass}
          >
            <option value="">-- Chọn khu/lô --</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
          {errors.areaId && (
            <p className="text-[11px] text-red-500" data-testid="sensor-area-error">
              {errors.areaId}
            </p>
          )}
        </div>

        {/* Trạng thái hoạt động */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="sensor-is-active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700"
          />
          <Label htmlFor="sensor-is-active" className="cursor-pointer font-normal text-sm">
            Kích hoạt tiếp nhận dữ liệu từ cảm biến này
          </Label>
        </div>

        {/* Thiết lập ngưỡng ban đầu (tùy chọn khi tạo mới) */}
        {!isEditing && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enable-initial-rule"
                checked={enableInitialRule}
                onChange={(e) => setEnableInitialRule(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <Label
                htmlFor="enable-initial-rule"
                className="cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                Thêm ngưỡng cảnh báo ban đầu (tùy chọn)
              </Label>
            </div>

            {enableInitialRule && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="initial-rule-op" className="text-xs">
                    Điều kiện
                  </Label>
                  <select
                    id="initial-rule-op"
                    value={initialOp}
                    onChange={(e) => setInitialOp(e.target.value as AlertOp)}
                    className={selectClass}
                  >
                    <option value={AlertOp.GT}>{ALERT_OP_LABELS[AlertOp.GT]}</option>
                    <option value={AlertOp.LT}>{ALERT_OP_LABELS[AlertOp.LT]}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="initial-rule-threshold" className="text-xs">
                    Ngưỡng ({unit || 'giá trị'})
                  </Label>
                  <Input
                    id="initial-rule-threshold"
                    type="number"
                    step="any"
                    placeholder="35"
                    value={initialThreshold}
                    onChange={(e) => setInitialThreshold(e.target.value)}
                  />
                  {errors.initialThreshold && (
                    <p className="text-[10px] text-red-500">{errors.initialThreshold}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="initial-rule-cooldown" className="text-xs">
                    Chờ lặp lại (phút)
                  </Label>
                  <Input
                    id="initial-rule-cooldown"
                    type="number"
                    min="1"
                    placeholder="30"
                    value={initialCooldown}
                    onChange={(e) => setInitialCooldown(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={isSubmitting} data-testid="submit-sensor-form-btn">
            {isSubmitting ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Tạo cảm biến'}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
