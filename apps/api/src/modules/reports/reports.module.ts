import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { CyclesModule } from '../cycles/cycles.module';

@Module({
  imports: [CyclesModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
