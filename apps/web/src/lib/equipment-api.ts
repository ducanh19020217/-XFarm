import { apiFetch } from './api';
import type { Paginated } from '@xfarm/shared';
import { EquipmentStatus, MaintenanceType } from '@xfarm/shared';

export interface EquipmentScheduleItem {
  id: string;
  equipmentId: string;
  name: string;
  intervalDays: number;
  nextDueDate: string | Date;
  isActive: boolean;
  createdById?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface EquipmentLogItem {
  id: string;
  equipmentId: string;
  scheduleId?: string | null;
  date: string | Date;
  type: MaintenanceType;
  cost: number | string;
  notes?: string | null;
  performedById?: string | null;
  performedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  schedule?: {
    id: string;
    name: string;
  } | null;
  createdAt?: string | Date;
}

export interface EquipmentItem {
  id: string;
  code: string;
  name: string;
  type: string;
  areaId?: string | null;
  area?: {
    id: string;
    code: string;
    name: string;
  } | null;
  purchaseDate?: string | Date | null;
  value?: number | string | null;
  status: EquipmentStatus;
  notes?: string | null;
  isActive: boolean;
  createdById?: string | null;
  createdBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  maintenanceSchedules?: EquipmentScheduleItem[];
  maintenanceLogs?: EquipmentLogItem[];
  totalMaintenanceCost?: number;
  totalCost?: number;
  _count?: {
    maintenanceSchedules: number;
    maintenanceLogs: number;
  };
}

export interface QueryEquipmentParams {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  status?: string;
  areaId?: string;
  isActive?: boolean;
  sort?: string;
}

export interface CreateEquipmentPayload {
  code?: string;
  name: string;
  type: string;
  areaId?: string | null;
  purchaseDate?: string | null;
  value?: number | null;
  status?: EquipmentStatus;
  notes?: string | null;
  isActive?: boolean;
}

export interface CreateSchedulePayload {
  name: string;
  intervalDays: number;
  nextDueDate: string;
  isActive?: boolean;
}

export interface CreateLogPayload {
  date: string;
  type: MaintenanceType;
  cost: number;
  scheduleId?: string | null;
  notes?: string | null;
}

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  [EquipmentStatus.ACTIVE]: 'Hoạt động',
  [EquipmentStatus.MAINTENANCE]: 'Đang bảo trì',
  [EquipmentStatus.BROKEN]: 'Hỏng hóc',
  [EquipmentStatus.RETIRED]: 'Ngừng sử dụng',
};

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  [MaintenanceType.ROUTINE]: 'Định kỳ',
  [MaintenanceType.REPAIR]: 'Sửa chữa',
  [MaintenanceType.INSPECTION]: 'Kiểm định',
};

export interface MaintenanceStatusResult {
  isOverdue: boolean;
  isDueSoon: boolean;
  earliestDueDate: Date | null;
  daysRemaining: number | null;
}

/**
 * Checks if any active schedule of an equipment is overdue or due within 3 days.
 */
export function getEquipmentMaintenanceStatus(
  schedules?: EquipmentScheduleItem[],
  referenceDate: Date = new Date(),
): MaintenanceStatusResult {
  const activeSchedules = (schedules || []).filter((s) => s.isActive);
  if (activeSchedules.length === 0) {
    return { isOverdue: false, isDueSoon: false, earliestDueDate: null, daysRemaining: null };
  }

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDate = referenceDate.getDate();
  const startOfRefDay = new Date(refYear, refMonth, refDate, 0, 0, 0, 0);

  let hasOverdue = false;
  let hasDueSoon = false;
  let minDueDate: Date | null = null;
  let minDaysRemaining: number | null = null;

  for (const s of activeSchedules) {
    const due = new Date(s.nextDueDate);
    if (Number.isNaN(due.getTime())) continue;

    const dueYear = due.getFullYear();
    const dueMonth = due.getMonth();
    const dueDate = due.getDate();
    const startOfDueDay = new Date(dueYear, dueMonth, dueDate, 0, 0, 0, 0);

    const diffMs = startOfDueDay.getTime() - startOfRefDay.getTime();
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays < 0) {
      hasOverdue = true;
    } else if (diffDays <= 3) {
      hasDueSoon = true;
    }

    if (minDueDate === null || due < minDueDate) {
      minDueDate = due;
      minDaysRemaining = diffDays;
    }
  }

  return {
    isOverdue: hasOverdue,
    isDueSoon: hasDueSoon,
    earliestDueDate: minDueDate,
    daysRemaining: minDaysRemaining,
  };
}

export function formatVNDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return String(date);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(date);
  }
}

export function formatCurrencyVN(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0 ₫';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '0 ₫';
  return `${new Intl.NumberFormat('vi-VN').format(num)} ₫`;
}

// API functions
export async function getEquipmentList(
  params: QueryEquipmentParams = {},
  signal?: AbortSignal,
): Promise<Paginated<EquipmentItem>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.type && params.type !== 'ALL') query.set('type', params.type);
  if (params.status && params.status !== 'ALL') query.set('status', params.status);
  if (params.areaId && params.areaId !== 'ALL') query.set('areaId', params.areaId);
  if (typeof params.isActive === 'boolean') query.set('isActive', String(params.isActive));
  if (params.sort) query.set('sort', params.sort);

  const endpoint = query.toString() ? `/equipment?${query.toString()}` : '/equipment';
  const res = await apiFetch<Paginated<EquipmentItem> | { data: EquipmentItem[]; total?: number }>(
    endpoint,
    { signal },
  );

  if ('total' in res && typeof res.total === 'number') {
    return {
      data: res.data || [],
      total: res.total,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    };
  }

  return {
    data: (res as { data: EquipmentItem[] }).data || [],
    total: ((res as { data: EquipmentItem[] }).data || []).length,
    page: 1,
    pageSize: params.pageSize || 20,
  };
}

export async function getEquipmentDetail(id: string, signal?: AbortSignal): Promise<EquipmentItem> {
  const res = await apiFetch<{ data: EquipmentItem }>(`/equipment/${id}`, { signal });
  return res.data;
}

export async function createEquipment(data: CreateEquipmentPayload): Promise<EquipmentItem> {
  const res = await apiFetch<{ data: EquipmentItem }>('/equipment', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateEquipment(
  id: string,
  data: Partial<CreateEquipmentPayload>,
): Promise<EquipmentItem> {
  const res = await apiFetch<{ data: EquipmentItem }>(`/equipment/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteEquipment(id: string): Promise<void> {
  await apiFetch(`/equipment/${id}`, { method: 'DELETE' });
}

export async function createEquipmentSchedule(
  equipmentId: string,
  data: CreateSchedulePayload,
): Promise<EquipmentScheduleItem> {
  const res = await apiFetch<{ data: EquipmentScheduleItem }>(
    `/equipment/${equipmentId}/maintenance-schedules`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
  return res.data;
}

export async function updateEquipmentSchedule(
  scheduleId: string,
  data: Partial<CreateSchedulePayload>,
): Promise<EquipmentScheduleItem> {
  const res = await apiFetch<{ data: EquipmentScheduleItem }>(
    `/maintenance-schedules/${scheduleId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  );
  return res.data;
}

export async function deleteEquipmentSchedule(scheduleId: string): Promise<void> {
  await apiFetch(`/maintenance-schedules/${scheduleId}`, { method: 'DELETE' });
}

export async function createEquipmentLog(
  equipmentId: string,
  data: CreateLogPayload,
): Promise<EquipmentLogItem> {
  const res = await apiFetch<{ data: EquipmentLogItem }>(
    `/equipment/${equipmentId}/maintenance-logs`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
  return res.data;
}
