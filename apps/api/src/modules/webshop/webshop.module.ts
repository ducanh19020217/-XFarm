import { Module } from '@nestjs/common';
import { SequenceModule } from '../../common/sequence/sequence.module';
import { WebshopController } from './webshop.controller';
import { WebshopService } from './webshop.service';

@Module({
  imports: [SequenceModule],
  controllers: [WebshopController],
  providers: [WebshopService],
})
export class WebshopModule {}
