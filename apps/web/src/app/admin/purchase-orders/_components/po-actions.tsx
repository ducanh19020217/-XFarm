'use client';

import * as React from 'react';
import { PurchaseOrderStatus } from '@xfarm/shared';
import { Button } from '@xfarm/ui';
import { CheckCircle2, PackageCheck, XCircle } from 'lucide-react';
import { canCancelPO, canOrderPO, canReceivePO, canPayPO } from './constants';
import { DollarSign } from 'lucide-react';

interface POActionsProps {
  status: PurchaseOrderStatus;
  role?: string | null;
  onOrder: () => void;
  onCancel: () => void;
  onReceive: () => void;
  onPay?: () => void;
}

export function POActions({ status, role, onOrder, onCancel, onReceive, onPay }: POActionsProps) {
  const allowOrder = canOrderPO(role);
  const allowCancel = canCancelPO(role);
  const allowReceive = canReceivePO(role);
  const allowPay = canPayPO(role);

  const payButton =
    allowPay && status !== PurchaseOrderStatus.CANCELLED && onPay ? (
      <Button
        type="button"
        variant="outline"
        onClick={onPay}
        className="border-accent text-accent hover:bg-accent-bg"
      >
        <DollarSign className="mr-1.5 h-4 w-4" />
        Trả tiền
      </Button>
    ) : null;

  if (status === PurchaseOrderStatus.DRAFT) {
    if (!allowCancel && !allowOrder && !payButton) return null;
    return (
      <div className="flex items-center gap-2">
        {allowCancel && (
          <Button variant="outline" onClick={onCancel} className="border-crit text-crit hover:bg-crit-bg">
            <XCircle className="mr-1.5 h-4 w-4" />
            Hủy
          </Button>
        )}
        {allowOrder && (
          <Button onClick={onOrder} className="bg-accent hover:bg-accent/90 text-white">
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Đặt hàng
          </Button>
        )}
        {payButton}
      </div>
    );
  }

  if (status === PurchaseOrderStatus.ORDERED) {
    if (!allowCancel && !allowReceive && !payButton) return null;
    return (
      <div className="flex items-center gap-2">
        {allowCancel && (
          <Button variant="outline" onClick={onCancel} className="border-crit text-crit hover:bg-crit-bg">
            <XCircle className="mr-1.5 h-4 w-4" />
            Hủy
          </Button>
        )}
        {allowReceive && (
          <Button onClick={onReceive} className="bg-ok hover:bg-ok/90 text-white">
            <PackageCheck className="mr-1.5 h-4 w-4" />
            Nhận hàng
          </Button>
        )}
        {payButton}
      </div>
    );
  }

  if (status === PurchaseOrderStatus.PARTIAL) {
    if (!allowReceive && !payButton) return null;
    return (
      <div className="flex items-center gap-2">
        {allowReceive && (
          <Button onClick={onReceive} className="bg-ok hover:bg-ok/90 text-white">
            <PackageCheck className="mr-1.5 h-4 w-4" />
            Nhận hàng
          </Button>
        )}
        {payButton}
      </div>
    );
  }

  if (status === PurchaseOrderStatus.RECEIVED && payButton) {
    return <div className="flex items-center gap-2">{payButton}</div>;
  }

  return null;
}
