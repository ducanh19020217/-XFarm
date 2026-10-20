'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable, Button, StatusBadge, Badge } from '@xfarm/ui';
import { Eye, Check, DollarSign } from 'lucide-react';
import { PayrollStatus } from '@xfarm/shared';
import { formatCurrency, getPayTypeLabel } from '../../common/format';
import type { PayrollItem } from '../../common/types';

interface PayrollTableProps {
  items: PayrollItem[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  searchValue: string;
  onSearchChange: (s: string) => void;
  isLoading: boolean;
  canApprove: boolean;
  canPay: boolean;
  onViewDetails: (item: PayrollItem) => void;
  onApprove: (item: PayrollItem) => void;
  onPay: (item: PayrollItem) => void;
}

export function PayrollTable({
  items,
  total,
  page,
  pageSize,
  onPageChange,
  searchValue,
  onSearchChange,
  isLoading,
  canApprove,
  canPay,
  onViewDetails,
  onApprove,
  onPay,
}: PayrollTableProps) {
  const columns: ColumnDef<PayrollItem>[] = React.useMemo(
    () => [
      {
        accessorKey: 'employee',
        header: 'Nhân viên',
        cell: ({ row }) => {
          const emp = row.original.employee;
          if (!emp) return <span className="text-muted">-</span>;
          return (
            <div>
              <div className="font-semibold text-fg">{emp.fullName}</div>
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <span className="font-mono text-accent">{emp.code}</span>
                <span>•</span>
                <span>{emp.position}</span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'payType',
        header: 'Hình thức lương',
        cell: ({ row }) => {
          const emp = row.original.employee;
          return (
            <Badge variant="outline" className="font-normal text-xs border-line text-fg-2">
              {getPayTypeLabel(emp?.payType || '')}
            </Badge>
          );
        },
      },
      {
        id: 'quantity',
        header: 'Công / Giờ / SP',
        cell: ({ row }) => {
          const details = row.original.details || {};
          if (details.days !== undefined) {
            return <span className="font-medium text-fg">{details.days} ngày</span>;
          }
          if (details.actualDays !== undefined) {
            return (
              <span className="font-medium text-fg">
                {details.actualDays} / {details.standardDays || 26} ngày
              </span>
            );
          }
          if (details.pieceQty !== undefined) {
            return <span className="font-medium text-warn">{details.pieceQty} SP</span>;
          }
          if (details.hours !== undefined) {
            return <span className="font-medium text-fg">{details.hours} giờ</span>;
          }
          return <span className="text-muted">-</span>;
        },
      },
      {
        accessorKey: 'amount',
        header: 'Thành tiền',
        cell: ({ row }) => (
          <span className="font-bold text-accent text-sm">
            {formatCurrency(row.original.amount)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: 'Thao tác',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(item)}
                className="h-8 px-2 text-xs text-muted hover:text-fg hover:bg-hover"
                title="Xem chi tiết từng ngày"
              >
                <Eye className="h-3.5 w-3.5 mr-1 text-muted" />
                Chi tiết
              </Button>

              {canApprove && item.status === PayrollStatus.DRAFT && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onApprove(item)}
                  className="h-8 px-2 text-xs border-info/30 text-info hover:bg-info-bg"
                  title="Duyệt bảng lương"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Duyệt
                </Button>
              )}

              {canPay && item.status === PayrollStatus.APPROVED && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPay(item)}
                  className="h-8 px-2 text-xs border-accent/30 text-accent hover:bg-accent-bg"
                  title="Xác nhận đã thanh toán tiền lương"
                >
                  <DollarSign className="h-3.5 w-3.5 mr-1" />
                  Đã trả
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [canApprove, canPay, onApprove, onPay, onViewDetails],
  );

  return (
    <DataTable
      columns={columns}
      data={items}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder="Tìm theo mã NV hoặc tên nhân viên..."
      isLoading={isLoading}
    />
  );
}
