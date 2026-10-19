import { createZodDto } from 'nestjs-zod';
import { createSensorSchema, querySensorSchema, updateSensorSchema } from '@xfarm/shared';

export class CreateSensorDto extends createZodDto(createSensorSchema) {}
export class UpdateSensorDto extends createZodDto(updateSensorSchema) {}
export class QuerySensorDto extends createZodDto(querySensorSchema) {}
