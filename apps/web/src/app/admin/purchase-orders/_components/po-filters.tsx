'use client';

import * as React from 'react';
import { PurchaseOrderStatus } from '@xfarm/shared';
import { Label } from '@xfarm/ui';
import { poStatusLabels } from './constants';
import type { SupplierOption } from './types';

interface POFiltersProps {
  status: string;
  supplierId: string;
  suppliers: SupplierOption[];
  onStatusChange: (status: string) => void;
  onSupplierChange: (supplierId: string) => void;
}

export function POFilters({
  status,
  supplierId,
  suppliers,
  onStatusChange,
  onSupplierChange,
}: POFiltersProps) {
  const selectClass =
    'h-10 rounded-md border border-line bg-surface px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/20';

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-line bg-surface p-4 shadow-sm">
      <div className="space-y-1">
        <Label htmlFor="filter-status" className="text-fg">
          Trạng thái
        </Label>
        <select
          id="filter-status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          className={selectClass}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.values(PurchaseOrderStatus).map((value) => (
            <option key={value} value={value}>
              {poStatusLabels[value]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-supplier" className="text-fg">
          Nhà cung cấp
        </Label>
        <select
          id="filter-supplier"
          value={supplierId}
          onChange={(event) => onSupplierChange(event.target.value)}
          className={selectClass}
        >
          <option value="">Tất cả nhà cung cấp</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.code} - {supplier.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
