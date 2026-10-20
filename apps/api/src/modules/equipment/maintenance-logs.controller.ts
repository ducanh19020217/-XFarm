import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateMaintenanceLogDto,
  QueryMaintenanceLogDto,
  UpdateMaintenanceLogDto,
} from './equipment.dto';
import { MaintenanceService } from './maintenance.service';

@ApiTags('maintenance-logs')
@Controller('maintenance-logs')
@Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.WORKER)
export class MaintenanceLogsController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách nhật ký bảo trì' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() query: QueryMaintenanceLogDto) {
    return this.maintenanceService.findAllLogs(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết nhật ký bảo trì' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhật ký bảo trì' })
  async findById(@Param('id') id: string) {
    return this.maintenanceService.findLogById(id);
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER, Role.WORKER)
  @ApiOperation({ summary: 'Ghi nhật ký bảo trì (transaction)' })
  @ApiResponse({ status: 201, description: 'Ghi nhận bảo trì thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền thực hiện thao tác' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thiết bị' })
  @ApiResponse({ status: 422, description: 'Lịch bảo trì không hợp lệ' })
  async create(@Body() dto: CreateMaintenanceLogDto, @CurrentUser('id') userId: string) {
    return this.maintenanceService.createLogTransaction(dto.equipmentId, dto, userId);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật nhật ký bảo trì' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhật ký bảo trì' })
  async update(@Param('id') id: string, @Body() dto: UpdateMaintenanceLogDto) {
    return this.maintenanceService.updateLog(id, dto);
  }
}
