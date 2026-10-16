import { createZodDto } from 'nestjs-zod';
import {
  createStockInSchema,
  createStockOutSchema,
  createStockTransferSchema,
  stockAdjustSchema,
  stockBalanceQuerySchema,
  stockMoveQuerySchema,
} from '@xfarm/shared';

export class CreateReceiptDto extends createZodDto(createStockInSchema) {}
export class CreateIssueDto extends createZodDto(createStockOutSchema) {}
export class CreateTransferDto extends createZodDto(createStockTransferSchema) {}
export class CreateCountDto extends createZodDto(stockAdjustSchema) {}
export class StockBalanceQueryDto extends createZodDto(stockBalanceQuerySchema) {}
export class StockMoveQueryDto extends createZodDto(stockMoveQuerySchema) {}
