import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { HarvestLotsService } from './harvest-lots.service';
import { QueryHarvestLotDto, UpdateHarvestLotDto } from './harvest-lots.dto';

@ApiTags('harvest-lots')
@Controller('harvest-lots')
@Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES)
export class HarvestLotsController {
  constructor(private readonly service: HarvestLotsService) {}

  @Get()
  findAll(@Query() query: QueryHarvestLotDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateHarvestLotDto) {
    return this.service.update(id, dto).then((data) => ({ data }));
  }
}
