import { Controller, Get, Post, Param, Body, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, QueryPaymentDto } from './finance.dto';

@ApiTags('payments')
@Controller('payments')
@Roles(Role.OWNER, Role.MANAGER, Role.SALES, Role.ACCOUNTANT)
export class PaymentsController {
  constructor(
    @Inject(PaymentsService)
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách các phiếu thanh toán' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() query: QueryPaymentDto) {
    return this.paymentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết phiếu thanh toán' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thanh toán' })
  async findById(@Param('id') id: string) {
    const data = await this.paymentsService.findById(id);
    return { data };
  }
}

@ApiTags('payments')
@Controller('sales-orders')
export class SalesOrderPaymentsController {
  constructor(
    @Inject(PaymentsService)
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post(':id/payments')
  @Roles(Role.OWNER, Role.MANAGER, Role.SALES, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Thu tiền cho đơn hàng bán' })
  @ApiResponse({ status: 201, description: 'Ghi nhận thanh toán thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  @ApiResponse({
    status: 422,
    description: 'Thu vượt quá giá trị đơn hoặc đơn đã bị hủy',
  })
  async addPayment(
    @Param('id') id: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser('id') userId?: string,
  ) {
    const data = await this.paymentsService.addSalesOrderPayment(id, dto, userId);
    return { data };
  }
}
