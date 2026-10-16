import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getDb,
  clearOutbox,
  enqueue,
  dequeue,
  getOutbox,
  getOutboxCount,
  getBackoffDelay,
  saveBlob,
  getBlob,
  syncOutbox,
  runWithSyncLock,
} from './offline-queue';
import { mobileApi, setMobileApiDelegate, type IMobileApi } from './mobile-api';
import { ActivityType, TaskStatus } from '@xfarm/shared';
import type { TaskItem, AttendanceItem } from '@/app/admin/hr/common/types';

describe('Offline Queue & Sync Module (IndexedDB)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    // Clear outbox before each test
    await clearOutbox();
  });

  afterEach(async () => {
    await clearOutbox();
  });

  describe('1. Enqueue & Outbox Storage', () => {
    it('enqueues an item into outbox with auto-generated UUID and ISO createdAt', async () => {
      const item = await enqueue({
        kind: 'activity',
        payload: { areaId: 'area-1', type: ActivityType.IRRIGATION },
      });

      expect(item.clientId).toBeDefined();
      expect(item.clientId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(item.attempts).toBe(0);
      expect(new Date(item.createdAt).toISOString()).toBe(item.createdAt);

      const count = await getOutboxCount();
      expect(count).toBe(1);

      const items = await getOutbox();
      expect(items).toHaveLength(1);
      expect(items[0].clientId).toBe(item.clientId);
      expect(items[0].kind).toBe('activity');
    });

    it('enqueues multiple kinds (activity, check-in, check-out, task-complete) in order', async () => {
      const t1 = '2026-10-16T08:00:00.000Z';
      const t2 = '2026-10-16T08:01:00.000Z';
      const t3 = '2026-10-16T08:02:00.000Z';
      const t4 = '2026-10-16T08:03:00.000Z';

      await enqueue({
        kind: 'check-in',
        payload: { at: t1, notes: 'Vào ca sáng' },
        createdAt: t1,
      });

      await enqueue({
        kind: 'activity',
        payload: { areaId: 'area-1', type: ActivityType.IRRIGATION },
        createdAt: t2,
      });

      await enqueue({
        kind: 'task-complete',
        payload: { taskId: 'task-100', notes: 'Đã xong' },
        createdAt: t3,
      });

      await enqueue({
        kind: 'check-out',
        payload: { at: t4, notes: 'Ra ca' },
        createdAt: t4,
      });

      const count = await getOutboxCount();
      expect(count).toBe(4);

      const items = await getOutbox();
      expect(items.map((i) => i.kind)).toEqual([
        'check-in',
        'activity',
        'task-complete',
        'check-out',
      ]);
    });
  });

  describe('2. Dequeue & Batch Limit', () => {
    it('dequeues up to limit items in FIFO order', async () => {
      for (let i = 0; i < 5; i++) {
        await enqueue({
          kind: 'activity',
          payload: { index: i },
          createdAt: new Date(Date.now() + i * 1000).toISOString(),
        });
      }

      const batch = await dequeue(3);
      expect(batch).toHaveLength(3);
      expect((batch[0].payload as { index: number }).index).toBe(0);
      expect((batch[1].payload as { index: number }).index).toBe(1);
      expect((batch[2].payload as { index: number }).index).toBe(2);
    });
  });

  describe('3. Backoff Delay Calculation', () => {
    it('calculates exponential backoff delay correctly', () => {
      expect(getBackoffDelay(0)).toBe(0);
      expect(getBackoffDelay(1, 2000, 60000)).toBe(2000); // 2s
      expect(getBackoffDelay(2, 2000, 60000)).toBe(4000); // 4s
      expect(getBackoffDelay(3, 2000, 60000)).toBe(8000); // 8s
      expect(getBackoffDelay(4, 2000, 60000)).toBe(16000); // 16s
      expect(getBackoffDelay(5, 2000, 60000)).toBe(32000); // 32s
      expect(getBackoffDelay(6, 2000, 60000)).toBe(60000); // capped at 60s
    });

    it('respects backoff delay during dequeue', async () => {
      const now = Date.now();

      // Item 1: never failed (attempts = 0)
      await enqueue({
        kind: 'activity',
        payload: { id: 1 },
        createdAt: new Date(now - 3000).toISOString(),
      });

      // Item 2: failed 1 time, attempted 1s ago (delay 2s -> NOT ready)
      const item2 = await enqueue({
        kind: 'activity',
        payload: { id: 2 },
        createdAt: new Date(now - 2000).toISOString(),
        attempts: 1,
      });
      item2.lastAttemptAt = now - 1000;
      const db = await getDb();
      await db.put('outbox', item2);

      // Item 3: failed 1 time, attempted 3s ago (delay 2s -> READY)
      const item3 = await enqueue({
        kind: 'activity',
        payload: { id: 3 },
        createdAt: new Date(now - 1000).toISOString(),
        attempts: 1,
      });
      item3.lastAttemptAt = now - 3000;
      await db.put('outbox', item3);

      const ready = await dequeue(10, false, now, 2000, 60000);
      const readyIds = ready.map((i) => (i.payload as { id: number }).id);

      expect(readyIds).toContain(1);
      expect(readyIds).toContain(3);
      expect(readyIds).not.toContain(2);
    });
  });

  describe('4. Sync Batch with duplicate, created, and error handling', () => {
    it('deletes from outbox on created OR duplicate status, and keeps on error', async () => {
      const itemCreated = await enqueue({
        kind: 'activity',
        payload: { name: 'act-created' },
      });

      const itemDuplicate = await enqueue({
        kind: 'check-in',
        payload: { name: 'att-duplicate' },
      });

      const itemError = await enqueue({
        kind: 'task-complete',
        payload: { name: 'task-error' },
      });

      // Mock fetch for POST /sync/batch
      const mockFetch = vi.fn().mockImplementation((url: string, _init?: RequestInit) => {
        if (url.includes('/sync/batch')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: [
                  { clientId: itemCreated.clientId, status: 'created', id: 'new-id-1' },
                  { clientId: itemDuplicate.clientId, status: 'duplicate', id: 'old-id-2' },
                  {
                    clientId: itemError.clientId,
                    status: 'error',
                    error: 'Mùa vụ đã đóng (CLOSED)',
                  },
                ],
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }
        return Promise.reject(new Error('Unknown url ' + url));
      });

      vi.stubGlobal('fetch', mockFetch);

      const result = await syncOutbox({ force: true });

      expect(result.syncedCount).toBe(1);
      expect(result.duplicateCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.remainingCount).toBe(1);

      // Verify that created and duplicate items are removed from outbox
      const remainingItems = await getOutbox();
      expect(remainingItems).toHaveLength(1);
      expect(remainingItems[0].clientId).toBe(itemError.clientId);
      expect(remainingItems[0].attempts).toBe(1);
      expect(remainingItems[0].lastError).toBe('Mùa vụ đã đóng (CLOSED)');
    });
  });

  describe('5. Offline Blobs Store & Pre-sync Upload', () => {
    it('saves Blob to blobs store and uploads photo before sending activity during sync', async () => {
      const fakeBlob = new Blob(['sample-image-bytes'], { type: 'image/jpeg' });
      const blobId = await saveBlob(fakeBlob, 'field-photo.jpg');

      expect(blobId).toMatch(/^blob-/);

      const storedBlob = await getBlob(blobId);
      expect(storedBlob).toBeDefined();
      expect(storedBlob?.fileName).toBe('field-photo.jpg');

      // Create activity referencing the blobId
      const activity = await enqueue({
        kind: 'activity',
        payload: {
          areaId: 'area-1',
          type: ActivityType.IRRIGATION,
          mediaIds: [blobId],
        },
      });

      // Mock presign, PUT, and /media
      const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/media/presign')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: {
                  uploadUrl: 'http://rustfs.local:9010/upload-dest',
                  key: 'media-s3-key-123',
                },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }
        if (url.includes('/upload-dest')) {
          // Direct PUT to S3
          return Promise.resolve(new Response(null, { status: 200 }));
        }
        if (url.includes('/media') && init?.method === 'POST') {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: { id: 'real-media-id-999', key: 'media-s3-key-123' },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }
        if (url.includes('/sync/batch')) {
          const body = JSON.parse(String(init?.body || '{}'));
          const item = body.items[0];
          // Ensure mediaIds was resolved from blob-xxx to real-media-id-999
          expect(item.payload.mediaIds).toEqual(['real-media-id-999']);

          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: [{ clientId: activity.clientId, status: 'created', id: 'act-real-1' }],
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }
        return Promise.reject(new Error('Unknown url ' + url));
      });

      vi.stubGlobal('fetch', mockFetch);

      const result = await syncOutbox({ force: true });
      expect(result.syncedCount).toBe(1);

      // Verify blob is cleaned up from store
      const blobAfterSync = await getBlob(blobId);
      expect(blobAfterSync).toBeUndefined();

      // Verify activity is removed from outbox
      const outboxAfter = await getOutbox();
      expect(outboxAfter).toHaveLength(0);
    });
  });

  describe('6. Concurrency Single-Process Lock', () => {
    it('prevents concurrent executions via runWithSyncLock', async () => {
      let runCount = 0;

      const promise1 = runWithSyncLock(async () => {
        runCount++;
        await new Promise((r) => setTimeout(r, 50));
        return 'first';
      });

      const promise2 = runWithSyncLock(async () => {
        runCount++;
        return 'second';
      });

      const [res1, res2] = await Promise.all([promise1, promise2]);
      expect(res1).toBe('first');
      expect(res2).toBeNull(); // Second was blocked by the lock
      expect(runCount).toBe(1);
    });
  });

  describe('7. Wrapping mobileApi: Offline & Network Error Interception', () => {
    let mockDelegate: IMobileApi;

    beforeEach(() => {
      mockDelegate = {
        getMyTasks: vi.fn().mockResolvedValue([]),
        startTask: vi.fn().mockResolvedValue({
          id: 'task-1',
          status: TaskStatus.IN_PROGRESS,
        } as unknown as TaskItem),
        completeTask: vi
          .fn()
          .mockResolvedValue({ id: 'task-1', status: TaskStatus.DONE } as unknown as TaskItem),
        checkIn: vi.fn().mockResolvedValue({
          id: 'att-1',
          checkIn: '2026-10-16T08:00:00Z',
        } as unknown as AttendanceItem),
        checkOut: vi.fn().mockResolvedValue({
          id: 'att-1',
          checkOut: '2026-10-16T17:00:00Z',
        } as unknown as AttendanceItem),
        getTodayAttendance: vi.fn().mockResolvedValue(null),
        getRecentAttendance: vi.fn().mockResolvedValue([]),
        createQuickActivity: vi.fn().mockResolvedValue({ id: 'act-1' }),
        uploadPhoto: vi.fn().mockResolvedValue({ id: 'photo-1', url: '/p.jpg', fileName: 'p.jpg' }),
        getAreas: vi.fn().mockResolvedValue([]),
        getAreaByCode: vi.fn().mockResolvedValue(null),
        getCycles: vi.fn().mockResolvedValue([]),
      };
      setMobileApiDelegate(mockDelegate);
    });

    it('optimistically saves quick activity to outbox with pendingSync badge when offline', async () => {
      // Simulate navigator.onLine = false
      vi.stubGlobal('navigator', { onLine: false });

      const res = (await mobileApi.createQuickActivity({
        type: ActivityType.IRRIGATION,
        areaId: 'area-1',
        notes: 'Tưới cây khi mất mạng',
      })) as { clientId: string; pendingSync: boolean };

      expect(res.pendingSync).toBe(true);
      expect(res.clientId).toBeDefined();

      const outbox = await getOutbox();
      expect(outbox).toHaveLength(1);
      expect(outbox[0].kind).toBe('activity');
      expect((outbox[0].payload as { notes: string }).notes).toBe('Tưới cây khi mất mạng');
    });

    it('optimistically saves attendance check-in to outbox when offline', async () => {
      vi.stubGlobal('navigator', { onLine: false });

      const att = await mobileApi.checkIn({
        at: '2026-10-16T07:30:00.000Z',
        notes: 'Chấm công vào ca offline',
      });

      expect(att.pendingSync).toBe(true);
      expect(att.checkIn).toBe('2026-10-16T07:30:00.000Z');

      const outbox = await getOutbox();
      expect(outbox).toHaveLength(1);
      expect(outbox[0].kind).toBe('check-in');
    });

    it('optimistically saves completeTask to outbox when fetch throws network error', async () => {
      vi.stubGlobal('navigator', { onLine: true });

      // Mock delegate throwing NetworkError
      mockDelegate.completeTask = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      const res = await mobileApi.completeTask('task-999', {
        notes: 'Hoàn thành nhưng mạng rớt lúc bấm',
      });

      expect(res.status).toBe(TaskStatus.DONE);
      expect(res.pendingSync).toBe(true);

      const outbox = await getOutbox();
      expect(outbox).toHaveLength(1);
      expect(outbox[0].kind).toBe('task-complete');
      expect((outbox[0].payload as { taskId: string }).taskId).toBe('task-999');
    });

    it('saves photo as Blob when offline and returns local blob preview', async () => {
      vi.stubGlobal('navigator', { onLine: false });

      const fakeFile = new File(['offline-img'], 'test.png', { type: 'image/png' });
      const photoRes = await mobileApi.uploadPhoto(fakeFile);

      expect(photoRes.id).toMatch(/^blob-/);
      expect(photoRes.fileName).toBe('test.png');

      const blobRecord = await getBlob(photoRes.id);
      expect(blobRecord).toBeDefined();
    });
  });
});
