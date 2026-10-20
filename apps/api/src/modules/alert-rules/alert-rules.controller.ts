import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateAlertRuleDto, QueryAlertRuleDto, UpdateAlertRuleDto } from './alert-rules.dto';
import { AlertRulesService } from './alert-rules.service';

@ApiTags('alert-rules')
@Controller('alert-rules')
@Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.WORKER)
export class AlertRulesController {
  constructor(private readonly service: AlertRulesService) {}
  @Get() findAll(@Query() query: QueryAlertRuleDto) {
    return this.service.findAll(query);
  }
  @Get(':id') findById(@Param('id') id: string) {
    return this.service.findById(id);
  }
  @Post() @Roles(Role.OWNER, Role.MANAGER) create(
    @Body() dto: CreateAlertRuleDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(dto, userId);
  }
  @Patch(':id') @Roles(Role.OWNER, Role.MANAGER) update(
    @Param('id') id: string,
    @Body() dto: UpdateAlertRuleDto,
  ) {
    return this.service.update(id, dto);
  }
  @Delete(':id') @Roles(Role.OWNER, Role.MANAGER) remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
