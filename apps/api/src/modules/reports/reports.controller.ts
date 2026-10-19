import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CashflowReportQueryDto, CycleReportQueryDto, ProductReportQueryDto } from './reports.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
@Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('cashflow')
  @ApiOperation({ summary: 'Báo cáo thu chi theo tháng' })
  getCashflow(@Query() query: CashflowReportQueryDto) {
    return this.reportsService.getCashflow(query.year);
  }

  @Get('cycles/:id/cost')
  @ApiOperation({ summary: 'Báo cáo giá thành và lãi lỗ mùa vụ' })
  async getCycleCost(@Param('id') id: string) {
    const data = await this.reportsService.getCycleCost(id);
    return { data };
  }

  @Get('cycles')
  @ApiOperation({ summary: 'Danh sách báo cáo giá thành mùa vụ' })
  getCycles(@Query() query: CycleReportQueryDto) {
    return this.reportsService.getCycles(query.status);
  }

  @Get('products')
  @ApiOperation({ summary: 'Top sản phẩm theo doanh thu' })
  getProducts(@Query() query: ProductReportQueryDto) {
    return this.reportsService.getProducts(query.from ?? undefined, query.to ?? undefined);
  }
}
