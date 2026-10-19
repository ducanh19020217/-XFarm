import { createZodDto } from 'nestjs-zod';
import { iotReadingsSchema, queryTimeseriesSchema } from '@xfarm/shared';

export class IotReadingsDto extends createZodDto(iotReadingsSchema) {}
export class QueryTimeseriesDto extends createZodDto(queryTimeseriesSchema) {}
