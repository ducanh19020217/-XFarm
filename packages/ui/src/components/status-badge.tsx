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

  // Handle roles
  switch (status) {
    case 'PLANNED':
      return <Badge variant="secondary">Kế hoạch</Badge>;
    case 'ACTIVE':
      return <Badge variant="info">Đang hoạt động</Badge>;
    case 'HARVESTING':
      return <Badge variant="warning">Đang thu hoạch</Badge>;
    case 'CLOSED':
      return (
        <Badge
          variant="default"
          className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          Đã đóng
        </Badge>
      );
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
      return (
        <Badge
          variant="default"
          className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
        >
          Chủ trại
        </Badge>
      );
    case 'MANAGER':
      return <Badge variant="info">Quản lý</Badge>;
    case 'ACCOUNTANT':
      return <Badge variant="warning">Kế toán</Badge>;
    case 'SALES':
      return (
        <Badge
          variant="default"
          className="bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400"
        >
          Bán hàng
        </Badge>
      );
    case 'WORKER':
      return <Badge variant="secondary">Công nhân</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
