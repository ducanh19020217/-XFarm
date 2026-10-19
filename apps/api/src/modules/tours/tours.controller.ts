import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@xfarm/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateTourDto,
  UpdateTourDto,
  QueryTourDto,
  CreateTourSlotDto,
  UpdateTourSlotDto,
  BatchCreateTourSlotsDto,
  QueryTourSlotDto,
} from './tours.dto';
import { ToursService } from './tours.service';

@Controller('tours')
export class ToursController {
  constructor(private readonly service: ToursService) {}
  @Get() findAll(@Query() q: QueryTourDto) {
    return this.service.findAll(q);
  }
  @Get('slots') findSlots(@Query() q: QueryTourSlotDto) {
    return this.service.findSlots(q);
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
  @Post() @Roles(Role.OWNER, Role.MANAGER) create(
    @Body() dto: CreateTourDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(dto, userId).then((data) => ({ data }));
  }
  @Patch(':id') @Roles(Role.OWNER, Role.MANAGER) update(
    @Param('id') id: string,
    @Body() dto: UpdateTourDto,
  ) {
    return this.service.update(id, dto).then((data) => ({ data }));
  }
  @Post('slots') @Roles(Role.OWNER, Role.MANAGER) createSlot(
    @Body() dto: CreateTourSlotDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.createSlot(dto, userId).then((data) => ({ data }));
  }
  @Post('slots/batch') @Roles(Role.OWNER, Role.MANAGER) batch(
    @Body() dto: BatchCreateTourSlotsDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.createSlots(dto, userId);
  }
  @Patch('slots/:id') @Roles(Role.OWNER, Role.MANAGER) updateSlot(
    @Param('id') id: string,
    @Body() dto: UpdateTourSlotDto,
  ) {
    return this.service.updateSlot(id, dto).then((data) => ({ data }));
  }
}
