import { Controller, Get, Post, Patch, Param, Body, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AreasService } from './areas.service';
import { CreateAreaDto, UpdateAreaDto, QueryAreasDto } from './areas.dto';

@ApiTags('areas')
@Controller('areas')
@Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES, Role.WORKER)
export class AreasController {
  constructor(@Inject(AreasService) private readonly areasService: AreasService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES, Role.WORKER)
  @ApiOperation({ summary: 'Danh sách khu/lô (phân trang & tìm kiếm & lọc)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() query: QueryAreasDto) {
    return this.areasService.findAll(query);
  }

  @Get('tree')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES, Role.WORKER)
  @ApiOperation({ summary: 'Cây lồng khu/lô (chỉ các khu active)' })
  @ApiResponse({ status: 200, description: 'Lấy cây khu/lô thành công' })
  async findTree() {
    return this.areasService.findTree();
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES, Role.WORKER)
  @ApiOperation({ summary: 'Chi tiết khu/lô kèm cha, con và số mùa vụ active' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khu/lô' })
  async findById(@Param('id') id: string) {
    return this.areasService.findById(id);
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Tạo khu/lô mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ (sai GeoJSON, thiếu tên...)' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 409, description: 'Mã khu/lô đã tồn tại' })
  @ApiResponse({ status: 422, description: 'Khu vực cha không tồn tại' })
  async create(@Body() dto: CreateAreaDto, @CurrentUser() user?: CurrentUserPayload) {
    const area = await this.areasService.create(dto, user?.id);
    return { data: area };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật hoặc khóa mềm khu/lô' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ (sai GeoJSON...)' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khu/lô' })
  @ApiResponse({
    status: 422,
    description: 'Tạo vòng lặp phân cấp hoặc khu có mùa vụ đang hoạt động',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateAreaDto) {
    const area = await this.areasService.update(id, dto);
    return { data: area };
  }
}
