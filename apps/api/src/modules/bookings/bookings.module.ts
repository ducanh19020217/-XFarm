import { Module } from '@nestjs/common';
import { SequenceModule } from '../../common/sequence/sequence.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingEmailService } from './email.service';

@Module({
  imports: [SequenceModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingEmailService],
})
export class BookingsModule {}
