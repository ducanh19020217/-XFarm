import { apiFetch, ApiError, isAbortError } from '@/lib/api';
import type {
  TaskItem,
  AttendanceItem,
  AreaOption,
  CycleOption,
} from '@/app/admin/hr/common/types';
import { type ActivityType, TaskStatus } from '@xfarm/shared';
import { enqueue, saveBlob, getOutbox } from '@/lib/offline-queue';

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
  performedAt?: string;
  date?: string;
  data?: unknown;
  quantity?: number;
  unit?: string;
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

export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }
  if (!err) return false;
  if (err instanceof TypeError) {
    return true;
  }
  const errObj = err as Record<string, unknown>;
  const name = String(errObj.name || '');
  const message = String(errObj.message || '').toLowerCase();
  const code = String(errObj.code || '');

  if (name === 'TypeError' || name === 'NetworkError' || name === 'FetchError') {
    return true;
  }
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('offline') ||
    message.includes('failed to fetch') ||
    message.includes('enotfound') ||
    message.includes('econnrefused')
  ) {
    return true;
  }
  if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ERR_NETWORK') {
    return true;
  }
  return false;
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
    const p = { ...(payload || {}) };
    p.clientId = p.clientId || crypto.randomUUID();
    const res = await apiFetch<{ data: TaskItem } | TaskItem>(`/tasks/${taskId}/start`, {
      method: 'POST',
      body: JSON.stringify(p),
    });
    return 'data' in res && res.data ? res.data : (res as TaskItem);
  }

  async completeTask(taskId: string, payload: CompleteTaskPayload): Promise<TaskItem> {
    const p = { ...payload };
    p.clientId = p.clientId || crypto.randomUUID();
    const res = await apiFetch<{ data: TaskItem } | TaskItem>(`/tasks/${taskId}/complete`, {
      method: 'POST',
      body: JSON.stringify(p),
    });
    return 'data' in res && res.data ? res.data : (res as TaskItem);
  }

  async checkIn(payload?: CheckInPayload): Promise<AttendanceItem> {
    const p = { ...(payload || {}) };
    p.clientId = p.clientId || crypto.randomUUID();
    p.at = p.at || new Date().toISOString();
    const res = await apiFetch<{ data: AttendanceItem } | AttendanceItem>('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(p),
    });
    return 'data' in res && res.data ? res.data : (res as AttendanceItem);
  }

  async checkOut(payload?: CheckOutPayload): Promise<AttendanceItem> {
    const p = { ...(payload || {}) };
    p.clientId = p.clientId || crypto.randomUUID();
    p.at = p.at || new Date().toISOString();
    const res = await apiFetch<{ data: AttendanceItem } | AttendanceItem>('/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify(p),
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
    const p = { ...payload };
    p.clientId = p.clientId || crypto.randomUUID();
    return apiFetch('/activities', {
      method: 'POST',
      body: JSON.stringify(p),
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
    const res = await apiFetch<{ data: AreaOption[] }>('/areas?pageSize=100', { signal });
    return res.data || [];
  }

  async getAreaByCode(code: string, signal?: AbortSignal): Promise<AreaOption | null> {
    const areas = await this.getAreas(signal);
    const target = code.trim().toLowerCase();
    const found = areas.find((a) => (a.code || '').trim().toLowerCase() === target);
    return found || null;
  }

  async getCycles(signal?: AbortSignal): Promise<CycleOption[]> {
    const res = await apiFetch<{ data: CycleOption[] }>('/cycles?pageSize=100', { signal });
    return res.data || [];
  }
}

export class OfflineAwareMobileApi implements IMobileApi {
  constructor(private inner: IMobileApi) {}

  setInner(delegate: IMobileApi) {
    this.inner = delegate;
  }

  getInner(): IMobileApi {
    return this.inner;
  }

  private async getCachedTasksWithOutbox(): Promise<TaskItem[]> {
    let cached: TaskItem[] = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('xfarm_cached_tasks');
        if (raw) cached = JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    // Overlay pending task completion from outbox
    try {
      const outbox = await getOutbox();
      for (const item of outbox) {
        if (item.kind === 'task-complete') {
          const p = item.payload as { taskId?: string; id?: string };
          const tId = p.taskId || p.id;
          const found = cached.find((t) => t.id === tId);
          if (found) {
            found.status = TaskStatus.DONE;
            found.completedAt = item.createdAt;
            found.pendingSync = true;
          }
        }
      }
    } catch {
      /* ignore */
    }
    return cached;
  }

  async getMyTasks(date?: string, signal?: AbortSignal): Promise<TaskItem[]> {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      return this.getCachedTasksWithOutbox();
    }

    try {
      const tasks = await this.inner.getMyTasks(date, signal);
      if (typeof window !== 'undefined' && Array.isArray(tasks) && tasks.length > 0) {
        try {
          localStorage.setItem('xfarm_cached_tasks', JSON.stringify(tasks));
        } catch {
          /* ignore */
        }
      }
      return tasks;
    } catch (err) {
      if (isAbortError(err)) throw err;
      if (isNetworkError(err)) {
        return this.getCachedTasksWithOutbox();
      }
      throw err;
    }
  }

  async startTask(taskId: string, payload?: { clientId?: string }): Promise<TaskItem> {
    const p = { ...(payload || {}) };
    p.clientId = p.clientId || crypto.randomUUID();
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isOffline) {
      return {
        id: taskId,
        title: '',
        assigneeId: '',
        dueDate: new Date().toISOString(),
        status: TaskStatus.IN_PROGRESS,
        pendingSync: true,
        clientId: p.clientId,
      };
    }

    try {
      return await this.inner.startTask(taskId, p);
    } catch (err) {
      if (isNetworkError(err)) {
        return {
          id: taskId,
          title: '',
          assigneeId: '',
          dueDate: new Date().toISOString(),
          status: TaskStatus.IN_PROGRESS,
          pendingSync: true,
          clientId: p.clientId,
        };
      }
      throw err;
    }
  }

  async completeTask(taskId: string, payload: CompleteTaskPayload): Promise<TaskItem> {
    const p = { ...payload };
    p.clientId = p.clientId || crypto.randomUUID();
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isOffline) {
      await enqueue({
        clientId: p.clientId,
        kind: 'task-complete',
        payload: { taskId, ...p },
        createdAt: new Date().toISOString(),
      });
      return {
        id: taskId,
        title: '',
        assigneeId: '',
        dueDate: new Date().toISOString(),
        status: TaskStatus.DONE,
        completedAt: new Date().toISOString(),
        pendingSync: true,
        clientId: p.clientId,
      };
    }

    try {
      return await this.inner.completeTask(taskId, p);
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueue({
          clientId: p.clientId,
          kind: 'task-complete',
          payload: { taskId, ...p },
          createdAt: new Date().toISOString(),
        });
        return {
          id: taskId,
          title: '',
          assigneeId: '',
          dueDate: new Date().toISOString(),
          status: TaskStatus.DONE,
          completedAt: new Date().toISOString(),
          pendingSync: true,
          clientId: p.clientId,
        };
      }
      throw err;
    }
  }

  async checkIn(payload?: CheckInPayload): Promise<AttendanceItem> {
    const p = { ...(payload || {}) };
    p.clientId = p.clientId || crypto.randomUUID();
    p.at = p.at || new Date().toISOString();
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isOffline) {
      await enqueue({
        clientId: p.clientId,
        kind: 'check-in',
        payload: p,
        createdAt: p.at,
      });
      return {
        id: 'optimistic-' + p.clientId,
        employeeId: p.employeeId || 'current-emp',
        date: p.at.slice(0, 10),
        checkIn: p.at,
        checkOut: null,
        hours: 0,
        notes: p.notes,
        pendingSync: true,
        clientId: p.clientId,
      };
    }

    try {
      return await this.inner.checkIn(p);
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueue({
          clientId: p.clientId,
          kind: 'check-in',
          payload: p,
          createdAt: p.at,
        });
        return {
          id: 'optimistic-' + p.clientId,
          employeeId: p.employeeId || 'current-emp',
          date: p.at.slice(0, 10),
          checkIn: p.at,
          checkOut: null,
          hours: 0,
          notes: p.notes,
          pendingSync: true,
          clientId: p.clientId,
        };
      }
      throw err;
    }
  }

  async checkOut(payload?: CheckOutPayload): Promise<AttendanceItem> {
    const p = { ...(payload || {}) };
    p.clientId = p.clientId || crypto.randomUUID();
    p.at = p.at || new Date().toISOString();
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isOffline) {
      await enqueue({
        clientId: p.clientId,
        kind: 'check-out',
        payload: p,
        createdAt: p.at,
      });
      return {
        id: 'optimistic-' + p.clientId,
        employeeId: p.employeeId || 'current-emp',
        date: p.at.slice(0, 10),
        checkIn: null,
        checkOut: p.at,
        hours: 0,
        pieceQty: p.pieceQty,
        notes: p.notes,
        pendingSync: true,
        clientId: p.clientId,
      };
    }

    try {
      return await this.inner.checkOut(p);
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueue({
          clientId: p.clientId,
          kind: 'check-out',
          payload: p,
          createdAt: p.at,
        });
        return {
          id: 'optimistic-' + p.clientId,
          employeeId: p.employeeId || 'current-emp',
          date: p.at.slice(0, 10),
          checkIn: null,
          checkOut: p.at,
          hours: 0,
          pieceQty: p.pieceQty,
          notes: p.notes,
          pendingSync: true,
          clientId: p.clientId,
        };
      }
      throw err;
    }
  }

  private async getCachedTodayAttendanceWithOutbox(): Promise<AttendanceItem | null> {
    let cached: AttendanceItem | null = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('xfarm_cached_today_att');
        if (raw) cached = JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    // Overlay pending outbox check-in/out
    try {
      const outbox = await getOutbox();
      for (const item of outbox) {
        if (item.kind === 'check-in') {
          const p = item.payload as CheckInPayload;
          if (!cached) {
            cached = {
              id: 'optimistic-' + item.clientId,
              employeeId: p.employeeId || 'current-emp',
              date: (p.at || item.createdAt).slice(0, 10),
              checkIn: p.at || item.createdAt,
              checkOut: null,
              hours: 0,
              pendingSync: true,
              clientId: item.clientId,
            };
          } else {
            cached.checkIn = p.at || item.createdAt;
            cached.pendingSync = true;
          }
        } else if (item.kind === 'check-out') {
          const p = item.payload as CheckOutPayload;
          if (cached) {
            cached.checkOut = p.at || item.createdAt;
            cached.pendingSync = true;
          }
        }
      }
    } catch {
      /* ignore */
    }
    return cached;
  }

  async getTodayAttendance(signal?: AbortSignal): Promise<AttendanceItem | null> {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      return this.getCachedTodayAttendanceWithOutbox();
    }

    try {
      const att = await this.inner.getTodayAttendance(signal);
      if (typeof window !== 'undefined' && att) {
        try {
          localStorage.setItem('xfarm_cached_today_att', JSON.stringify(att));
        } catch {
          /* ignore */
        }
      }
      return att;
    } catch (err) {
      if (isAbortError(err)) throw err;
      if (isNetworkError(err)) {
        return this.getCachedTodayAttendanceWithOutbox();
      }
      throw err;
    }
  }

  async getRecentAttendance(days = 7, signal?: AbortSignal): Promise<AttendanceItem[]> {
    try {
      return await this.inner.getRecentAttendance(days, signal);
    } catch (err) {
      if (isAbortError(err)) throw err;
      return [];
    }
  }

  async createQuickActivity(payload: QuickActivityPayload): Promise<unknown> {
    const p = { ...payload };
    p.clientId = p.clientId || crypto.randomUUID();
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isOffline) {
      await enqueue({
        clientId: p.clientId,
        kind: 'activity',
        payload: p,
        createdAt: p.date || new Date().toISOString(),
      });
      return {
        id: 'optimistic-' + p.clientId,
        clientId: p.clientId,
        ...p,
        pendingSync: true,
      };
    }

    try {
      return await this.inner.createQuickActivity(p);
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueue({
          clientId: p.clientId,
          kind: 'activity',
          payload: p,
          createdAt: p.date || new Date().toISOString(),
        });
        return {
          id: 'optimistic-' + p.clientId,
          clientId: p.clientId,
          ...p,
          pendingSync: true,
        };
      }
      throw err;
    }
  }

  async uploadPhoto(file: File): Promise<UploadPhotoResult> {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isOffline) {
      const blobId = await saveBlob(file, file.name);
      const url =
        typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
          ? URL.createObjectURL(file)
          : blobId;
      return { id: blobId, url, fileName: file.name };
    }

    try {
      return await this.inner.uploadPhoto(file);
    } catch (err) {
      if (isNetworkError(err)) {
        const blobId = await saveBlob(file, file.name);
        const url =
          typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
            ? URL.createObjectURL(file)
            : blobId;
        return { id: blobId, url, fileName: file.name };
      }
      throw err;
    }
  }

  private getCachedAreas(): AreaOption[] {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('xfarm_cached_areas');
        if (raw) return JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    return [];
  }

  async getAreas(signal?: AbortSignal): Promise<AreaOption[]> {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      return this.getCachedAreas();
    }

    try {
      const res = await this.inner.getAreas(signal);
      if (typeof window !== 'undefined' && Array.isArray(res) && res.length > 0) {
        try {
          localStorage.setItem('xfarm_cached_areas', JSON.stringify(res));
        } catch {
          /* ignore */
        }
        return res;
      }
      return this.getCachedAreas();
    } catch {
      return this.getCachedAreas();
    }
  }

  async getAreaByCode(code: string, signal?: AbortSignal): Promise<AreaOption | null> {
    try {
      return await this.inner.getAreaByCode(code, signal);
    } catch (err) {
      if (isAbortError(err)) throw err;
      const areas = await this.getAreas(signal);
      const target = code.trim().toLowerCase();
      const found = areas.find((a) => (a.code || '').trim().toLowerCase() === target);
      return found || null;
    }
  }

  private getCachedCycles(): CycleOption[] {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('xfarm_cached_cycles');
        if (raw) return JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    return [];
  }

  async getCycles(signal?: AbortSignal): Promise<CycleOption[]> {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      return this.getCachedCycles();
    }

    try {
      const res = await this.inner.getCycles(signal);
      if (typeof window !== 'undefined' && Array.isArray(res) && res.length > 0) {
        try {
          localStorage.setItem('xfarm_cached_cycles', JSON.stringify(res));
        } catch {
          /* ignore */
        }
        return res;
      }
      return this.getCachedCycles();
    } catch {
      return this.getCachedCycles();
    }
  }
}

let baseApiDelegate: IMobileApi = new DefaultMobileApi();
const activeWrapper = new OfflineAwareMobileApi(baseApiDelegate);

export const mobileApi: IMobileApi = {
  getMyTasks: (date, signal) => activeWrapper.getMyTasks(date, signal),
  startTask: (id, payload) => activeWrapper.startTask(id, payload),
  completeTask: (id, payload) => activeWrapper.completeTask(id, payload),
  checkIn: (payload) => activeWrapper.checkIn(payload),
  checkOut: (payload) => activeWrapper.checkOut(payload),
  getTodayAttendance: (signal) => activeWrapper.getTodayAttendance(signal),
  getRecentAttendance: (days, signal) => activeWrapper.getRecentAttendance(days, signal),
  createQuickActivity: (payload) => activeWrapper.createQuickActivity(payload),
  uploadPhoto: (file) => activeWrapper.uploadPhoto(file),
  getAreas: (signal) => activeWrapper.getAreas(signal),
  getAreaByCode: (code, signal) => activeWrapper.getAreaByCode(code, signal),
  getCycles: (signal) => activeWrapper.getCycles(signal),
};

export function setMobileApiDelegate(delegate: IMobileApi) {
  baseApiDelegate = delegate;
  activeWrapper.setInner(delegate);
}

export function getMobileApiDelegate(): IMobileApi {
  return activeWrapper.getInner();
}
