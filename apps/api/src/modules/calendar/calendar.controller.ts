import { Controller, Get, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CalendarService } from './calendar.service';
import { QueryCalendarDto } from './calendar.dto';

@ApiTags('calendar')
@Controller('calendar')
@Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES)
export class CalendarController {
  constructor(@Inject(CalendarService) private readonly calendarService: CalendarService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.SALES)
  @ApiOperation({
    summary: 'Lấy dữ liệu lịch sản xuất theo tháng (activities và cycle milestones)',
  })
  @ApiResponse({ status: 200, description: 'Lấy dữ liệu lịch thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu truy vấn không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  async getCalendar(@Query() query: QueryCalendarDto, @CurrentUser() user: CurrentUserPayload) {
    return this.calendarService.getCalendarData(query, user);
  }
}
