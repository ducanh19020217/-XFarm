import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmployeesService } from './employees.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  QueryEmployeeDto,
  LinkEmployeeUserDto,
} from './employees.dto';

@ApiTags('employees')
@Controller('employees')
export class EmployeesController {
  constructor(@Inject(EmployeesService) private readonly employeesService: EmployeesService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Danh sách nhân viên' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() query: QueryEmployeeDto) {
    return this.employeesService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Chi tiết nhân viên' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhân viên' })
  async findById(@Param('id') id: string) {
    const data = await this.employeesService.findById(id);
    return { data };
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Tạo nhân viên mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @ApiResponse({ status: 409, description: 'Mã nhân viên đã tồn tại' })
  async create(@Body() dto: CreateEmployeeDto) {
    const data = await this.employeesService.create(dto);
    return { data };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật thông tin nhân viên' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhân viên' })
  @ApiResponse({ status: 409, description: 'Mã nhân viên đã tồn tại' })
  async update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    const data = await this.employeesService.update(id, dto);
    return { data };
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Khóa mềm nhân viên' })
  @ApiResponse({ status: 200, description: 'Đã khóa nhân viên thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhân viên' })
  async remove(@Param('id') id: string) {
    const data = await this.employeesService.softDelete(id);
    return { data, message: 'Đã khóa nhân viên thành công' };
  }

  @Patch(':id/user')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Liên kết hoặc gỡ liên kết với User' })
  @ApiResponse({ status: 200, description: 'Cập nhật liên kết tài khoản thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhân viên hoặc người dùng' })
  async linkUser(@Param('id') id: string, @Body() dto: LinkEmployeeUserDto) {
    const data = await this.employeesService.linkUser(id, dto);
    return { data };
  }
}
