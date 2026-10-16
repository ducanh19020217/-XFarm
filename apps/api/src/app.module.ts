import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MediaModule } from './modules/media/media.module';
import { CyclesModule } from './modules/cycles/cycles.module';
import { AreasModule } from './modules/areas/areas.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { AnimalsModule } from './modules/animals/animals.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { ItemsModule } from './modules/items/items.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { StockModule } from './modules/stock/stock.module';
import { PayrollsModule } from './modules/payrolls/payrolls.module';
import { SequenceModule } from './common/sequence/sequence.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    SequenceModule,
    AuthModule,
    UsersModule,
    AreasModule,
    MediaModule,
    CyclesModule,
    ActivitiesModule,
    AnimalsModule,
    CalendarModule,
    AlertsModule,
    ItemsModule,
    WarehousesModule,
    SuppliersModule,
    InventoryModule,
    StockModule,
    PayrollsModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
