import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role, TransactionType } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { FinanceCategoriesService } from './finance-categories.service';
import {
  CreateFinanceCategoryDto,
  UpdateFinanceCategoryDto,
  QueryFinanceCategoryDto,
} from './finance.dto';

@ApiTags('finance-categories')
@Controller('finance-categories')
@Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
export class FinanceCategoriesController {
  constructor(
    @Inject(FinanceCategoriesService)
    private readonly categoriesService: FinanceCategoriesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách danh mục thu chi' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() query: QueryFinanceCategoryDto) {
    return this.categoriesService.findAll(query);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Cây danh mục thu chi' })
  @ApiResponse({ status: 200, description: 'Lấy cây danh mục thành công' })
  async getTree(@Query('type') type?: TransactionType) {
    const data = await this.categoriesService.getTree(type);
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết danh mục thu chi' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  async findById(@Param('id') id: string) {
    const data = await this.categoriesService.findById(id);
    return { data };
  }

  @Post()
  @ApiOperation({ summary: 'Tạo danh mục thu chi mới' })
  @ApiResponse({ status: 201, description: 'Tạo danh mục thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async create(@Body() dto: CreateFinanceCategoryDto) {
    const data = await this.categoriesService.create(dto);
    return { data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật danh mục thu chi' })
  @ApiResponse({ status: 200, description: 'Cập nhật danh mục thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  @ApiResponse({ status: 422, description: 'Dữ liệu không hợp lệ (vòng lặp cây)' })
  async update(@Param('id') id: string, @Body() dto: UpdateFinanceCategoryDto) {
    const data = await this.categoriesService.update(id, dto);
    return { data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa danh mục thu chi' })
  @ApiResponse({ status: 200, description: 'Xóa danh mục thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  @ApiResponse({
    status: 422,
    description: 'Không thể xóa danh mục hệ thống hoặc đã có giao dịch',
  })
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
