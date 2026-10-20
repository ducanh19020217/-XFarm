'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Clock, DollarSign, ExternalLink, Users } from 'lucide-react';
import { Button, DataTable, Input, PageHeader, StatusBadge, Toast, useToast } from '@xfarm/ui';
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
        <span className="font-mono text-xs font-semibold text-fg">{row.original.customerCode}</span>
      ),
    },
    {
      header: 'Khách hàng',
      accessorKey: 'customerName',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-fg">{row.original.customerName}</div>
          <div className="text-xs text-muted">{row.original.customerPhone}</div>
        </div>
      ),
    },
    {
      header: 'Số đơn nợ',
      accessorKey: 'orderCount',
      cell: ({ row }) => <span className="font-medium text-fg">{row.original.orderCount} đơn</span>,
    },
    {
      header: 'Tổng tiền mua',
      accessorKey: 'totalOrders',
      cell: ({ row }) => <span className="text-fg">{formatVND(row.original.totalOrders)}</span>,
    },
    {
      header: 'Đã thanh toán',
      accessorKey: 'totalPaid',
      cell: ({ row }) => (
        <span className="text-ok font-medium">{formatVND(row.original.totalPaid)}</span>
      ),
    },
    {
      header: 'Còn nợ phải thu',
      accessorKey: 'debt',
      cell: ({ row }) => (
        <span className={`font-bold ${row.original.debt > 0 ? 'text-warn' : 'text-muted'}`}>
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
          className="text-xs border-line text-fg hover:bg-hover"
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
          className="font-medium text-accent hover:underline inline-flex items-center gap-1"
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
          <div className="font-medium text-fg">{row.original.customerName}</div>
          <div className="text-xs text-muted">{row.original.customerPhone}</div>
        </div>
      ),
    },
    {
      header: 'Ngày đặt',
      accessorKey: 'createdAt',
      cell: ({ row }) => (
        <span className="text-xs text-muted">{formatDate(row.original.createdAt)}</span>
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
      cell: ({ row }) => <span className="text-fg">{formatVND(row.original.total)}</span>,
    },
    {
      header: 'Đã trả',
      accessorKey: 'paid',
      cell: ({ row }) => (
        <span className="text-ok font-medium">{formatVND(row.original.paid)}</span>
      ),
    },
    {
      header: 'Còn nợ',
      accessorKey: 'remaining',
      cell: ({ row }) => (
        <span className="font-bold text-warn">{formatVND(row.original.remaining)}</span>
      ),
    },
    {
      header: 'Hạn công nợ',
      accessorKey: 'isOverdue',
      cell: ({ row }) => {
        if (row.original.isOverdue) {
          return (
            <span className="inline-flex items-center gap-1 rounded bg-crit-bg px-2 py-0.5 text-xs font-semibold text-crit">
              <AlertTriangle className="h-3 w-3" />
              Quá hạn {row.original.daysOverdue} ngày
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 rounded bg-surface-2 border border-line px-2 py-0.5 text-xs font-medium text-muted">
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
          className="text-xs border-line text-accent hover:bg-hover hover:text-accent-hover"
        >
          <Link href={`/admin/sales/orders/${row.original.orderId}`}>Ghi thu</Link>
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
        <div className="rounded-lg border border-warn/30 bg-warn-bg/20 p-4 shadow-xs text-warn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng nợ phải thu</span>
            <DollarSign className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold mt-2">{formatVND(summary.totalReceivable)}</p>
        </div>

        <div className="rounded-lg border border-crit/30 bg-crit-bg/20 p-4 shadow-xs text-crit">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Nợ quá hạn (&gt; 7 ngày)
            </span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold mt-2">{formatVND(summary.totalOverdue)}</p>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4 shadow-xs text-fg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Khách hàng còn nợ
            </span>
            <Users className="h-4 w-4 text-muted" />
          </div>
          <p className="text-2xl font-bold text-fg mt-2">{summary.customerCount}</p>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4 shadow-xs text-fg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Đơn chưa thanh toán đủ
            </span>
            <Clock className="h-4 w-4 text-muted" />
          </div>
          <p className="text-2xl font-bold text-fg mt-2">{summary.orderCount}</p>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-surface p-3 sm:p-4 text-fg shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center rounded-lg border border-line bg-surface-2 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'customer'
                ? 'bg-surface text-fg shadow-xs font-semibold'
                : 'text-muted hover:text-fg'
            }`}
          >
            Theo khách hàng ({byCustomer.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('order')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'order'
                ? 'bg-surface text-fg shadow-xs font-semibold'
                : 'text-muted hover:text-fg'
            }`}
          >
            Đơn nợ &amp; Quá hạn ({filteredOrders.length})
          </button>
        </div>

        {/* Search & Overdue Toggle */}
        <div className="flex items-center gap-3">
          {activeTab === 'order' && (
            <label className="flex items-center gap-2 text-sm text-fg cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyOverdue}
                onChange={(e) => setOnlyOverdue(e.target.checked)}
                className="h-4 w-4 rounded border-line text-crit focus:ring-crit"
              />
              <span className="font-medium text-crit">Chỉ hiện đơn quá hạn</span>
            </label>
          )}

          {selectedCustomerFilter && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedCustomerFilter(null)}
              className="text-xs border-line text-fg hover:bg-hover"
            >
              Bỏ lọc khách hàng
            </Button>
          )}

          <div className="w-64">
            <Input
              placeholder="Tìm theo tên khách, SĐT, mã đơn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface border-line text-fg"
            />
          </div>
        </div>
      </div>

      {/* Content Tables */}
      <div className="rounded-lg border border-line bg-surface shadow-xs overflow-hidden">
        {activeTab === 'customer' ? (
          <DataTable columns={customerColumns} data={byCustomer} isLoading={loading} />
        ) : (
          <DataTable columns={orderColumns} data={filteredOrders} isLoading={loading} />
        )}
      </div>
    </div>
  );
}
