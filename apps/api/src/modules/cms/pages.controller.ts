import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CmsService } from './cms.service';
import { CreatePageDto, UpdatePageDto, QueryPageDto } from './cms.dto';

@ApiTags('pages')
@Controller('pages')
export class PagesController {
  constructor(@Inject(CmsService) private readonly cmsService: CmsService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES, Role.WORKER)
  @ApiOperation({ summary: 'Danh sách trang tĩnh (phân trang, tìm kiếm)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() query: QueryPageDto) {
    return this.cmsService.findPages(query);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES, Role.WORKER)
  @ApiOperation({ summary: 'Chi tiết trang tĩnh' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy trang' })
  async findById(@Param('id') id: string) {
    const page = await this.cmsService.findPageById(id);
    return { data: page };
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Tạo trang mới (chỉ OWNER và MANAGER)' })
  @ApiResponse({ status: 201, description: 'Tạo trang thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async create(@Body() dto: CreatePageDto, @CurrentUser() user: { id: string }) {
    const page = await this.cmsService.createPage(dto, user?.id);
    return { data: page };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật trang tĩnh (chỉ OWNER và MANAGER)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy trang' })
  async update(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    const page = await this.cmsService.updatePage(id, dto);
    return { data: page };
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Xóa trang tĩnh (chỉ OWNER và MANAGER)' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy trang' })
  async remove(@Param('id') id: string) {
    return this.cmsService.deletePage(id);
  }
}
