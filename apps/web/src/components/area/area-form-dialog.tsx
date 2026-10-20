'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createAreaSchema, type CreateAreaInput, AreaType } from '@xfarm/shared';
import {
  FormDialog,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@xfarm/ui';
import { Loader2 } from 'lucide-react';
import { AREA_TYPE_LABELS, AreaItem } from '@/lib/area-constants';

interface AreaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area?: AreaItem | null;
  parentOptions: Array<{ id: string; name: string; code: string }>;
  onSubmit: (data: CreateAreaInput) => Promise<void>;
  formError?: string | null;
  isSubmitting?: boolean;
}

export function AreaFormDialog({
  open,
  onOpenChange,
  area,
  parentOptions,
  onSubmit,
  formError,
  isSubmitting = false,
}: AreaFormDialogProps) {
  const isEdit = Boolean(area);

  // Lọc danh sách khu cha để không cho chọn chính nó làm cha khi sửa
  const availableParents = React.useMemo(() => {
    if (!area) return parentOptions;
    return parentOptions.filter((p) => p.id !== area.id);
  }, [area, parentOptions]);

  const form = useForm<CreateAreaInput>({
    resolver: zodResolver(createAreaSchema),
    defaultValues: {
      code: '',
      name: '',
      type: AreaType.FIELD,
      parentId: null,
      areaM2: undefined,
      description: '',
      isActive: true,
      geojson: null,
    },
  });

  // Đồng bộ dữ liệu khi mở form sửa hoặc tạo mới
  React.useEffect(() => {
    if (open) {
      if (area) {
        form.reset({
          code: area.code,
          name: area.name,
          type: area.type,
          parentId: area.parentId || null,
          areaM2: area.areaM2 ? Number(area.areaM2) : undefined,
          description: area.description || '',
          isActive: area.isActive,
          geojson: area.geojson || null,
        });
      } else {
        form.reset({
          code: '',
          name: '',
          type: AreaType.FIELD,
          parentId: null,
          areaM2: undefined,
          description: '',
          isActive: true,
          geojson: null,
        });
      }
    }
  }, [open, area, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload: CreateAreaInput = {
      ...values,
      code: values.code?.trim() || undefined,
      description: values.description?.trim() || null,
      parentId: values.parentId || null,
      areaM2: values.areaM2 ? Number(values.areaM2) : null,
    };
    await onSubmit(payload);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Chỉnh sửa thông tin Khu/lô' : 'Thêm Khu/lô mới'}
      description={
        isEdit
          ? 'Cập nhật phân loại, khu cha, diện tích và mô tả cho khu vực này'
          : 'Nhập thông tin phân vùng, diện tích và khu cha để tạo khu/lô mới'
      }
    >
      {formError && (
        <div
          data-testid="form-error-alert"
          className="mb-4 rounded-lg border border-crit/30 bg-crit-bg p-3 text-sm text-crit"
        >
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mã khu/lô & Tên */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="area-code">
              Mã khu/lô{' '}
              <span className="text-xs text-muted font-normal">(để trống tự sinh AR-xxxx)</span>
            </Label>
            <Input
              id="area-code"
              placeholder="VD: AR-0001"
              disabled={isSubmitting}
              {...form.register('code')}
            />
            {form.formState.errors.code && (
              <p className="text-xs text-crit">{form.formState.errors.code.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="area-name">
              Tên khu/lô <span className="text-crit">*</span>
            </Label>
            <Input
              id="area-name"
              placeholder="VD: Lô rau hữu cơ số 1"
              disabled={isSubmitting}
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-crit">{form.formState.errors.name.message}</p>
            )}
          </div>
        </div>

        {/* Loại khu vực & Khu cha */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="area-type">
              Loại khu vực <span className="text-crit">*</span>
            </Label>
            <Select
              defaultValue={form.getValues('type')}
              onValueChange={(val) => form.setValue('type', val as AreaType)}
            >
              <SelectTrigger id="area-type">
                <SelectValue placeholder="Chọn loại khu vực" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(AreaType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {AREA_TYPE_LABELS[t]} ({t})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <p className="text-xs text-crit">{form.formState.errors.type.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="area-parent">Khu cha trực thuộc</Label>
            <Select
              defaultValue={form.getValues('parentId') || 'none'}
              onValueChange={(val) => form.setValue('parentId', val === 'none' ? null : val)}
            >
              <SelectTrigger id="area-parent">
                <SelectValue placeholder="Chọn khu cha (nếu có)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Không có (Khu gốc / Root) --</SelectItem>
                {availableParents.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Diện tích m2 & Mô tả - 2 cột trên desktop */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="area-m2">Diện tích (m²)</Label>
            <Input
              id="area-m2"
              type="number"
              step="0.01"
              placeholder="VD: 500.5"
              disabled={isSubmitting}
              {...form.register('areaM2')}
            />
            {form.formState.errors.areaM2 && (
              <p className="text-xs text-crit">{form.formState.errors.areaM2.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="area-desc">Mô tả / Ghi chú</Label>
            <Input
              id="area-desc"
              placeholder="Ghi chú về thổ nhưỡng, hệ thống tưới hoặc công năng"
              disabled={isSubmitting}
              {...form.register('description')}
            />
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex justify-end gap-2 pt-4 border-t border-line">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : isEdit ? (
              'Cập nhật'
            ) : (
              'Tạo mới'
            )}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
