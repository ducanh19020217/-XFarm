import { Module } from '@nestjs/common';
import { HarvestLotsController } from './harvest-lots.controller';
import { HarvestLotsService } from './harvest-lots.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [HarvestLotsController],
  providers: [HarvestLotsService],
})
export class HarvestLotsModule {}
