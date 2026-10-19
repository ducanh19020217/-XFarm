'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createEmployeeSchema,
  PayType,
  PAY_TYPE_LABELS,
  type CreateEmployeeInput,
} from '@xfarm/shared';
import {
  FormDialog,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@xfarm/ui';
import { Loader2 } from 'lucide-react';
import { MoneyInput } from '../../common/money-input';
import type { EmployeeItem } from '../../common/types';

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: EmployeeItem | null;
  onSubmit: (data: CreateEmployeeInput) => Promise<void>;
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  onSubmit,
}: EmployeeFormDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      code: '',
      fullName: '',
      phone: '',
      position: '',
      payType: PayType.DAILY,
      baseRate: 0,
      isActive: true,
    },
  });

  React.useEffect(() => {
    if (open) {
      setFormError(null);
      if (employee) {
        reset({
          code: employee.code || '',
          fullName: employee.fullName,
          phone: employee.phone || '',
          position: employee.position,
          payType: employee.payType,
          baseRate: Number(employee.baseRate) || 0,
          isActive: employee.isActive ?? true,
        });
      } else {
        reset({
          code: '',
          fullName: '',
          phone: '',
          position: '',
          payType: PayType.DAILY,
          baseRate: 0,
          isActive: true,
        });
      }
    }
  }, [open, employee, reset]);

  const handleFormSubmit = async (values: CreateEmployeeInput) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu nhân viên';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = Boolean(employee);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}
      description="Điền thông tin nhân viên, hình thức trả lương và mức lương cơ bản."
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {formError && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">
            {formError}
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="code">Mã nhân viên (để trống để tự sinh)</Label>
          <Input
            id="code"
            placeholder="NV-0001"
            disabled={isEdit || submitting}
            {...register('code')}
          />
          {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="fullName">
            Họ và tên <span className="text-red-500">*</span>
          </Label>
          <Input
            id="fullName"
            placeholder="Nguyễn Văn A"
            disabled={submitting}
            {...register('fullName')}
          />
          {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input
              id="phone"
              placeholder="0912345678"
              disabled={submitting}
              {...register('phone')}
            />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="position">
              Vị trí công việc <span className="text-red-500">*</span>
            </Label>
            <Input
              id="position"
              placeholder="Công nhân trồng trọt"
              disabled={submitting}
              {...register('position')}
            />
            {errors.position && <p className="text-xs text-red-500">{errors.position.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="payType">
              Hình thức lương <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="payType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={submitting}>
                  <SelectTrigger id="payType">
                    <SelectValue placeholder="Chọn hình thức lương" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PayType.DAILY}>{PAY_TYPE_LABELS[PayType.DAILY]}</SelectItem>
                    <SelectItem value={PayType.MONTHLY}>
                      {PAY_TYPE_LABELS[PayType.MONTHLY]}
                    </SelectItem>
                    <SelectItem value={PayType.PIECE}>{PAY_TYPE_LABELS[PayType.PIECE]}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.payType && <p className="text-xs text-red-500">{errors.payType.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="baseRate">
              Mức lương cơ bản <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="baseRate"
              control={control}
              render={({ field }) => (
                <MoneyInput
                  id="baseRate"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={submitting}
                  error={Boolean(errors.baseRate)}
                  placeholder="300.000"
                />
              )}
            />
            {errors.baseRate && <p className="text-xs text-red-500">{errors.baseRate.message}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="isActive"
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            disabled={submitting}
            {...register('isActive')}
          />
          <Label htmlFor="isActive" className="cursor-pointer font-normal">
            Đang hoạt động (cho phép giao việc & chấm công)
          </Label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Lưu thay đổi' : 'Thêm nhân viên'}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
