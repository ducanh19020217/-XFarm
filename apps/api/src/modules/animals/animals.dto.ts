import { createZodDto } from 'nestjs-zod';
import {
  createAnimalEventSchema,
  createAnimalGroupSchema,
  createAnimalSchema,
  queryAnimalEventSchema,
  queryAnimalGroupSchema,
  queryAnimalSchema,
  updateAnimalEventSchema,
  updateAnimalGroupSchema,
  updateAnimalSchema,
} from '@xfarm/shared';

export class CreateAnimalGroupDto extends createZodDto(createAnimalGroupSchema) {}
export class UpdateAnimalGroupDto extends createZodDto(updateAnimalGroupSchema) {}
export class QueryAnimalGroupDto extends createZodDto(queryAnimalGroupSchema) {}

export class CreateAnimalDto extends createZodDto(createAnimalSchema) {}
export class UpdateAnimalDto extends createZodDto(updateAnimalSchema) {}
export class QueryAnimalDto extends createZodDto(queryAnimalSchema) {}

export class CreateAnimalEventDto extends createZodDto(createAnimalEventSchema) {}
export class UpdateAnimalEventDto extends createZodDto(updateAnimalEventSchema) {}
export class QueryAnimalEventDto extends createZodDto(queryAnimalEventSchema) {}
