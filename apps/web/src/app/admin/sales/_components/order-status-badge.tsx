'use client';

import * as React from 'react';
import { Badge } from '@xfarm/ui';
import {
  SalesChannel,
  SalesOrderStatus,
  PaymentStatus,
  CustomerType,
} from '@xfarm/shared';
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
        <Badge
          variant="secondary"
          className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 font-medium"
        >
          {label}
        </Badge>
      );
    case SalesOrderStatus.CONFIRMED:
      return (
        <Badge
          variant="info"
          className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 font-medium"
        >
          {label}
        </Badge>
      );
    case SalesOrderStatus.PACKING:
      return (
        <Badge
          variant="secondary"
          className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 font-medium"
        >
          {label}
        </Badge>
      );
    case SalesOrderStatus.SHIPPING:
      return (
        <Badge
          variant="info"
          className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 font-medium"
        >
          {label}
        </Badge>
      );
    case SalesOrderStatus.COMPLETED:
      return (
        <Badge
          variant="default"
          className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium"
        >
          {label}
        </Badge>
      );
    case SalesOrderStatus.CANCELLED:
      return (
        <Badge
          variant="destructive"
          className="bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 font-medium"
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
        <Badge
          variant="default"
          className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium"
        >
          {label}
        </Badge>
      );
    case PaymentStatus.PARTIAL:
      return (
        <Badge
          variant="warning"
          className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 font-medium"
        >
          {label}
        </Badge>
      );
    case PaymentStatus.UNPAID:
    default:
      return (
        <Badge
          variant="destructive"
          className="bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 font-medium"
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
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm animate-pulse ring-2 ring-amber-300 dark:ring-amber-600"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
        WEBSHOP MỚI
      </span>
    );
  }

  if (isWebshop) {
    return (
      <Badge
        variant="secondary"
        className="bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 font-medium border border-amber-300 dark:border-amber-700"
      >
        {channelLabels[SalesChannel.WEBSHOP]}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300 font-medium"
    >
      {channelLabels[SalesChannel.ADMIN] || channel}
    </Badge>
  );
}

export function CustomerTypeBadge({ type }: { type: CustomerType | string }) {
  const label = customerTypeLabels[type as CustomerType] || type;
  switch (type) {
    case CustomerType.WHOLESALE:
      return (
        <Badge
          variant="info"
          className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
        >
          {label}
        </Badge>
      );
    case CustomerType.AGENT:
      return (
        <Badge
          variant="secondary"
          className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
        >
          {label}
        </Badge>
      );
    case CustomerType.RETAIL:
    default:
      return (
        <Badge
          variant="outline"
          className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
        >
          {label}
        </Badge>
      );
  }
}
