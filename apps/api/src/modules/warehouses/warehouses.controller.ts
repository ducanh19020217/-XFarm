import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto, UpdateWarehouseDto, QueryWarehouseDto } from './warehouses.dto';

@ApiTags('warehouses')
@Controller('warehouses')
export class WarehousesController {
  constructor(
    @Inject(WarehousesService)
    private readonly warehousesService: WarehousesService,
  ) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES)
  @ApiOperation({ summary: 'Danh sách kho (phân trang & tìm kiếm)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() query: QueryWarehouseDto) {
    return this.warehousesService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES)
  @ApiOperation({ summary: 'Chi tiết kho' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy kho' })
  async findById(@Param('id') id: string) {
    const warehouse = await this.warehousesService.findById(id);
    return { data: warehouse };
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Tạo kho mới' })
  @ApiResponse({ status: 201, description: 'Tạo kho thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 409, description: 'Mã kho đã tồn tại' })
  @ApiResponse({ status: 422, description: 'Khu vực không tồn tại' })
  async create(@Body() dto: CreateWarehouseDto) {
    const warehouse = await this.warehousesService.create(dto);
    return { data: warehouse };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật kho' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy kho' })
  @ApiResponse({ status: 409, description: 'Mã kho đã tồn tại' })
  @ApiResponse({ status: 422, description: 'Khu vực không tồn tại' })
  async update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    const warehouse = await this.warehousesService.update(id, dto);
    return { data: warehouse };
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Xóa kho' })
  @ApiResponse({ status: 200, description: 'Xóa kho thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy kho' })
  @ApiResponse({
    status: 422,
    description: 'Không thể xóa kho đã phát sinh giao dịch',
  })
  async remove(@Param('id') id: string) {
    return this.warehousesService.remove(id);
  }
}
