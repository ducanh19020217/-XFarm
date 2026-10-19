import { createZodDto } from 'nestjs-zod';
import { createCustomerSchema, queryCustomerSchema, updateCustomerSchema } from '@xfarm/shared';

export class CreateCustomerDto extends createZodDto(createCustomerSchema) {}
export class UpdateCustomerDto extends createZodDto(updateCustomerSchema) {}
export class QueryCustomerDto extends createZodDto(queryCustomerSchema) {}
