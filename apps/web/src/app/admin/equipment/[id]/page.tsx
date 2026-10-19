'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Edit2,
  FileText,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import { Badge, Button, PageHeader, Toast, useToast } from '@xfarm/ui';
import {
  type EquipmentItem,
  type EquipmentScheduleItem,
  type CreateEquipmentPayload,
  type CreateSchedulePayload,
  type CreateLogPayload,
  getEquipmentDetail,
  updateEquipment,
  createEquipmentSchedule,
  updateEquipmentSchedule,
  deleteEquipmentSchedule,
  createEquipmentLog,
  formatVNDate,
  formatCurrencyVN,
  EQUIPMENT_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
} from '@/lib/equipment-api';
import { apiFetch, isAbortError } from '@/lib/api';
import { useAdminUser } from '../../admin-user-context';
import { ScheduleDialog } from './schedule-dialog';
import { LogDialog } from './log-dialog';
import { EquipmentDialog } from '../equipment-dialog';
import { EquipmentStatus } from '@xfarm/shared';

interface AreaSummary {
  id: string;
  code: string;
  name: string;
}

export default function EquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const equipmentId = String(params.id);

  const user = useAdminUser();
  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const canLog = user?.role === 'OWNER' || user?.role === 'MANAGER' || user?.role === 'WORKER';

  const { message, showToast, closeToast } = useToast();

  const [equipment, setEquipment] = React.useState<EquipmentItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [areas, setAreas] = React.useState<AreaSummary[]>([]);

  // Dialogs
  const [editEquipmentOpen, setEditEquipmentOpen] = React.useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = React.useState(false);
  const [selectedSchedule, setSelectedSchedule] = React.useState<EquipmentScheduleItem | null>(
    null,
  );
  const [logDialogOpen, setLogDialogOpen] = React.useState(false);

  // Fetch areas for equipment edit dialog
  React.useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ data: AreaSummary[] }>('/areas?pageSize=100', { signal: controller.signal })
      .then((res) => setAreas(res.data || []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const fetchDetail = React.useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const data = await getEquipmentDetail(equipmentId, signal);
        setEquipment(data);
      } catch (err) {
        if (!isAbortError(err)) {
          showToast('Không thể tải thông tin thiết bị');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [equipmentId, showToast],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchDetail(controller.signal);
    return () => controller.abort();
  }, [fetchDetail]);

  const handleUpdateEquipment = async (data: CreateEquipmentPayload) => {
    await updateEquipment(equipmentId, data);
    showToast('Cập nhật thiết bị thành công');
    void fetchDetail();
  };

  const handleOpenAddSchedule = () => {
    setSelectedSchedule(null);
    setScheduleDialogOpen(true);
  };

  const handleOpenEditSchedule = (s: EquipmentScheduleItem) => {
    setSelectedSchedule(s);
    setScheduleDialogOpen(true);
  };

  const handleSaveSchedule = async (data: CreateSchedulePayload) => {
    if (selectedSchedule) {
      await updateEquipmentSchedule(selectedSchedule.id, data);
      showToast('Cập nhật lịch bảo trì thành công');
    } else {
      await createEquipmentSchedule(equipmentId, data);
      showToast('Thêm lịch bảo trì thành công');
    }
    void fetchDetail();
  };

  const handleToggleSchedule = async (s: EquipmentScheduleItem) => {
    try {
      if (s.isActive) {
        await deleteEquipmentSchedule(s.id);
        showToast('Đã tắt lịch bảo trì');
      } else {
        await updateEquipmentSchedule(s.id, { isActive: true });
        showToast('Đã bật lại lịch bảo trì');
      }
      void fetchDetail();
    } catch {
      showToast('Không thể cập nhật trạng thái lịch bảo trì');
    }
  };

  const handleCreateLog = async (data: CreateLogPayload) => {
    await createEquipmentLog(equipmentId, data);
    showToast('Ghi nhận bảo trì thành công');
    void fetchDetail();
  };

  if (isLoading && !equipment) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-slate-500">Không tìm thấy thiết bị hoặc đã bị xóa.</p>
        <Button variant="outline" onClick={() => router.push('/admin/equipment')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Về danh sách thiết bị
        </Button>
      </div>
    );
  }

  const schedules = equipment.maintenanceSchedules || [];
  const logs = equipment.maintenanceLogs || [];
  const activeSchedulesCount = schedules.filter((s) => s.isActive).length;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} />

      {/* Top Navigation */}
      <div>
        <Link
          href="/admin/equipment"
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-emerald-600 dark:text-slate-400"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Danh sách thiết bị
        </Link>
      </div>

      <PageHeader
        title={equipment.name}
        description={`Mã thiết bị: ${equipment.code} · Loại: ${equipment.type}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {canLog && (
            <Button
              variant="outline"
              onClick={() => setLogDialogOpen(true)}
              className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <FileText className="mr-1.5 h-4 w-4" />
              Ghi nhận bảo trì
            </Button>
          )}

          {canManage && (
            <>
              <Button variant="outline" onClick={handleOpenAddSchedule}>
                <Calendar className="mr-1.5 h-4 w-4" />
                Thêm lịch bảo trì
              </Button>

              <Button onClick={() => setEditEquipmentOpen(true)}>
                <Edit2 className="mr-1.5 h-4 w-4" />
                Sửa thông tin
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => void fetchDetail()}
            title="Tải lại thông tin"
            className="h-9 w-9 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </PageHeader>

      {/* Stat Cards: Tổng chi phí & số lượng */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Tổng chi phí bảo trì
              </p>
              <p
                data-testid="total-maintenance-cost"
                className="text-xl font-bold text-slate-900 dark:text-slate-100"
              >
                {formatCurrencyVN(equipment.totalMaintenanceCost ?? equipment.totalCost ?? 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Lịch bảo trì</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {activeSchedulesCount}{' '}
                <span className="text-xs font-normal text-slate-400">/ {schedules.length} lịch</span>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Lần ghi nhận bảo trì
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {logs.length} <span className="text-xs font-normal text-slate-400">lần</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Thông tin thiết bị */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Thông tin chi tiết
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs text-slate-400 block">Mã thiết bị</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{equipment.code}</span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block">Tên thiết bị</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{equipment.name}</span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block">Loại thiết bị</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{equipment.type}</span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block">Khu vực</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {equipment.area ? `${equipment.area.name} (${equipment.area.code})` : '—'}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block">Ngày mua</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {formatVNDate(equipment.purchaseDate)}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block">Giá trị ban đầu</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {formatCurrencyVN(equipment.value)}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block">Trạng thái thiết bị</span>
            <div className="pt-0.5">
              <Badge
                variant={
                  equipment.status === EquipmentStatus.ACTIVE
                    ? 'default'
                    : equipment.status === EquipmentStatus.MAINTENANCE
                      ? 'warning'
                      : equipment.status === EquipmentStatus.BROKEN
                        ? 'destructive'
                        : 'secondary'
                }
              >
                {EQUIPMENT_STATUS_LABELS[equipment.status]}
              </Badge>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 block">Kích hoạt</span>
            <div className="pt-0.5">
              {equipment.isActive ? (
                <Badge variant="default" className="bg-emerald-600">
                  Hoạt động
                </Badge>
              ) : (
                <Badge variant="secondary">Đã khóa</Badge>
              )}
            </div>
          </div>
        </div>

        {equipment.notes && (
          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            <span className="text-xs text-slate-400 block">Ghi chú</span>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{equipment.notes}</p>
          </div>
        )}
      </div>

      {/* Lịch bảo trì định kỳ */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Lịch bảo trì định kỳ
            </h3>
            <p className="text-xs text-slate-500">
              Tự động nhắc lịch và cập nhật chu kỳ mỗi khi ghi nhận bảo trì
            </p>
          </div>
          {canManage && (
            <Button size="sm" onClick={handleOpenAddSchedule}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Thêm lịch
            </Button>
          )}
        </div>

        {schedules.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500">
            Chưa có lịch bảo trì nào cho thiết bị này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50/50 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="py-2.5 px-3">Tên lịch</th>
                  <th className="py-2.5 px-3">Chu kỳ</th>
                  <th className="py-2.5 px-3">Hạn tiếp theo</th>
                  <th className="py-2.5 px-3">Tình trạng</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  {canManage && <th className="py-2.5 px-3 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {schedules.map((s) => {
                  const due = new Date(s.nextDueDate);
                  const startOfDueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
                  const diffMs = startOfDueDay.getTime() - startOfToday.getTime();
                  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

                  const isOverdue = s.isActive && diffDays < 0;
                  const isDueSoon = s.isActive && diffDays >= 0 && diffDays <= 3;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                        {s.name}
                      </td>
                      <td className="py-2.5 px-3">{s.intervalDays} ngày</td>
                      <td
                        data-testid={`schedule-due-${s.id}`}
                        className="py-2.5 px-3 font-medium"
                      >
                        {formatVNDate(s.nextDueDate)}
                      </td>
                      <td className="py-2.5 px-3">
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            Quá hạn
                          </Badge>
                        )}
                        {isDueSoon && (
                          <Badge
                            variant="warning"
                            className="text-xs bg-amber-500 text-white hover:bg-amber-600"
                          >
                            Đến hạn bảo trì
                          </Badge>
                        )}
                        {!isOverdue && !isDueSoon && s.isActive && (
                          <span className="text-xs text-slate-500">Còn {diffDays} ngày</span>
                        )}
                        {!s.isActive && (
                          <span className="text-xs text-slate-400">Đã tắt lịch</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {s.isActive ? (
                          <Badge variant="default" className="bg-emerald-600 text-xs">
                            Đang bật
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Đã tắt
                          </Badge>
                        )}
                      </td>
                      {canManage && (
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditSchedule(s)}
                              title="Sửa lịch"
                              className="h-7 w-7 p-0 text-slate-500 hover:text-emerald-600"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleToggleSchedule(s)}
                              title={s.isActive ? 'Tắt lịch bảo trì' : 'Bật lại lịch'}
                              className={`h-7 w-7 p-0 ${
                                s.isActive
                                  ? 'text-slate-400 hover:text-red-600'
                                  : 'text-slate-400 hover:text-emerald-600'
                              }`}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nhật ký bảo trì */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Nhật ký bảo trì
            </h3>
            <p className="text-xs text-slate-500">
              Lịch sử các lần bảo dưỡng, sửa chữa và chi phí phát sinh
            </p>
          </div>
          {canLog && (
            <Button size="sm" onClick={() => setLogDialogOpen(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Ghi nhận bảo trì
            </Button>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500">
            Chưa có ghi nhận bảo trì nào cho thiết bị này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50/50 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="py-2.5 px-3">Ngày</th>
                  <th className="py-2.5 px-3">Loại</th>
                  <th className="py-2.5 px-3">Lịch liên quan</th>
                  <th className="py-2.5 px-3">Chi phí</th>
                  <th className="py-2.5 px-3">Người thực hiện</th>
                  <th className="py-2.5 px-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatVNDate(log.date)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <Badge variant="outline" className="text-xs font-normal">
                        {MAINTENANCE_TYPE_LABELS[log.type] || log.type}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {log.schedule?.name || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                      {formatCurrencyVN(log.cost)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {log.performedBy?.fullName || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                      {log.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <EquipmentDialog
        open={editEquipmentOpen}
        onOpenChange={setEditEquipmentOpen}
        equipment={equipment}
        areas={areas}
        onSubmit={handleUpdateEquipment}
      />

      <ScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        schedule={selectedSchedule}
        onSubmit={handleSaveSchedule}
      />

      <LogDialog
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
        schedules={schedules}
        onSubmit={handleCreateLog}
      />
    </div>
  );
}
