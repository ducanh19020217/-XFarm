import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto, QuerySupplierDto } from './suppliers.dto';

@ApiTags('suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(
    @Inject(SuppliersService)
    private readonly suppliersService: SuppliersService,
  ) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES, Role.WORKER)
  @ApiOperation({ summary: 'Danh sách nhà cung cấp (phân trang & tìm kiếm)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() query: QuerySupplierDto) {
    return this.suppliersService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES, Role.WORKER)
  @ApiOperation({ summary: 'Chi tiết nhà cung cấp' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhà cung cấp' })
  async findById(@Param('id') id: string) {
    const supplier = await this.suppliersService.findById(id);
    return { data: supplier };
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Tạo nhà cung cấp mới' })
  @ApiResponse({ status: 201, description: 'Tạo nhà cung cấp thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 409, description: 'Mã nhà cung cấp đã tồn tại' })
  async create(@Body() dto: CreateSupplierDto, @CurrentUser('id') userId?: string) {
    const supplier = await this.suppliersService.create(dto, userId);
    return { data: supplier };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Cập nhật nhà cung cấp' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhà cung cấp' })
  @ApiResponse({ status: 409, description: 'Mã nhà cung cấp đã tồn tại' })
  async update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    const supplier = await this.suppliersService.update(id, dto);
    return { data: supplier };
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Xóa nhà cung cấp' })
  @ApiResponse({ status: 200, description: 'Xóa nhà cung cấp thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhà cung cấp' })
  @ApiResponse({
    status: 422,
    description: 'Không thể xóa nhà cung cấp đã phát sinh giao dịch',
  })
  async remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
