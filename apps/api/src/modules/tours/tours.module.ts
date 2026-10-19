import { Module } from '@nestjs/common';
import { ToursController } from './tours.controller';
import { TourSlotsController } from './tour-slots.controller';
import { PublicToursController } from './public-tours.controller';
import { ToursService } from './tours.service';

@Module({
  controllers: [ToursController, TourSlotsController, PublicToursController],
  providers: [ToursService],
  exports: [ToursService],
})
export class ToursModule {}
