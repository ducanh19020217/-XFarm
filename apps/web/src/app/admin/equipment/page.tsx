'use client';

import * as React from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, RefreshCw, Wrench, ExternalLink, Edit2, Loader2 } from 'lucide-react';
import { Badge, Button, DataTable, Input, Label, PageHeader, Toast, useToast } from '@xfarm/ui';
import {
  type EquipmentItem,
  type CreateEquipmentPayload,
  getEquipmentList,
  createEquipment,
  updateEquipment,
  getEquipmentMaintenanceStatus,
  formatVNDate,
  formatCurrencyVN,
  EQUIPMENT_STATUS_LABELS,
} from '@/lib/equipment-api';
import { runMaintenanceCheck } from '@/lib/alerts-api';
import { apiFetch, isAbortError } from '@/lib/api';
import { useAdminUser } from '../admin-user-context';
import { EquipmentDialog } from './equipment-dialog';
import { EquipmentStatus } from '@xfarm/shared';

interface AreaSummary {
  id: string;
  code: string;
  name: string;
}

export default function EquipmentPage() {
  const user = useAdminUser();
  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const { message, showToast, closeToast } = useToast();

  const [equipmentList, setEquipmentList] = React.useState<EquipmentItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCheckingMaint, setIsCheckingMaint] = React.useState(false);

  // Filters
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('ALL');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [areaFilter, setAreaFilter] = React.useState<string>('ALL');

  // Areas for filter & dialog
  const [areas, setAreas] = React.useState<AreaSummary[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedEquipment, setSelectedEquipment] = React.useState<EquipmentItem | null>(null);

  // Fetch areas
  React.useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ data: AreaSummary[] }>('/areas?pageSize=100', { signal: controller.signal })
      .then((res) => {
        setAreas(res.data || []);
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          console.error('Lỗi khi tải danh sách khu vực:', err);
        }
      });
    return () => controller.abort();
  }, []);

  const requestIdRef = React.useRef(0);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const fetchEquipment = React.useCallback(async () => {
    // Abort previous in-flight request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentRequestId = ++requestIdRef.current;

    setIsLoading(true);
    try {
      const res = await getEquipmentList(
        {
          page,
          pageSize,
          search: search.trim() || undefined,
          type: typeFilter !== 'ALL' ? typeFilter : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          areaId: areaFilter !== 'ALL' ? areaFilter : undefined,
          sort: 'createdAt:desc',
        },
        controller.signal,
      );

      // Only apply response if this is still the latest request and not aborted
      if (currentRequestId === requestIdRef.current && !controller.signal.aborted) {
        setEquipmentList(res.data || []);
        setTotal(res.total || 0);
      }
    } catch (err) {
      if (!isAbortError(err) && currentRequestId === requestIdRef.current) {
        showToast('Không thể tải danh sách thiết bị');
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [page, pageSize, search, typeFilter, statusFilter, areaFilter, showToast]);

  React.useEffect(() => {
    void fetchEquipment();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchEquipment]);

  const handleOpenCreate = () => {
    setSelectedEquipment(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: EquipmentItem) => {
    setSelectedEquipment(item);
    setDialogOpen(true);
  };

  const handleSaveEquipment = async (data: CreateEquipmentPayload) => {
    if (selectedEquipment) {
      await updateEquipment(selectedEquipment.id, data);
      showToast('Cập nhật thiết bị thành công');
    } else {
      await createEquipment(data);
      showToast('Thêm thiết bị mới thành công');
    }
    void fetchEquipment();
  };

  const handleRunMaintenanceCheck = async () => {
    setIsCheckingMaint(true);
    try {
      await runMaintenanceCheck();
      showToast('Đã chạy kiểm tra lịch bảo trì thành công');
      void fetchEquipment();
      window.dispatchEvent(new CustomEvent('xfarm:alerts-updated'));
    } catch {
      showToast('Lỗi khi chạy kiểm tra bảo trì');
    } finally {
      setIsCheckingMaint(false);
    }
  };

  const getStatusBadge = (status: EquipmentStatus) => {
    switch (status) {
      case EquipmentStatus.ACTIVE:
        return (
          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
            {EQUIPMENT_STATUS_LABELS[status]}
          </Badge>
        );
      case EquipmentStatus.MAINTENANCE:
        return <Badge variant="warning">{EQUIPMENT_STATUS_LABELS[status]}</Badge>;
      case EquipmentStatus.BROKEN:
        return <Badge variant="destructive">{EQUIPMENT_STATUS_LABELS[status]}</Badge>;
      case EquipmentStatus.RETIRED:
        return <Badge variant="secondary">{EQUIPMENT_STATUS_LABELS[status]}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columns: ColumnDef<EquipmentItem>[] = [
    {
      accessorKey: 'code',
      header: 'Mã thiết bị',
      cell: ({ row }) => (
        <Link
          href={`/admin/equipment/${row.original.id}`}
          className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
        >
          {row.original.code}
        </Link>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Tên thiết bị',
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <Link
            href={`/admin/equipment/${row.original.id}`}
            className="font-medium text-slate-900 hover:text-emerald-600 dark:text-slate-100"
          >
            {row.original.name}
          </Link>
          {row.original.notes && (
            <p className="text-xs text-slate-400 line-clamp-1">{row.original.notes}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Loại',
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-normal text-xs">
          {row.original.type}
        </Badge>
      ),
    },
    {
      id: 'area',
      header: 'Khu vực',
      cell: ({ row }) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {row.original.area ? `${row.original.area.name} (${row.original.area.code})` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'value',
      header: 'Giá trị',
      cell: ({ row }) => (
        <span className="text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
          {row.original.value ? formatCurrencyVN(row.original.value) : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      id: 'maintenance',
      header: 'Tình trạng bảo trì',
      cell: ({ row }) => {
        const maintStatus = getEquipmentMaintenanceStatus(row.original.maintenanceSchedules);
        const { isOverdue, isDueSoon, earliestDueDate } = maintStatus;

        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {isOverdue && (
              <Badge variant="destructive" data-testid="badge-overdue" className="text-xs">
                Quá hạn
              </Badge>
            )}
            {isDueSoon && (
              <Badge
                variant="warning"
                data-testid="badge-due-soon"
                className="text-xs bg-amber-500 text-white hover:bg-amber-600"
              >
                Đến hạn bảo trì
              </Badge>
            )}
            {!isOverdue && !isDueSoon && earliestDueDate && (
              <span className="text-xs text-slate-500">Hạn: {formatVNDate(earliestDueDate)}</span>
            )}
            {!isOverdue && !isDueSoon && !earliestDueDate && (
              <span className="text-xs text-slate-400">—</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/admin/equipment/${row.original.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Xem chi tiết"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:text-xs">Chi tiết</span>
          </Link>

          {canManage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenEdit(row.original)}
              className="h-7 w-7 p-0 text-slate-500 hover:text-emerald-600"
              title="Chỉnh sửa thiết bị"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const selectClass =
    'h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20';

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} />

      <PageHeader
        title="Quản lý Thiết bị"
        description="Theo dõi danh mục máy móc, công cụ, trạng thái và lịch bảo trì thiết bị"
      >
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <>
              <Button
                variant="outline"
                onClick={handleRunMaintenanceCheck}
                disabled={isCheckingMaint}
                className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                {isCheckingMaint ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Wrench className="h-4 w-4 mr-1.5" />
                )}
                Kiểm tra bảo trì
              </Button>

              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-1.5" />
                Thêm thiết bị
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => void fetchEquipment()}
            title="Tải lại danh sách"
            className="h-9 w-9 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </PageHeader>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label htmlFor="search-equipment">Tìm kiếm</Label>
          <Input
            id="search-equipment"
            placeholder="Tìm theo tên hoặc mã thiết bị..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="space-y-1.5 min-w-[150px]">
          <Label htmlFor="filter-type">Loại thiết bị</Label>
          <select
            id="filter-type"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="ALL">Tất cả loại</option>
            <option value="TRACTOR">Máy cày (TRACTOR)</option>
            <option value="PUMP">Máy bơm (PUMP)</option>
            <option value="HARVESTER">Máy gặt (HARVESTER)</option>
            <option value="IRRIGATION">Tưới tiêu (IRRIGATION)</option>
            <option value="MOWER">Máy cắt cỏ (MOWER)</option>
            <option value="OTHER">Khác (OTHER)</option>
          </select>
        </div>

        <div className="space-y-1.5 min-w-[160px]">
          <Label htmlFor="filter-status">Trạng thái</Label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="MAINTENANCE">Đang bảo trì</option>
            <option value="BROKEN">Hỏng hóc</option>
            <option value="RETIRED">Ngừng sử dụng</option>
          </select>
        </div>

        <div className="space-y-1.5 min-w-[170px]">
          <Label htmlFor="filter-area">Khu vực</Label>
          <select
            id="filter-area"
            value={areaFilter}
            onChange={(e) => {
              setAreaFilter(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="ALL">Tất cả khu vực</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={equipmentList}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
      />

      {/* Create / Edit Dialog */}
      <EquipmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        equipment={selectedEquipment}
        areas={areas}
        onSubmit={handleSaveEquipment}
      />
    </div>
  );
}
