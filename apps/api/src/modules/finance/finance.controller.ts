import { Controller, Get, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { FinanceService } from './finance.service';
import { QueryReceivablesDto } from './finance.dto';

@ApiTags('finance')
@Controller('finance')
@Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
export class FinanceController {
  constructor(
    @Inject(FinanceService)
    private readonly financeService: FinanceService,
  ) {}

  @Get('receivables')
  @ApiOperation({ summary: 'Báo cáo công nợ phải thu theo khách và theo đơn' })
  @ApiResponse({ status: 200, description: 'Lấy dữ liệu công nợ thành công' })
  async getReceivables(@Query() query: QueryReceivablesDto) {
    const data = await this.financeService.getReceivables(query);
    return { data };
  }
}
