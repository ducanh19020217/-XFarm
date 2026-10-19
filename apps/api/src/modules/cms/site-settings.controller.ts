import { Controller, Get, Put, Post, Delete, Param, Body, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CmsService } from './cms.service';
import { CreateSiteSettingDto, UpdateSiteSettingDto, QuerySiteSettingDto } from './cms.dto';

@ApiTags('site-settings')
@Controller('site-settings')
export class SiteSettingsController {
  constructor(@Inject(CmsService) private readonly cmsService: CmsService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Danh sách cấu hình website (admin)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() query: QuerySiteSettingDto) {
    return this.cmsService.findSiteSettings(query);
  }

  @Get(':key')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Chi tiết cấu hình theo key' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy cấu hình' })
  async findByKey(@Param('key') key: string) {
    const setting = await this.cmsService.findSiteSettingByKey(key);
    return { data: setting };
  }

  @Put(':key')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật cấu hình theo key (validate value theo key)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async updateByKey(@Param('key') key: string, @Body() dto: UpdateSiteSettingDto) {
    const setting = await this.cmsService.upsertSiteSetting(key, dto.value);
    return { data: setting };
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Tạo hoặc cập nhật cấu hình theo key' })
  @ApiResponse({ status: 201, description: 'Lưu thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async create(@Body() dto: CreateSiteSettingDto) {
    const setting = await this.cmsService.upsertSiteSetting(dto.key, dto.value);
    return { data: setting };
  }

  @Delete(':key')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Xóa cấu hình' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy cấu hình' })
  async remove(@Param('key') key: string) {
    return this.cmsService.deleteSiteSetting(key);
  }
}
