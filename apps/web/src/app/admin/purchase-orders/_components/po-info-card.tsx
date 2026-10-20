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
    <div className="rounded-lg border border-line bg-surface p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <h2 className="text-lg font-bold text-fg">{po.code}</h2>
          <p className="text-xs text-muted">Mã đơn mua hàng</p>
        </div>
        <StatusBadge status={po.status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-xs font-medium text-muted block">Nhà cung cấp</span>
          <p className="font-semibold text-fg">{po.supplier?.name || '-'}</p>
          {po.supplier?.code && <p className="text-xs text-muted">Mã: {po.supplier.code}</p>}
          {po.supplier?.phone && <p className="text-xs text-muted">SĐT: {po.supplier.phone}</p>}
          {po.supplier?.address && (
            <p className="text-xs text-muted">Đ/c: {po.supplier.address}</p>
          )}
        </div>

        <div>
          <span className="text-xs font-medium text-muted block">Ngày đặt hàng</span>
          <p className="font-semibold text-fg">{formatDate(po.orderDate)}</p>

          <span className="text-xs font-medium text-muted block mt-2">Tổng tiền</span>
          <p className="text-base font-bold text-fg">{formatCurrency(po.total)}</p>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <span className="text-xs font-medium text-muted block">Đã thanh toán</span>
              <p className="text-sm font-semibold text-ok">
                {formatCurrency(po.paidAmount || 0)}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted block">Còn lại</span>
              <p className="text-sm font-semibold text-warn">
                {formatCurrency(Math.max(0, Number(po.total) - Number(po.paidAmount || 0)))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {po.notes && (
        <div className="border-t border-line pt-3 text-sm">
          <span className="text-xs font-medium text-muted block">Ghi chú</span>
          <p className="text-fg-2 italic">{po.notes}</p>
        </div>
      )}
    </div>
  );
}
