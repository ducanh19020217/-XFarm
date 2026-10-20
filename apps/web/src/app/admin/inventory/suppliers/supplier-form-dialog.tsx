'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSupplierSchema, type CreateSupplierInput } from '@xfarm/shared';
import { Button, FormDialog, Input, Label } from '@xfarm/ui';
import { Loader2 } from 'lucide-react';

export interface SupplierRecord {
  id: string;
  code: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  taxCode?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: SupplierRecord | null;
  onSubmit: (data: CreateSupplierInput) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
  onSubmit,
  isLoading = false,
  error = null,
}: SupplierFormDialogProps) {
  const isEdit = Boolean(supplier);

  const form = useForm<CreateSupplierInput>({
    resolver: zodResolver(createSupplierSchema) as never,
    defaultValues: {
      code: '',
      name: '',
      phone: '',
      address: '',
      taxCode: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      if (supplier) {
        form.reset({
          code: supplier.code,
          name: supplier.name,
          phone: supplier.phone ?? '',
          address: supplier.address ?? '',
          taxCode: supplier.taxCode ?? '',
        });
      } else {
        form.reset({
          code: '',
          name: '',
          phone: '',
          address: '',
          taxCode: '',
        });
      }
    }
  }, [open, supplier, form]);

  const handleSubmit = async (values: CreateSupplierInput) => {
    const payload: CreateSupplierInput = {
      ...values,
      code: values.code && values.code.trim() !== '' ? values.code.trim() : undefined,
      phone: values.phone && values.phone.trim() !== '' ? values.phone.trim() : undefined,
      address: values.address && values.address.trim() !== '' ? values.address.trim() : undefined,
      taxCode: values.taxCode && values.taxCode.trim() !== '' ? values.taxCode.trim() : undefined,
    };
    await onSubmit(payload);
  };

  const errors = form.formState.errors;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
      description={
        isEdit
          ? 'Cập nhật thông tin đối tác cung cấp vật tư và dịch vụ.'
          : 'Thêm nhà cung cấp mới vào hệ thống. Mã nhà cung cấp để trống sẽ được tự động sinh mã (SUP-xxxx).'
      }
      className="sm:max-w-[500px]"
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
          <Label htmlFor="supplier-code">
            Mã nhà cung cấp <span className="text-xs text-muted font-normal">(tùy chọn)</span>
          </Label>
          <Input
            id="supplier-code"
            placeholder={isEdit ? '' : 'Để trống để tự sinh mã (SUP-xxxx)'}
            disabled={isEdit || isLoading}
            {...form.register('code')}
          />
          {errors.code && (
            <p className="text-xs text-crit mt-1">{errors.code.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="supplier-name">
            Tên nhà cung cấp <span className="text-crit">*</span>
          </Label>
          <Input
            id="supplier-name"
            placeholder="Ví dụ: Công ty Cổ phần Nông nghiệp Xanh..."
            disabled={isLoading}
            {...form.register('name')}
          />
          {errors.name && (
            <p className="text-xs text-crit mt-1">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="supplier-phone">
              Số điện thoại <span className="text-xs text-muted font-normal">(tùy chọn)</span>
            </Label>
            <Input
              id="supplier-phone"
              placeholder="0901234567"
              disabled={isLoading}
              {...form.register('phone')}
            />
            {errors.phone && (
              <p className="text-xs text-crit mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="supplier-tax-code">
              Mã số thuế <span className="text-xs text-muted font-normal">(tùy chọn)</span>
            </Label>
            <Input
              id="supplier-tax-code"
              placeholder="0101234567"
              disabled={isLoading}
              {...form.register('taxCode')}
            />
            {errors.taxCode && (
              <p className="text-xs text-crit mt-1">
                {errors.taxCode.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="supplier-address">
            Địa chỉ <span className="text-xs text-muted font-normal">(tùy chọn)</span>
          </Label>
          <Input
            id="supplier-address"
            placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố..."
            disabled={isLoading}
            {...form.register('address')}
          />
          {errors.address && (
            <p className="text-xs text-crit mt-1">{errors.address.message}</p>
          )}
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
