'use client';

import * as React from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Check, CheckCheck, ExternalLink, Loader2, Package, Play, RefreshCw, Wrench } from 'lucide-react';
import { Badge, Button, DataTable, Label, PageHeader, Toast, useToast } from '@xfarm/ui';
import {
  type AlertItem,
  formatAlertDate,
  getAlertTypeInfo,
  getInventoryLink,
  getAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
  notifyAlertsUpdated,
  runInventoryCheck,
  runMaintenanceCheck,
} from '@/lib/alerts-api';
import { useAdminUser } from '../admin-user-context';

export default function AlertsPage() {
  const user = useAdminUser();
  const isOwner = user?.role === 'OWNER';
  const { message, showToast, closeToast } = useToast();

  const [alerts, setAlerts] = React.useState<AlertItem[]>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [page, setPage] = React.useState<number>(1);
  const [pageSize] = React.useState<number>(10);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isChecking, setIsChecking] = React.useState<boolean>(false);
  const [isCheckingMaint, setIsCheckingMaint] = React.useState<boolean>(false);
  const [isReadingAll, setIsReadingAll] = React.useState<boolean>(false);

  // Filters
  const [unreadFilter, setUnreadFilter] = React.useState<string>('all');
  const [typeFilter, setTypeFilter] = React.useState<string>('ALL');

  const fetchAlerts = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const unreadParam =
        unreadFilter === 'true' ? true : unreadFilter === 'false' ? false : undefined;
      const result = await getAlerts({
        page,
        pageSize,
        unread: unreadParam,
        type: typeFilter,
        sort: 'createdAt:desc',
      });
      setAlerts(result.data);
      setTotal(result.total);
    } catch {
      showToast('Không thể tải danh sách cảnh báo');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, unreadFilter, typeFilter, showToast]);

  React.useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Listen to alerts updated event
  React.useEffect(() => {
    const handleUpdated = () => {
      fetchAlerts();
    };
    window.addEventListener('xfarm:alerts-updated', handleUpdated);
    return () => {
      window.removeEventListener('xfarm:alerts-updated', handleUpdated);
    };
  }, [fetchAlerts]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAlertAsRead(id);
      notifyAlertsUpdated(-1);
      showToast('Đã đánh dấu đã đọc');
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, readAt: new Date().toISOString() } : a)),
      );
    } catch {
      showToast('Không thể đánh dấu đã đọc cảnh báo');
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsReadingAll(true);
    try {
      await markAllAlertsAsRead();
      showToast('Đã đánh dấu đã đọc tất cả cảnh báo');
      fetchAlerts();
    } catch {
      showToast('Không thể cập nhật cảnh báo');
    } finally {
      setIsReadingAll(false);
    }
  };

  const handleRunInventoryCheck = async () => {
    setIsChecking(true);
    try {
      await runInventoryCheck();
      showToast('Đã chạy kiểm tra cảnh báo tồn kho thành công');
      fetchAlerts();
      window.dispatchEvent(new CustomEvent('xfarm:alerts-updated'));
    } catch {
      showToast('Lỗi khi chạy kiểm tra tồn kho');
    } finally {
      setIsChecking(false);
    }
  };

  const handleRunMaintenanceCheck = async () => {
    setIsCheckingMaint(true);
    try {
      await runMaintenanceCheck();
      showToast('Đã chạy kiểm tra lịch bảo trì thành công');
      fetchAlerts();
      window.dispatchEvent(new CustomEvent('xfarm:alerts-updated'));
    } catch {
      showToast('Lỗi khi chạy kiểm tra bảo trì');
    } finally {
      setIsCheckingMaint(false);
    }
  };

  const columns: ColumnDef<AlertItem>[] = [
    {
      accessorKey: 'type',
      header: 'Loại cảnh báo',
      cell: ({ row }) => {
        const typeInfo = getAlertTypeInfo(row.original.type);
        return <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>;
      },
    },
    {
      accessorKey: 'message',
      header: 'Nội dung',
      cell: ({ row }) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {row.original.message}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Thời gian',
      cell: ({ row }) => (
        <span className="text-sm text-slate-500 whitespace-nowrap">
          {formatAlertDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      accessorKey: 'readAt',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const isRead = Boolean(row.original.readAt);
        return isRead ? (
          <Badge variant="secondary">Đã đọc</Badge>
        ) : (
          <Badge variant="default">Chưa đọc</Badge>
        );
      },
    },
    {
      id: 'inventoryLink',
      header: 'Đối tượng liên quan',
      cell: ({ row }) => {
        const inv = getInventoryLink(row.original);
        const isEquipment =
          row.original.type === 'MAINTENANCE_DUE' || row.original.refType === 'EQUIPMENT';
        return (
          <Link
            href={inv.href}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            {isEquipment ? (
              <Wrench className="h-3.5 w-3.5" />
            ) : (
              <Package className="h-3.5 w-3.5" />
            )}
            <span>{inv.label}</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </Link>
        );
      },
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => {
        const isRead = Boolean(row.original.readAt);
        if (isRead) {
          return <span className="text-xs text-slate-400 italic">Đã xử lý</span>;
        }
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMarkAsRead(row.original.id)}
            className="text-xs h-8"
          >
            <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
            Đánh dấu đã đọc
          </Button>
        );
      },
    },
  ];

  const selectClass =
    'h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} />

      <PageHeader
        title="Cảnh báo"
        description="Theo dõi và xử lý các cảnh báo tồn kho, hạn sử dụng và hệ thống."
      >
        <div className="flex flex-wrap items-center gap-2">
          {isOwner && (
            <Button
              variant="outline"
              onClick={handleRunInventoryCheck}
              disabled={isChecking}
              className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              {isChecking ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1.5 fill-emerald-600" />
              )}
              Chạy kiểm tra
            </Button>
          )}

          {(isOwner || user?.role === 'MANAGER') && (
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
          )}

          <Button variant="outline" onClick={handleMarkAllAsRead} disabled={isReadingAll}>
            {isReadingAll ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4 mr-1.5" />
            )}
            Đọc tất cả
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAlerts}
            title="Tải lại danh sách"
            className="h-9 w-9 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </PageHeader>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="space-y-1.5">
          <Label htmlFor="filter-unread">Trạng thái đọc</Label>
          <select
            id="filter-unread"
            value={unreadFilter}
            onChange={(e) => {
              setUnreadFilter(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="true">Chưa đọc</option>
            <option value="false">Đã đọc</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-type">Loại cảnh báo</Label>
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
            <option value="LOW_STOCK">Tồn kho thấp</option>
            <option value="LOT_EXPIRING">Lô sắp hết hạn</option>
            <option value="LOT_EXPIRED">Lô đã hết hạn</option>
            <option value="MAINTENANCE_DUE">Đến hạn bảo trì</option>
          </select>
        </div>
      </div>

      {/* Alerts Table */}
      <DataTable
        columns={columns}
        data={alerts}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </div>
  );
}
