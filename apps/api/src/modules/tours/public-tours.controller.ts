import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { QueryTourDto, QueryTourSlotDto } from './tours.dto';
import { ToursService } from './tours.service';

@Public()
@Controller('public/tours')
export class PublicToursController {
  constructor(private readonly service: ToursService) {}
  @Get() findAll(@Query() q: QueryTourDto) {
    return this.service.findAll(q, true);
  }
  @Get('slots') findSlots(@Query() q: QueryTourSlotDto) {
    return this.service.findSlots(q, true);
  }
  @Get(':slug') findOne(@Param('slug') slug: string) {
    return this.service.findOne(slug, true).then((data) => ({ data }));
  }
}
