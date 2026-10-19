import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ConfirmSalesOrderDto,
  CreatePaymentDto,
  CreateSalesOrderDto,
  QuerySalesOrderDto,
  TransitionSalesOrderDto,
  UpdateSalesOrderDto,
} from './sales-orders.dto';
import { SalesOrdersService } from './sales-orders.service';

@ApiTags('sales-orders')
@Controller('sales-orders')
@Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES)
export class SalesOrdersController {
  constructor(private readonly orders: SalesOrdersService) {}

  @Get()
  findAll(@Query() query: QuerySalesOrderDto) {
    return this.orders.findAll(query);
  }
  @Get(':id/print')
  print(@Param('id') id: string, @Query('type') type: 'invoice' | 'delivery' = 'invoice') {
    if (type !== 'invoice' && type !== 'delivery') type = 'invoice';
    return this.orders.print(id, type).then((data) => ({ data }));
  }
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.orders.findById(id).then((data) => ({ data }));
  }
  @Post()
  @Roles(Role.OWNER, Role.MANAGER, Role.SALES)
  create(
    @Body() dto: CreateSalesOrderDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.orders.create(dto, userId, role).then((data) => ({ data }));
  }
  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.SALES)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.orders.update(id, dto, userId, role).then((data) => ({ data }));
  }
  @Patch(':id/status')
  @Roles(Role.OWNER, Role.MANAGER, Role.SALES)
  transition(@Param('id') id: string, @Body() dto: TransitionSalesOrderDto) {
    return this.orders.transition(id, dto).then((data) => ({ data }));
  }
  @Post(':id/confirm')
  @Roles(Role.OWNER, Role.MANAGER, Role.SALES)
  confirm(@Param('id') id: string, @Body() dto: ConfirmSalesOrderDto) {
    return this.orders.confirm(id, dto).then((data) => ({ data }));
  }
  @Post(':id/cancel')
  @Roles(Role.OWNER, Role.MANAGER, Role.SALES)
  cancel(@Param('id') id: string) {
    return this.orders.cancel(id).then((data) => ({ data }));
  }
  @Post(':id/payments')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES)
  payment(
    @Param('id') id: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.orders.addPayment({ ...dto, orderId: id }, userId).then((data) => ({ data }));
  }
}
