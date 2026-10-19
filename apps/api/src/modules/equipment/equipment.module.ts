import { Module } from '@nestjs/common';
import { SequenceModule } from '../../common/sequence/sequence.module';
import { EquipmentController } from './equipment.controller';
import { MaintenanceSchedulesController } from './maintenance-schedules.controller';
import { MaintenanceLogsController } from './maintenance-logs.controller';
import { EquipmentService } from './equipment.service';
import { MaintenanceService } from './maintenance.service';

@Module({
  imports: [SequenceModule],
  controllers: [EquipmentController, MaintenanceSchedulesController, MaintenanceLogsController],
  providers: [EquipmentService, MaintenanceService],
  exports: [EquipmentService, MaintenanceService],
})
export class EquipmentModule {}
