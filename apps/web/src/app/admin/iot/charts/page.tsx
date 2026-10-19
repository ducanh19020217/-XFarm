'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Calendar,
  Clock,
  Cpu,
  Layers,
  LineChart,
  MapPin,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { Badge, Button, Input, Label, PageHeader } from '@xfarm/ui';
import { apiFetch, isAbortError } from '@/lib/api';
import {
  type SensorItem,
  getSensors,
  SENSOR_TYPE_LABELS,
} from '@/lib/iot-api';
import { type AreaTreeItem } from '@/lib/area-constants';
import { SensorChartCard } from './sensor-chart';
import { AreaTreeSelector } from './area-tree-selector';

type RangePreset = '24h' | '7d' | '30d' | 'custom';
type SelectionMode = 'sensor' | 'area';

function ChartsContent() {
  const searchParams = useSearchParams();
  const urlSensorId = searchParams.get('sensorId');
  const urlAreaId = searchParams.get('areaId');

  // Mode: by sensor or by area
  const [mode, setMode] = React.useState<SelectionMode>(urlAreaId ? 'area' : 'sensor');

  // Sensors and areas data
  const [sensors, setSensors] = React.useState<SensorItem[]>([]);
  const [treeData, setTreeData] = React.useState<AreaTreeItem[]>([]);
  const [isLoadingSensors, setIsLoadingSensors] = React.useState(true);

  // Selected sensor or area
  const [selectedSensorId, setSelectedSensorId] = React.useState<string>(urlSensorId || '');
  const [selectedAreaId, setSelectedAreaId] = React.useState<string>(urlAreaId || '');

  // Time range preset
  const [preset, setPreset] = React.useState<RangePreset>('24h');
  const [customFrom, setCustomFrom] = React.useState<string>(() => {
    const d = new Date(Date.now() - 24 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [customTo, setCustomTo] = React.useState<string>(() => {
    return new Date().toISOString().slice(0, 16);
  });
  const [customBucket, setCustomBucket] = React.useState<'5m' | '1h' | '1d'>('5m');

  // Auto-refresh key
  const [autoRefreshKey, setAutoRefreshKey] = React.useState(0);

  // Load sensors and area tree
  React.useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getSensors({ pageSize: 100 }, controller.signal),
      apiFetch<{ data: AreaTreeItem[] }>('/areas/tree', { signal: controller.signal }),
    ])
      .then(([sensorsRes, treeRes]) => {
        const loadedSensors = sensorsRes.data || [];
        setSensors(loadedSensors);
        setTreeData(treeRes.data || []);

        // Preselect sensor if urlSensorId is valid, or fallback to first sensor
        if (urlSensorId) {
          setSelectedSensorId(urlSensorId);
          setMode('sensor');
        } else if (urlAreaId) {
          setSelectedAreaId(urlAreaId);
          setMode('area');
        } else if (loadedSensors.length > 0) {
          setSelectedSensorId(loadedSensors[0].id);
        }
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          console.error('Lỗi khi tải dữ liệu IoT:', err);
        }
      })
      .finally(() => setIsLoadingSensors(false));

    return () => controller.abort();
  }, [urlSensorId, urlAreaId]);

  // Handle URL sensorId change
  React.useEffect(() => {
    if (urlSensorId) {
      setSelectedSensorId(urlSensorId);
      setMode('sensor');
    }
  }, [urlSensorId]);

  // 60-second auto-refresh when viewing 24h
  React.useEffect(() => {
    if (preset !== '24h') return;

    const interval = setInterval(() => {
      setAutoRefreshKey((k) => k + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, [preset]);

  // Compute timeseries params from preset
  const { from, to, bucket, rangeLabel } = React.useMemo(() => {
    const now = new Date();
    if (preset === '24h') {
      const fromDate = new Date(now.getTime() - 24 * 3600 * 1000);
      return {
        from: fromDate.toISOString(),
        to: now.toISOString(),
        bucket: '5m' as const,
        rangeLabel: '24 giờ qua',
      };
    }
    if (preset === '7d') {
      const fromDate = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      return {
        from: fromDate.toISOString(),
        to: now.toISOString(),
        bucket: '1h' as const,
        rangeLabel: '7 ngày qua',
      };
    }
    if (preset === '30d') {
      const fromDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      return {
        from: fromDate.toISOString(),
        to: now.toISOString(),
        bucket: '1d' as const,
        rangeLabel: '30 ngày qua',
      };
    }
    // Custom
    const f = customFrom ? new Date(customFrom).toISOString() : new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const t = customTo ? new Date(customTo).toISOString() : now.toISOString();
    return {
      from: f,
      to: t,
      bucket: customBucket,
      rangeLabel: 'Tùy chọn',
    };
  }, [preset, customFrom, customTo, customBucket]);

  // Active sensors to display charts for
  const activeSensors = React.useMemo(() => {
    if (mode === 'sensor') {
      const s = sensors.find((item) => item.id === selectedSensorId);
      return s ? [s] : [];
    }
    // Area mode
    if (!selectedAreaId) return [];
    return sensors.filter((item) => item.areaId === selectedAreaId);
  }, [mode, selectedSensorId, selectedAreaId, sensors]);

  const selectClass =
    'h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biểu đồ Dữ liệu IoT"
        description="Trực quan hóa chuỗi thời gian các thông số cảm biến, dải min-max và ngưỡng cảnh báo"
      >
        <div className="flex flex-wrap items-center gap-2">
          {preset === '24h' && (
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-300 flex items-center gap-1.5 py-1 px-2.5 text-xs dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              data-testid="auto-refresh-indicator"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Tự refresh mỗi 60s
            </Badge>
          )}

          <Link href="/admin/iot/sensors">
            <Button variant="outline" size="sm">
              <Cpu className="h-4 w-4 mr-1.5" />
              Danh sách cảm biến
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoRefreshKey((k) => k + 1)}
            title="Làm mới tất cả biểu đồ"
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </PageHeader>

      {/* Control Panel: Selection Mode + Time Range */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-4">
        {/* Row 1: Mode toggles and presets */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          {/* Mode Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Xem theo:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setMode('sensor')}
                data-testid="mode-sensor-btn"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mode === 'sensor'
                    ? 'bg-white text-emerald-700 font-semibold shadow-xs dark:bg-slate-800 dark:text-emerald-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                <Cpu className="h-3.5 w-3.5" />
                Cảm biến đơn lẻ
              </button>
              <button
                type="button"
                onClick={() => setMode('area')}
                data-testid="mode-area-btn"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mode === 'area'
                    ? 'bg-white text-emerald-700 font-semibold shadow-xs dark:bg-slate-800 dark:text-emerald-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Cây Khu / Lô
              </button>
            </div>
          </div>

          {/* Time range presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Khoảng thời gian:
            </span>
            <Button
              type="button"
              variant={preset === '24h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreset('24h')}
              data-testid="preset-24h-btn"
              className={`h-8 text-xs ${preset === '24h' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
            >
              24 giờ
            </Button>
            <Button
              type="button"
              variant={preset === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreset('7d')}
              data-testid="preset-7d-btn"
              className={`h-8 text-xs ${preset === '7d' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
            >
              7 ngày
            </Button>
            <Button
              type="button"
              variant={preset === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreset('30d')}
              data-testid="preset-30d-btn"
              className={`h-8 text-xs ${preset === '30d' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
            >
              30 ngày
            </Button>
            <Button
              type="button"
              variant={preset === 'custom' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreset('custom')}
              data-testid="preset-custom-btn"
              className={`h-8 text-xs ${preset === 'custom' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
            >
              <Calendar className="h-3 w-3 mr-1" />
              Tùy chọn
            </Button>
          </div>
        </div>

        {/* Row 2: Selectors depending on mode or custom range */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {mode === 'sensor' ? (
            <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
              <Label htmlFor="select-sensor" className="text-xs">
                Chọn cảm biến để xem biểu đồ
              </Label>
              <select
                id="select-sensor"
                value={selectedSensorId}
                onChange={(e) => setSelectedSensorId(e.target.value)}
                data-testid="select-sensor-dropdown"
                className={`w-full ${selectClass}`}
              >
                {sensors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} – {s.name} ({s.area?.name || 'Chưa gán khu'}) [{SENSOR_TYPE_LABELS[s.type]}]
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5 md:col-span-2 lg:col-span-2">
              <Label className="text-xs flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                Cây phân cấp Khu/Lô (chọn khu để hiển thị tất cả cảm biến của khu đó)
              </Label>
              <div
                className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-900/40"
                data-testid="area-tree-container"
              >
                {treeData.length > 0 ? (
                  <AreaTreeSelector
                    treeData={treeData}
                    selectedAreaId={selectedAreaId}
                    onSelectArea={(id) => setSelectedAreaId(id)}
                  />
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400">
                    Đang tải cây phân cấp khu vực...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Custom Date Inputs if preset === 'custom' */}
          {preset === 'custom' && (
            <div className="space-y-3 col-span-full rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Cấu hình khoảng thời gian tùy chọn
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="custom-from" className="text-xs">
                    Từ thời điểm
                  </Label>
                  <Input
                    id="custom-from"
                    type="datetime-local"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="custom-to" className="text-xs">
                    Đến thời điểm
                  </Label>
                  <Input
                    id="custom-to"
                    type="datetime-local"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="custom-bucket" className="text-xs">
                    Độ gom nhóm dữ liệu (Bucket)
                  </Label>
                  <select
                    id="custom-bucket"
                    value={customBucket}
                    onChange={(e) => setCustomBucket(e.target.value as '5m' | '1h' | '1d')}
                    className={`w-full ${selectClass}`}
                  >
                    <option value="5m">5 phút (5m)</option>
                    <option value="1h">1 giờ (1h)</option>
                    <option value="1d">1 ngày (1d)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart List: 1 chart per sensor */}
      {isLoadingSensors ? (
        <div className="flex h-64 items-center justify-center text-xs text-slate-400">
          Đang tải thông tin cảm biến...
        </div>
      ) : activeSensors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-950">
          <LineChart className="mx-auto h-10 w-10 text-slate-300 mb-2" />
          <p className="font-medium text-slate-600 dark:text-slate-300">
            {mode === 'sensor'
              ? 'Chưa chọn cảm biến nào hoặc chưa có cảm biến trong hệ thống.'
              : 'Khu vực này hiện chưa được gắn cảm biến nào.'}
          </p>
          <p className="mt-1">
            Vui lòng chọn một cảm biến khác hoặc chuyển sang khu vực có cảm biến.
          </p>
        </div>
      ) : (
        <div className="space-y-6" data-testid="sensor-charts-container">
          {activeSensors.map((sensor) => (
            <SensorChartCard
              key={sensor.id}
              sensor={sensor}
              from={from}
              to={to}
              bucket={bucket}
              rangeLabel={rangeLabel}
              autoRefreshKey={autoRefreshKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function IotChartsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs text-slate-400">
          Đang tải biểu đồ IoT...
        </div>
      }
    >
      <ChartsContent />
    </React.Suspense>
  );
}
