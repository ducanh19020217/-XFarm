import { Module } from '@nestjs/common';
import { SequenceModule } from '../../common/sequence/sequence.module';
import { CyclesController } from './cycles.controller';
import { CyclesService } from './cycles.service';

@Module({
  imports: [SequenceModule],
  controllers: [CyclesController],
  providers: [CyclesService],
})
export class CyclesModule {}
