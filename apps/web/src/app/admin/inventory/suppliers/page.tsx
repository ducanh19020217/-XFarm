'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { type CreateSupplierInput, type Paginated } from '@xfarm/shared';
import {
  DataTable,
  PageHeader,
  Button,
  StatusBadge,
  ConfirmDialog,
  useToast,
  Toast,
} from '@xfarm/ui';
import { Plus, Edit2, Lock, Unlock, Trash2, Truck, Phone, MapPin, Building } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { useAdminUser } from '../../admin-user-context';
import { CatalogTabs } from '../_components/catalog-tabs';
import { SupplierFormDialog, type SupplierRecord } from './supplier-form-dialog';

export default function SuppliersPage() {
  const user = useAdminUser();
  const canWrite =
    user?.role === 'OWNER' || user?.role === 'MANAGER' || user?.role === 'ACCOUNTANT';
  const { message: toastMessage, showToast, closeToast } = useToast();

  const [suppliers, setSuppliers] = React.useState<SupplierRecord[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [search, setSearch] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  // Dialogs state
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<SupplierRecord | null>(null);
  const [confirmLockSupplier, setConfirmLockSupplier] = React.useState<SupplierRecord | null>(null);
  const [confirmDeleteSupplier, setConfirmDeleteSupplier] = React.useState<SupplierRecord | null>(
    null,
  );
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLocking, setIsLocking] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchSuppliers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search.trim()) params.set('search', search.trim());

      const res = await apiFetch<Paginated<SupplierRecord>>(`/suppliers?${params.toString()}`);
      setSuppliers(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error('Lỗi khi tải danh sách nhà cung cấp:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search]);

  React.useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleCreateSubmit = async (data: CreateSupplierInput) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiFetch<SupplierRecord>('/suppliers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setCreateOpen(false);
      showToast('Thêm nhà cung cấp thành công');
      fetchSuppliers();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Đã có lỗi xảy ra khi tạo nhà cung cấp');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (data: CreateSupplierInput) => {
    if (!editingSupplier) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiFetch<SupplierRecord>(`/suppliers/${editingSupplier.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          address: data.address,
          taxCode: data.taxCode,
        }),
      });
      setEditingSupplier(null);
      showToast('Cập nhật nhà cung cấp thành công');
      fetchSuppliers();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Đã có lỗi xảy ra khi cập nhật nhà cung cấp');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLock = async () => {
    if (!confirmLockSupplier) return;
    setIsLocking(true);
    const newStatus = confirmLockSupplier.isActive === false ? true : false;
    try {
      await apiFetch<SupplierRecord>(`/suppliers/${confirmLockSupplier.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: newStatus }),
      });
      showToast(
        newStatus ? 'Đã mở khóa nhà cung cấp thành công' : 'Đã khóa nhà cung cấp thành công',
      );
      setConfirmLockSupplier(null);
      fetchSuppliers();
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message);
      } else {
        showToast('Không thể thay đổi trạng thái nhà cung cấp');
      }
    } finally {
      setIsLocking(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteSupplier) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/suppliers/${confirmDeleteSupplier.id}`, {
        method: 'DELETE',
      });
      showToast('Xóa nhà cung cấp thành công');
      setConfirmDeleteSupplier(null);
      fetchSuppliers();
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message);
      } else {
        showToast('Không thể xóa nhà cung cấp đã phát sinh giao dịch');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = React.useMemo<ColumnDef<SupplierRecord>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã NCC',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
            {row.original.code}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Tên nhà cung cấp',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-zinc-400" />
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {row.original.name}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Số điện thoại',
        cell: ({ row }) => {
          const phone = row.original.phone;
          if (!phone) return <span className="text-zinc-400 text-sm">-</span>;
          return (
            <div className="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
              <Phone className="h-3.5 w-3.5 text-zinc-400" />
              <span>{phone}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'address',
        header: 'Địa chỉ',
        cell: ({ row }) => {
          const address = row.original.address;
          if (!address) return <span className="text-zinc-400 text-sm">-</span>;
          return (
            <div className="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300 max-w-xs truncate">
              <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">{address}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'taxCode',
        header: 'Mã số thuế',
        cell: ({ row }) => {
          const taxCode = row.original.taxCode;
          if (!taxCode) return <span className="text-zinc-400 text-sm">-</span>;
          return (
            <div className="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
              <Building className="h-3.5 w-3.5 text-zinc-400" />
              <span className="font-mono text-xs">{taxCode}</span>
            </div>
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
              cell: ({ row }: { row: { original: SupplierRecord } }) => {
                const sup = row.original;
                const isLocked = sup.isActive === false;
                return (
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormError(null);
                        setEditingSupplier(sup);
                      }}
                      title="Chỉnh sửa nhà cung cấp"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={
                        isLocked
                          ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                      }
                      onClick={() => setConfirmLockSupplier(sup)}
                      title={isLocked ? 'Mở khóa nhà cung cấp' : 'Khóa nhà cung cấp'}
                    >
                      {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => setConfirmDeleteSupplier(sup)}
                      title="Xóa nhà cung cấp"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              },
            } as ColumnDef<SupplierRecord>,
          ]
        : []),
    ],
    [canWrite],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Danh mục Nhà cung cấp"
        description="Quản lý danh sách nhà cung cấp vật tư, giống cây trồng, vật nuôi và thức ăn"
      >
        {canWrite && (
          <Button
            onClick={() => {
              setFormError(null);
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm nhà cung cấp
          </Button>
        )}
      </PageHeader>

      <CatalogTabs active="suppliers" />

      <DataTable
        columns={columns}
        data={suppliers}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Tìm kiếm theo mã, tên, SĐT, MST..."
        isLoading={isLoading}
      />

      {/* FormDialog create */}
      <SupplierFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateSubmit}
        isLoading={isSubmitting}
        error={formError}
      />

      {/* FormDialog edit */}
      <SupplierFormDialog
        open={Boolean(editingSupplier)}
        onOpenChange={(open) => !open && setEditingSupplier(null)}
        supplier={editingSupplier}
        onSubmit={handleEditSubmit}
        isLoading={isSubmitting}
        error={formError}
      />

      {/* ConfirmDialog soft lock */}
      <ConfirmDialog
        open={Boolean(confirmLockSupplier)}
        onOpenChange={(open) => !open && setConfirmLockSupplier(null)}
        title={
          confirmLockSupplier?.isActive === false
            ? 'Xác nhận mở khóa nhà cung cấp'
            : 'Xác nhận khóa nhà cung cấp'
        }
        description={
          confirmLockSupplier?.isActive === false
            ? `Bạn có chắc chắn muốn mở khóa nhà cung cấp "${confirmLockSupplier?.name}" để tiếp tục giao dịch?`
            : `Bạn có chắc chắn muốn khóa nhà cung cấp "${confirmLockSupplier?.name}"? Nhà cung cấp bị khóa sẽ không thể chọn khi lập đơn mua hàng mới.`
        }
        confirmText={confirmLockSupplier?.isActive === false ? 'Mở khóa' : 'Khóa nhà cung cấp'}
        isDanger={confirmLockSupplier?.isActive !== false}
        isLoading={isLocking}
        onConfirm={handleToggleLock}
      />

      {/* ConfirmDialog delete (chặn xóa nếu đã phát sinh giao dịch, lỗi 422) */}
      <ConfirmDialog
        open={Boolean(confirmDeleteSupplier)}
        onOpenChange={(open) => !open && setConfirmDeleteSupplier(null)}
        title="Xác nhận xóa nhà cung cấp"
        description={`Bạn có chắc chắn muốn xóa nhà cung cấp "${confirmDeleteSupplier?.name}"? Hệ thống chỉ cho phép xóa nhà cung cấp khi chưa phát sinh bất kỳ đơn hàng hoặc giao dịch nào.`}
        confirmText="Xóa nhà cung cấp"
        isDanger
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />

      {toastMessage && <Toast message={toastMessage} onClose={closeToast} />}
    </div>
  );
}
