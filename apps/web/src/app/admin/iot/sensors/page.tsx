'use client';

import * as React from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Bell, Edit2, KeyRound, LineChart, Plus, RefreshCw } from 'lucide-react';
import { Badge, Button, DataTable, Input, Label, PageHeader, Toast, useToast } from '@xfarm/ui';
import { apiFetch, isAbortError } from '@/lib/api';
import {
  type SensorItem,
  type CreateSensorPayload,
  type UpdateSensorPayload,
  SensorType,
  SENSOR_TYPE_LABELS,
  isOnline,
  getSensors,
  createSensor,
  updateSensor,
  rotateSensorKey,
  createAlertRule,
} from '@/lib/iot-api';
import { useAdminUser } from '../../admin-user-context';
import { SensorDialog, type SensorFormValues } from './sensor-dialog';
import { ApiKeyDialog } from './api-key-dialog';
import { AlertRulesDialog } from './alert-rules-dialog';

interface AreaSummary {
  id: string;
  code: string;
  name: string;
}

export default function SensorsPage() {
  const user = useAdminUser();
  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const { message, showToast, closeToast } = useToast();

  const [sensors, setSensors] = React.useState<SensorItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [isLoading, setIsLoading] = React.useState(true);

  // Filters
  const [search, setSearch] = React.useState('');
  const [areaFilter, setAreaFilter] = React.useState('ALL');
  const [typeFilter, setTypeFilter] = React.useState<string>('ALL');
  const [activeFilter, setActiveFilter] = React.useState<string>('ALL');

  // Areas
  const [areas, setAreas] = React.useState<AreaSummary[]>([]);

  // Dialogs
  const [sensorDialogOpen, setSensorDialogOpen] = React.useState(false);
  const [selectedSensor, setSelectedSensor] = React.useState<SensorItem | null>(null);

  const [apiKeyDialogOpen, setApiKeyDialogOpen] = React.useState(false);
  const [activeApiKey, setActiveApiKey] = React.useState('');
  const [keySensorMeta, setKeySensorMeta] = React.useState<{ name: string; code: string }>({
    name: '',
    code: '',
  });

  const [rulesDialogOpen, setRulesDialogOpen] = React.useState(false);
  const [rulesSensor, setRulesSensor] = React.useState<SensorItem | null>(null);

  // Fetch areas for filter & dialog
  React.useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ data: AreaSummary[] }>('/areas?pageSize=100', { signal: controller.signal })
      .then((res) => setAreas(res.data || []))
      .catch((err) => {
        if (!isAbortError(err)) {
          console.error('Lỗi khi tải danh sách khu vực:', err);
        }
      });
    return () => controller.abort();
  }, []);

  const requestIdRef = React.useRef(0);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const fetchSensors = React.useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentRequestId = ++requestIdRef.current;

    setIsLoading(true);
    try {
      const res = await getSensors(
        {
          page,
          pageSize,
          search: search.trim() || undefined,
          areaId: areaFilter !== 'ALL' ? areaFilter : undefined,
          type: typeFilter !== 'ALL' ? (typeFilter as SensorType) : undefined,
          isActive: activeFilter === 'ALL' ? undefined : activeFilter === 'true',
          sort: 'createdAt:desc',
        },
        controller.signal,
      );

      if (currentRequestId === requestIdRef.current && !controller.signal.aborted) {
        setSensors(res.data || []);
        setTotal(res.total || 0);
      }
    } catch (err) {
      if (!isAbortError(err) && currentRequestId === requestIdRef.current) {
        showToast('Không thể tải danh sách cảm biến');
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [page, pageSize, search, areaFilter, typeFilter, activeFilter, showToast]);

  React.useEffect(() => {
    void fetchSensors();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchSensors]);

  const handleOpenCreate = () => {
    setSelectedSensor(null);
    setSensorDialogOpen(true);
  };

  const handleOpenEdit = (sensor: SensorItem) => {
    setSelectedSensor(sensor);
    setSensorDialogOpen(true);
  };

  const handleSaveSensor = async (values: SensorFormValues) => {
    try {
      if (selectedSensor) {
        const payload: UpdateSensorPayload = {
          name: values.name,
          type: values.type,
          unit: values.unit,
          areaId: values.areaId,
          isActive: values.isActive,
        };
        await updateSensor(selectedSensor.id, payload);
        showToast('Cập nhật cảm biến thành công');
        void fetchSensors();
      } else {
        const createPayload: CreateSensorPayload = {
          code: values.code,
          name: values.name,
          type: values.type,
          unit: values.unit,
          areaId: values.areaId,
          isActive: values.isActive,
        };
        const created = await createSensor(createPayload);
        showToast('Thêm cảm biến mới thành công');

        // Create initial alert rule if provided
        if (values.initialAlertRule) {
          try {
            await createAlertRule({
              sensorId: created.data.id,
              op: values.initialAlertRule.op,
              threshold: values.initialAlertRule.threshold,
              cooldownMinutes: values.initialAlertRule.cooldownMinutes,
            });
          } catch (e) {
            console.error('Không thể tạo ngưỡng cảnh báo ban đầu:', e);
            showToast('Đã tạo cảm biến nhưng không thể tạo ngưỡng cảnh báo ban đầu');
          }
        }

        // Display API Key dialog once!
        if (created.apiKey) {
          setActiveApiKey(created.apiKey);
          setKeySensorMeta({ name: created.data.name, code: created.data.code });
          setApiKeyDialogOpen(true);
        }

        void fetchSensors();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu';
      showToast(msg);
      throw err;
    }
  };

  const handleRotateKey = async (sensor: SensorItem) => {
    const confirmRotate = window.confirm(
      `Bạn có chắc chắn muốn xoay khóa API cho cảm biến ${sensor.name} (${sensor.code})? Khóa cũ sẽ bị vô hiệu hóa ngay lập tức.`,
    );
    if (!confirmRotate) return;

    try {
      const res = await rotateSensorKey(sensor.id);
      showToast('Đã xoay khóa API mới');
      setActiveApiKey(res.apiKey);
      setKeySensorMeta({ name: sensor.name, code: sensor.code });
      setApiKeyDialogOpen(true);
      void fetchSensors();
    } catch {
      showToast('Không thể xoay khóa API');
    }
  };

  const handleOpenRules = (sensor: SensorItem) => {
    setRulesSensor(sensor);
    setRulesDialogOpen(true);
  };

  const formatLastSeen = (lastSeenAt: string | null) => {
    if (!lastSeenAt) return 'Chưa kết nối';
    const date = new Date(lastSeenAt);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const columns: ColumnDef<SensorItem>[] = [
    {
      accessorKey: 'code',
      header: 'Mã cảm biến',
      cell: ({ row }) => (
        <Link
          href={`/admin/iot/charts?sensorId=${row.original.id}`}
          className="font-mono text-xs font-semibold text-accent hover:text-accent-hover hover:underline"
          title="Xem biểu đồ cảm biến này"
        >
          {row.original.code}
        </Link>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Tên cảm biến',
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <Link
            href={`/admin/iot/charts?sensorId=${row.original.id}`}
            className="font-medium text-fg hover:text-accent transition-colors"
          >
            {row.original.name}
          </Link>
          <div className="text-[11px] text-muted">Đơn vị: {row.original.unit}</div>
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Loại thông số',
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-xs font-normal">
          {SENSOR_TYPE_LABELS[row.original.type] || row.original.type}
        </Badge>
      ),
    },
    {
      id: 'area',
      header: 'Khu / Lô',
      cell: ({ row }) => (
        <span className="text-xs text-fg-2">
          {row.original.area ? `${row.original.area.name} (${row.original.area.code})` : '—'}
        </span>
      ),
    },
    {
      id: 'online',
      header: 'Trạng thái kết nối',
      cell: ({ row }) => {
        const online = isOnline(row.original.lastSeenAt);
        return (
          <div className="space-y-0.5">
            {online ? (
              <span
                data-testid={`sensor-status-online-${row.original.id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-2 py-0.5 text-xs font-semibold text-ok border border-ok/20"
              >
                <span className="h-2 w-2 rounded-full bg-ok animate-pulse" />
                Online
              </span>
            ) : (
              <span
                data-testid={`sensor-status-offline-${row.original.id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted border border-line"
              >
                <span className="h-2 w-2 rounded-full bg-muted" />
                Offline
              </span>
            )}
            <p className="text-[10px] text-muted">
              {row.original.lastSeenAt
                ? `Vừa thấy: ${formatLastSeen(row.original.lastSeenAt)}`
                : 'Chưa có tín hiệu'}
            </p>
          </div>
        );
      },
    },
    {
      id: 'latestValue',
      header: 'Giá trị mới nhất',
      cell: ({ row }) => {
        const latestReading = row.original.readings?.[0];
        if (!latestReading) {
          return <span className="text-xs text-muted">—</span>;
        }
        const val = Number(latestReading.value);
        return (
          <div className="space-y-0.5">
            <span className="font-semibold text-fg text-sm">
              {Number.isNaN(val) ? String(latestReading.value) : val.toLocaleString('vi-VN')}{' '}
              <span className="text-xs font-normal text-muted">{row.original.unit}</span>
            </span>
            <p className="text-[10px] text-muted">
              {latestReading.recordedAt
                ? new Date(latestReading.recordedAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}
            </p>
          </div>
        );
      },
    },
    {
      id: 'alertRules',
      header: 'Ngưỡng cảnh báo',
      cell: ({ row }) => {
        const rules = row.original.alertRules || [];
        return (
          <div className="flex items-center gap-1.5">
            {rules.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenRules(row.original)}
                className="h-7 text-xs border-warn/30 text-warn hover:bg-warn-bg"
                title={
                  canManage ? 'Xem và chỉnh sửa các ngưỡng cảnh báo' : 'Xem các ngưỡng cảnh báo'
                }
              >
                <Bell className="h-3 w-3 mr-1 fill-warn text-warn" />
                {rules.length} ngưỡng
              </Button>
            ) : canManage ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenRules(row.original)}
                className="h-7 text-xs text-muted hover:text-fg"
                title="Chưa thiết lập ngưỡng"
              >
                <Bell className="h-3 w-3 mr-1" />
                Thêm ngưỡng
              </Button>
            ) : (
              <span className="text-xs text-muted">Chưa có ngưỡng</span>
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
            href={`/admin/iot/charts?sensorId=${row.original.id}`}
            className="inline-flex items-center gap-1 rounded p-1 text-xs font-medium text-accent hover:bg-accent-bg hover:text-accent-hover transition-colors"
            title="Mở biểu đồ dữ liệu"
          >
            <LineChart className="h-3.5 w-3.5" />
            <span className="hidden lg:inline text-xs">Biểu đồ</span>
          </Link>

          {canManage && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRotateKey(row.original)}
                className="h-7 w-7 p-0 text-muted hover:text-warn"
                title="Xoay khóa API (Rotate Key)"
                data-testid={`rotate-key-btn-${row.original.id}`}
              >
                <KeyRound className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenEdit(row.original)}
                className="h-7 w-7 p-0 text-muted hover:text-accent"
                title="Chỉnh sửa cảm biến"
                data-testid={`edit-sensor-btn-${row.original.id}`}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const selectClass =
    'h-10 rounded-lg border border-line bg-surface px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/20';

  const onlineCount = sensors.filter((s) => isOnline(s.lastSeenAt)).length;
  const offlineCount = sensors.filter((s) => !isOnline(s.lastSeenAt)).length;

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} />

      <PageHeader
        title="Quản lý Cảm biến IoT"
        description="Theo dõi trạng thái online, thông số đo tức thời và cấu hình ngưỡng cảnh báo thiết bị"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/iot/charts">
            <Button
              variant="outline"
              className="text-accent border-line hover:bg-accent-bg"
            >
              <LineChart className="h-4 w-4 mr-1.5" />
              Biểu đồ trực quan
            </Button>
          </Link>

          {canManage && (
            <Button onClick={handleOpenCreate} data-testid="create-sensor-btn">
              <Plus className="h-4 w-4 mr-1.5" />
              Thêm cảm biến
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => void fetchSensors()}
            title="Tải lại danh sách"
            className="h-9 w-9 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-line bg-surface p-4 shadow-xs">
          <span className="text-xs font-medium text-muted block">Tổng số cảm biến</span>
          <p className="text-2xl font-bold text-fg mt-1">{total}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-xs">
          <span className="text-xs font-medium text-muted block">Đang kết nối (Online)</span>
          <p className="text-2xl font-bold text-ok mt-1">{onlineCount}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-xs">
          <span className="text-xs font-medium text-muted block">Mất kết nối / Chưa thấy</span>
          <p className="text-2xl font-bold text-muted mt-1">{offlineCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-4 shadow-xs">
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label htmlFor="search-sensors">Tìm kiếm</Label>
          <Input
            id="search-sensors"
            placeholder="Tìm theo tên hoặc mã cảm biến..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="space-y-1.5 min-w-[160px]">
          <Label htmlFor="filter-area">Khu/lô</Label>
          <select
            id="filter-area"
            value={areaFilter}
            onChange={(e) => {
              setAreaFilter(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="ALL">Tất cả khu/lô</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 min-w-[170px]">
          <Label htmlFor="filter-type">Loại cảm biến</Label>
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
            {Object.values(SensorType).map((st) => (
              <option key={st} value={st}>
                {SENSOR_TYPE_LABELS[st]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 min-w-[150px]">
          <Label htmlFor="filter-active">Hoạt động</Label>
          <select
            id="filter-active"
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="true">Đang kích hoạt</option>
            <option value="false">Đang khóa</option>
          </select>
        </div>
      </div>

      {/* Sensors DataTable */}
      <DataTable
        columns={columns}
        data={sensors}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
      />

      {/* Sensor Dialog (Create / Edit) */}
      <SensorDialog
        open={sensorDialogOpen}
        onOpenChange={setSensorDialogOpen}
        sensor={selectedSensor}
        areas={areas}
        onSubmit={handleSaveSensor}
      />

      {/* API Key Dialog (displays key once + curl example) */}
      <ApiKeyDialog
        open={apiKeyDialogOpen}
        onOpenChange={setApiKeyDialogOpen}
        apiKey={activeApiKey}
        sensorName={keySensorMeta.name}
        sensorCode={keySensorMeta.code}
      />

      {/* Alert Rules Dialog */}
      <AlertRulesDialog
        open={rulesDialogOpen}
        onOpenChange={setRulesDialogOpen}
        sensor={rulesSensor}
        canManage={canManage}
        onRulesChanged={() => void fetchSensors()}
      />
    </div>
  );
}
