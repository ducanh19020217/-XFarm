import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { InventoryModule } from '../inventory/inventory.module';
import { SequenceModule } from '../../common/sequence/sequence.module';

@Module({
  imports: [InventoryModule, SequenceModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
