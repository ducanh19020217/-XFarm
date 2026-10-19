import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CycleStatus, Role } from '@xfarm/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateCycleDto, QueryCycleDto, TransitionCycleDto, UpdateCycleDto } from './cycles.dto';
import { CyclesService } from './cycles.service';

@ApiTags('cycles')
@Controller('cycles')
export class CyclesController {
  constructor(private readonly cyclesService: CyclesService) {}

  @Get()
  findAll(@Query() query: QueryCycleDto) {
    return this.cyclesService.findAll(query);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return { data: await this.cyclesService.findById(id) };
  }

  @Get(':id/labor-cost')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  async getLaborCost(@Param('id') id: string) {
    const result = await this.cyclesService.getLaborCost(id);
    return {
      ...result,
      data: result,
    };
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  async create(@Body() dto: CreateCycleDto, @CurrentUser('id') userId: string) {
    return { data: await this.cyclesService.create(dto, userId) };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  async update(@Param('id') id: string, @Body() dto: UpdateCycleDto) {
    return { data: await this.cyclesService.update(id, dto) };
  }

  @Post(':id/transition')
  @Roles(Role.OWNER, Role.MANAGER)
  async transition(@Param('id') id: string, @Body() dto: TransitionCycleDto) {
    return {
      data: await this.cyclesService.transition(id, dto.to as CycleStatus, dto.note),
    };
  }
}
