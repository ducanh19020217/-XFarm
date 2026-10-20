import { Module } from '@nestjs/common';
import { SequenceModule } from '../../common/sequence/sequence.module';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';

@Module({
  imports: [SequenceModule],
  controllers: [SensorsController],
  providers: [SensorsService],
  exports: [SensorsService],
})
export class SensorsModule {}
