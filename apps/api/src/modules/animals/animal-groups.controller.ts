import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateAnimalGroupDto, QueryAnimalGroupDto, UpdateAnimalGroupDto } from './animals.dto';
import { AnimalsService } from './animals.service';

@ApiTags('animal-groups')
@Controller('animal-groups')
export class AnimalGroupsController {
  constructor(private readonly animalsService: AnimalsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách đàn vật nuôi (phân trang & lọc)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() query: QueryAnimalGroupDto) {
    return this.animalsService.findGroups(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đàn vật nuôi kèm số lượng theo trạng thái' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đàn vật nuôi' })
  async findById(@Param('id') id: string) {
    const group = await this.animalsService.findGroupById(id);
    return { data: group };
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Tạo đàn vật nuôi mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @ApiResponse({ status: 422, description: 'Mùa vụ hoặc khu không hợp lệ' })
  async create(@Body() dto: CreateAnimalGroupDto, @CurrentUser('id') userId: string) {
    const group = await this.animalsService.createGroup(dto, userId);
    return { data: group };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật thông tin đàn vật nuôi' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đàn vật nuôi' })
  async update(@Param('id') id: string, @Body() dto: UpdateAnimalGroupDto) {
    const group = await this.animalsService.updateGroup(id, dto);
    return { data: group };
  }
}
