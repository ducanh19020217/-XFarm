'use client';

import * as React from 'react';
import { CustomerType, createCustomerSchema, updateCustomerSchema } from '@xfarm/shared';
import { Button, FormDialog, Input, Label } from '@xfarm/ui';
import { apiFetch, ApiError } from '@/lib/api';
import type { CustomerRecord } from '../../_components/types';
import { customerTypeLabels } from '../../_components/constants';

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: CustomerRecord | null;
  onSuccess: (saved: CustomerRecord) => void;
  title?: string;
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSuccess,
  title,
}: CustomerFormDialogProps) {
  const isEdit = Boolean(customer?.id);

  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [type, setType] = React.useState<CustomerType>(CustomerType.RETAIL);
  const [isActive, setIsActive] = React.useState(true);

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setPhone(customer.phone || '');
      setEmail(customer.email || '');
      setAddress(customer.address || '');
      setType(customer.type || CustomerType.RETAIL);
      setIsActive(customer.isActive ?? true);
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setType(CustomerType.RETAIL);
      setIsActive(true);
    }
    setErrors({});
    setGlobalError(null);
  }, [customer, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGlobalError(null);

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      type,
      isActive,
    };

    const schema = isEdit ? updateCustomerSchema : createCustomerSchema;
    const validation = schema.safeParse(payload);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = isEdit ? `/customers/${customer!.id}` : '/customers';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await apiFetch<CustomerRecord | { data: CustomerRecord }>(endpoint, {
        method,
        body: JSON.stringify(validation.data),
      });
      const saved = (res && 'data' in res ? res.data : res) as CustomerRecord;
      onSuccess(saved);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409 || err.message?.includes('Số điện thoại')) {
          setErrors((prev) => ({
            ...prev,
            phone: 'Số điện thoại khách hàng đã tồn tại',
          }));
        } else {
          setGlobalError(err.message || 'Lỗi khi lưu khách hàng');
        }
      } else {
        setGlobalError('Đã có lỗi không mong muốn xảy ra');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogTitle = title || (isEdit ? 'Sửa thông tin khách hàng' : 'Thêm khách hàng mới');

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      description={
        isEdit ? 'Cập nhật thông tin khách hàng' : 'Nhập thông tin để tạo khách hàng mới'
      }
      className="sm:max-w-[500px]"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {globalError && (
          <div className="p-3 text-sm rounded bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">
            {globalError}
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="customer-name">
            Tên khách hàng <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="customer-name"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder="Ví dụ: Nguyễn Văn A"
            disabled={isSubmitting}
          />
          {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="customer-phone">
            Số điện thoại <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="customer-phone"
            value={phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
            placeholder="Ví dụ: 0912345678"
            disabled={isSubmitting}
          />
          {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="customer-email">Email</Label>
          <Input
            id="customer-email"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            placeholder="khachhang@example.com"
            disabled={isSubmitting}
          />
          {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="customer-address">Địa chỉ</Label>
          <Input
            id="customer-address"
            value={address}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
            placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
            disabled={isSubmitting}
          />
          {errors.address && <p className="text-xs text-rose-500 mt-1">{errors.address}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="customer-type">Loại khách hàng</Label>
            <select
              id="customer-type"
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-950 dark:border-slate-800 dark:bg-slate-900"
              value={type}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setType(e.target.value as CustomerType)
              }
              disabled={isSubmitting}
            >
              <option value={CustomerType.RETAIL}>{customerTypeLabels[CustomerType.RETAIL]}</option>
              <option value={CustomerType.WHOLESALE}>
                {customerTypeLabels[CustomerType.WHOLESALE]}
              </option>
              <option value={CustomerType.AGENT}>{customerTypeLabels[CustomerType.AGENT]}</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="customer-status">Trạng thái</Label>
            <select
              id="customer-status"
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-950 dark:border-slate-800 dark:bg-slate-900"
              value={isActive ? 'true' : 'false'}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setIsActive(e.target.value === 'true')
              }
              disabled={isSubmitting}
            >
              <option value="true">Hoạt động</option>
              <option value="false">Đã khóa</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo khách hàng'}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
