import { Module } from '@nestjs/common';
import { SequenceModule } from '../../common/sequence/sequence.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [SequenceModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
