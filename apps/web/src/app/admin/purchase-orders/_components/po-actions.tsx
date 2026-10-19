'use client';

import * as React from 'react';
import { PurchaseOrderStatus } from '@xfarm/shared';
import { Button } from '@xfarm/ui';
import { CheckCircle2, PackageCheck, XCircle } from 'lucide-react';
import { canCancelPO, canOrderPO, canReceivePO } from './constants';

interface POActionsProps {
  status: PurchaseOrderStatus;
  role?: string | null;
  onOrder: () => void;
  onCancel: () => void;
  onReceive: () => void;
}

export function POActions({ status, role, onOrder, onCancel, onReceive }: POActionsProps) {
  const allowOrder = canOrderPO(role);
  const allowCancel = canCancelPO(role);
  const allowReceive = canReceivePO(role);

  if (status === PurchaseOrderStatus.DRAFT) {
    if (!allowCancel && !allowOrder) return null;
    return (
      <div className="flex items-center gap-2">
        {allowCancel && (
          <Button variant="outline" onClick={onCancel} className="text-red-600 hover:bg-red-50">
            <XCircle className="mr-1.5 h-4 w-4" />
            Hủy
          </Button>
        )}
        {allowOrder && (
          <Button onClick={onOrder} className="bg-blue-600 hover:bg-blue-700 text-white">
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Đặt hàng
          </Button>
        )}
      </div>
    );
  }

  if (status === PurchaseOrderStatus.ORDERED) {
    if (!allowCancel && !allowReceive) return null;
    return (
      <div className="flex items-center gap-2">
        {allowCancel && (
          <Button variant="outline" onClick={onCancel} className="text-red-600 hover:bg-red-50">
            <XCircle className="mr-1.5 h-4 w-4" />
            Hủy
          </Button>
        )}
        {allowReceive && (
          <Button onClick={onReceive} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <PackageCheck className="mr-1.5 h-4 w-4" />
            Nhận hàng
          </Button>
        )}
      </div>
    );
  }

  if (status === PurchaseOrderStatus.PARTIAL) {
    if (!allowReceive) return null;
    return (
      <div className="flex items-center gap-2">
        {allowReceive && (
          <Button onClick={onReceive} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <PackageCheck className="mr-1.5 h-4 w-4" />
            Nhận hàng
          </Button>
        )}
      </div>
    );
  }

  return null;
}
