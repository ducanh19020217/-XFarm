import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateEquipmentDto,
  UpdateEquipmentDto,
  QueryEquipmentDto,
  CreateEquipmentMaintenanceScheduleDto,
  QueryMaintenanceScheduleDto,
  CreateEquipmentMaintenanceLogDto,
  QueryMaintenanceLogDto,
} from './equipment.dto';
import { EquipmentService } from './equipment.service';
import { MaintenanceService } from './maintenance.service';

@ApiTags('equipment')
@Controller('equipment')
@Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.WORKER)
export class EquipmentController {
  constructor(
    private readonly equipmentService: EquipmentService,
    private readonly maintenanceService: MaintenanceService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thiết bị (phân trang & lọc)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() query: QueryEquipmentDto) {
    return this.equipmentService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết thiết bị kèm lịch, 20 log gần nhất và tổng chi phí' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thiết bị' })
  async findById(@Param('id') id: string) {
    return this.equipmentService.findById(id);
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Tạo mới thiết bị' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @ApiResponse({ status: 409, description: 'Mã thiết bị đã tồn tại' })
  @ApiResponse({ status: 422, description: 'Khu vực không tồn tại' })
  async create(@Body() dto: CreateEquipmentDto, @CurrentUser('id') userId: string) {
    return this.equipmentService.create(dto, userId);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật thiết bị' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thiết bị' })
  @ApiResponse({ status: 409, description: 'Mã thiết bị đã tồn tại' })
  async update(@Param('id') id: string, @Body() dto: UpdateEquipmentDto) {
    return this.equipmentService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Khóa mềm thiết bị (isActive = false)' })
  @ApiResponse({ status: 200, description: 'Khóa thiết bị thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thiết bị' })
  async remove(@Param('id') id: string) {
    return this.equipmentService.remove(id);
  }

  @Get(':id/maintenance-schedules')
  @ApiOperation({ summary: 'Danh sách lịch bảo trì của thiết bị' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách lịch thành công' })
  async findSchedules(
    @Param('id') equipmentId: string,
    @Query() query: QueryMaintenanceScheduleDto,
  ) {
    return this.maintenanceService.findAllSchedules({
      ...query,
      equipmentId,
    });
  }

  @Post(':id/maintenance-schedules')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Tạo lịch bảo trì cho thiết bị' })
  @ApiResponse({ status: 201, description: 'Tạo lịch bảo trì thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thiết bị' })
  async createSchedule(
    @Param('id') equipmentId: string,
    @Body() dto: CreateEquipmentMaintenanceScheduleDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.maintenanceService.createSchedule(
      {
        ...dto,
        equipmentId,
      },
      userId,
    );
  }

  @Get(':id/maintenance-logs')
  @ApiOperation({ summary: 'Danh sách nhật ký bảo trì của thiết bị' })
  @ApiResponse({ status: 200, description: 'Lấy nhật ký thành công' })
  async findLogs(@Param('id') equipmentId: string, @Query() query: QueryMaintenanceLogDto) {
    return this.maintenanceService.findAllLogs({
      ...query,
      equipmentId,
    });
  }

  @Post(':id/maintenance-logs')
  @Roles(Role.OWNER, Role.MANAGER, Role.WORKER)
  @ApiOperation({ summary: 'Ghi nhật ký bảo trì cho thiết bị trong 1 transaction' })
  @ApiResponse({ status: 201, description: 'Ghi nhận bảo trì thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền thực hiện thao tác' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thiết bị' })
  @ApiResponse({ status: 422, description: 'Lịch bảo trì không hợp lệ' })
  async createLog(
    @Param('id') equipmentId: string,
    @Body() dto: CreateEquipmentMaintenanceLogDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.maintenanceService.createLogTransaction(equipmentId, dto, userId);
  }
}
