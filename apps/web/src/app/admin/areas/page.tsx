'use client';

import * as React from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { AreaType, type CreateAreaInput, Role } from '@xfarm/shared';
import {
  DataTable,
  PageHeader,
  Button,
  StatusBadge,
  Badge,
  ConfirmDialog,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@xfarm/ui';
import {
  Plus,
  Edit2,
  Lock,
  Unlock,
  Eye,
  List,
  GitFork,
  Map as MapIcon,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { apiFetch, ApiError, isAbortError } from '@/lib/api';
import { AreaItem, AreaTreeItem, AREA_TYPE_LABELS, AREA_TYPE_COLORS } from '@/lib/area-constants';
import { AreaFormDialog } from '@/components/area/area-form-dialog';
import { AreaTreeView } from '@/components/area/area-tree-view';
import { DynamicAreaMapOverview } from '@/components/map';

interface PaginatedAreas {
  data: AreaItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

type ViewMode = 'table' | 'tree' | 'map';

export default function AreasPage() {
  // Quyền người dùng
  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(null);
  const canWrite = currentUser?.role === Role.OWNER || currentUser?.role === Role.MANAGER;

  // Chế độ xem: Bảng, Cây, Bản đồ
  const [viewMode, setViewMode] = React.useState<ViewMode>('table');

  // Dữ liệu danh sách phân trang
  const [areas, setAreas] = React.useState<AreaItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(15);
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<string>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [isLoading, setIsLoading] = React.useState(true);

  // Dữ liệu cây
  const [treeData, setTreeData] = React.useState<AreaTreeItem[]>([]);
  const [isTreeLoading, setIsTreeLoading] = React.useState(false);

  // Danh sách toàn bộ khu để chọn khu cha và hiển thị đầy đủ trên bản đồ
  const [allAreas, setAllAreas] = React.useState<AreaItem[]>([]);

  // Dialog State: Form Tạo / Sửa
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingArea, setEditingArea] = React.useState<AreaItem | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Dialog State: Khóa / Mở khóa
  const [statusArea, setStatusArea] = React.useState<AreaItem | null>(null);
  const [statusError, setStatusError] = React.useState<string | null>(null);
  const [isStatusSubmitting, setIsStatusSubmitting] = React.useState(false);

  // Thông báo lỗi chung trên trang
  const [pageAlert, setPageAlert] = React.useState<string | null>(null);

  // 1. Tải thông tin người dùng hiện tại để phân quyền
  React.useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    apiFetch<{ data: UserProfile }>('/auth/me', { signal: controller.signal })
      .then((res) => {
        if (isMounted) setCurrentUser(res.data);
      })
      .catch((err) => {
        if (!isAbortError(err))
          console.warn('Chưa lấy được thông tin người dùng từ /auth/me:', err);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // 2. Tải danh sách phân trang (/areas)
  const fetchAreas = React.useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setPageAlert(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        if (search.trim()) params.set('search', search.trim());
        if (typeFilter !== 'ALL') params.set('type', typeFilter);
        if (statusFilter !== 'ALL') params.set('isActive', String(statusFilter === 'ACTIVE'));

        const res = await apiFetch<PaginatedAreas>(`/areas?${params.toString()}`, { signal });
        setAreas(res.data || []);
        setTotal(res.total || 0);
      } catch (err) {
        if (!isAbortError(err)) {
          console.error('Lỗi khi tải danh sách khu/lô:', err);
          setPageAlert('Không thể tải danh sách khu vực. Vui lòng thử lại.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [page, pageSize, search, typeFilter, statusFilter],
  );

  // 3. Tải cây phân cấp (/areas/tree)
  const fetchTree = React.useCallback(async (signal?: AbortSignal) => {
    setIsTreeLoading(true);
    try {
      const res = await apiFetch<{ data: AreaTreeItem[] } | AreaTreeItem[]>('/areas/tree', {
        signal,
      });
      const data = Array.isArray(res) ? res : res.data || [];
      setTreeData(data);
    } catch (err) {
      if (!isAbortError(err)) console.error('Lỗi khi tải cây khu/lô:', err);
    } finally {
      setIsTreeLoading(false);
    }
  }, []);

  // 4. Tải toàn bộ khu để làm tùy chọn cha và hiển thị đầy đủ trên Bản đồ
  const fetchAllAreas = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiFetch<PaginatedAreas>('/areas?page=1&pageSize=100', { signal });
      setAllAreas(res.data || []);
    } catch (err) {
      if (!isAbortError(err)) console.error('Lỗi khi tải toàn bộ khu vực:', err);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchAreas(controller.signal);
    return () => controller.abort();
  }, [fetchAreas]);

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchAllAreas(controller.signal);
    void fetchTree(controller.signal);
    return () => controller.abort();
  }, [fetchAllAreas, fetchTree]);

  // Xử lý chuyển tab
  const handleTabChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'tree' && treeData.length === 0) {
      fetchTree();
    }
    if (mode === 'map') {
      fetchAllAreas();
    }
  };

  // Xử lý tạo / sửa khu vực
  const handleFormSubmit = async (data: CreateAreaInput) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingArea) {
        await apiFetch(`/areas/${editingArea.id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      } else {
        await apiFetch('/areas', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
      setFormOpen(false);
      setEditingArea(null);
      fetchAreas();
      fetchTree();
      fetchAllAreas();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message || 'Lỗi kiểm tra dữ liệu từ máy chủ');
      } else {
        setFormError('Đã có lỗi xảy ra khi lưu khu/lô');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý khóa / mở khóa khu vực
  const handleToggleStatus = async () => {
    if (!statusArea) return;
    setIsStatusSubmitting(true);
    setStatusError(null);
    try {
      await apiFetch(`/areas/${statusArea.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !statusArea.isActive }),
      });
      setStatusArea(null);
      setStatusError(null);
      fetchAreas();
      fetchTree();
      fetchAllAreas();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 422) {
          setStatusError(
            err.message ||
              'Không thể khóa khu vực đang có mùa vụ hoạt động (ACTIVE hoặc HARVESTING).',
          );
        } else {
          setStatusError(err.message || `Lỗi yêu cầu: ${err.statusCode}`);
        }
      } else {
        setStatusError('Đã có lỗi không xác định xảy ra khi cập nhật trạng thái.');
      }
    } finally {
      setIsStatusSubmitting(false);
    }
  };

  // Định nghĩa các cột cho DataTable
  const columns: ColumnDef<AreaItem>[] = [
    {
      accessorKey: 'code',
      header: 'Mã khu/lô',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Tên khu/lô',
      cell: ({ row }) => (
        <div>
          <Link
            href={`/admin/areas/${row.original.id}`}
            className="font-medium text-slate-900 hover:text-emerald-600 dark:text-slate-100 dark:hover:text-emerald-400"
          >
            {row.original.name}
          </Link>
          {row.original.description && (
            <span className="block truncate max-w-xs text-xs text-slate-400">
              {row.original.description}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Phân loại',
      cell: ({ row }) => {
        const type = row.original.type;
        const style = AREA_TYPE_COLORS[type];
        return (
          <Badge
            variant="outline"
            className="text-xs px-2 py-0.5"
            style={{
              backgroundColor: `${style?.fill}15`,
              color: style?.stroke,
              borderColor: `${style?.stroke}40`,
            }}
          >
            {AREA_TYPE_LABELS[type] || type}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'parent',
      header: 'Khu cha',
      cell: ({ row }) => {
        const parent = row.original.parent;
        if (!parent) return <span className="text-slate-400">—</span>;
        return (
          <div className="text-xs">
            <span className="font-medium text-slate-700 dark:text-slate-300">{parent.name}</span>
            <span className="block font-mono text-[11px] text-slate-400">({parent.code})</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'areaM2',
      header: 'Diện tích (m²)',
      cell: ({ row }) => {
        const val = row.original.areaM2;
        if (val == null) return <span className="text-slate-400">—</span>;
        return (
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {Number(val).toLocaleString('vi-VN')} m²
          </span>
        );
      },
    },
    {
      accessorKey: 'activeCyclesCount',
      header: 'Mùa vụ đang chạy',
      cell: ({ row }) => {
        const count = row.original.activeCyclesCount ?? row.original._count?.cycles ?? 0;
        return count > 0 ? (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {count} vụ
          </span>
        ) : (
          <span className="text-xs text-slate-400">0</span>
        );
      },
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
        const area = row.original;
        return (
          <div className="flex items-center gap-1.5">
            <Link href={`/admin/areas/${area.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                title="Xem chi tiết và bản đồ"
              >
                <Eye className="h-3.5 w-3.5 text-slate-600" />
              </Button>
            </Link>

            {canWrite && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setEditingArea(area);
                    setFormError(null);
                    setFormOpen(true);
                  }}
                  title="Chỉnh sửa khu/lô"
                >
                  <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                </Button>

                <Button
                  variant={area.isActive ? 'outline' : 'default'}
                  size="sm"
                  className={`h-8 w-8 p-0 ${
                    area.isActive
                      ? 'text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                  onClick={() => {
                    setStatusArea(area);
                    setStatusError(null);
                  }}
                  title={area.isActive ? 'Khóa khu/lô' : 'Mở khóa khu/lô'}
                >
                  {area.isActive ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <Unlock className="h-3.5 w-3.5" />
                  )}
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header trang */}
      <PageHeader
        title="Quản lý Khu/lô"
        description="Quản lý cấu trúc phân vùng, diện tích canh tác, mùa vụ và bản đồ polygon của toàn bộ nông trại"
      >
        <div className="flex items-center gap-2">
          {canWrite && (
            <Button
              onClick={() => {
                setEditingArea(null);
                setFormError(null);
                setFormOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Thêm khu/lô mới
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Thông báo cảnh báo nếu có */}
      {pageAlert && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{pageAlert}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchAreas()}
            className="ml-auto h-7 text-xs"
          >
            <RefreshCw className="mr-1 h-3 w-3" /> Thử lại
          </Button>
        </div>
      )}

      {/* Thanh điều hướng chế độ xem (Tabs) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => handleTabChange('table')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === 'table'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100 font-semibold'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>Danh sách bảng</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('tree')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === 'tree'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100 font-semibold'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <GitFork className="h-3.5 w-3.5" />
            <span>Dạng cây phân cấp</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('map')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === 'map'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100 font-semibold'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <MapIcon className="h-3.5 w-3.5" />
            <span>Bản đồ nông trại</span>
          </button>
        </div>

        {/* Bộ lọc loại khu và trạng thái khi ở chế độ Table */}
        {viewMode === 'table' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-44">
              <Select
                value={typeFilter}
                onValueChange={(val) => {
                  setTypeFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Lọc theo loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả loại khu</SelectItem>
                  {Object.values(AreaType).map((t) => (
                    <SelectItem key={t} value={t}>
                      {AREA_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-36">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                  <SelectItem value="INACTIVE">Đã khóa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Nội dung theo Tab */}
      {viewMode === 'table' && (
        <DataTable
          columns={columns}
          data={areas}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          searchPlaceholder="Tìm theo tên hoặc mã khu/lô..."
          isLoading={isLoading}
        />
      )}

      {viewMode === 'tree' && (
        <div>
          {isTreeLoading ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                <span>Đang tải cây phân cấp...</span>
              </div>
            </div>
          ) : (
            <AreaTreeView
              treeData={treeData}
              onEdit={(area) => {
                setEditingArea(area);
                setFormError(null);
                setFormOpen(true);
              }}
              onToggleStatus={(area) => {
                setStatusArea(area);
                setStatusError(null);
              }}
              canWrite={canWrite}
            />
          )}
        </div>
      )}

      {viewMode === 'map' && <DynamicAreaMapOverview areas={allAreas} />}

      {/* Dialog Form Thêm / Sửa */}
      <AreaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        area={editingArea}
        parentOptions={allAreas.map((a) => ({
          id: a.id,
          name: a.name,
          code: a.code,
        }))}
        onSubmit={handleFormSubmit}
        formError={formError}
        isSubmitting={isSubmitting}
      />

      {/* Dialog Xác nhận Khóa / Mở khóa */}
      <ConfirmDialog
        open={Boolean(statusArea)}
        onOpenChange={(open) => {
          if (!open) {
            setStatusArea(null);
            setStatusError(null);
          }
        }}
        title={statusArea?.isActive ? 'Khóa Khu/lô' : 'Mở khóa Khu/lô'}
        description={
          statusError
            ? `LỖI: ${statusError}`
            : `Bạn có chắc chắn muốn ${
                statusArea?.isActive ? 'khóa' : 'mở khóa'
              } khu vực "${statusArea?.name}" (${statusArea?.code})? ${
                statusArea?.isActive
                  ? 'Khu vực bị khóa sẽ không thể gán mùa vụ hoặc hoạt động mới.'
                  : 'Khu vực sẽ được kích hoạt lại để canh tác bình thường.'
              }`
        }
        confirmText={statusError ? 'Đóng' : statusArea?.isActive ? 'Khóa khu vực' : 'Mở khóa'}
        cancelText={statusError ? undefined : 'Hủy bỏ'}
        isDanger={statusArea?.isActive && !statusError}
        isLoading={isStatusSubmitting}
        onConfirm={() => {
          if (statusError) {
            setStatusArea(null);
            setStatusError(null);
          } else {
            handleToggleStatus();
          }
        }}
      />
    </div>
  );
}
