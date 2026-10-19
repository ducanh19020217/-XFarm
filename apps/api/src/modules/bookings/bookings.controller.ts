import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { BookingStatus, Role } from '@xfarm/shared';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BookingsService } from './bookings.service';
import {
  CreateBookingPaymentDto,
  LookupBookingDto,
  PublicBookingDto,
  QueryBookingDto,
} from './bookings.dto';

@Controller()
export class BookingsController {
  constructor(private readonly service: BookingsService) {}
  @Public() @Post('public/bookings') create(@Body() dto: PublicBookingDto) {
    return this.service.create(dto);
  }
  @Public() @Get('public/bookings/lookup') lookup(@Query() dto: LookupBookingDto) {
    return this.service.lookup(dto.code, dto.phone);
  }
  @Public() @Get('public/bookings/:code') getByCode(@Param('code') code: string) {
    return this.service.findByCode(code);
  }
  @Get('bookings')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES)
  findAll(@Query() q: QueryBookingDto) {
    return this.service.findAll(q);
  }
  @Post('bookings/:id/confirm')
  @Roles(Role.OWNER, Role.MANAGER, Role.SALES)
  confirm(@Param('id') id: string) {
    return this.service.changeStatus(id, BookingStatus.CONFIRMED).then((data) => ({ data }));
  }
  @Post('bookings/:id/cancel')
  @Roles(Role.OWNER, Role.MANAGER, Role.SALES)
  cancel(@Param('id') id: string) {
    return this.service.changeStatus(id, BookingStatus.CANCELLED).then((data) => ({ data }));
  }
  @Post('bookings/:id/complete')
  @Roles(Role.OWNER, Role.MANAGER, Role.SALES)
  complete(@Param('id') id: string) {
    return this.service.changeStatus(id, BookingStatus.COMPLETED).then((data) => ({ data }));
  }
  @Post('bookings/:id/payments')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES)
  pay(
    @Param('id') id: string,
    @Body() dto: CreateBookingPaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.pay(id, dto, userId).then((data) => ({ data }));
  }
}
