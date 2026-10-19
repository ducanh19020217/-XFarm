import { Module } from '@nestjs/common';
import { SequenceModule } from '../../common/sequence/sequence.module';
import { InventoryModule } from '../inventory/inventory.module';
import { SalesOrdersController } from './sales-orders.controller';
import { SalesOrdersService } from './sales-orders.service';

@Module({
  imports: [SequenceModule, InventoryModule],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService],
})
export class SalesOrdersModule {}
