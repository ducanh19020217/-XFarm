import { Controller, Get, Param, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ToursService } from './tours.service';
import { PublicQueryTourDto } from './tours.dto';

@ApiTags('public-tours')
@Controller('public/tours')
@Public()
export class PublicToursController {
  constructor(@Inject(ToursService) private readonly toursService: ToursService) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách tour public (đã publish, kèm giá vé, thời lượng, mediaIds)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getTours(@Query() query: PublicQueryTourDto) {
    return this.toursService.findPublicTours(query);
  }

  @Get(':slug')
  @ApiOperation({
    summary:
      'Chi tiết tour public kèm slot 60 ngày tới còn chỗ (remaining = capacity - bookedCount, chỉ active và tương lai)',
  })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tour hoặc tour chưa publish' })
  async getTourBySlug(@Param('slug') slug: string) {
    const tour = await this.toursService.findPublicTourBySlug(slug);
    return { data: tour };
  }
}
