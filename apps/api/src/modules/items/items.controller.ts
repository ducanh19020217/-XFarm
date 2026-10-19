import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { ItemsService } from './items.service';
import { CreateItemDto, UpdateItemDto, QueryItemDto } from './items.dto';

@ApiTags('items')
@Controller('items')
export class ItemsController {
  constructor(@Inject(ItemsService) private readonly itemsService: ItemsService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES)
  @ApiOperation({
    summary:
      'Danh sách vật tư/hàng hóa (phân trang, tìm kiếm, lọc category, isSellable, belowMinStock kèm onHand)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() query: QueryItemDto) {
    return this.itemsService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES)
  @ApiOperation({ summary: 'Chi tiết vật tư kèm tồn onHand' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vật tư' })
  async findById(@Param('id') id: string) {
    const item = await this.itemsService.findById(id);
    return { data: item };
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Tạo vật tư mới (sku tự sinh nếu trống)' })
  @ApiResponse({ status: 201, description: 'Tạo vật tư thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 409, description: 'Mã vật tư đã tồn tại' })
  async create(@Body() dto: CreateItemDto) {
    const item = await this.itemsService.create(dto);
    return { data: item };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật vật tư' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vật tư' })
  @ApiResponse({ status: 409, description: 'Mã vật tư đã tồn tại' })
  async update(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    const item = await this.itemsService.update(id, dto);
    return { data: item };
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Khóa mềm vật tư (isActive = false)' })
  @ApiResponse({ status: 200, description: 'Khóa mềm vật tư thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vật tư' })
  async remove(@Param('id') id: string) {
    return this.itemsService.remove(id);
  }
}
