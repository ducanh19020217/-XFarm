import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IotReadingsDto, QueryTimeseriesDto } from './iot.dto';
import { IotService } from './iot.service';

@ApiTags('iot')
@Controller('iot')
export class IotController {
  constructor(private readonly service: IotService) {}
  @Post('readings') @Public() ingest(
    @Headers('x-sensor-key') key: string | undefined,
    @Body() dto: IotReadingsDto,
  ) {
    return this.service.ingest(key, dto);
  }
  @Get('series') @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.WORKER) series(
    @Query() query: QueryTimeseriesDto,
  ) {
    return this.service.series(query);
  }
  @Get('latest') @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.WORKER) latest(
    @Query('areaId') areaId: string,
  ) {
    return this.service.latest(areaId);
  }
}
