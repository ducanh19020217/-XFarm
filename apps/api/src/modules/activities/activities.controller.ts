import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto, QueryActivityDto, UpdateActivityDto } from './activities.dto';

@ApiTags('activities')
@Controller()
@Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES, Role.WORKER)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post('activities')
  @Roles(Role.OWNER, Role.MANAGER, Role.WORKER)
  @ApiOperation({ summary: 'Tạo nhật ký sản xuất' })
  create(@Body() dto: CreateActivityDto, @CurrentUser() user: { id: string; role: string }) {
    return this.activitiesService.create(dto, user.id, user.role).then((data) => ({ data }));
  }

  @Get('activities')
  findAll(@Query() query: QueryActivityDto, @CurrentUser() user: { id: string; role: string }) {
    return this.activitiesService.findAll(query, user.id, user.role);
  }

  @Get('activities/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string; role: string }) {
    return this.activitiesService.findOne(id, user.id, user.role).then((data) => ({ data }));
  }

  @Get('cycles/:id/timeline')
  timeline(@Param('id') id: string, @CurrentUser() user: { id: string; role: string }) {
    return this.activitiesService.timeline(id, user.id, user.role).then((data) => ({ data }));
  }

  @Patch('activities/:id')
  @Roles(Role.OWNER, Role.MANAGER, Role.WORKER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.activitiesService.update(id, dto, user.id, user.role).then((data) => ({ data }));
  }

  @Delete('activities/:id')
  remove(@Param('id') id: string, @CurrentUser('role') role: string) {
    return this.activitiesService.remove(id, role);
  }
}
