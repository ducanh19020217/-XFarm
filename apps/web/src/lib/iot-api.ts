import { apiFetch } from './api';
import type { Paginated } from '@xfarm/shared';
import { SensorType, AlertOp } from '@xfarm/shared';

export { SensorType, AlertOp };

export const SENSOR_TYPE_LABELS: Record<SensorType, string> = {
  [SensorType.TEMP]: 'Nhiệt độ',
  [SensorType.HUMIDITY]: 'Độ ẩm không khí',
  [SensorType.SOIL_MOISTURE]: 'Độ ẩm đất',
  [SensorType.PH]: 'Độ pH',
  [SensorType.DO]: 'Oxy hòa tan (DO)',
  [SensorType.LIGHT]: 'Cường độ ánh sáng',
  [SensorType.OTHER]: 'Khác',
};

export const DEFAULT_UNITS: Record<SensorType, string> = {
  [SensorType.TEMP]: '°C',
  [SensorType.HUMIDITY]: '%',
  [SensorType.SOIL_MOISTURE]: '%',
  [SensorType.PH]: 'pH',
  [SensorType.DO]: 'mg/L',
  [SensorType.LIGHT]: 'lux',
  [SensorType.OTHER]: '',
};

export const ALERT_OP_LABELS: Record<AlertOp, string> = {
  [AlertOp.GT]: 'Cao hơn (>)',
  [AlertOp.LT]: 'Thấp hơn (<)',
};

export interface SensorReadingSummary {
  value: number | string;
  recordedAt: string;
}

export interface AlertRuleItem {
  id: string;
  sensorId: string;
  op: AlertOp;
  threshold: number | string;
  isActive: boolean;
  cooldownMinutes: number;
  createdAt?: string;
  updatedAt?: string;
  sensor?: {
    id: string;
    code: string;
    name: string;
    type?: SensorType;
    unit: string;
    areaId?: string;
    isActive?: boolean;
  };
}

export interface SensorItem {
  id: string;
  code: string;
  name: string;
  type: SensorType;
  unit: string;
  areaId: string;
  lastSeenAt: string | null;
  isActive: boolean;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  area?: {
    id: string;
    code: string;
    name: string;
  };
  readings?: SensorReadingSummary[];
  alertRules?: AlertRuleItem[];
}

export interface CreateSensorPayload {
  code?: string;
  name: string;
  type: SensorType;
  unit: string;
  areaId: string;
  isActive?: boolean;
}

export interface UpdateSensorPayload {
  code?: string;
  name?: string;
  type?: SensorType;
  unit?: string;
  areaId?: string;
  isActive?: boolean;
}

export interface CreateAlertRulePayload {
  sensorId: string;
  op: AlertOp;
  threshold: number;
  isActive?: boolean;
  cooldownMinutes?: number;
}

export interface UpdateAlertRulePayload {
  sensorId?: string;
  op?: AlertOp;
  threshold?: number;
  isActive?: boolean;
  cooldownMinutes?: number;
}

export interface QuerySensorParams {
  page?: number;
  pageSize?: number;
  search?: string;
  areaId?: string;
  type?: SensorType;
  isActive?: boolean;
  sort?: string;
}

export interface QueryTimeseriesParams {
  sensorId?: string;
  areaId?: string;
  from: string;
  to: string;
  bucket: '5m' | '1h' | '1d';
}

export interface TimeseriesPoint {
  sensorId: string;
  sensorName: string;
  areaId: string;
  bucket: string;
  avg: number;
  min: number;
  max: number;
}

export interface LatestReadingItem {
  sensorId: string;
  sensorName: string;
  unit: string;
  areaId: string;
  value: number;
  recordedAt: string;
}

export function isOnline(lastSeenAt: string | Date | null | undefined): boolean {
  if (!lastSeenAt) return false;
  const time =
    typeof lastSeenAt === 'string' ? new Date(lastSeenAt).getTime() : lastSeenAt.getTime();
  if (Number.isNaN(time)) return false;
  const diff = Date.now() - time;
  return diff >= 0 && diff < 15 * 60 * 1000;
}

export function generateCurlExample(apiKey: string, apiBaseUrl?: string): string {
  const base =
    apiBaseUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/api/v1`
      : 'http://localhost:4250/api/v1');
  return `curl -X POST "${base}/iot/readings" \\
  -H "Content-Type: application/json" \\
  -H "X-Sensor-Key: ${apiKey}" \\
  -d '{"readings":[{"value":25.5,"recordedAt":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}]}'`;
}

export async function getSensors(
  params: QuerySensorParams = {},
  signal?: AbortSignal,
): Promise<Paginated<SensorItem>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.areaId && params.areaId !== 'ALL') query.set('areaId', params.areaId);
  if (params.type) query.set('type', params.type);
  if (typeof params.isActive === 'boolean') query.set('isActive', String(params.isActive));
  if (params.sort) query.set('sort', params.sort);

  const endpoint = query.toString() ? `/sensors?${query.toString()}` : '/sensors';
  const res = await apiFetch<Paginated<SensorItem> | { data: SensorItem[]; total: number }>(
    endpoint,
    { signal },
  );

  if ('data' in res && Array.isArray(res.data)) {
    return {
      data: res.data,
      total: res.total ?? res.data.length,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    };
  }

  return {
    data: [],
    total: 0,
    page: 1,
    pageSize: params.pageSize || 20,
  };
}

export async function getSensor(id: string, signal?: AbortSignal): Promise<SensorItem> {
  const res = await apiFetch<{ data: SensorItem }>(`/sensors/${id}`, { signal });
  return res.data;
}

export async function createSensor(
  payload: CreateSensorPayload,
): Promise<{ data: SensorItem; apiKey: string }> {
  return apiFetch<{ data: SensorItem; apiKey: string }>('/sensors', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSensor(
  id: string,
  payload: UpdateSensorPayload,
): Promise<{ data: SensorItem }> {
  return apiFetch<{ data: SensorItem }>(`/sensors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function rotateSensorKey(id: string): Promise<{ data: SensorItem; apiKey: string }> {
  return apiFetch<{ data: SensorItem; apiKey: string }>(`/sensors/${id}/rotate-key`, {
    method: 'POST',
  });
}

export async function getAlertRules(
  params: { page?: number; pageSize?: number; sensorId?: string; isActive?: boolean } = {},
  signal?: AbortSignal,
): Promise<Paginated<AlertRuleItem>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.sensorId) query.set('sensorId', params.sensorId);
  if (typeof params.isActive === 'boolean') query.set('isActive', String(params.isActive));

  const endpoint = query.toString() ? `/alert-rules?${query.toString()}` : '/alert-rules';
  const res = await apiFetch<Paginated<AlertRuleItem> | { data: AlertRuleItem[]; total: number }>(
    endpoint,
    { signal },
  );

  if ('data' in res && Array.isArray(res.data)) {
    return {
      data: res.data,
      total: res.total ?? res.data.length,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    };
  }

  return {
    data: [],
    total: 0,
    page: 1,
    pageSize: params.pageSize || 20,
  };
}

export async function getAlertRule(id: string, signal?: AbortSignal): Promise<AlertRuleItem> {
  const res = await apiFetch<{ data: AlertRuleItem }>(`/alert-rules/${id}`, { signal });
  return res.data;
}

export async function createAlertRule(
  payload: CreateAlertRulePayload,
): Promise<{ data: AlertRuleItem }> {
  return apiFetch<{ data: AlertRuleItem }>('/alert-rules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAlertRule(
  id: string,
  payload: UpdateAlertRulePayload,
): Promise<{ data: AlertRuleItem }> {
  return apiFetch<{ data: AlertRuleItem }>(`/alert-rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAlertRule(
  id: string,
): Promise<{ data: AlertRuleItem; message: string }> {
  return apiFetch<{ data: AlertRuleItem; message: string }>(`/alert-rules/${id}`, {
    method: 'DELETE',
  });
}

export async function getTimeseries(
  params: QueryTimeseriesParams,
  signal?: AbortSignal,
): Promise<{ data: TimeseriesPoint[] }> {
  const query = new URLSearchParams();
  if (params.sensorId) query.set('sensorId', params.sensorId);
  if (params.areaId) query.set('areaId', params.areaId);
  query.set('from', params.from);
  query.set('to', params.to);
  query.set('bucket', params.bucket);

  return apiFetch<{ data: TimeseriesPoint[] }>(`/iot/series?${query.toString()}`, { signal });
}

export async function getLatestReadings(
  areaId?: string,
  signal?: AbortSignal,
): Promise<{ data: LatestReadingItem[] }> {
  const endpoint = areaId ? `/iot/latest?areaId=${encodeURIComponent(areaId)}` : '/iot/latest';
  return apiFetch<{ data: LatestReadingItem[] }>(endpoint, { signal });
}
