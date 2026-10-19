'use client';

import * as React from 'react';
import { StatusBadge } from '@xfarm/ui';
import { formatCurrency, formatDate } from './constants';
import type { PurchaseOrderDetail } from './types';

interface POInfoCardProps {
  po: PurchaseOrderDetail;
}

export function POInfoCard({ po }: POInfoCardProps) {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{po.code}</h2>
          <p className="text-xs text-slate-500">Mã đơn mua hàng</p>
        </div>
        <StatusBadge status={po.status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-xs font-medium text-slate-400 block">Nhà cung cấp</span>
          <p className="font-semibold text-slate-800">{po.supplier?.name || '-'}</p>
          {po.supplier?.code && <p className="text-xs text-slate-500">Mã: {po.supplier.code}</p>}
          {po.supplier?.phone && <p className="text-xs text-slate-500">SĐT: {po.supplier.phone}</p>}
          {po.supplier?.address && (
            <p className="text-xs text-slate-500">Đ/c: {po.supplier.address}</p>
          )}
        </div>

        <div>
          <span className="text-xs font-medium text-slate-400 block">Ngày đặt hàng</span>
          <p className="font-semibold text-slate-800">{formatDate(po.orderDate)}</p>

          <span className="text-xs font-medium text-slate-400 block mt-2">Tổng tiền</span>
          <p className="text-base font-bold text-emerald-700">{formatCurrency(po.total)}</p>
        </div>
      </div>

      {po.notes && (
        <div className="border-t pt-3 text-sm">
          <span className="text-xs font-medium text-slate-400 block">Ghi chú</span>
          <p className="text-slate-700 italic">{po.notes}</p>
        </div>
      )}
    </div>
  );
}
