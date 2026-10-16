import { z } from 'zod';
import { AnimalEventType, AnimalSex, AnimalStatus } from '../types';
import { paginationSchema } from './pagination';
import { optionalNullableString, optionalString } from './helpers';

export const createAnimalGroupSchema = z.object({
  code: optionalString(),
  cycleId: z.string().min(1, 'Mùa vụ không được để trống'),
  species: z.string().min(1, 'Loài không được để trống'),
  breed: optionalNullableString(),
  headCount: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.coerce.number().int().min(0, 'Số lượng không được âm').default(0),
  ),
  areaId: z.string().min(1, 'Khu/chuồng không được để trống'),
  notes: optionalNullableString(),
});

export const updateAnimalGroupSchema = createAnimalGroupSchema.partial();

export const queryAnimalGroupSchema = paginationSchema.extend({
  cycleId: z.string().optional(),
  areaId: z.string().optional(),
  species: z.string().optional(),
});

export const createAnimalSchema = z.object({
  tag: z.string().min(1, 'Mã tai/thẻ không được để trống'),
  groupId: z.string().nullable().optional(),
  species: z.string().min(1, 'Loài không được để trống'),
  breed: z.string().nullable().optional(),
  sex: z.nativeEnum(AnimalSex).optional().default(AnimalSex.UNKNOWN),
  birthDate: z.coerce.date().nullable().optional(),
  status: z.nativeEnum(AnimalStatus).optional().default(AnimalStatus.ALIVE),
  motherId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const updateAnimalSchema = createAnimalSchema.partial();

export const queryAnimalSchema = paginationSchema.extend({
  groupId: z.string().optional(),
  species: z.string().optional(),
  status: z.nativeEnum(AnimalStatus).optional(),
});

export const animalOffspringInputSchema = z.object({
  tag: z.string().min(1, 'Mã tai/thẻ không được để trống'),
  groupId: z.string().nullable().optional(),
  species: z.string().optional(),
  breed: z.string().nullable().optional(),
  sex: z.nativeEnum(AnimalSex).optional().default(AnimalSex.UNKNOWN),
  birthDate: z.coerce.date().nullable().optional(),
  status: z.nativeEnum(AnimalStatus).optional().default(AnimalStatus.ALIVE),
  notes: z.string().nullable().optional(),
});

export const createAnimalEventSchema = z.object({
  animalId: z.string().min(1, 'Vật nuôi không được để trống').optional(),
  type: z.nativeEnum(AnimalEventType),
  date: z.coerce
    .date()
    .optional()
    .default(() => new Date()),
  data: z.any().nullable().optional(),
  notes: z.string().nullable().optional(),
  offspring: z.array(animalOffspringInputSchema).optional(),
});

export const updateAnimalEventSchema = createAnimalEventSchema.partial();

export const queryAnimalEventSchema = paginationSchema.extend({
  animalId: z.string().optional(),
  type: z.nativeEnum(AnimalEventType).optional(),
});

export type AnimalOffspringInput = z.infer<typeof animalOffspringInputSchema>;

export type CreateAnimalGroupInput = z.infer<typeof createAnimalGroupSchema>;
export type UpdateAnimalGroupInput = z.infer<typeof updateAnimalGroupSchema>;
export type QueryAnimalGroupInput = z.infer<typeof queryAnimalGroupSchema>;

export type CreateAnimalInput = z.infer<typeof createAnimalSchema>;
export type UpdateAnimalInput = z.infer<typeof updateAnimalSchema>;
export type QueryAnimalInput = z.infer<typeof queryAnimalSchema>;

export type CreateAnimalEventInput = z.infer<typeof createAnimalEventSchema>;
export type UpdateAnimalEventInput = z.infer<typeof updateAnimalEventSchema>;
export type QueryAnimalEventInput = z.infer<typeof queryAnimalEventSchema>;
