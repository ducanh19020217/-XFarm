import { describe, expect, it } from 'vitest';
import {
  syncBatchResponseSchema,
  syncBatchSchema,
  syncItemSchema,
  syncKinds,
  syncResultItemSchema,
} from './sync';

describe('sync schemas', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  it('parses valid syncItemSchema for all supported kinds', () => {
    for (const kind of syncKinds) {
      const item = {
        clientId: validUuid,
        kind,
        payload: { test: 123 },
        createdAt: '2026-10-16T12:00:00Z',
      };
      const parsed = syncItemSchema.parse(item);
      expect(parsed.clientId).toBe(validUuid);
      expect(parsed.kind).toBe(kind);
      expect(parsed.payload).toEqual({ test: 123 });
      expect(parsed.createdAt).toBeInstanceOf(Date);
    }
  });

  it('rejects invalid clientId that is not a UUID', () => {
    expect(() =>
      syncItemSchema.parse({
        clientId: 'not-a-valid-uuid',
        kind: 'activity',
        payload: {},
        createdAt: new Date(),
      }),
    ).toThrow('clientId phải là UUID hợp lệ');
  });

  it('rejects unsupported sync kind', () => {
    expect(() =>
      syncItemSchema.parse({
        clientId: validUuid,
        kind: 'unknown-kind',
        payload: {},
        createdAt: new Date(),
      }),
    ).toThrow('Loại thao tác đồng bộ không hợp lệ');
  });

  it('accepts sync batch with up to 50 items', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      clientId: `123e4567-e89b-12d3-a456-${String(i).padStart(12, '0')}`,
      kind: 'activity' as const,
      payload: { index: i },
      createdAt: new Date(),
    }));

    const parsed = syncBatchSchema.parse({ items });
    expect(parsed.items).toHaveLength(50);
  });

  it('rejects sync batch with more than 50 items', () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      clientId: `123e4567-e89b-12d3-a456-${String(i).padStart(12, '0')}`,
      kind: 'activity' as const,
      payload: { index: i },
      createdAt: new Date(),
    }));

    expect(() => syncBatchSchema.parse({ items })).toThrow('Tối đa 50 item mỗi lần đồng bộ');
  });

  it('parses valid syncResultItemSchema for created, duplicate, and error', () => {
    const created = syncResultItemSchema.parse({
      clientId: validUuid,
      status: 'created',
      id: 'act-123',
    });
    expect(created.status).toBe('created');
    expect(created.id).toBe('act-123');

    const duplicate = syncResultItemSchema.parse({
      clientId: validUuid,
      status: 'duplicate',
      id: 'act-123',
    });
    expect(duplicate.status).toBe('duplicate');

    const error = syncResultItemSchema.parse({
      clientId: validUuid,
      status: 'error',
      error: 'Mùa vụ đã đóng',
    });
    expect(error.status).toBe('error');
    expect(error.error).toBe('Mùa vụ đã đóng');
  });

  it('rejects invalid status in syncResultItemSchema', () => {
    expect(() =>
      syncResultItemSchema.parse({
        clientId: validUuid,
        status: 'invalid_status',
      }),
    ).toThrow();
  });

  it('parses valid syncBatchResponseSchema', () => {
    const res = syncBatchResponseSchema.parse({
      data: [{ clientId: validUuid, status: 'created', id: '123' }],
    });
    expect(res.data).toHaveLength(1);
    expect(res.data[0].status).toBe('created');
  });
});
