'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { type CreateWarehouseInput, type Paginated } from '@xfarm/shared';
import {
  DataTable,
  PageHeader,
  Button,
  StatusBadge,
  ConfirmDialog,
  useToast,
  Toast,
} from '@xfarm/ui';
import { Plus, Edit2, Lock, Unlock, Trash2, Warehouse as WarehouseIcon } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { useAdminUser } from '../../admin-user-context';
import { CatalogTabs } from '../_components/catalog-tabs';
import { WarehouseFormDialog, type WarehouseRecord } from './warehouse-form-dialog';

export default function WarehousesPage() {
  const user = useAdminUser();
  const canWrite = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const { message: toastMessage, showToast, closeToast } = useToast();

  const [warehouses, setWarehouses] = React.useState<WarehouseRecord[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [search, setSearch] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  // Dialogs state
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingWarehouse, setEditingWarehouse] = React.useState<WarehouseRecord | null>(null);
  const [confirmLockWarehouse, setConfirmLockWarehouse] = React.useState<WarehouseRecord | null>(
    null,
  );
  const [confirmDeleteWarehouse, setConfirmDeleteWarehouse] =
    React.useState<WarehouseRecord | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLocking, setIsLocking] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchWarehouses = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search.trim()) params.set('search', search.trim());

      const res = await apiFetch<Paginated<WarehouseRecord>>(`/warehouses?${params.toString()}`);
      setWarehouses(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error('Lỗi khi tải danh sách kho:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search]);

  React.useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const handleCreateSubmit = async (data: CreateWarehouseInput) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiFetch<WarehouseRecord>('/warehouses', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setCreateOpen(false);
      showToast('Thêm kho hàng thành công');
      fetchWarehouses();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Đã có lỗi xảy ra khi tạo kho hàng');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (data: CreateWarehouseInput) => {
    if (!editingWarehouse) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiFetch<WarehouseRecord>(`/warehouses/${editingWarehouse.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: data.name,
          areaId: data.areaId,
        }),
      });
      setEditingWarehouse(null);
      showToast('Cập nhật kho hàng thành công');
      fetchWarehouses();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Đã có lỗi xảy ra khi cập nhật kho hàng');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLock = async () => {
    if (!confirmLockWarehouse) return;
    setIsLocking(true);
    const newStatus = confirmLockWarehouse.isActive === false ? true : false;
    try {
      await apiFetch<WarehouseRecord>(`/warehouses/${confirmLockWarehouse.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: newStatus }),
      });
      showToast(newStatus ? 'Đã mở khóa kho hàng thành công' : 'Đã khóa kho hàng thành công');
      setConfirmLockWarehouse(null);
      fetchWarehouses();
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message);
      } else {
        showToast('Không thể thay đổi trạng thái kho hàng');
      }
    } finally {
      setIsLocking(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteWarehouse) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/warehouses/${confirmDeleteWarehouse.id}`, {
        method: 'DELETE',
      });
      showToast('Xóa kho hàng thành công');
      setConfirmDeleteWarehouse(null);
      fetchWarehouses();
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message);
      } else {
        showToast('Không thể xóa kho hàng đã phát sinh giao dịch');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = React.useMemo<ColumnDef<WarehouseRecord>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã kho',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-medium text-fg bg-surface-2 border border-line px-2 py-1 rounded">
            {row.original.code}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Tên kho hàng',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <WarehouseIcon className="h-4 w-4 text-muted" />
            <span className="font-medium text-fg">
              {row.original.name}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'area',
        header: 'Khu vực liên kết',
        cell: ({ row }) => {
          const area = row.original.area;
          if (!area) return <span className="text-muted text-sm">-</span>;
          return (
            <span className="text-sm text-fg-2">
              {area.code ? `${area.code} - ${area.name}` : area.name}
            </span>
          );
        },
      },
      {
        accessorKey: 'isActive',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <StatusBadge status={row.original.isActive === false ? 'INACTIVE' : 'ACTIVE'} />
        ),
      },
      ...(canWrite
        ? [
            {
              id: 'actions',
              header: 'Thao tác',
              cell: ({ row }: { row: { original: WarehouseRecord } }) => {
                const wh = row.original;
                const isLocked = wh.isActive === false;
                return (
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormError(null);
                        setEditingWarehouse(wh);
                      }}
                      title="Chỉnh sửa kho"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={
                        isLocked
                          ? 'text-ok hover:bg-ok-bg'
                          : 'text-warn hover:bg-warn-bg'
                      }
                      onClick={() => setConfirmLockWarehouse(wh)}
                      title={isLocked ? 'Mở khóa kho hàng' : 'Khóa kho hàng'}
                    >
                      {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-crit hover:bg-crit-bg"
                      onClick={() => setConfirmDeleteWarehouse(wh)}
                      title="Xóa kho hàng"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              },
            } as ColumnDef<WarehouseRecord>,
          ]
        : []),
    ],
    [canWrite],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Danh mục Kho hàng"
        description="Quản lý hệ thống kho bãi lưu trữ vật tư nông nghiệp và thành phẩm thu hoạch"
      >
        {canWrite && (
          <Button
            onClick={() => {
              setFormError(null);
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm kho
          </Button>
        )}
      </PageHeader>

      <CatalogTabs active="warehouses" />

      <DataTable
        columns={columns}
        data={warehouses}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Tìm kiếm theo mã kho, tên kho..."
        isLoading={isLoading}
      />

      {/* FormDialog create */}
      <WarehouseFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateSubmit}
        isLoading={isSubmitting}
        error={formError}
      />

      {/* FormDialog edit */}
      <WarehouseFormDialog
        open={Boolean(editingWarehouse)}
        onOpenChange={(open) => !open && setEditingWarehouse(null)}
        warehouse={editingWarehouse}
        onSubmit={handleEditSubmit}
        isLoading={isSubmitting}
        error={formError}
      />

      {/* ConfirmDialog soft lock */}
      <ConfirmDialog
        open={Boolean(confirmLockWarehouse)}
        onOpenChange={(open) => !open && setConfirmLockWarehouse(null)}
        title={
          confirmLockWarehouse?.isActive === false
            ? 'Xác nhận mở khóa kho hàng'
            : 'Xác nhận khóa kho hàng'
        }
        description={
          confirmLockWarehouse?.isActive === false
            ? `Bạn có chắc chắn muốn mở khóa kho hàng "${confirmLockWarehouse?.name}" để tiếp tục lưu chuyển hàng hóa?`
            : `Bạn có chắc chắn muốn khóa kho hàng "${confirmLockWarehouse?.name}"? Kho bị khóa sẽ không thể nhập xuất vật tư mới.`
        }
        confirmText={confirmLockWarehouse?.isActive === false ? 'Mở khóa' : 'Khóa kho'}
        isDanger={confirmLockWarehouse?.isActive !== false}
        isLoading={isLocking}
        onConfirm={handleToggleLock}
      />

      {/* ConfirmDialog delete (chặn xóa nếu có giao dịch, lỗi 422) */}
      <ConfirmDialog
        open={Boolean(confirmDeleteWarehouse)}
        onOpenChange={(open) => !open && setConfirmDeleteWarehouse(null)}
        title="Xác nhận xóa kho hàng"
        description={`Bạn có chắc chắn muốn xóa kho hàng "${confirmDeleteWarehouse?.name}"? Hệ thống chỉ cho phép xóa kho khi chưa phát sinh bất kỳ giao dịch kho nào.`}
        confirmText="Xóa kho hàng"
        isDanger
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />

      {toastMessage && <Toast message={toastMessage} onClose={closeToast} />}
    </div>
  );
}
