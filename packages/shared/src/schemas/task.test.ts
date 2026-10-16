import { describe, expect, it } from 'vitest';
import { TaskStatus, TASK_STATUS_LABELS } from '../types';
import { createTaskSchema, updateTaskSchema, completeTaskSchema, queryTaskSchema } from './task';

describe('task schemas', () => {
  it('parses valid task input and normalizes empty string fields', () => {
    const valid = {
      title: 'Tưới rau cải lô 1',
      description: '',
      assigneeId: 'emp-1',
      areaId: '',
      cycleId: 'cycle-1',
      dueDate: '2026-10-20T08:00:00Z',
      clientId: 'client-task-1',
    };
    const parsed = createTaskSchema.parse(valid);
    expect(parsed.title).toBe('Tưới rau cải lô 1');
    expect(parsed.description).toBeUndefined();
    expect(parsed.assigneeId).toBe('emp-1');
    expect(parsed.areaId).toBeUndefined();
    expect(parsed.cycleId).toBe('cycle-1');
    expect(parsed.dueDate).toBeInstanceOf(Date);
    expect(parsed.status).toBe(TaskStatus.TODO);
    expect(parsed.clientId).toBe('client-task-1');
  });

  it('rejects missing title or assigneeId', () => {
    expect(() =>
      createTaskSchema.parse({
        title: '',
        assigneeId: 'emp-1',
        dueDate: '2026-10-20T08:00:00Z',
      }),
    ).toThrow('Tiêu đề công việc không được để trống');

    expect(() =>
      createTaskSchema.parse({
        title: 'Làm cỏ',
        assigneeId: '',
        dueDate: '2026-10-20T08:00:00Z',
      }),
    ).toThrow('Vui lòng chọn nhân viên thực hiện');
  });

  it('parses completeTaskSchema with clientId and activityId', () => {
    const completed = completeTaskSchema.parse({
      clientId: 'idempotent-complete-1',
      activityId: 'act-123',
      completedAt: '2026-10-20T10:30:00Z',
      notes: 'Đã hoàn thành tốt',
    });
    expect(completed.clientId).toBe('idempotent-complete-1');
    expect(completed.activityId).toBe('act-123');
    expect(completed.completedAt).toBeInstanceOf(Date);
    expect(completed.notes).toBe('Đã hoàn thành tốt');
  });

  it('supports partial updates via updateTaskSchema', () => {
    const updated = updateTaskSchema.parse({
      status: TaskStatus.IN_PROGRESS,
    });
    expect(updated.status).toBe(TaskStatus.IN_PROGRESS);
    expect(updated.title).toBeUndefined();
  });

  it('parses queryTaskSchema with status and date filters', () => {
    const query = queryTaskSchema.parse({
      page: '1',
      pageSize: '20',
      assigneeId: 'emp-1',
      status: TaskStatus.TODO,
      from: '2026-10-01',
      to: '2026-10-31',
    });
    expect(query.assigneeId).toBe('emp-1');
    expect(query.status).toBe(TaskStatus.TODO);
    expect(query.from).toBeInstanceOf(Date);
    expect(query.to).toBeInstanceOf(Date);
  });

  it('defines labels for all TaskStatus values', () => {
    for (const status of Object.values(TaskStatus)) {
      expect(TASK_STATUS_LABELS[status]).toBeDefined();
      expect(typeof TASK_STATUS_LABELS[status]).toBe('string');
    }
  });
});
