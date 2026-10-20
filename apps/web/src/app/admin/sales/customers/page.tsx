'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { CustomerType, type Paginated } from '@xfarm/shared';
import {
  DataTable,
  PageHeader,
  Button,
  StatusBadge,
  ConfirmDialog,
  useToast,
  Toast,
} from '@xfarm/ui';
import { Plus, Edit2, Lock, Unlock, Eye } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { useAdminUser } from '../../admin-user-context';
import type { CustomerRecord } from '../_components/types';
import { customerTypeLabels } from '../_components/constants';
import { CustomerTypeBadge } from '../_components/order-status-badge';
import { CustomerFormDialog } from './_components/customer-form-dialog';
import { CustomerDetailDialog } from './_components/customer-detail-dialog';

export default function CustomersPage() {
  const user = useAdminUser();
  const canWrite =
    user?.role === 'OWNER' ||
    user?.role === 'MANAGER' ||
    user?.role === 'SALES' ||
    user?.role === 'ACCOUNTANT';
  const { message: toastMessage, showToast, closeToast } = useToast();

  const [customers, setCustomers] = React.useState<CustomerRecord[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);

  // Dialogs state
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<CustomerRecord | null>(null);
  const [viewingCustomerId, setViewingCustomerId] = React.useState<string | null>(null);
  const [toggleCustomer, setToggleCustomer] = React.useState<CustomerRecord | null>(null);
  const [isToggling, setIsToggling] = React.useState(false);

  const fetchCustomers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search.trim()) params.set('search', search.trim());
      if (typeFilter) params.set('type', typeFilter);

      const res = await apiFetch<Paginated<CustomerRecord>>(`/customers?${params.toString()}`);
      setCustomers(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error('Lỗi khi tải danh sách khách hàng:', err);
      showToast('Không thể tải danh sách khách hàng');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, typeFilter, showToast]);

  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleToggleActive = async () => {
    if (!toggleCustomer) return;
    setIsToggling(true);
    try {
      await apiFetch<CustomerRecord>(`/customers/${toggleCustomer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !toggleCustomer.isActive }),
      });
      showToast(
        toggleCustomer.isActive
          ? 'Đã khóa khách hàng thành công'
          : 'Đã mở khóa khách hàng thành công',
      );
      setToggleCustomer(null);
      fetchCustomers();
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message);
      } else {
        showToast('Có lỗi xảy ra khi cập nhật trạng thái');
      }
    } finally {
      setIsToggling(false);
    }
  };

  const columns = React.useMemo<ColumnDef<CustomerRecord>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã khách',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setViewingCustomerId(row.original.id)}
            className="font-medium text-accent hover:underline"
          >
            {row.original.code}
          </button>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Tên khách hàng',
        cell: ({ row }) => (
          <div className="font-medium text-fg">{row.original.name}</div>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Số điện thoại',
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => <span className="text-muted">{row.original.email || '—'}</span>,
      },
      {
        accessorKey: 'type',
        header: 'Loại khách',
        cell: ({ row }) => <CustomerTypeBadge type={row.original.type} />,
      },
      {
        accessorKey: 'isActive',
        header: 'Trạng thái',
        cell: ({ row }) => <StatusBadge status={row.original.isActive} />,
      },
      {
        id: 'actions',
        header: 'Thao tác',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingCustomerId(item.id)}
                title="Xem chi tiết"
                className="h-8 w-8 p-0 text-muted hover:text-fg"
              >
                <Eye className="h-4 w-4" />
              </Button>
              {canWrite && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingCustomer(item)}
                    title="Chỉnh sửa"
                    className="h-8 w-8 p-0 text-muted hover:text-fg"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setToggleCustomer(item)}
                    title={item.isActive ? 'Khóa khách hàng' : 'Mở khóa khách hàng'}
                    className={`h-8 w-8 p-0 ${
                      item.isActive
                        ? 'text-crit hover:text-crit/80'
                        : 'text-ok hover:text-ok/80'
                    }`}
                  >
                    {item.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [canWrite],
  );

  const activeCount = customers.filter((c) => c.isActive).length;
  const lockedCount = customers.filter((c) => !c.isActive).length;

  return (
    <div className="space-y-6">
      {toastMessage && <Toast message={toastMessage} onClose={closeToast} />}

      <PageHeader
        title="Khách hàng"
        description="Quản lý thông tin khách hàng, công nợ và lịch sử mua hàng"
      >
        {canWrite && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm khách hàng</span>
          </Button>
        )}
      </PageHeader>

      {/* Thẻ thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-line bg-surface p-4 shadow-xs text-fg">
          <div className="text-xs font-semibold uppercase text-muted tracking-wider">
            Tổng khách hàng
          </div>
          <p className="text-2xl font-bold mt-1 text-fg">{total}</p>
        </div>
        <div className="rounded-lg border border-ok/30 bg-ok-bg/20 p-4 shadow-xs text-ok">
          <div className="text-xs font-semibold uppercase tracking-wider">
            Đang hoạt động
          </div>
          <p className="text-2xl font-bold mt-1 text-ok">{activeCount}</p>
        </div>
        <div className="rounded-lg border border-crit/30 bg-crit-bg/20 p-4 shadow-xs text-crit">
          <div className="text-xs font-semibold uppercase tracking-wider">
            Tạm khóa
          </div>
          <p className="text-2xl font-bold mt-1 text-crit">{lockedCount}</p>
        </div>
      </div>

      {/* Thanh lọc */}
      <div className="rounded-lg border border-line bg-surface p-3 sm:p-4 text-fg shadow-xs">
        <div className="w-full sm:w-64">
          <select
            aria-label="Lọc theo loại khách"
            className="flex h-9 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm shadow-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
            value={typeFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả loại khách</option>
            <option value={CustomerType.RETAIL}>{customerTypeLabels[CustomerType.RETAIL]}</option>
            <option value={CustomerType.WHOLESALE}>
              {customerTypeLabels[CustomerType.WHOLESALE]}
            </option>
            <option value={CustomerType.AGENT}>{customerTypeLabels[CustomerType.AGENT]}</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Tìm theo mã, tên, số điện thoại..."
        isLoading={isLoading}
      />

      {/* Dialog tạo khách hàng */}
      <CustomerFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={(newCust) => {
          showToast(`Đã thêm khách hàng ${newCust.name} thành công`);
          fetchCustomers();
        }}
      />

      {/* Dialog sửa khách hàng */}
      <CustomerFormDialog
        open={Boolean(editingCustomer)}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
        customer={editingCustomer}
        onSuccess={(updated) => {
          showToast(`Đã cập nhật khách hàng ${updated.name} thành công`);
          setEditingCustomer(null);
          fetchCustomers();
        }}
      />

      {/* Dialog xem chi tiết khách hàng */}
      <CustomerDetailDialog
        open={Boolean(viewingCustomerId)}
        onOpenChange={(open) => !open && setViewingCustomerId(null)}
        customerId={viewingCustomerId}
      />

      {/* Confirm dialog khóa / mở khóa */}
      <ConfirmDialog
        open={Boolean(toggleCustomer)}
        onOpenChange={(open) => !open && setToggleCustomer(null)}
        title={toggleCustomer?.isActive ? 'Khóa khách hàng' : 'Mở khóa khách hàng'}
        description={
          toggleCustomer?.isActive
            ? `Bạn có chắc chắn muốn khóa khách hàng "${toggleCustomer.name}"? Khách hàng bị khóa sẽ không thể tạo đơn hàng mới.`
            : `Bạn có chắc chắn muốn mở khóa khách hàng "${toggleCustomer?.name}"?`
        }
        confirmText={toggleCustomer?.isActive ? 'Khóa khách hàng' : 'Mở khóa'}
        isDanger={toggleCustomer?.isActive}
        isLoading={isToggling}
        onConfirm={handleToggleActive}
      />
    </div>
  );
}
