import { createZodDto } from 'nestjs-zod';
import { syncBatchSchema } from '@xfarm/shared';

export class SyncBatchDto extends createZodDto(syncBatchSchema) {}
