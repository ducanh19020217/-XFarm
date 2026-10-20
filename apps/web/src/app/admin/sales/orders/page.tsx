'use client';

import * as React from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { type Paginated } from '@xfarm/shared';
import { DataTable, PageHeader, Button, useToast, Toast } from '@xfarm/ui';
import { Plus, Eye, Printer } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAdminUser } from '../../admin-user-context';
import type { SalesOrderRecord } from '../_components/types';
import {
  channelLabels,
  formatCurrency,
  formatDate,
  orderStatusLabels,
  paymentStatusLabels,
} from '../_components/constants';
import {
  ChannelBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from '../_components/order-status-badge';

export default function SalesOrdersPage() {
  const user = useAdminUser();
  const canCreate = user?.role === 'OWNER' || user?.role === 'MANAGER' || user?.role === 'SALES';
  const { message: toastMessage, showToast, closeToast } = useToast();

  const [orders, setOrders] = React.useState<SalesOrderRecord[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<string>('');
  const [paymentStatus, setPaymentStatus] = React.useState<string>('');
  const [channel, setChannel] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchOrders = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      if (paymentStatus) params.set('paymentStatus', paymentStatus);
      if (channel) params.set('channel', channel);

      const res = await apiFetch<Paginated<SalesOrderRecord>>(`/sales-orders?${params.toString()}`);
      setOrders(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Lỗi khi tải danh sách đơn hàng:', err);
      showToast('Không thể tải danh sách đơn hàng');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, status, paymentStatus, channel, showToast]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const columns = React.useMemo<ColumnDef<SalesOrderRecord>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã đơn',
        cell: ({ row }) => (
          <Link
            href={`/admin/sales/orders/${row.original.id}`}
            className="font-medium text-accent hover:underline"
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: 'customer',
        header: 'Khách hàng',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-fg">{row.original.customer?.name}</div>
            <div className="text-xs text-muted">{row.original.customer?.phone}</div>
          </div>
        ),
      },
      {
        accessorKey: 'channel',
        header: 'Kênh bán',
        cell: ({ row }) => (
          <ChannelBadge channel={row.original.channel} status={row.original.status} />
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Ngày tạo',
        cell: ({ row }) => (
          <span className="text-xs text-muted">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'paymentStatus',
        header: 'Thanh toán',
        cell: ({ row }) => <PaymentStatusBadge status={row.original.paymentStatus} />,
      },
      {
        accessorKey: 'total',
        header: 'Tổng tiền',
        cell: ({ row }) => (
          <span className="font-semibold text-fg">{formatCurrency(row.original.total)}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Thao tác',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1">
              <Link href={`/admin/sales/orders/${item.id}`} passHref>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Xem chi tiết"
                  className="h-8 w-8 p-0 text-muted hover:text-fg"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={`/admin/sales/orders/${item.id}/print?type=invoice`} passHref>
                <Button
                  variant="ghost"
                  size="sm"
                  title="In hóa đơn"
                  className="h-8 w-8 p-0 text-muted hover:text-fg"
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          );
        },
      },
    ],
    [],
  );

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const paidCount = orders.filter((o) => o.paymentStatus === 'PAID').length;

  return (
    <div className="space-y-6">
      {toastMessage && <Toast message={toastMessage} onClose={closeToast} />}

      <PageHeader
        title="Đơn hàng bán"
        description="Quản lý và xử lý đơn hàng từ các kênh bán hàng (Admin, Webshop)"
      >
        {canCreate && (
          <Link href="/admin/sales/orders/new">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Tạo đơn hàng</span>
            </Button>
          </Link>
        )}
      </PageHeader>

      {/* Thẻ thống kê nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-line bg-surface p-4 shadow-xs text-fg">
          <div className="text-xs font-semibold uppercase text-muted tracking-wider">
            Tổng số đơn
          </div>
          <p className="text-2xl font-bold mt-1 text-fg">{total}</p>
        </div>
        <div className="rounded-lg border border-warn/30 bg-warn-bg/20 p-4 shadow-xs text-warn">
          <div className="text-xs font-semibold uppercase tracking-wider">Chờ xác nhận</div>
          <p className="text-2xl font-bold mt-1 text-warn">{pendingCount}</p>
        </div>
        <div className="rounded-lg border border-ok/30 bg-ok-bg/20 p-4 shadow-xs text-ok">
          <div className="text-xs font-semibold uppercase tracking-wider">Đã thanh toán đủ</div>
          <p className="text-2xl font-bold mt-1 text-ok">{paidCount}</p>
        </div>
      </div>

      {/* Bộ lọc trạng thái / thanh toán / kênh */}
      <div className="rounded-lg border border-line bg-surface p-3 sm:p-4 text-fg shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <select
              aria-label="Lọc trạng thái đơn"
              className="flex h-9 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm shadow-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
              value={status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái đơn</option>
              {Object.entries(orderStatusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              aria-label="Lọc trạng thái thanh toán"
              className="flex h-9 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm shadow-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
              value={paymentStatus}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setPaymentStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái thanh toán</option>
              {Object.entries(paymentStatusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              aria-label="Lọc kênh bán"
              className="flex h-9 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm shadow-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
              value={channel}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setChannel(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả kênh bán</option>
              {Object.entries(channelLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Tìm theo mã đơn hoặc tên khách hàng..."
        isLoading={isLoading}
      />
    </div>
  );
}
