import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { apiFetch } from '@/lib/api';
import type { SyncKind } from '@xfarm/shared';

export interface OutboxItem<T = Record<string, unknown>> {
  clientId: string;
  kind: SyncKind;
  payload: T;
  createdAt: string; // ISO 8601 string
  attempts: number;
  lastError?: string;
  lastAttemptAt?: number; // epoch ms
}

export interface BlobItem {
  id: string; // e.g. blob-uuid
  blob: Blob;
  fileName: string;
  mimeType: string;
  createdAt: string;
}

export interface MetaItem {
  key: string;
  value: unknown;
}

export interface OfflineDBSchema extends DBSchema {
  outbox: {
    key: string;
    value: OutboxItem;
    indexes: { 'by-created': string };
  };
  blobs: {
    key: string;
    value: BlobItem;
  };
  meta: {
    key: string;
    value: MetaItem;
  };
}

export const DB_NAME = 'xfarm-offline-queue';
export const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OfflineDBSchema>> | null = null;

export function getDb(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (typeof window === 'undefined' && typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in non-browser environment without polyfill');
  }

  if (!dbPromise) {
    dbPromise = openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('outbox')) {
          const outboxStore = db.createObjectStore('outbox', { keyPath: 'clientId' });
          outboxStore.createIndex('by-created', 'createdAt');
        }
        if (!db.objectStoreNames.contains('blobs')) {
          db.createObjectStore('blobs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
    });
  }

  return dbPromise;
}

export async function closeDb(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}

// -------------------------------------------------------------
// Observers / Event listeners for reactive UI
// -------------------------------------------------------------
type OutboxListener = (count: number, items: OutboxItem[]) => void;
type SyncStatusListener = (status: {
  isSyncing: boolean;
  count: number;
  lastSyncTime?: string | null;
}) => void;

const outboxListeners = new Set<OutboxListener>();
const syncStatusListeners = new Set<SyncStatusListener>();

let cachedLastSyncTime: string | null = null;
let cachedIsSyncing = false;

export function subscribeOutbox(listener: OutboxListener): () => void {
  outboxListeners.add(listener);
  // Emit current state immediately
  getOutbox()
    .then((items) => listener(items.length, items))
    .catch(() => {});

  return () => {
    outboxListeners.delete(listener);
  };
}

export function subscribeSyncStatus(listener: SyncStatusListener): () => void {
  syncStatusListeners.add(listener);
  getOutboxCount()
    .then((count) => {
      listener({
        isSyncing: cachedIsSyncing,
        count,
        lastSyncTime: cachedLastSyncTime,
      });
    })
    .catch(() => {});

  return () => {
    syncStatusListeners.delete(listener);
  };
}

async function notifyOutboxChanged(): Promise<void> {
  try {
    const items = await getOutbox();
    const count = items.length;
    for (const listener of outboxListeners) {
      try {
        listener(count, items);
      } catch {
        // ignore subscriber errors
      }
    }
    notifySyncStatus({ isSyncing: cachedIsSyncing, count });
  } catch {
    // ignore
  }
}

function notifySyncStatus(status: {
  isSyncing: boolean;
  count: number;
  lastSyncTime?: string | null;
}) {
  cachedIsSyncing = status.isSyncing;
  if (status.lastSyncTime !== undefined) {
    cachedLastSyncTime = status.lastSyncTime;
  }
  for (const listener of syncStatusListeners) {
    try {
      listener({
        isSyncing: cachedIsSyncing,
        count: status.count,
        lastSyncTime: cachedLastSyncTime,
      });
    } catch {
      // ignore subscriber errors
    }
  }
}

// -------------------------------------------------------------
// Backoff Delay Calculation
// -------------------------------------------------------------
export function getBackoffDelay(attempts: number, baseMs = 2000, maxMs = 60000): number {
  if (attempts <= 0) return 0;
  return Math.min(baseMs * Math.pow(2, attempts - 1), maxMs);
}

export function isItemReadyForRetry(
  item: OutboxItem,
  now = Date.now(),
  baseMs = 2000,
  maxMs = 60000,
): boolean {
  if (item.attempts <= 0 || !item.lastAttemptAt) return true;
  const delay = getBackoffDelay(item.attempts, baseMs, maxMs);
  return now - item.lastAttemptAt >= delay;
}

// -------------------------------------------------------------
// Outbox CRUD
// -------------------------------------------------------------
export async function enqueue<T = Record<string, unknown>>(
  item: Omit<OutboxItem<T>, 'attempts' | 'createdAt' | 'clientId'> & {
    clientId?: string;
    createdAt?: string;
    attempts?: number;
  },
): Promise<OutboxItem<T>> {
  const db = await getDb();
  const clientId = item.clientId || crypto.randomUUID();
  const createdAt = item.createdAt || new Date().toISOString();
  const fullItem: OutboxItem<T> = {
    ...item,
    clientId,
    createdAt,
    attempts: item.attempts || 0,
  };

  await db.put('outbox', fullItem as unknown as OutboxItem);
  await notifyOutboxChanged();
  return fullItem;
}

export async function getOutbox(): Promise<OutboxItem[]> {
  try {
    const db = await getDb();
    const items = await db.getAllFromIndex('outbox', 'by-created');
    return items;
  } catch {
    return [];
  }
}

export async function getOutboxCount(): Promise<number> {
  try {
    const db = await getDb();
    return await db.count('outbox');
  } catch {
    return 0;
  }
}

export async function getOutboxItem(clientId: string): Promise<OutboxItem | undefined> {
  const db = await getDb();
  return await db.get('outbox', clientId);
}

export async function updateOutboxItem(item: OutboxItem): Promise<void> {
  const db = await getDb();
  await db.put('outbox', item);
  await notifyOutboxChanged();
}

export async function removeOutboxItem(clientId: string): Promise<void> {
  const db = await getDb();
  await db.delete('outbox', clientId);
  await notifyOutboxChanged();
}

export async function clearOutbox(): Promise<void> {
  const db = await getDb();
  await db.clear('outbox');
  await notifyOutboxChanged();
}

export async function dequeue(
  limit = 50,
  ignoreBackoff = false,
  now = Date.now(),
  baseMs = 2000,
  maxMs = 60000,
): Promise<OutboxItem[]> {
  const all = await getOutbox();
  const ready = ignoreBackoff
    ? all
    : all.filter((item) => isItemReadyForRetry(item, now, baseMs, maxMs));
  return ready.slice(0, limit);
}

// -------------------------------------------------------------
// Blobs Store (Offline media)
// -------------------------------------------------------------
export async function saveBlob(fileOrBlob: Blob, fileName?: string): Promise<string> {
  const db = await getDb();
  const id = `blob-${crypto.randomUUID()}`;
  const blobItem: BlobItem = {
    id,
    blob: fileOrBlob,
    fileName: fileName || (fileOrBlob instanceof File ? fileOrBlob.name : 'photo.jpg'),
    mimeType: fileOrBlob.type || 'image/jpeg',
    createdAt: new Date().toISOString(),
  };

  await db.put('blobs', blobItem);
  return id;
}

export async function getBlob(id: string): Promise<BlobItem | undefined> {
  const db = await getDb();
  return await db.get('blobs', id);
}

export async function removeBlob(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('blobs', id);
}

// -------------------------------------------------------------
// Meta Store (Key-Value)
// -------------------------------------------------------------
export async function getMeta<T = unknown>(key: string): Promise<T | null> {
  try {
    const db = await getDb();
    const item = await db.get('meta', key);
    return (item?.value as T) ?? null;
  } catch {
    return null;
  }
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  try {
    const db = await getDb();
    await db.put('meta', { key, value });
    if (key === 'lastSyncTime' && typeof value === 'string') {
      cachedLastSyncTime = value;
      notifySyncStatus({
        isSyncing: cachedIsSyncing,
        count: await getOutboxCount(),
        lastSyncTime: value,
      });
    }
  } catch {
    // ignore
  }
}

export async function getLastSyncTime(): Promise<string | null> {
  if (cachedLastSyncTime) return cachedLastSyncTime;
  const time = await getMeta<string>('lastSyncTime');
  cachedLastSyncTime = time;
  return time;
}

// -------------------------------------------------------------
// Single process concurrency lock (navigator.locks or in-memory)
// -------------------------------------------------------------
let inMemoryLock = false;

export async function runWithSyncLock<T>(fn: () => Promise<T>): Promise<T | null> {
  if (
    typeof navigator !== 'undefined' &&
    'locks' in navigator &&
    typeof navigator.locks?.request === 'function'
  ) {
    return navigator.locks.request(
      'xfarm_offline_sync_lock',
      { ifAvailable: true },
      async (lock) => {
        if (!lock) {
          // Another tab or task currently holds the lock
          return null;
        }
        return await fn();
      },
    );
  }

  // Fallback: in-memory flag
  if (inMemoryLock) return null;
  inMemoryLock = true;
  try {
    return await fn();
  } finally {
    inMemoryLock = false;
  }
}

// -------------------------------------------------------------
// Synchronize Outbox
// -------------------------------------------------------------
export interface SyncBatchResult {
  syncedCount: number;
  duplicateCount: number;
  errorCount: number;
  remainingCount: number;
}

export interface SyncOptions {
  force?: boolean; // ignore backoff and online check
  baseBackoffMs?: number;
  maxBackoffMs?: number;
}

export async function syncOutbox(options?: SyncOptions): Promise<SyncBatchResult> {
  const result = await runWithSyncLock(async () => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline && !options?.force) {
      return {
        syncedCount: 0,
        duplicateCount: 0,
        errorCount: 0,
        remainingCount: await getOutboxCount(),
      };
    }

    const items = await dequeue(
      50,
      options?.force,
      Date.now(),
      options?.baseBackoffMs,
      options?.maxBackoffMs,
    );
    if (items.length === 0) {
      return {
        syncedCount: 0,
        duplicateCount: 0,
        errorCount: 0,
        remainingCount: await getOutboxCount(),
      };
    }

    notifySyncStatus({ isSyncing: true, count: items.length });

    let syncedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    try {
      // 1. Process offline blobs for activities
      for (const item of items) {
        if (item.kind === 'activity' && item.payload && typeof item.payload === 'object') {
          const payload = item.payload as Record<string, unknown>;
          if (Array.isArray(payload.mediaIds) && payload.mediaIds.length > 0) {
            const resolvedMediaIds: string[] = [];
            for (const mid of payload.mediaIds) {
              if (typeof mid === 'string' && mid.startsWith('blob-')) {
                const blobRecord = await getBlob(mid);
                if (blobRecord) {
                  try {
                    // Presign
                    const presignRes = await apiFetch<{
                      data: { uploadUrl: string; key: string };
                    }>('/media/presign', {
                      method: 'POST',
                      body: JSON.stringify({
                        filename: blobRecord.fileName,
                        mime: blobRecord.mimeType || 'image/jpeg',
                        size: blobRecord.blob.size,
                      }),
                    });

                    const { uploadUrl, key } = presignRes.data;

                    // PUT to storage
                    await fetch(uploadUrl, {
                      method: 'PUT',
                      headers: { 'Content-Type': blobRecord.mimeType || 'image/jpeg' },
                      body: blobRecord.blob,
                    });

                    // Save Media metadata
                    const mediaRes = await apiFetch<{ data: { id: string } }>('/media', {
                      method: 'POST',
                      body: JSON.stringify({
                        key,
                        alt: blobRecord.fileName,
                      }),
                    });

                    resolvedMediaIds.push(mediaRes.data.id);
                    await removeBlob(mid);
                  } catch (err: unknown) {
                    item.attempts = (item.attempts || 0) + 1;
                    item.lastError =
                      err instanceof Error ? err.message : 'Lỗi tải ảnh lên khi đồng bộ';
                    item.lastAttemptAt = Date.now();
                    await updateOutboxItem(item);
                    throw err;
                  }
                }
              } else {
                resolvedMediaIds.push(mid);
              }
            }
            payload.mediaIds = resolvedMediaIds;
            await updateOutboxItem(item);
          }
        }
      }

      // 2. Send batch request
      const batchPayload = {
        items: items.map((it) => ({
          clientId: it.clientId,
          kind: it.kind,
          payload: it.payload,
          createdAt: it.createdAt,
        })),
      };

      const res = await apiFetch<
        | {
            data: Array<{
              clientId: string;
              status: 'created' | 'duplicate' | 'error';
              id?: string;
              error?: string;
            }>;
          }
        | Array<{
            clientId: string;
            status: 'created' | 'duplicate' | 'error';
            id?: string;
            error?: string;
          }>
      >('/sync/batch', {
        method: 'POST',
        body: JSON.stringify(batchPayload),
      });

      const results = Array.isArray(res) ? res : res?.data || [];
      const resultMap = new Map(results.map((r) => [r.clientId, r]));

      for (const item of items) {
        const r = resultMap.get(item.clientId);
        if (!r) continue;

        if (r.status === 'created' || r.status === 'duplicate') {
          if (r.status === 'created') syncedCount++;
          if (r.status === 'duplicate') duplicateCount++;
          await removeOutboxItem(item.clientId);
        } else {
          errorCount++;
          item.attempts = (item.attempts || 0) + 1;
          item.lastError = r.error || 'Lỗi đồng bộ';
          item.lastAttemptAt = Date.now();
          await updateOutboxItem(item);
        }
      }

      const nowIso = new Date().toISOString();
      await setMeta('lastSyncTime', nowIso);
    } catch (err: unknown) {
      const now = Date.now();
      const message = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ khi đồng bộ';
      for (const item of items) {
        item.attempts = (item.attempts || 0) + 1;
        item.lastError = message;
        item.lastAttemptAt = now;
        await updateOutboxItem(item);
      }
    } finally {
      const remaining = await getOutboxCount();
      notifySyncStatus({ isSyncing: false, count: remaining });
    }

    const remaining = await getOutboxCount();
    return {
      syncedCount,
      duplicateCount,
      errorCount,
      remainingCount: remaining,
    };
  });

  return (
    result || {
      syncedCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      remainingCount: await getOutboxCount(),
    }
  );
}

// -------------------------------------------------------------
// Auto Sync Registration (Events, 30s timer, Background Sync)
// -------------------------------------------------------------
export function setupAutoSync(options?: { intervalMs?: number }): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    syncOutbox().catch(() => {});
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      syncOutbox().catch(() => {});
    }
  };

  window.addEventListener('online', handleOnline);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  const intervalId = setInterval(() => {
    syncOutbox().catch(() => {});
  }, options?.intervalMs ?? 30000);

  // Background Sync if supported
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then((reg: unknown) => {
        const syncReg = reg as { sync?: { register: (tag: string) => Promise<void> } };
        if (syncReg?.sync?.register) {
          syncReg.sync.register('xfarm-sync-outbox').catch(() => {});
        }
      })
      .catch(() => {});

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_OUTBOX') {
        syncOutbox().catch(() => {});
      }
    });
  }

  // Trigger initial sync if online
  if (navigator.onLine) {
    syncOutbox().catch(() => {});
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    clearInterval(intervalId);
  };
}
