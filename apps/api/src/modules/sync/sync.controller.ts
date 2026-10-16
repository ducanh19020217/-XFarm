import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SyncBatchDto } from './sync.dto';
import { SyncService } from './sync.service';

@ApiTags('sync')
@Controller('sync')
@Roles(Role.OWNER, Role.MANAGER, Role.WORKER)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đồng bộ offline theo lô (idempotent)' })
  @ApiResponse({ status: 200, description: 'Đồng bộ hoàn tất' })
  async batch(
    @Body() dto: SyncBatchDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const results = await this.syncService.syncBatch(dto, user);
    return { data: results, results };
  }
}
