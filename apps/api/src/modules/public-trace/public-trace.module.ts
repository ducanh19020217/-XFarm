import { Module } from '@nestjs/common';
import { PublicTraceController } from './public-trace.controller';
import { PublicTraceService } from './public-trace.service';

@Module({
  controllers: [PublicTraceController],
  providers: [PublicTraceService],
  exports: [PublicTraceService],
})
export class PublicTraceModule {}
