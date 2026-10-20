import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateSensorDto, QuerySensorDto, UpdateSensorDto } from './sensors.dto';
import { SensorsService } from './sensors.service';

@ApiTags('sensors')
@Controller('sensors')
@Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.WORKER)
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Get()
  findAll(@Query() query: QuerySensorDto) {
    return this.sensorsService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.sensorsService.findById(id);
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  create(@Body() dto: CreateSensorDto, @CurrentUser('id') userId: string) {
    return this.sensorsService.create(dto, userId);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateSensorDto) {
    return this.sensorsService.update(id, dto);
  }

  @Post(':id/rotate-key')
  @Roles(Role.OWNER, Role.MANAGER)
  rotateKey(@Param('id') id: string) {
    return this.sensorsService.rotateKey(id);
  }
}
