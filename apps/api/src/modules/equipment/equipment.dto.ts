import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  queryEquipmentSchema,
  createMaintenanceScheduleSchema,
  updateMaintenanceScheduleSchema,
  queryMaintenanceScheduleSchema,
  createMaintenanceLogSchema,
  updateMaintenanceLogSchema,
  queryMaintenanceLogSchema,
} from '@xfarm/shared';

export class CreateEquipmentDto extends createZodDto(createEquipmentSchema) {}
export class UpdateEquipmentDto extends createZodDto(updateEquipmentSchema) {}
export class QueryEquipmentDto extends createZodDto(queryEquipmentSchema) {}

export class CreateMaintenanceScheduleDto extends createZodDto(createMaintenanceScheduleSchema) {}
export class UpdateMaintenanceScheduleDto extends createZodDto(updateMaintenanceScheduleSchema) {}
export class QueryMaintenanceScheduleDto extends createZodDto(queryMaintenanceScheduleSchema) {}

export const createEquipmentMaintenanceScheduleSchema = createMaintenanceScheduleSchema.extend({
  equipmentId: z.string().optional(),
});
export class CreateEquipmentMaintenanceScheduleDto extends createZodDto(
  createEquipmentMaintenanceScheduleSchema,
) {}

export class CreateMaintenanceLogDto extends createZodDto(createMaintenanceLogSchema) {}
export class UpdateMaintenanceLogDto extends createZodDto(updateMaintenanceLogSchema) {}
export class QueryMaintenanceLogDto extends createZodDto(queryMaintenanceLogSchema) {}

export const createEquipmentMaintenanceLogSchema = createMaintenanceLogSchema.extend({
  equipmentId: z.string().optional(),
});
export class CreateEquipmentMaintenanceLogDto extends createZodDto(
  createEquipmentMaintenanceLogSchema,
) {}
