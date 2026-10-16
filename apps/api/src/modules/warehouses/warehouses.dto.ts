import { createZodDto } from 'nestjs-zod';
import { createWarehouseSchema, updateWarehouseSchema, queryWarehouseSchema } from '@xfarm/shared';

export class CreateWarehouseDto extends createZodDto(createWarehouseSchema) {}
export class UpdateWarehouseDto extends createZodDto(updateWarehouseSchema) {}
export class QueryWarehouseDto extends createZodDto(queryWarehouseSchema) {}
