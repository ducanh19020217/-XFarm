import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { WebshopCheckoutDto, WebshopOrderLookupDto } from './webshop.dto';
import { WebshopService } from './webshop.service';

@ApiTags('public-webshop')
@Controller('public/orders')
@Public()
export class WebshopController {
  constructor(private readonly webshopService: WebshopService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  create(@Body() body: WebshopCheckoutDto) {
    return this.webshopService.createOrder(body);
  }

  @Get('lookup')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  lookup(@Query() query: WebshopOrderLookupDto) {
    return this.webshopService.lookupOrder(query.code, query.phone);
  }
}
