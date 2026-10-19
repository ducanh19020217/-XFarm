import { createZodDto } from 'nestjs-zod';
import { queryHarvestLotSchema, updateHarvestLotSchema } from '@xfarm/shared';

export class QueryHarvestLotDto extends createZodDto(queryHarvestLotSchema) {}

export class UpdateHarvestLotDto extends createZodDto(updateHarvestLotSchema) {}
