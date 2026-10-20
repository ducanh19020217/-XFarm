import { createZodDto } from 'nestjs-zod';
import { createAlertRuleSchema, queryAlertRuleSchema, updateAlertRuleSchema } from '@xfarm/shared';

export class CreateAlertRuleDto extends createZodDto(createAlertRuleSchema) {}
export class UpdateAlertRuleDto extends createZodDto(updateAlertRuleSchema) {}
export class QueryAlertRuleDto extends createZodDto(queryAlertRuleSchema) {}
