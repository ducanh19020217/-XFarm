import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { PublicTraceService } from './public-trace.service';

@ApiTags('public-trace')
@Controller('public/trace')
export class PublicTraceController {
  constructor(private readonly service: PublicTraceService) {}

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get(':traceCode')
  @ApiOperation({ summary: 'Truy xuất nguồn gốc lô nông sản theo mã truy xuất' })
  @ApiResponse({ status: 200, description: 'Thông tin truy xuất nguồn gốc của lô' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông tin truy xuất nguồn gốc' })
  getTrace(@Param('traceCode') traceCode: string) {
    return this.service.getTrace(traceCode);
  }
}
