import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateMaintenanceScheduleDto,
  QueryMaintenanceScheduleDto,
  UpdateMaintenanceScheduleDto,
} from './equipment.dto';
import { MaintenanceService } from './maintenance.service';

@ApiTags('maintenance-schedules')
@Controller('maintenance-schedules')
@Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.WORKER)
export class MaintenanceSchedulesController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách lịch bảo trì' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() query: QueryMaintenanceScheduleDto) {
    return this.maintenanceService.findAllSchedules(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết lịch bảo trì' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lịch bảo trì' })
  async findById(@Param('id') id: string) {
    return this.maintenanceService.findScheduleById(id);
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Tạo lịch bảo trì theo thiết bị (intervalDays ≥ 1)' })
  @ApiResponse({ status: 201, description: 'Tạo lịch thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thiết bị' })
  async create(@Body() dto: CreateMaintenanceScheduleDto, @CurrentUser('id') userId: string) {
    return this.maintenanceService.createSchedule(dto, userId);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật lịch bảo trì' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lịch bảo trì' })
  async update(@Param('id') id: string, @Body() dto: UpdateMaintenanceScheduleDto) {
    return this.maintenanceService.updateSchedule(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Khóa mềm lịch bảo trì' })
  @ApiResponse({ status: 200, description: 'Khóa lịch thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lịch bảo trì' })
  async remove(@Param('id') id: string) {
    return this.maintenanceService.removeSchedule(id);
  }
}
