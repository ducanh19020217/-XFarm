import { createZodDto } from 'nestjs-zod';
import { createSupplierSchema, updateSupplierSchema, querySupplierSchema } from '@xfarm/shared';

export class CreateSupplierDto extends createZodDto(createSupplierSchema) {}
export class UpdateSupplierDto extends createZodDto(updateSupplierSchema) {}
export class QuerySupplierDto extends createZodDto(querySupplierSchema) {}
