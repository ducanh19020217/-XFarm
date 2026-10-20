'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import { Button, DataTable, FormDialog, PageHeader, StatusBadge, Toast, useToast } from '@xfarm/ui';
import { Plus } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { useAdminUser } from '../admin-user-context';
import { canCreatePO, formatCurrency, formatDate } from './_components/constants';
import { POFilters } from './_components/po-filters';
import { POForm, type POFormSubmitData } from './_components/po-form';
import type {
  ItemOption,
  PurchaseOrderItem,
  PurchaseOrderListResponse,
  SupplierOption,
} from './_components/types';

export default function PurchaseOrdersPage() {
  const user = useAdminUser();
  const router = useRouter();
  const canCreate = canCreatePO(user?.role);
  const { message, showToast, closeToast } = useToast();

  const [orders, setOrders] = React.useState<PurchaseOrderItem[]>([]);
  const [suppliers, setSuppliers] = React.useState<SupplierOption[]>([]);
  const [items, setItems] = React.useState<ItemOption[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [supplierId, setSupplierId] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const pageSize = 10;

  const fetchSuppliers = React.useCallback(async () => {
    try {
      const res = await apiFetch<SupplierOption[] | { data: SupplierOption[] }>(
        '/suppliers?page=1&pageSize=100',
      );
      setSuppliers(Array.isArray(res) ? res : res.data || []);
    } catch {
      // Mock or fallback silently if API is not yet merged
      setSuppliers([]);
    }
  }, []);

  const fetchItems = React.useCallback(async () => {
    try {
      const res = await apiFetch<ItemOption[] | { data: ItemOption[] }>(
        '/items?page=1&pageSize=100&isActive=true',
      );
      setItems(Array.isArray(res) ? res : res.data || []);
    } catch {
      setItems([]);
    }
  }, []);

  const fetchPurchaseOrders = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (search.trim()) params.set('search', search.trim());
    if (status) params.set('status', status);
    if (supplierId) params.set('supplierId', supplierId);

    try {
      const res = await apiFetch<PurchaseOrderListResponse>(`/purchase-orders?${params}`);
      setOrders(res.data || []);
      setTotal(res.total || 0);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        // API not ready yet on backend
        setOrders([]);
        setTotal(0);
      } else {
        showToast(
          error instanceof ApiError ? error.message : 'Không thể tải danh sách đơn mua hàng',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, showToast, status, supplierId]);

  React.useEffect(() => {
    void fetchSuppliers();
    void fetchItems();
  }, [fetchSuppliers, fetchItems]);

  React.useEffect(() => {
    void fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  const handleCreatePO = async (data: POFormSubmitData) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch('/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setCreateOpen(false);
      showToast('Tạo đơn mua hàng thành công');
      await fetchPurchaseOrders();
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : 'Không thể tạo đơn mua hàng';
      setFormError(msg);
      showToast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const stats = React.useMemo(() => {
    const totalCount = total || orders.length;
    const draftCount = orders.filter((o) => o.status === 'DRAFT').length;
    const orderedCount = orders.filter(
      (o) => o.status === 'ORDERED' || o.status === 'PARTIAL',
    ).length;
    const receivedCount = orders.filter((o) => o.status === 'RECEIVED').length;
    return { totalCount, draftCount, orderedCount, receivedCount };
  }, [total, orders]);

  const columns: ColumnDef<PurchaseOrderItem>[] = React.useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã đơn',
        cell: ({ row }) => (
          <Link
            href={`/admin/purchase-orders/${row.original.id}`}
            className="font-medium text-accent hover:underline"
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: 'supplier',
        header: 'Nhà cung cấp',
        cell: ({ row }) => (
          <span className="text-fg">
            {row.original.supplier?.name || row.original.supplier?.code || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'orderDate',
        header: 'Ngày đặt',
        cell: ({ row }) => <span className="text-fg-2">{formatDate(row.original.orderDate)}</span>,
      },
      {
        accessorKey: 'total',
        header: 'Tổng tiền',
        cell: ({ row }) => (
          <span className="font-semibold text-fg">{formatCurrency(row.original.total)}</span>
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
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/admin/purchase-orders/${row.original.id}`)}
          >
            Xem
          </Button>
        ),
      },
    ],
    [router],
  );

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} />
      <PageHeader
        title="Đơn mua hàng"
        description="Quản lý đơn mua hàng và nhận hàng từ nhà cung cấp"
      >
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tạo đơn mua hàng
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <p className="text-xs font-medium text-muted">Tổng đơn hàng</p>
          <p className="mt-1 text-2xl font-bold text-fg">{stats.totalCount}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <p className="text-xs font-medium text-muted">Bản nháp</p>
          <p className="mt-1 text-2xl font-bold text-warn">{stats.draftCount}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <p className="text-xs font-medium text-muted">Đang đặt hàng</p>
          <p className="mt-1 text-2xl font-bold text-accent">{stats.orderedCount}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <p className="text-xs font-medium text-muted">Đã nhận đủ</p>
          <p className="mt-1 text-2xl font-bold text-ok">{stats.receivedCount}</p>
        </div>
      </div>

      <POFilters
        status={status}
        supplierId={supplierId}
        suppliers={suppliers}
        onStatusChange={(val) => {
          setStatus(val);
          setPage(1);
        }}
        onSupplierChange={(val) => {
          setSupplierId(val);
          setPage(1);
        }}
      />

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
        searchPlaceholder="Tìm theo mã đơn hoặc nhà cung cấp..."
        isLoading={loading}
      />

      {canCreate && (
        <FormDialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) setFormError(null);
          }}
          title="Tạo đơn mua hàng mới"
          description="Nhập thông tin nhà cung cấp và danh sách các mặt hàng cần đặt"
          className="max-w-3xl"
        >
          <POForm
            suppliers={suppliers}
            items={items}
            onSubmit={handleCreatePO}
            onCancel={() => setCreateOpen(false)}
            isSubmitting={submitting}
            formError={formError}
          />
        </FormDialog>
      )}
    </div>
  );
}
