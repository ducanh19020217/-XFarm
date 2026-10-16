import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AttendanceService } from './attendance.service';
import {
  CheckInDto,
  CheckOutDto,
  CreateAttendanceDto,
  UpdateAttendanceDto,
  QueryAttendanceDto,
} from './attendance.dto';

@ApiTags('attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(@Inject(AttendanceService) private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @Roles(Role.WORKER, Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Chấm công vào ca (WORKER tự chấm công)' })
  @ApiResponse({ status: 201, description: 'Chấm công vào thành công' })
  @ApiResponse({ status: 422, description: 'Đã chấm công vào hôm nay hoặc dữ liệu không hợp lệ' })
  async checkIn(
    @Body() dto: CheckInDto,
    @CurrentUser() user: { id: string; role: Role; employeeId?: string | null },
  ) {
    const data = await this.attendanceService.checkIn(dto, user);
    return { data };
  }

  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.WORKER, Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Chấm công ra ca (tính giờ làm tròn 0.25h, trừ nghỉ trưa nếu ca > 6h)' })
  @ApiResponse({ status: 200, description: 'Chấm công ra thành công' })
  @ApiResponse({ status: 422, description: 'Chưa chấm công vào hoặc dữ liệu không hợp lệ' })
  async checkOut(
    @Body() dto: CheckOutDto,
    @CurrentUser() user: { id: string; role: Role; employeeId?: string | null },
  ) {
    const data = await this.attendanceService.checkOut(dto, user);
    return { data };
  }

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.WORKER)
  @ApiOperation({ summary: 'Danh sách chấm công' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(
    @Query() query: QueryAttendanceDto,
    @CurrentUser() user: { id: string; role: Role; employeeId?: string | null },
  ) {
    return this.attendanceService.findAll(query, user);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.WORKER)
  @ApiOperation({ summary: 'Chi tiết bản ghi chấm công' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bản ghi chấm công' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role; employeeId?: string | null },
  ) {
    const data = await this.attendanceService.findById(id, user);
    return { data };
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Tạo bản ghi chấm công thủ công' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @ApiResponse({ status: 422, description: 'Bản ghi chấm công đã tồn tại' })
  async create(@Body() dto: CreateAttendanceDto) {
    const data = await this.attendanceService.create(dto);
    return { data };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Sửa giờ công, khoán hoặc mùa vụ (ghi AuditLog)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bản ghi chấm công' })
  async update(@Param('id') id: string, @Body() dto: UpdateAttendanceDto) {
    const data = await this.attendanceService.update(id, dto);
    return { data };
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Xóa bản ghi chấm công' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bản ghi chấm công' })
  async remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }
}
