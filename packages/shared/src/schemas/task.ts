import { z } from 'zod';
import { TaskStatus } from '../types';
import { paginationSchema } from './pagination';
import { optionalDate, optionalString } from './helpers';
import { createActivitySchema } from './activity';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Tiêu đề công việc không được để trống'),
  description: optionalString(),
  assigneeId: z.string().min(1, 'Vui lòng chọn nhân viên thực hiện'),
  areaId: optionalString(),
  cycleId: optionalString(),
  dueDate: z.coerce.date({
    errorMap: () => ({ message: 'Hạn hoàn thành không hợp lệ' }),
  }),
  status: z.nativeEnum(TaskStatus).optional().default(TaskStatus.TODO),
  clientId: optionalString(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.nativeEnum(TaskStatus).optional(),
  activityId: optionalString(),
  completedAt: optionalDate(),
});

export const completeTaskSchema = z.object({
  clientId: optionalString(),
  activityId: optionalString(),
  completedAt: optionalDate(),
  notes: optionalString(),
  activity: createActivitySchema.optional(),
});

export const queryTaskSchema = paginationSchema.extend({
  assigneeId: optionalString(),
  areaId: optionalString(),
  cycleId: optionalString(),
  status: z.nativeEnum(TaskStatus).optional(),
  from: optionalDate(),
  to: optionalDate(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;
export type QueryTaskInput = z.infer<typeof queryTaskSchema>;
