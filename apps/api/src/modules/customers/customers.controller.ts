import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateCustomerDto, QueryCustomerDto, UpdateCustomerDto } from './customers.dto';
import { CustomersService } from './customers.service';

@ApiTags('customers')
@Controller('customers')
@Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  findAll(@Query() query: QueryCustomerDto) {
    return this.customers.findAll(query);
  }
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.customers.findById(id).then((data) => ({ data }));
  }
  @Post()
  create(@Body() dto: CreateCustomerDto, @CurrentUser('id') userId: string) {
    return this.customers.create(dto, userId).then((data) => ({ data }));
  }
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(id, dto).then((data) => ({ data }));
  }
}
