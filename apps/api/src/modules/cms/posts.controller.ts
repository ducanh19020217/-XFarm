import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CmsService } from './cms.service';
import { CreatePostDto, UpdatePostDto, QueryPostDto } from './cms.dto';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(@Inject(CmsService) private readonly cmsService: CmsService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES, Role.WORKER)
  @ApiOperation({ summary: 'Danh sách bài viết (phân trang, lọc status, tìm kiếm)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() query: QueryPostDto) {
    return this.cmsService.findPosts(query);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES, Role.WORKER)
  @ApiOperation({ summary: 'Chi tiết bài viết' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết' })
  async findById(@Param('id') id: string) {
    const post = await this.cmsService.findPostById(id);
    return { data: post };
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Tạo bài viết mới' })
  @ApiResponse({ status: 201, description: 'Tạo bài viết thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async create(@Body() dto: CreatePostDto, @CurrentUser() user: { id: string }) {
    const post = await this.cmsService.createPost(dto, user?.id);
    return { data: post };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Cập nhật bài viết' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết' })
  async update(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    const post = await this.cmsService.updatePost(id, dto);
    return { data: post };
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Xóa bài viết' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết' })
  async remove(@Param('id') id: string) {
    return this.cmsService.deletePost(id);
  }
}
