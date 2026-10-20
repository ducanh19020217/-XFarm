import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
@Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async summary(@CurrentUser('role') role: Role) {
    return { data: await this.dashboardService.summary(role) };
  }

  @Get('charts')
  async charts(@Query('months') months: string | undefined, @CurrentUser('role') role: Role) {
    return { data: await this.dashboardService.charts(months, role) };
  }
}
