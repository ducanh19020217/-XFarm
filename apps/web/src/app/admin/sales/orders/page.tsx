'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Button,
  DataTable,
  Input,
  PageHeader,
  Select,
  StatusBadge,
  Toast,
  useToast,
  type ColumnDef,
} from '@xfarm/ui';
import { PaymentStatus, SalesOrderStatus } from '@xfarm/shared';
import { apiFetch, ApiError } from '@/lib/api';

interface SalesOrderListItem {
  id: string;
  code: string;
  channel: string;
  status: SalesOrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number | string;
  total: number | string;
  createdAt: string;
  customer?: {
    id: string;
    code: string;
    name: string;
    phone: string;
  };
  _count?: {
    lines: number;
    payments: number;
  };
}

interface SalesOrderListResponse {
  data: SalesOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
}

function formatVND(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0 ₫';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (Number.isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

export default function SalesOrdersPage() {
  const router = useRouter();
  const { message, showToast, closeToast } = useToast();

  const [orders, setOrders] = React.useState<SalesOrderListItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  // Filters
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<string>('ALL');
  const [paymentStatus, setPaymentStatus] = React.useState<string>('ALL');
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const fetchOrders = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());
      if (search.trim()) params.set('search', search.trim());
      if (status !== 'ALL') params.set('status', status);
      if (paymentStatus !== 'ALL') params.set('paymentStatus', paymentStatus);

      const res = await apiFetch<SalesOrderListResponse>(`/sales-orders?${params.toString()}`);
      setOrders(res.data || []);
      setTotal(res.total || 0);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tải danh sách đơn bán');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, paymentStatus, showToast]);

  React.useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const columns: ColumnDef<SalesOrderListItem>[] = [
    {
      header: 'Mã đơn',
      accessorKey: 'code',
      cell: ({ row }) => (
        <Link
          href={`/admin/sales/orders/${row.original.id}`}
          className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          {row.original.code}
        </Link>
      ),
    },
    {
      header: 'Khách hàng',
      accessorKey: 'customer',
      cell: ({ row }) => {
        const cust = row.original.customer;
        if (!cust) return <span className="text-slate-400">-</span>;
        return (
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">{cust.name}</div>
            <div className="text-xs text-slate-500">{cust.phone}</div>
          </div>
        );
      },
    },
    {
      header: 'Ngày tạo',
      accessorKey: 'createdAt',
      cell: ({ row }) => (
        <span className="text-xs text-slate-500">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      header: 'Kênh',
      accessorKey: 'channel',
      cell: ({ row }) => (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {row.original.channel === 'WEBSHOP' ? 'Cửa hàng online' : 'Nội bộ'}
        </span>
      ),
    },
    {
      header: 'Trạng thái đơn',
      accessorKey: 'status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      header: 'Thanh toán',
      accessorKey: 'paymentStatus',
      cell: ({ row }) => <StatusBadge status={row.original.paymentStatus} />,
    },
    {
      header: 'Tổng tiền',
      accessorKey: 'total',
      cell: ({ row }) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {formatVND(row.original.total)}
        </span>
      ),
    },
    {
      header: 'Thao tác',
      id: 'actions',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(`/admin/sales/orders/${row.original.id}`)}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} />

      <PageHeader
        title="Đơn bán hàng"
        description="Quản lý đơn hàng bán, giao nhận và thanh toán"
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-[200px] flex-1">
          <Input
            placeholder="Tìm theo mã đơn hoặc tên khách..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="w-44">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả trạng thái đơn</option>
            <option value="PENDING">Chờ xác nhận</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="PACKING">Đang đóng gói</option>
            <option value="SHIPPING">Đang giao hàng</option>
            <option value="COMPLETED">Đã hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </Select>
        </div>

        <div className="w-44">
          <Select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả thanh toán</option>
            <option value="UNPAID">Chưa thanh toán</option>
            <option value="PARTIAL">Thanh toán 1 phần</option>
            <option value="PAID">Đã thanh toán đủ</option>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <DataTable
          columns={columns}
          data={orders}
          loading={loading}
          emptyText="Chưa có đơn bán nào phù hợp"
        />
      </div>
    </div>
  );
}
