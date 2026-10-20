'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createItemSchema,
  type CreateItemInput,
  ItemCategory,
  ITEM_CATEGORY_LABELS,
} from '@xfarm/shared';
import { Button, FormDialog, Input, Label } from '@xfarm/ui';
import { Loader2 } from 'lucide-react';

export interface ItemRecord {
  id: string;
  sku: string;
  name: string;
  category: ItemCategory;
  unit: string;
  minStock: number | null;
  isSellable: boolean;
  isActive: boolean;
  onHand?: number;
}

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ItemRecord | null;
  onSubmit: (data: CreateItemInput) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function ItemFormDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
  isLoading = false,
  error = null,
}: ItemFormDialogProps) {
  const isEdit = Boolean(item);

  const form = useForm<CreateItemInput>({
    resolver: zodResolver(createItemSchema) as never,
    defaultValues: {
      sku: '',
      name: '',
      category: ItemCategory.FERTILIZER,
      unit: '',
      minStock: null,
      isSellable: false,
      isActive: true,
    },
  });

  React.useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          sku: item.sku,
          name: item.name,
          category: item.category,
          unit: item.unit,
          minStock: item.minStock ?? null,
          isSellable: item.isSellable ?? false,
          isActive: item.isActive ?? true,
        });
      } else {
        form.reset({
          sku: '',
          name: '',
          category: ItemCategory.FERTILIZER,
          unit: '',
          minStock: null,
          isSellable: false,
          isActive: true,
        });
      }
    }
  }, [open, item, form]);

  const handleSubmit = async (values: CreateItemInput) => {
    // If sku is empty, ensure it's undefined so backend auto-generates code
    const payload: CreateItemInput = {
      ...values,
      sku: values.sku && values.sku.trim() !== '' ? values.sku.trim() : undefined,
      minStock:
        values.minStock !== undefined && values.minStock !== null && !Number.isNaN(values.minStock)
          ? Number(values.minStock)
          : undefined,
    };
    await onSubmit(payload);
  };

  const errors = form.formState.errors;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Chỉnh sửa vật tư' : 'Thêm vật tư mới'}
      description={
        isEdit
          ? 'Cập nhật thông tin chi tiết vật tư, định mức tồn và quyền bán.'
          : 'Nhập thông tin vật tư mới vào danh mục kho. Mã SKU để trống sẽ được tự động sinh mã.'
      }
      className="sm:max-w-[550px]"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1 sm:col-span-1">
            <Label htmlFor="item-sku">
              Mã SKU <span className="text-xs text-muted font-normal">(tùy chọn)</span>
            </Label>
            <Input
              id="item-sku"
              placeholder={isEdit ? '' : 'Để trống để tự sinh mã (IT-xxxx)'}
              disabled={isEdit || isLoading}
              {...form.register('sku')}
            />
            {errors.sku && (
              <p className="text-xs text-crit mt-1">{errors.sku.message}</p>
            )}
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label htmlFor="item-category">
              Nhóm hàng <span className="text-crit">*</span>
            </Label>
            <select
              id="item-category"
              className="flex h-10 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm text-fg shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              {...form.register('category')}
            >
              {Object.values(ItemCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {ITEM_CATEGORY_LABELS[cat] || cat}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-xs text-crit mt-1">
                {errors.category.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="item-name">
            Tên vật tư / hàng hóa <span className="text-crit">*</span>
          </Label>
          <Input
            id="item-name"
            placeholder="Ví dụ: Phân NPK 16-16-8, Hạt giống cải ngọt..."
            disabled={isLoading}
            {...form.register('name')}
          />
          {errors.name && (
            <p className="text-xs text-crit mt-1">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="item-unit">
              Đơn vị tính <span className="text-crit">*</span>
            </Label>
            <Input
              id="item-unit"
              placeholder="Ví dụ: kg, bao, chai, gói, lít..."
              disabled={isLoading}
              {...form.register('unit')}
            />
            {errors.unit && (
              <p className="text-xs text-crit mt-1">{errors.unit.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="item-min-stock">
              Tồn tối thiểu (định mức){' '}
              <span className="text-xs text-muted font-normal">(tùy chọn)</span>
            </Label>
            <Input
              id="item-min-stock"
              type="number"
              step="any"
              placeholder="0"
              disabled={isLoading}
              {...form.register('minStock', {
                setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)),
              })}
            />
            {errors.minStock && (
              <p className="text-xs text-crit mt-1">
                {errors.minStock.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-1">
          <input
            type="checkbox"
            id="item-is-sellable"
            className="h-4 w-4 rounded-sm border-line text-accent focus:ring-accent"
            disabled={isLoading}
            {...form.register('isSellable')}
          />
          <Label htmlFor="item-is-sellable" className="cursor-pointer text-sm font-normal text-fg">
            Hàng hóa được phép bán trực tiếp (nông sản, thành phẩm)
          </Label>
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
