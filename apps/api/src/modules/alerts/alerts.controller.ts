import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { MarkAlertReadDto, QueryAlertDto } from './alerts.dto';
import { AlertsService } from './alerts.service';

@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  async findAll(@Query() query: QueryAlertDto) {
    return this.alertsService.findAll(query);
  }

  @Get('unread-count')
  async getUnreadCount() {
    const count = await this.alertsService.getUnreadCount();
    return { data: { count }, count };
  }

  @Post('run-inventory-check')
  @Roles(Role.OWNER)
  async runInventoryCheck() {
    const result = await this.alertsService.runInventoryCheck();
    return {
      data: result,
      message: 'Kiểm tra tồn kho hoàn tất',
    };
  }

  @Post('run-maintenance-check')
  @Roles(Role.OWNER, Role.MANAGER)
  async runMaintenanceCheck() {
    const result = await this.alertsService.runMaintenanceCheck();
    return {
      data: result,
      message: 'Kiểm tra lịch bảo trì hoàn tất',
    };
  }

  @Post('read-all')
  async markAllRead() {
    const result = await this.alertsService.markAllRead();
    return {
      data: result,
      message: 'Đã đánh dấu tất cả cảnh báo là đã đọc',
    };
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Body() dto?: MarkAlertReadDto) {
    const alert = await this.alertsService.markRead(id, dto);
    return {
      data: alert,
      message: 'Đã cập nhật trạng thái đã đọc',
    };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const alert = await this.alertsService.findById(id);
    return { data: alert };
  }
}
