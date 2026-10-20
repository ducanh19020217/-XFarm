import { Module } from '@nestjs/common';
import { SequenceModule } from '../../common/sequence/sequence.module';
import { FinanceCategoriesController } from './finance-categories.controller';
import { FinanceCategoriesService } from './finance-categories.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PaymentsController, SalesOrderPaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [SequenceModule],
  controllers: [
    FinanceCategoriesController,
    TransactionsController,
    PaymentsController,
    SalesOrderPaymentsController,
    FinanceController,
  ],
  providers: [FinanceCategoriesService, TransactionsService, PaymentsService, FinanceService],
  exports: [FinanceCategoriesService, TransactionsService, PaymentsService, FinanceService],
})
export class FinanceModule {}
