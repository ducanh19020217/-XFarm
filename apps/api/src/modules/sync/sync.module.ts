import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../activities/activities.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { TasksModule } from '../tasks/tasks.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [ActivitiesModule, AttendanceModule, TasksModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
