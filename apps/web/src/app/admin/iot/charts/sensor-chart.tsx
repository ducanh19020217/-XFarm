'use client';

import * as React from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, Bell, Loader2, RefreshCw } from 'lucide-react';
import { Badge, Button } from '@xfarm/ui';
import { useChartColors } from '@/lib/chart-colors';
import {
  type SensorItem,
  type TimeseriesPoint,
  type AlertRuleItem,
  AlertOp,
  getTimeseries,
  getAlertRules,
} from '@/lib/iot-api';

interface SensorChartProps {
  sensor: SensorItem;
  from: string;
  to: string;
  bucket: '5m' | '1h' | '1d';
  rangeLabel: string;
  autoRefreshKey?: number;
}

interface ChartRow {
  timestamp: string;
  formattedTime: string;
  avg: number;
  min: number;
  max: number;
  range: [number, number];
}

function formatBucketDate(dateStr: string, bucket: '5m' | '1h' | '1d'): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    if (bucket === '5m' || bucket === '1h') {
      return d.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | [number, number];
    color: string;
    dataKey: string;
  }>;
  label?: string;
  unit: string;
}

function CustomTooltip({ active, payload, label, unit }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const avgItem = payload.find((p) => p.dataKey === 'avg');
  const minItem = payload.find((p) => p.dataKey === 'min');
  const maxItem = payload.find((p) => p.dataKey === 'max');

  return (
    <div className="rounded-lg border border-line bg-surface p-3 shadow-lg text-xs space-y-1 text-fg">
      <p className="font-semibold text-fg border-b pb-1 border-line">Thời gian: {label}</p>
      {avgItem && (
        <p className="text-accent font-bold flex items-center justify-between gap-4">
          <span>Trung bình (AVG):</span>
          <span>
            {typeof avgItem.value === 'number' ? avgItem.value.toFixed(2) : avgItem.value} {unit}
          </span>
        </p>
      )}
      {minItem && (
        <p className="text-muted flex items-center justify-between gap-4">
          <span>Nhỏ nhất (MIN):</span>
          <span>
            {typeof minItem.value === 'number' ? minItem.value.toFixed(2) : minItem.value} {unit}
          </span>
        </p>
      )}
      {maxItem && (
        <p className="text-muted flex items-center justify-between gap-4">
          <span>Lớn nhất (MAX):</span>
          <span>
            {typeof maxItem.value === 'number' ? maxItem.value.toFixed(2) : maxItem.value} {unit}
          </span>
        </p>
      )}
    </div>
  );
}

export function SensorChartCard({
  sensor,
  from,
  to,
  bucket,
  rangeLabel,
  autoRefreshKey,
}: SensorChartProps) {
  const [data, setData] = React.useState<ChartRow[]>([]);
  const [rules, setRules] = React.useState<AlertRuleItem[]>(sensor.alertRules || []);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [isMounted, setIsMounted] = React.useState(false);
  const colors = useChartColors();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [seriesRes, rulesRes] = await Promise.all([
        getTimeseries({ sensorId: sensor.id, from, to, bucket }),
        getAlertRules({ sensorId: sensor.id, isActive: true }),
      ]);

      const formatted: ChartRow[] = (seriesRes.data || []).map((pt: TimeseriesPoint) => ({
        timestamp: pt.bucket,
        formattedTime: formatBucketDate(pt.bucket, bucket),
        avg: pt.avg,
        min: pt.min,
        max: pt.max,
        range: [pt.min, pt.max],
      }));

      setData(formatted);
      setRules(rulesRes.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu biểu đồ');
    } finally {
      setIsLoading(false);
    }
  }, [sensor.id, from, to, bucket]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData, autoRefreshKey]);

  // Overall stats
  const stats = React.useMemo(() => {
    if (data.length === 0) return null;
    const avgSum = data.reduce((acc, row) => acc + row.avg, 0);
    const overallAvg = avgSum / data.length;
    const overallMin = Math.min(...data.map((r) => r.min));
    const overallMax = Math.max(...data.map((r) => r.max));
    const latest = data[data.length - 1];
    return {
      avg: overallAvg,
      min: overallMin,
      max: overallMax,
      latest: latest?.avg,
    };
  }, [data]);

  return (
    <div
      data-testid={`sensor-chart-card-${sensor.id}`}
      className="rounded-lg border border-line bg-surface p-4 shadow-xs space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-accent bg-accent-bg px-2 py-0.5 rounded border border-line">
              {sensor.code}
            </span>
            <h3 className="font-semibold text-fg text-base">{sensor.name}</h3>
            {sensor.area && (
              <Badge variant="outline" className="text-xs">
                {sensor.area.name} ({sensor.area.code})
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              Đơn vị: {sensor.unit}
            </Badge>
          </div>
          <p className="text-xs text-muted">
            Khoảng thời gian: <span className="font-medium text-fg-2">{rangeLabel}</span> (Độ gom:{' '}
            {bucket})
          </p>
        </div>

        {/* Stats summary & reload */}
        <div className="flex items-center gap-3">
          {stats && (
            <div className="flex items-center gap-3 text-xs">
              <div className="text-right">
                <span className="text-[11px] text-muted block">Hiện tại</span>
                <span className="font-bold text-fg text-sm">
                  {stats.latest?.toFixed(1)} {sensor.unit}
                </span>
              </div>
              <div className="text-right hidden sm:block border-l pl-3 border-line">
                <span className="text-[11px] text-muted block">AVG</span>
                <span className="font-semibold text-accent">
                  {stats.avg.toFixed(1)} {sensor.unit}
                </span>
              </div>
              <div className="text-right hidden sm:block border-l pl-3 border-line">
                <span className="text-[11px] text-muted block">MIN – MAX</span>
                <span className="font-medium text-fg-2">
                  {stats.min.toFixed(1)} – {stats.max.toFixed(1)}
                </span>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => void fetchData()}
            disabled={isLoading}
            className="h-8 w-8 p-0"
            title="Làm mới biểu đồ"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Alert rules indicator */}
      {rules.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted">
          <span className="inline-flex items-center gap-1 font-medium text-fg-2">
            <Bell className="h-3 w-3 text-warn" />
            Đường ngưỡng thiết lập:
          </span>
          {rules.map((r) => (
            <span
              key={r.id}
              className={`rounded px-1.5 py-0.5 text-[11px] font-semibold border ${
                r.op === AlertOp.GT
                  ? 'bg-crit-bg text-crit border-crit/20'
                  : 'bg-warn-bg text-warn border-warn/20'
              }`}
            >
              {r.op === AlertOp.GT ? 'Vượt quá (>)' : 'Thấp hơn (<)'} {r.threshold} {sensor.unit}
            </span>
          ))}
        </div>
      )}

      {/* Chart Body */}
      {error ? (
        <div className="flex h-72 items-center justify-center text-xs text-crit">{error}</div>
      ) : isLoading && data.length === 0 ? (
        <div className="flex h-72 items-center justify-center text-xs text-muted">
          <Loader2 className="h-5 w-5 animate-spin mr-2 text-accent" />
          Đang tải dữ liệu chuỗi thời gian...
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-72 flex-col items-center justify-center rounded-lg border border-dashed border-line text-xs text-muted">
          <Activity className="h-8 w-8 text-muted mb-2" />
          <span>Chưa có dữ liệu đo trong khoảng thời gian này</span>
        </div>
      ) : !isMounted ? (
        <div className="flex h-72 items-center justify-center text-xs text-muted">
          Đang chuẩn bị biểu đồ...
        </div>
      ) : (
        <div className="h-72 w-full pt-2" data-testid={`recharts-container-${sensor.id}`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="formattedTime"
                stroke={colors.axis}
                tick={{ fontSize: 11, fill: colors.axis }}
                tickLine={false}
              />
              <YAxis
                unit={` ${sensor.unit}`}
                stroke={colors.axis}
                tick={{ fontSize: 11, fill: colors.axis }}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip unit={sensor.unit} />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '8px', fontSize: '11px' }}
              />

              {/* Dải MIN-MAX (Area band) */}
              <Area
                type="monotone"
                dataKey="range"
                fill={colors.accent}
                fillOpacity={0.12}
                stroke="none"
                name="Dải MIN–MAX"
              />

              {/* Đường MIN */}
              <Line
                type="monotone"
                dataKey="min"
                stroke={colors.muted}
                strokeDasharray="3 3"
                strokeWidth={1}
                dot={false}
                name="Nhỏ nhất (MIN)"
              />

              {/* Đường MAX */}
              <Line
                type="monotone"
                dataKey="max"
                stroke={colors.axis}
                strokeDasharray="3 3"
                strokeWidth={1}
                dot={false}
                name="Lớn nhất (MAX)"
              />

              {/* Đường trung bình AVG */}
              <Line
                type="monotone"
                dataKey="avg"
                stroke={colors.accent}
                strokeWidth={2.5}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
                name="Trung bình (AVG)"
              />

              {/* ReferenceLines từ AlertRule */}
              {rules.map((rule) => {
                const color = rule.op === AlertOp.GT ? '#ef4444' : '#f59e0b';
                const sign = rule.op === AlertOp.GT ? '>' : '<';
                return (
                  <ReferenceLine
                    key={rule.id}
                    y={Number(rule.threshold)}
                    stroke={color}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Ngưỡng ${sign} ${rule.threshold} ${sensor.unit}`,
                      position: 'top',
                      fill: color,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
