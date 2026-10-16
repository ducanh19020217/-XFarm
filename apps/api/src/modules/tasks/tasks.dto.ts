import { createZodDto } from 'nestjs-zod';
import {
  createTaskSchema,
  updateTaskSchema,
  completeTaskSchema,
  queryTaskSchema,
  optionalDate,
} from '@xfarm/shared';
import { z } from 'zod';

export class CreateTaskDto extends createZodDto(createTaskSchema) {}
export class UpdateTaskDto extends createZodDto(updateTaskSchema) {}
export class CompleteTaskDto extends createZodDto(completeTaskSchema) {}
export class QueryTaskDto extends createZodDto(queryTaskSchema) {}

const myTasksQuerySchema = z.object({
  date: optionalDate(),
});
export class MyTasksQueryDto extends createZodDto(myTasksQuerySchema) {}
