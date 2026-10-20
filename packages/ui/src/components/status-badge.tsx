import * as React from 'react';
import { Badge } from './badge';

export interface StatusBadgeProps {
  status?: boolean | string;
  activeText?: string;
  inactiveText?: string;
}

export function StatusBadge({
  status,
  activeText = 'Hoạt động',
  inactiveText = 'Đã khóa',
}: StatusBadgeProps) {
  if (typeof status === 'boolean') {
    return status ? (
      <Badge variant="default">{activeText}</Badge>
    ) : (
      <Badge variant="destructive">{inactiveText}</Badge>
    );
  }

  // Handle roles and business statuses
  switch (status) {
    case 'PLANNED':
      return <Badge variant="secondary">Kế hoạch</Badge>;
    case 'ACTIVE':
      return <Badge variant="info">Đang hoạt động</Badge>;
    case 'HARVESTING':
      return <Badge variant="warning">Đang thu hoạch</Badge>;
    case 'CLOSED':
      return <Badge variant="secondary">Đã đóng</Badge>;
    case 'CANCELLED':
      return <Badge variant="destructive">Đã hủy</Badge>;
    case 'DRAFT':
      return <Badge variant="secondary">Nháp</Badge>;
    case 'ORDERED':
      return <Badge variant="info">Đã đặt</Badge>;
    case 'PARTIAL':
      return <Badge variant="warning">Nhận một phần</Badge>;
    case 'RECEIVED':
      return <Badge variant="default">Đã nhận đủ</Badge>;
    case 'OWNER':
      return <Badge variant="accent">Chủ trại</Badge>;
    case 'MANAGER':
      return <Badge variant="info">Quản lý</Badge>;
    case 'ACCOUNTANT':
      return <Badge variant="warning">Kế toán</Badge>;
    case 'SALES':
      return <Badge variant="chip">Bán hàng</Badge>;
    case 'WORKER':
      return <Badge variant="secondary">Công nhân</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
