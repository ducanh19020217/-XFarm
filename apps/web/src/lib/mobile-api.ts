import { apiFetch, ApiError, isAbortError } from '@/lib/api';
import type {
  TaskItem,
  AttendanceItem,
  AreaOption,
  CycleOption,
} from '@/app/admin/hr/common/types';
import type { ActivityType } from '@xfarm/shared';

export interface CompleteTaskPayload {
  clientId?: string;
  activity?: {
    type: ActivityType;
    areaId?: string;
    cycleId?: string;
    date?: string;
    notes?: string;
    metrics?: Record<string, unknown>;
    mediaIds?: string[];
  };
  notes?: string;
}

export interface CheckInPayload {
  clientId?: string;
  at?: string;
  cycleId?: string;
  employeeId?: string;
  notes?: string;
}

export interface CheckOutPayload {
  clientId?: string;
  at?: string;
  employeeId?: string;
  pieceQty?: number;
  notes?: string;
}

export interface QuickActivityPayload {
  clientId?: string;
  type: ActivityType;
  areaId: string;
  cycleId?: string;
  date?: string;
  notes?: string;
  metrics?: Record<string, unknown>;
  mediaIds?: string[];
}

export interface UploadPhotoResult {
  id: string;
  url: string;
  fileName: string;
}

export interface IMobileApi {
  // Tasks
  getMyTasks(date?: string, signal?: AbortSignal): Promise<TaskItem[]>;
  startTask(taskId: string, payload?: { clientId?: string }): Promise<TaskItem>;
  completeTask(taskId: string, payload: CompleteTaskPayload): Promise<TaskItem>;

  // Attendance
  checkIn(payload?: CheckInPayload): Promise<AttendanceItem>;
  checkOut(payload?: CheckOutPayload): Promise<AttendanceItem>;
  getTodayAttendance(signal?: AbortSignal): Promise<AttendanceItem | null>;
  getRecentAttendance(days?: number, signal?: AbortSignal): Promise<AttendanceItem[]>;

  // Quick Activity
  createQuickActivity(payload: QuickActivityPayload): Promise<unknown>;
  uploadPhoto(file: File): Promise<UploadPhotoResult>;

  // Areas & Cycles
  getAreas(signal?: AbortSignal): Promise<AreaOption[]>;
  getAreaByCode(code: string, signal?: AbortSignal): Promise<AreaOption | null>;
  getCycles(signal?: AbortSignal): Promise<CycleOption[]>;
}

export class DefaultMobileApi implements IMobileApi {
  async getMyTasks(date?: string, signal?: AbortSignal): Promise<TaskItem[]> {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    try {
      const res = await apiFetch<{ data: TaskItem[] } | TaskItem[]>(`/tasks/my${query}`, {
        signal,
      });
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    } catch (err) {
      if (isAbortError(err)) throw err;
      if (err instanceof ApiError && err.statusCode === 404) return [];
      throw err;
    }
  }

  async startTask(taskId: string, payload?: { clientId?: string }): Promise<TaskItem> {
    const res = await apiFetch<{ data: TaskItem } | TaskItem>(`/tasks/${taskId}/start`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    return 'data' in res && res.data ? res.data : (res as TaskItem);
  }

  async completeTask(taskId: string, payload: CompleteTaskPayload): Promise<TaskItem> {
    const res = await apiFetch<{ data: TaskItem } | TaskItem>(`/tasks/${taskId}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return 'data' in res && res.data ? res.data : (res as TaskItem);
  }

  async checkIn(payload?: CheckInPayload): Promise<AttendanceItem> {
    const res = await apiFetch<{ data: AttendanceItem } | AttendanceItem>('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    return 'data' in res && res.data ? res.data : (res as AttendanceItem);
  }

  async checkOut(payload?: CheckOutPayload): Promise<AttendanceItem> {
    const res = await apiFetch<{ data: AttendanceItem } | AttendanceItem>('/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    return 'data' in res && res.data ? res.data : (res as AttendanceItem);
  }

  async getTodayAttendance(signal?: AbortSignal): Promise<AttendanceItem | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const from = today.toISOString();
    const to = tomorrow.toISOString();

    try {
      const res = await apiFetch<{ data: AttendanceItem[] } | AttendanceItem[]>(
        `/attendance?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { signal },
      );
      const list = Array.isArray(res) ? res : res?.data || [];
      return list[0] || null;
    } catch (err) {
      if (isAbortError(err)) throw err;
      if (err instanceof ApiError && err.statusCode === 404) return null;
      return null;
    }
  }

  async getRecentAttendance(days = 7, signal?: AbortSignal): Promise<AttendanceItem[]> {
    const now = new Date();
    const past = new Date(now);
    past.setDate(past.getDate() - days);
    past.setHours(0, 0, 0, 0);

    const from = past.toISOString();
    const to = now.toISOString();

    try {
      const res = await apiFetch<{ data: AttendanceItem[] } | AttendanceItem[]>(
        `/attendance?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&pageSize=50`,
        { signal },
      );
      const list = Array.isArray(res) ? res : res?.data || [];
      return list;
    } catch (err) {
      if (isAbortError(err)) throw err;
      if (err instanceof ApiError && err.statusCode === 404) return [];
      return [];
    }
  }

  async createQuickActivity(payload: QuickActivityPayload): Promise<unknown> {
    return apiFetch('/activities', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async uploadPhoto(file: File): Promise<UploadPhotoResult> {
    const presignRes = await apiFetch<{ data: { uploadUrl: string; key: string } }>(
      '/media/presign',
      {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          mime: file.type || 'image/jpeg',
          size: file.size,
        }),
      },
    );

    const { uploadUrl, key } = presignRes.data;

    // Direct PUT to S3 / RustFS
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'image/jpeg',
      },
      body: file,
    });

    // Save metadata
    const mediaRes = await apiFetch<{ data: { id: string; url?: string } }>('/media', {
      method: 'POST',
      body: JSON.stringify({
        key,
        alt: file.name,
      }),
    });

    return {
      id: mediaRes.data.id,
      url: mediaRes.data.url || key,
      fileName: file.name,
    };
  }

  async getAreas(signal?: AbortSignal): Promise<AreaOption[]> {
    try {
      const res = await apiFetch<{ data: AreaOption[] }>('/areas?pageSize=100', { signal });
      return res.data || [];
    } catch {
      return [];
    }
  }

  async getAreaByCode(code: string, signal?: AbortSignal): Promise<AreaOption | null> {
    const areas = await this.getAreas(signal);
    const target = code.trim().toLowerCase();
    const found = areas.find((a) => (a.code || '').trim().toLowerCase() === target);
    return found || null;
  }

  async getCycles(signal?: AbortSignal): Promise<CycleOption[]> {
    try {
      const res = await apiFetch<{ data: CycleOption[] }>('/cycles?pageSize=100', { signal });
      return res.data || [];
    } catch {
      return [];
    }
  }
}

let activeApiDelegate: IMobileApi = new DefaultMobileApi();

export const mobileApi: IMobileApi = {
  getMyTasks: (date, signal) => activeApiDelegate.getMyTasks(date, signal),
  startTask: (id, payload) => activeApiDelegate.startTask(id, payload),
  completeTask: (id, payload) => activeApiDelegate.completeTask(id, payload),
  checkIn: (payload) => activeApiDelegate.checkIn(payload),
  checkOut: (payload) => activeApiDelegate.checkOut(payload),
  getTodayAttendance: (signal) => activeApiDelegate.getTodayAttendance(signal),
  getRecentAttendance: (days, signal) => activeApiDelegate.getRecentAttendance(days, signal),
  createQuickActivity: (payload) => activeApiDelegate.createQuickActivity(payload),
  uploadPhoto: (file) => activeApiDelegate.uploadPhoto(file),
  getAreas: (signal) => activeApiDelegate.getAreas(signal),
  getAreaByCode: (code, signal) => activeApiDelegate.getAreaByCode(code, signal),
  getCycles: (signal) => activeApiDelegate.getCycles(signal),
};

export function setMobileApiDelegate(delegate: IMobileApi) {
  activeApiDelegate = delegate;
}

export function getMobileApiDelegate(): IMobileApi {
  return activeApiDelegate;
}
