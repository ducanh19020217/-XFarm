import { Module } from '@nestjs/common';
import { SequenceModule } from '../../common/sequence/sequence.module';
import { ToursController } from './tours.controller';
import { PublicToursController } from './public-tours.controller';
import { ToursService } from './tours.service';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingEmailService } from './email.service';

@Module({
  imports: [SequenceModule],
  controllers: [ToursController, PublicToursController, BookingsController],
  providers: [ToursService, BookingsService, BookingEmailService],
})
export class ToursModule {}
