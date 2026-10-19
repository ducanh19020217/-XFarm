import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateCountDto,
  CreateIssueDto,
  CreateReceiptDto,
  CreateTransferDto,
  StockBalanceQueryDto,
  StockMoveQueryDto,
} from './stock.dto';
import { StockService } from './stock.service';

@ApiTags('stock')
@Controller('stock')
@Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.WORKER)
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get('balances') balances(@Query() query: StockBalanceQueryDto, @CurrentUser('role') role: Role) {
    return this.stock.balances(query, role);
  }
  @Get('moves')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  moves(@Query() query: StockMoveQueryDto) {
    return this.stock.moves(query);
  }
  @Get('documents')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  documents(@Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.stock.documents(Number(page), Number(pageSize));
  }
  @Get('documents/:code')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  document(@Param('code') code: string) {
    return this.stock.getDocument(code).then((data) => ({ data }));
  }

  @Post('receipts')
  @Roles(Role.OWNER, Role.MANAGER)
  receipt(@Body() dto: CreateReceiptDto, @CurrentUser('id') userId: string) {
    return this.stock.receipt(dto, userId).then((data) => ({ data }));
  }
  @Post('issues')
  @Roles(Role.OWNER, Role.MANAGER)
  issue(@Body() dto: CreateIssueDto, @CurrentUser('id') userId: string) {
    return this.stock.issue(dto, userId).then((data) => ({ data }));
  }
  @Post('transfers')
  @Roles(Role.OWNER, Role.MANAGER)
  transfer(@Body() dto: CreateTransferDto, @CurrentUser('id') userId: string) {
    return this.stock.transfer(dto, userId).then((data) => ({ data }));
  }
  @Post('counts')
  @Roles(Role.OWNER, Role.MANAGER)
  count(@Body() dto: CreateCountDto, @CurrentUser('id') userId: string) {
    return this.stock.count(dto, userId).then((data) => ({ data }));
  }
}
