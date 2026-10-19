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
import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  CompleteTaskDto,
  QueryTaskDto,
  MyTasksQueryDto,
} from './tasks.dto';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(@Inject(TasksService) private readonly tasksService: TasksService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.WORKER)
  @ApiOperation({ summary: 'Danh sách công việc (WORKER chỉ thấy của mình)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(
    @Query() query: QueryTaskDto,
    @CurrentUser() user: { id: string; role: Role; employeeId?: string | null },
  ) {
    return this.tasksService.findAll(query, user);
  }

  @Get('my')
  @Roles(Role.WORKER, Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Công việc hôm nay và quá hạn của chính mình' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findMyTasks(
    @Query() query: MyTasksQueryDto,
    @CurrentUser() user: { id: string; role: Role; employeeId?: string | null },
  ) {
    return this.tasksService.findMyTasks(query, user);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT, Role.WORKER)
  @ApiOperation({ summary: 'Chi tiết công việc' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy công việc' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role; employeeId?: string | null },
  ) {
    const data = await this.tasksService.findById(id, user);
    return { data };
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Giao việc mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async create(@Body() dto: CreateTaskDto) {
    const data = await this.tasksService.create(dto);
    return { data };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật công việc' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy công việc' })
  async update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    const data = await this.tasksService.update(id, dto);
    return { data };
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Xóa công việc' })
  @ApiResponse({ status: 200, description: 'Đã xóa công việc thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy công việc' })
  async remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.WORKER, Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Bắt đầu làm việc (chuyển trạng thái sang IN_PROGRESS)' })
  @ApiResponse({ status: 200, description: 'Bắt đầu thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy công việc' })
  async start(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role; employeeId?: string | null },
  ) {
    const data = await this.tasksService.start(id, user);
    return { data };
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.WORKER, Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Hoàn thành công việc (chuyển DONE, tạo Activity nếu có)' })
  @ApiResponse({ status: 200, description: 'Hoàn thành công việc thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy công việc' })
  async complete(
    @Param('id') id: string,
    @Body() dto: CompleteTaskDto,
    @CurrentUser() user: { id: string; role: Role; employeeId?: string | null },
  ) {
    const data = await this.tasksService.complete(id, dto, user);
    return { data };
  }
}
