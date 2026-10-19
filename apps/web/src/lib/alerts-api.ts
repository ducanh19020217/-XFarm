import { apiFetch } from './api';
import type { Paginated } from '@xfarm/shared';

export interface AlertItem {
  id: string;
  ruleId?: string | null;
  type: string;
  message: string;
  refType?: string | null;
  refId?: string | null;
  dedupeKey?: string | null;
  createdAt: string;
  readAt?: string | null;
}

export interface QueryAlertsParams {
  page?: number;
  pageSize?: number;
  unread?: boolean;
  type?: string;
  sort?: string;
}

export const ALERT_TYPE_LABELS: Record<
  string,
  { label: string; variant: 'warning' | 'destructive' | 'default' | 'info' }
> = {
  LOW_STOCK: { label: 'Tồn kho thấp', variant: 'warning' },
  LOT_EXPIRING: { label: 'Lô sắp hết hạn', variant: 'destructive' },
  LOT_EXPIRED: { label: 'Lô đã hết hạn', variant: 'destructive' },
  MAINTENANCE_DUE: { label: 'Đến hạn bảo trì', variant: 'warning' },
  SENSOR_THRESHOLD: { label: 'Vượt ngưỡng cảm biến', variant: 'destructive' },
};

export function getAlertTypeInfo(type: string): {
  label: string;
  variant: 'warning' | 'destructive' | 'default' | 'info';
} {
  return ALERT_TYPE_LABELS[type] || { label: type, variant: 'default' };
}

export function formatAlertDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return String(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return String(dateString);
  }
}

export function getInventoryLink(alert: AlertItem): { href: string; label: string } {
  if (
    alert.refType === 'Sensor' ||
    alert.refType === 'SENSOR' ||
    alert.type === 'SENSOR_THRESHOLD'
  ) {
    const href = alert.refId ? `/admin/iot/charts?sensorId=${alert.refId}` : '/admin/iot/charts';
    return {
      href,
      label: alert.refId ? 'Xem biểu đồ cảm biến' : 'Xem biểu đồ IoT',
    };
  }
  if (alert.refType === 'EQUIPMENT' || alert.type === 'MAINTENANCE_DUE') {
    const href = alert.refId ? `/admin/equipment/${alert.refId}` : '/admin/equipment';
    return {
      href,
      label: alert.refId ? `Thiết bị ${alert.refId}` : 'Xem thiết bị',
    };
  }
  if (alert.refType === 'LOT' || alert.type.startsWith('LOT')) {
    const href = alert.refId ? `/admin/inventory?lotId=${alert.refId}` : '/admin/inventory';
    return {
      href,
      label: alert.refId ? `Lô ${alert.refId}` : 'Xem lô trong kho',
    };
  }
  if (alert.refType === 'ITEM' || alert.type === 'LOW_STOCK') {
    const href = alert.refId ? `/admin/inventory?itemId=${alert.refId}` : '/admin/inventory';
    return {
      href,
      label: alert.refId ? `Vật tư ${alert.refId}` : 'Xem vật tư trong kho',
    };
  }
  return {
    href: alert.refId ? `/admin/inventory?refId=${alert.refId}` : '/admin/inventory',
    label: 'Xem trong kho',
  };
}

export function notifyAlertsUpdated(unreadDelta?: number): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('xfarm:alerts-updated', { detail: { unreadDelta } }));
  }
}

export async function getUnreadAlertCount(): Promise<number> {
  try {
    const res = await apiFetch<unknown>('/alerts/unread-count');
    if (typeof res === 'number') return res;
    if (res && typeof res === 'object') {
      const record = res as Record<string, unknown>;
      if (typeof record.count === 'number') return record.count;
      if (typeof record.unreadCount === 'number') return record.unreadCount;
      if (typeof record.data === 'number') return record.data;
      if (
        record.data &&
        typeof record.data === 'object' &&
        typeof (record.data as Record<string, unknown>).count === 'number'
      ) {
        return (record.data as Record<string, unknown>).count as number;
      }
    }
    return 0;
  } catch {
    return 0;
  }
}

export async function getAlerts(params: QueryAlertsParams = {}): Promise<Paginated<AlertItem>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (typeof params.unread === 'boolean') query.set('unread', String(params.unread));
  if (params.type && params.type !== 'ALL') query.set('type', params.type);
  if (params.sort) query.set('sort', params.sort);

  const endpoint = query.toString() ? `/alerts?${query.toString()}` : '/alerts';
  const res = await apiFetch<unknown>(endpoint);

  if (Array.isArray(res)) {
    return {
      data: res as AlertItem[],
      total: res.length,
      page: params.page || 1,
      pageSize: params.pageSize || 10,
    };
  }

  if (res && typeof res === 'object') {
    const record = res as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      const total = typeof record.total === 'number' ? record.total : record.data.length;
      const page = typeof record.page === 'number' ? record.page : params.page || 1;
      const pageSize =
        typeof record.pageSize === 'number' ? record.pageSize : params.pageSize || 10;
      return {
        data: record.data as AlertItem[],
        total,
        page,
        pageSize,
      };
    }
  }

  return {
    data: [],
    total: 0,
    page: 1,
    pageSize: params.pageSize || 10,
  };
}

export async function markAlertAsRead(id: string): Promise<void> {
  await apiFetch(`/alerts/${id}/read`, { method: 'PATCH' });
}

export async function markAllAlertsAsRead(): Promise<void> {
  await apiFetch('/alerts/read-all', { method: 'POST' });
  notifyAlertsUpdated();
}

export async function runInventoryCheck(): Promise<unknown> {
  const res = await apiFetch('/alerts/run-inventory-check', { method: 'POST' });
  notifyAlertsUpdated();
  return res;
}

export async function runMaintenanceCheck(): Promise<unknown> {
  const res = await apiFetch('/alerts/run-maintenance-check', { method: 'POST' });
  notifyAlertsUpdated();
  return res;
}
