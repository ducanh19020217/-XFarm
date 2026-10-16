import { z } from 'zod';

export const syncKinds = ['activity', 'check-in', 'check-out', 'task-complete'] as const;
export type SyncKind = (typeof syncKinds)[number];

export const syncItemSchema = z.object({
  clientId: z.string().uuid('clientId phải là UUID hợp lệ'),
  kind: z.enum(syncKinds, {
    errorMap: () => ({ message: 'Loại thao tác đồng bộ không hợp lệ' }),
  }),
  payload: z.record(z.string(), z.any()),
  createdAt: z.coerce.date({
    errorMap: () => ({ message: 'Thời gian tạo không hợp lệ' }),
  }),
});

export const syncBatchSchema = z.object({
  items: z.array(syncItemSchema).max(50, 'Tối đa 50 item mỗi lần đồng bộ'),
});

export type SyncItem = z.infer<typeof syncItemSchema>;
export type SyncBatchInput = z.infer<typeof syncBatchSchema>;
