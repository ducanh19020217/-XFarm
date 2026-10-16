import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreatePayrollDto,
  GeneratePayrollDto,
  QueryPayrollDto,
  UpdatePayrollDto,
} from './payrolls.dto';
import { PayrollsService } from './payrolls.service';

@ApiTags('payrolls')
@Controller('payrolls')
export class PayrollsController {
  constructor(private readonly payrollsService: PayrollsService) {}

  @Post('generate')
  @Roles(Role.OWNER, Role.ACCOUNTANT)
  async generate(@Body() dto: GeneratePayrollDto) {
    const data = await this.payrollsService.generate(dto);
    return { data };
  }

  @Get()
  @Roles(Role.OWNER, Role.ACCOUNTANT)
  findAll(@Query() query: QueryPayrollDto) {
    return this.payrollsService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ACCOUNTANT)
  async findById(@Param('id') id: string) {
    return { data: await this.payrollsService.findById(id) };
  }

  @Post(':id/approve')
  @Roles(Role.OWNER, Role.ACCOUNTANT)
  async approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return { data: await this.payrollsService.approve(id, userId) };
  }

  @Post(':id/pay')
  @Roles(Role.OWNER)
  async pay(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return { data: await this.payrollsService.pay(id, userId) };
  }

  @Post()
  @Roles(Role.OWNER, Role.ACCOUNTANT)
  async create(@Body() dto: CreatePayrollDto) {
    return { data: await this.payrollsService.create(dto) };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ACCOUNTANT)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePayrollDto,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.payrollsService.update(id, dto, userId) };
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ACCOUNTANT)
  async remove(@Param('id') id: string) {
    return { data: await this.payrollsService.remove(id) };
  }
}
