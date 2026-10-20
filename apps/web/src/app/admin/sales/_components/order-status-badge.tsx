'use client';

import * as React from 'react';
import { Badge } from '@xfarm/ui';
import { SalesChannel, SalesOrderStatus, PaymentStatus, CustomerType } from '@xfarm/shared';
import {
  orderStatusLabels,
  paymentStatusLabels,
  channelLabels,
  customerTypeLabels,
} from './constants';

export function OrderStatusBadge({ status }: { status: SalesOrderStatus | string }) {
  const label = orderStatusLabels[status as SalesOrderStatus] || status;
  switch (status) {
    case SalesOrderStatus.PENDING:
      return (
        <Badge variant="secondary" className="bg-warn-bg text-warn border-transparent font-medium">
          {label}
        </Badge>
      );
    case SalesOrderStatus.CONFIRMED:
      return (
        <Badge variant="info" className="bg-info-bg text-info border-transparent font-medium">
          {label}
        </Badge>
      );
    case SalesOrderStatus.PACKING:
      return (
        <Badge
          variant="secondary"
          className="bg-accent-bg text-accent border-transparent font-medium"
        >
          {label}
        </Badge>
      );
    case SalesOrderStatus.SHIPPING:
      return (
        <Badge variant="info" className="bg-info-bg text-info border-transparent font-medium">
          {label}
        </Badge>
      );
    case SalesOrderStatus.COMPLETED:
      return (
        <Badge variant="default" className="bg-ok-bg text-ok border-transparent font-medium">
          {label}
        </Badge>
      );
    case SalesOrderStatus.CANCELLED:
      return (
        <Badge
          variant="destructive"
          className="bg-crit-bg text-crit border-transparent font-medium"
        >
          {label}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus | string }) {
  const label = paymentStatusLabels[status as PaymentStatus] || status;
  switch (status) {
    case PaymentStatus.PAID:
      return (
        <Badge variant="default" className="bg-ok-bg text-ok border-transparent font-medium">
          {label}
        </Badge>
      );
    case PaymentStatus.PARTIAL:
      return (
        <Badge variant="warning" className="bg-warn-bg text-warn border-transparent font-medium">
          {label}
        </Badge>
      );
    case PaymentStatus.UNPAID:
    default:
      return (
        <Badge
          variant="destructive"
          className="bg-crit-bg text-crit border-transparent font-medium"
        >
          {label}
        </Badge>
      );
  }
}

export function ChannelBadge({
  channel,
  status,
}: {
  channel: SalesChannel | string;
  status?: SalesOrderStatus | string;
}) {
  const isWebshop = channel === SalesChannel.WEBSHOP || channel === 'WEBSHOP';
  const isPending = status === SalesOrderStatus.PENDING || status === 'PENDING';

  // "badge kênh WEBSHOP nổi bật cho đơn PENDING mới"
  if (isWebshop && isPending) {
    return (
      <span
        data-testid="badge-webshop-pending"
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-warn-fill text-white shadow-xs animate-pulse ring-2 ring-warn-bg"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
        WEBSHOP MỚI
      </span>
    );
  }

  if (isWebshop) {
    return (
      <Badge variant="secondary" className="bg-warn-bg text-warn font-medium border border-line">
        {channelLabels[SalesChannel.WEBSHOP]}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-surface-2 text-fg font-medium border border-line">
      {channelLabels[SalesChannel.ADMIN] || channel}
    </Badge>
  );
}

export function CustomerTypeBadge({ type }: { type: CustomerType | string }) {
  const label = customerTypeLabels[type as CustomerType] || type;
  switch (type) {
    case CustomerType.WHOLESALE:
      return (
        <Badge variant="info" className="bg-info-bg text-info border-transparent">
          {label}
        </Badge>
      );
    case CustomerType.AGENT:
      return (
        <Badge variant="secondary" className="bg-accent-bg text-accent border-transparent">
          {label}
        </Badge>
      );
    case CustomerType.RETAIL:
    default:
      return (
        <Badge variant="outline" className="bg-surface-2 text-fg border border-line">
          {label}
        </Badge>
      );
  }
}
