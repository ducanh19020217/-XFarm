'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  type CreateItemInput,
  type Paginated,
  ItemCategory,
  ITEM_CATEGORY_LABELS,
} from '@xfarm/shared';
import {
  DataTable,
  PageHeader,
  Button,
  StatusBadge,
  ConfirmDialog,
  Badge,
  useToast,
  Toast,
} from '@xfarm/ui';
import { Plus, Edit2, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { useAdminUser } from '../../admin-user-context';
import { CatalogTabs } from '../_components/catalog-tabs';
import { ItemFormDialog, type ItemRecord } from './item-form-dialog';

export default function ItemsPage() {
  const user = useAdminUser();
  const canWrite = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const { message: toastMessage, showToast, closeToast } = useToast();

  const [items, setItems] = React.useState<ItemRecord[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState<string>('ALL');
  const [belowMinStock, setBelowMinStock] = React.useState<string>('ALL');
  const [isLoading, setIsLoading] = React.useState(true);

  // Dialogs state
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ItemRecord | null>(null);
  const [confirmLockItem, setConfirmLockItem] = React.useState<ItemRecord | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLocking, setIsLocking] = React.useState(false);

  const fetchItems = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search.trim()) params.set('search', search.trim());
      if (category !== 'ALL') params.set('category', category);
      if (belowMinStock === 'true') params.set('belowMinStock', 'true');

      const res = await apiFetch<Paginated<ItemRecord>>(`/items?${params.toString()}`);
      setItems(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error('Lỗi khi tải danh sách vật tư:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, category, belowMinStock]);

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCreateSubmit = async (data: CreateItemInput) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiFetch<ItemRecord>('/items', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setCreateOpen(false);
      showToast('Thêm vật tư mới thành công');
      fetchItems();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Đã có lỗi xảy ra khi tạo vật tư');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (data: CreateItemInput) => {
    if (!editingItem) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiFetch<ItemRecord>(`/items/${editingItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: data.name,
          category: data.category,
          unit: data.unit,
          minStock: data.minStock,
          isSellable: data.isSellable,
        }),
      });
      setEditingItem(null);
      showToast('Cập nhật vật tư thành công');
      fetchItems();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Đã có lỗi xảy ra khi cập nhật vật tư');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLock = async () => {
    if (!confirmLockItem) return;
    setIsLocking(true);
    try {
      await apiFetch<ItemRecord>(`/items/${confirmLockItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !confirmLockItem.isActive }),
      });
      showToast(
        confirmLockItem.isActive ? 'Đã khóa vật tư thành công' : 'Đã mở khóa vật tư thành công',
      );
      setConfirmLockItem(null);
      fetchItems();
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message);
      } else {
        showToast('Không thể thay đổi trạng thái vật tư');
      }
    } finally {
      setIsLocking(false);
    }
  };

  const columns = React.useMemo<ColumnDef<ItemRecord>[]>(
    () => [
      {
        accessorKey: 'sku',
        header: 'Mã SKU',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-medium text-fg bg-surface-2 border border-line px-2 py-1 rounded">
            {row.original.sku}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Tên vật tư / hàng hóa',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-fg">{row.original.name}</span>
            {row.original.isSellable && (
              <span className="text-xs text-ok font-medium">Được phép bán</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Nhóm hàng',
        cell: ({ row }) => (
          <Badge variant="outline" className="font-normal text-xs">
            {ITEM_CATEGORY_LABELS[row.original.category] || row.original.category}
          </Badge>
        ),
      },
      {
        accessorKey: 'unit',
        header: 'ĐVT',
        cell: ({ row }) => <span className="text-sm text-fg-2">{row.original.unit}</span>,
      },
      {
        accessorKey: 'minStock',
        header: 'Định mức tồn',
        cell: ({ row }) => {
          const min = row.original.minStock;
          if (min === null || min === undefined) return <span className="text-muted">-</span>;
          return (
            <span className="text-sm text-fg-2">
              {new Intl.NumberFormat('vi-VN').format(Number(min))} {row.original.unit}
            </span>
          );
        },
      },
      {
        id: 'onHand',
        header: 'Tồn kho',
        cell: ({ row }) => {
          const item = row.original;
          const onHand = Number(item.onHand ?? 0);
          const minStock =
            item.minStock !== null && item.minStock !== undefined ? Number(item.minStock) : null;
          const isBelow = minStock !== null && onHand < minStock;
          const formattedOnHand = new Intl.NumberFormat('vi-VN').format(onHand);

          return (
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-semibold ${isBelow ? 'text-crit' : 'text-fg'}`}>
                {formattedOnHand} {item.unit}
              </span>
              {isBelow && (
                <span
                  title="Tồn dưới mức tối thiểu"
                  className="inline-flex items-center text-xs text-crit bg-crit-bg px-1.5 py-0.5 rounded font-medium gap-0.5"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Dưới định mức
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'isActive',
        header: 'Trạng thái',
        cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} />,
      },
      ...(canWrite
        ? [
            {
              id: 'actions',
              header: 'Thao tác',
              cell: ({ row }: { row: { original: ItemRecord } }) => {
                const item = row.original;
                return (
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormError(null);
                        setEditingItem(item);
                      }}
                      title="Chỉnh sửa vật tư"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={
                        item.isActive ? 'text-warn hover:bg-warn-bg' : 'text-ok hover:bg-ok-bg'
                      }
                      onClick={() => setConfirmLockItem(item)}
                      title={item.isActive ? 'Khóa vật tư' : 'Mở khóa vật tư'}
                    >
                      {item.isActive ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );
              },
            } as ColumnDef<ItemRecord>,
          ]
        : []),
    ],
    [canWrite],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Danh mục Vật tư & Hàng hóa"
        description="Quản lý danh sách vật tư nông nghiệp, định mức tồn kho và trạng thái sử dụng"
      >
        {canWrite && (
          <Button
            onClick={() => {
              setFormError(null);
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm vật tư
          </Button>
        )}
      </PageHeader>

      <CatalogTabs active="items" />

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-48 sm:w-56">
            <select
              aria-label="Lọc theo nhóm hàng"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="flex h-10 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm text-fg shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="ALL">Tất cả nhóm hàng</option>
              {Object.values(ItemCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {ITEM_CATEGORY_LABELS[cat] || cat}
                </option>
              ))}
            </select>
          </div>

          <div className="w-44 sm:w-52">
            <select
              aria-label="Lọc theo mức tồn"
              value={belowMinStock}
              onChange={(e) => {
                setBelowMinStock(e.target.value);
                setPage(1);
              }}
              className="flex h-10 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm text-fg shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="ALL">Tất cả mức tồn</option>
              <option value="true">Dưới định mức tồn</option>
            </select>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Tìm kiếm theo mã SKU, tên vật tư..."
        isLoading={isLoading}
      />

      {/* FormDialog create */}
      <ItemFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateSubmit}
        isLoading={isSubmitting}
        error={formError}
      />

      {/* FormDialog edit */}
      <ItemFormDialog
        open={Boolean(editingItem)}
        onOpenChange={(open) => !open && setEditingItem(null)}
        item={editingItem}
        onSubmit={handleEditSubmit}
        isLoading={isSubmitting}
        error={formError}
      />

      {/* ConfirmDialog soft lock */}
      <ConfirmDialog
        open={Boolean(confirmLockItem)}
        onOpenChange={(open) => !open && setConfirmLockItem(null)}
        title={confirmLockItem?.isActive ? 'Xác nhận khóa vật tư' : 'Xác nhận mở khóa vật tư'}
        description={
          confirmLockItem?.isActive
            ? `Bạn có chắc chắn muốn khóa vật tư "${confirmLockItem?.name}"? Vật tư bị khóa sẽ không thể sử dụng cho các chứng từ xuất/nhập mới.`
            : `Bạn có chắc chắn muốn mở khóa vật tư "${confirmLockItem?.name}" để tiếp tục sử dụng?`
        }
        confirmText={confirmLockItem?.isActive ? 'Khóa vật tư' : 'Mở khóa'}
        isDanger={confirmLockItem?.isActive}
        isLoading={isLocking}
        onConfirm={handleToggleLock}
      />

      {toastMessage && <Toast message={toastMessage} onClose={closeToast} />}
    </div>
  );
}
