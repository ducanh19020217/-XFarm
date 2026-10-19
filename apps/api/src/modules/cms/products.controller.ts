import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CmsService } from './cms.service';
import { CreateProductDto, UpdateProductDto, QueryProductDto } from './cms.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(@Inject(CmsService) private readonly cmsService: CmsService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES)
  @ApiOperation({ summary: 'Danh sách sản phẩm CMS (phân trang, lọc, tìm kiếm)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() query: QueryProductDto) {
    return this.cmsService.findProducts(query);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES)
  @ApiOperation({ summary: 'Chi tiết sản phẩm' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  async findById(@Param('id') id: string) {
    const product = await this.cmsService.findProductById(id);
    return { data: product };
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Tạo sản phẩm mới' })
  @ApiResponse({ status: 201, description: 'Tạo sản phẩm thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc item không sellable' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async create(@Body() dto: CreateProductDto, @CurrentUser() user: { id: string }) {
    const product = await this.cmsService.createProduct(dto, user?.id);
    return { data: product };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Cập nhật sản phẩm' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    const product = await this.cmsService.updateProduct(id, dto);
    return { data: product };
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Xóa sản phẩm' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  async remove(@Param('id') id: string) {
    return this.cmsService.deleteProduct(id);
  }
}
