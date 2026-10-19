'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  DollarSign,
  ExternalLink,
  Users,
} from 'lucide-react';
import {
  Button,
  DataTable,
  Input,
  PageHeader,
  StatusBadge,
  Toast,
  useToast,
} from '@xfarm/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { apiFetch, ApiError } from '@/lib/api';

interface CustomerReceivable {
  customerId: string;
  customerCode: string;
  customerName: string;
  customerPhone: string;
  totalOrders: number;
  totalPaid: number;
  debt: number;
  orderCount: number;
}

interface OrderReceivable {
  orderId: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  status: string;
  paymentStatus: string;
  total: number;
  paid: number;
  remaining: number;
  createdAt: string;
  confirmedAt: string | null;
  isOverdue: boolean;
  daysOverdue: number;
}

interface ReceivablesSummary {
  totalReceivable: number;
  totalOverdue: number;
  customerCount: number;
  orderCount: number;
}

interface ReceivablesResponse {
  data: {
    byCustomer: CustomerReceivable[];
    byOrder: OrderReceivable[];
    summary: ReceivablesSummary;
  };
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
    });
  } catch {
    return '-';
  }
}

export default function ReceivablesPage() {
  const { message, showToast, closeToast } = useToast();

  const [byCustomer, setByCustomer] = React.useState<CustomerReceivable[]>([]);
  const [byOrder, setByOrder] = React.useState<OrderReceivable[]>([]);
  const [summary, setSummary] = React.useState<ReceivablesSummary>({
    totalReceivable: 0,
    totalOverdue: 0,
    customerCount: 0,
    orderCount: 0,
  });
  const [loading, setLoading] = React.useState(true);

  // Filters & State
  const [search, setSearch] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'customer' | 'order'>('customer');
  const [onlyOverdue, setOnlyOverdue] = React.useState(false);
  const [selectedCustomerFilter, setSelectedCustomerFilter] = React.useState<string | null>(null);

  const fetchReceivables = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (selectedCustomerFilter) params.set('customerId', selectedCustomerFilter);

      const res = await apiFetch<ReceivablesResponse>(`/finance/receivables?${params.toString()}`);
      if (res.data) {
        setByCustomer(res.data.byCustomer || []);
        setByOrder(res.data.byOrder || []);
        setSummary(
          res.data.summary || {
            totalReceivable: 0,
            totalOverdue: 0,
            customerCount: 0,
            orderCount: 0,
          },
        );
      }
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tải dữ liệu công nợ');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCustomerFilter, showToast]);

  React.useEffect(() => {
    void fetchReceivables();
  }, [fetchReceivables]);

  // Filtered orders list
  const filteredOrders = React.useMemo(() => {
    let list = byOrder;
    if (onlyOverdue) {
      list = list.filter((o) => o.isOverdue);
    }
    return list;
  }, [byOrder, onlyOverdue]);

  const customerColumns: ColumnDef<CustomerReceivable>[] = [
    {
      header: 'Mã KH',
      accessorKey: 'customerCode',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
          {row.original.customerCode}
        </span>
      ),
    },
    {
      header: 'Khách hàng',
      accessorKey: 'customerName',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.customerName}
          </div>
          <div className="text-xs text-slate-500">{row.original.customerPhone}</div>
        </div>
      ),
    },
    {
      header: 'Số đơn nợ',
      accessorKey: 'orderCount',
      cell: ({ row }) => (
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {row.original.orderCount} đơn
        </span>
      ),
    },
    {
      header: 'Tổng tiền mua',
      accessorKey: 'totalOrders',
      cell: ({ row }) => (
        <span className="text-slate-700 dark:text-slate-300">
          {formatVND(row.original.totalOrders)}
        </span>
      ),
    },
    {
      header: 'Đã thanh toán',
      accessorKey: 'totalPaid',
      cell: ({ row }) => (
        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
          {formatVND(row.original.totalPaid)}
        </span>
      ),
    },
    {
      header: 'Còn nợ phải thu',
      accessorKey: 'debt',
      cell: ({ row }) => (
        <span
          className={`font-bold ${
            row.original.debt > 0
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-500'
          }`}
        >
          {formatVND(row.original.debt)}
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
          onClick={() => {
            setSelectedCustomerFilter(row.original.customerId);
            setActiveTab('order');
          }}
          className="text-xs"
        >
          Xem các đơn
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      ),
    },
  ];

  const orderColumns: ColumnDef<OrderReceivable>[] = [
    {
      header: 'Mã đơn',
      accessorKey: 'orderCode',
      cell: ({ row }) => (
        <Link
          href={`/admin/sales/orders/${row.original.orderId}`}
          className="font-medium text-emerald-600 hover:underline dark:text-emerald-400 inline-flex items-center gap-1"
        >
          {row.original.orderCode}
          <ExternalLink className="h-3 w-3" />
        </Link>
      ),
    },
    {
      header: 'Khách hàng',
      accessorKey: 'customerName',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.customerName}
          </div>
          <div className="text-xs text-slate-500">{row.original.customerPhone}</div>
        </div>
      ),
    },
    {
      header: 'Ngày đặt',
      accessorKey: 'createdAt',
      cell: ({ row }) => (
        <span className="text-xs text-slate-500">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      header: 'Trạng thái',
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
        <span className="text-slate-700 dark:text-slate-300">{formatVND(row.original.total)}</span>
      ),
    },
    {
      header: 'Đã trả',
      accessorKey: 'paid',
      cell: ({ row }) => (
        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
          {formatVND(row.original.paid)}
        </span>
      ),
    },
    {
      header: 'Còn nợ',
      accessorKey: 'remaining',
      cell: ({ row }) => (
        <span className="font-bold text-amber-600 dark:text-amber-400">
          {formatVND(row.original.remaining)}
        </span>
      ),
    },
    {
      header: 'Hạn công nợ',
      accessorKey: 'isOverdue',
      cell: ({ row }) => {
        if (row.original.isOverdue) {
          return (
            <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
              <AlertTriangle className="h-3 w-3" />
              Quá hạn {row.original.daysOverdue} ngày
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <Clock className="h-3 w-3" />
            Trong hạn
          </span>
        );
      },
    },
    {
      header: 'Thao tác',
      id: 'actions',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          asChild
          className="text-xs text-emerald-700 hover:bg-emerald-50"
        >
          <Link href={`/admin/sales/orders/${row.original.orderId}`}>
            Ghi thu
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} />

      <PageHeader
        title="Quản lý công nợ"
        description="Theo dõi công nợ phải thu của khách hàng và các đơn hàng quá hạn thanh toán"
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm border-amber-200 bg-amber-50/20 dark:border-amber-900 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Tổng nợ phải thu
            </span>
            <DollarSign className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-2">
            {formatVND(summary.totalReceivable)}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm border-rose-200 bg-rose-50/20 dark:border-rose-900 dark:bg-rose-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              Nợ quá hạn (&gt; 7 ngày)
            </span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-2">
            {formatVND(summary.totalOverdue)}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Khách hàng còn nợ
            </span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {summary.customerCount}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Đơn chưa thanh toán đủ
            </span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {summary.orderCount}
          </p>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center rounded-lg border bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'customer'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Theo khách hàng ({byCustomer.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('order')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'order'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Đơn nợ &amp; Quá hạn ({filteredOrders.length})
          </button>
        </div>

        {/* Search & Overdue Toggle */}
        <div className="flex items-center gap-3">
          {activeTab === 'order' && (
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyOverdue}
                onChange={(e) => setOnlyOverdue(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <span className="font-medium text-rose-700 dark:text-rose-400">
                Chỉ hiện đơn quá hạn
              </span>
            </label>
          )}

          {selectedCustomerFilter && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedCustomerFilter(null)}
              className="text-xs"
            >
              Bỏ lọc khách hàng
            </Button>
          )}

          <div className="w-64">
            <Input
              placeholder="Tìm theo tên khách, SĐT, mã đơn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Content Tables */}
      <div className="rounded-lg border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {activeTab === 'customer' ? (
          <DataTable
            columns={customerColumns}
            data={byCustomer}
            isLoading={loading}
          />
        ) : (
          <DataTable
            columns={orderColumns}
            data={filteredOrders}
            isLoading={loading}
          />
        )}
      </div>
    </div>
  );
}
