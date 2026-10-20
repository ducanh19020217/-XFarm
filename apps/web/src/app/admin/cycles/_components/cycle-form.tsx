'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCycleSchema, CycleKind } from '@xfarm/shared';
import { useForm } from 'react-hook-form';
import { Button, Input, Label } from '@xfarm/ui';
import { Loader2 } from 'lucide-react';
import { kindLabels } from './constants';
import type { AreaItem, CycleFormValues } from './types';

interface CycleFormProps {
  areas: AreaItem[];
  onSubmit: (data: CycleFormValues) => Promise<void>;
  isSubmitting: boolean;
  formError: string | null;
}

export function CycleForm({ areas, onSubmit, isSubmitting, formError }: CycleFormProps) {
  const form = useForm<CycleFormValues>({
    resolver: zodResolver(createCycleSchema) as never,
    defaultValues: {
      name: '',
      kind: CycleKind.CROP,
      areaId: '',
      species: '',
      variety: '',
      startDate: new Date().toISOString().slice(0, 10),
      expectedYield: undefined,
      yieldUnit: '',
      initialQuantity: undefined,
      notes: '',
    },
  });
  const kind = form.watch('kind');
  const errors = form.formState.errors;
  const numberOptions = {
    setValueAs: (value: unknown) => {
      if (value == null || value === '' || (typeof value === 'number' && Number.isNaN(value))) {
        return undefined;
      }
      const number = Number(value);
      return Number.isNaN(number) ? undefined : number;
    },
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {formError && (
        <p
          role="alert"
          className="rounded-md border border-crit/20 bg-crit-bg p-3 text-sm text-crit"
        >
          {formError}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="cycle-name">Tên mùa vụ *</Label>
          <Input
            id="cycle-name"
            {...form.register('name')}
            placeholder="Ví dụ: Vụ rau cải mùa đông"
          />
          {errors.name && <p className="text-xs text-crit">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="cycle-kind">Loại mùa vụ *</Label>
          <select
            id="cycle-kind"
            value={kind}
            onChange={(event) =>
              form.setValue('kind', event.target.value as CycleKind, { shouldValidate: true })
            }
            className="flex h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {Object.values(CycleKind).map((value) => (
              <option key={value} value={value}>
                {kindLabels[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cycle-area">Khu/lô *</Label>
          <select
            id="cycle-area"
            className="flex h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
            {...form.register('areaId')}
          >
            <option value="">Chọn khu/lô</option>
            {areas
              .filter((area) => area.isActive !== false)
              .map((area) => (
                <option key={area.id} value={area.id}>
                  {area.code} - {area.name}
                </option>
              ))}
          </select>
          {errors.areaId && <p className="text-xs text-crit">{errors.areaId.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="cycle-species">{kind === CycleKind.CROP ? 'Giống' : 'Loài'} *</Label>
          <Input
            id="cycle-species"
            {...form.register('species')}
            placeholder={kind === CycleKind.CROP ? 'Ví dụ: Cải xanh' : 'Ví dụ: Gà ri'}
          />
          {errors.species && <p className="text-xs text-crit">{errors.species.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="cycle-start">Ngày bắt đầu *</Label>
          <Input id="cycle-start" type="date" {...form.register('startDate')} />
          {errors.startDate && <p className="text-xs text-crit">Ngày bắt đầu không hợp lệ</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="cycle-variety">
            {kind === CycleKind.CROP ? 'Tên dòng/giống bổ sung' : 'Ghi chú loài'}
          </Label>
          <Input id="cycle-variety" {...form.register('variety')} />
        </div>
        {kind === CycleKind.CROP ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="cycle-yield">Sản lượng dự kiến</Label>
              <Input
                id="cycle-yield"
                type="number"
                min="0"
                step="0.001"
                {...form.register('expectedYield', numberOptions)}
              />
              {errors.expectedYield && (
                <p className="text-xs text-crit">{errors.expectedYield.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="cycle-yield-unit">Đơn vị sản lượng</Label>
              <Input id="cycle-yield-unit" placeholder="kg" {...form.register('yieldUnit')} />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <Label htmlFor="cycle-quantity">Số lượng thả ban đầu</Label>
              <Input
                id="cycle-quantity"
                type="number"
                min="0"
                step="0.001"
                {...form.register('initialQuantity', numberOptions)}
              />
              {errors.initialQuantity && (
                <p className="text-xs text-crit">{errors.initialQuantity.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="cycle-quantity-unit">Đơn vị số lượng</Label>
              <Input id="cycle-quantity-unit" placeholder="con" {...form.register('yieldUnit')} />
            </div>
          </>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="cycle-notes">Ghi chú</Label>
        <textarea
          id="cycle-notes"
          className="min-h-20 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          {...form.register('notes')}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Đang lưu...
            </>
          ) : (
            'Tạo mùa vụ'
          )}
        </Button>
      </div>
    </form>
  );
}
