'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createWarehouseSchema, type CreateWarehouseInput } from '@xfarm/shared';
import { Button, FormDialog, Input, Label } from '@xfarm/ui';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export interface WarehouseRecord {
  id: string;
  code: string;
  name: string;
  areaId?: string | null;
  area?: { id: string; name: string; code?: string } | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AreaOption {
  id: string;
  name: string;
  code?: string;
}

interface WarehouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: WarehouseRecord | null;
  onSubmit: (data: CreateWarehouseInput) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function WarehouseFormDialog({
  open,
  onOpenChange,
  warehouse,
  onSubmit,
  isLoading = false,
  error = null,
}: WarehouseFormDialogProps) {
  const isEdit = Boolean(warehouse);
  const [areas, setAreas] = React.useState<AreaOption[]>([]);

  const form = useForm<CreateWarehouseInput>({
    resolver: zodResolver(createWarehouseSchema) as never,
    defaultValues: {
      code: '',
      name: '',
      areaId: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      // Load available areas for warehouse linking
      Promise.resolve(
        apiFetch<{ data: AreaOption[] } | AreaOption[]>('/areas?page=1&pageSize=100&isActive=true'),
      )
        .then((res) => {
          if (!res) return;
          const list = Array.isArray(res) ? res : res.data;
          setAreas(list || []);
        })
        .catch(() => {
          // ignore area fetch failure in dialog
        });

      if (warehouse) {
        form.reset({
          code: warehouse.code,
          name: warehouse.name,
          areaId: warehouse.areaId ?? '',
        });
      } else {
        form.reset({
          code: '',
          name: '',
          areaId: '',
        });
      }
    }
  }, [open, warehouse, form]);

  const handleSubmit = async (values: CreateWarehouseInput) => {
    const payload: CreateWarehouseInput = {
      ...values,
      code: values.code && values.code.trim() !== '' ? values.code.trim() : undefined,
      areaId: values.areaId && values.areaId.trim() !== '' ? values.areaId.trim() : undefined,
    };
    await onSubmit(payload);
  };

  const errors = form.formState.errors;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Chỉnh sửa kho hàng' : 'Thêm kho hàng mới'}
      description={
        isEdit
          ? 'Cập nhật thông tin kho hàng và khu vực phụ trách.'
          : 'Thêm kho hàng mới vào hệ thống quản lý. Mã kho để trống sẽ được tự động sinh mã (WH-xxxx).'
      }
      className="sm:max-w-[480px]"
    >
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-1">
        {error && (
          <div
            role="alert"
            className="rounded-md bg-crit-bg p-3 text-sm text-crit border border-crit/30"
          >
            {error}
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="warehouse-code">
            Mã kho <span className="text-xs text-muted font-normal">(tùy chọn)</span>
          </Label>
          <Input
            id="warehouse-code"
            placeholder={isEdit ? '' : 'Để trống để tự sinh mã (WH-xxxx)'}
            disabled={isEdit || isLoading}
            {...form.register('code')}
          />
          {errors.code && <p className="text-xs text-crit mt-1">{errors.code.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="warehouse-name">
            Tên kho hàng <span className="text-crit">*</span>
          </Label>
          <Input
            id="warehouse-name"
            placeholder="Ví dụ: Kho vật tư trung tâm, Kho thành phẩm..."
            disabled={isLoading}
            {...form.register('name')}
          />
          {errors.name && <p className="text-xs text-crit mt-1">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="warehouse-area">
            Khu vực gắn kèm <span className="text-xs text-muted font-normal">(tùy chọn)</span>
          </Label>
          <select
            id="warehouse-area"
            className="flex h-10 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm text-fg shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            {...form.register('areaId')}
          >
            <option value="">-- Không gắn khu vực riêng --</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.code ? `${area.code} - ${area.name}` : area.name}
              </option>
            ))}
          </select>
          {errors.areaId && <p className="text-xs text-crit mt-1">{errors.areaId.message}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-line">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Hủy bỏ
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : isEdit ? (
              'Lưu thay đổi'
            ) : (
              'Tạo mới'
            )}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
