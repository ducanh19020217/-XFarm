import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, UpdateTransactionDto, QueryTransactionDto } from './finance.dto';

@ApiTags('transactions')
@Controller('transactions')
@Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
export class TransactionsController {
  constructor(
    @Inject(TransactionsService)
    private readonly transactionsService: TransactionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách giao dịch tài chính' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() query: QueryTransactionDto) {
    return this.transactionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết giao dịch tài chính' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giao dịch' })
  async findById(@Param('id') id: string) {
    const data = await this.transactionsService.findById(id);
    return { data };
  }

  @Post()
  @ApiOperation({ summary: 'Tạo giao dịch tài chính thủ công' })
  @ApiResponse({ status: 201, description: 'Tạo giao dịch thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 422, description: 'Loại giao dịch không khớp danh mục' })
  async create(@Body() dto: CreateTransactionDto, @CurrentUser('id') userId?: string) {
    const data = await this.transactionsService.create(dto, userId);
    return { data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Chỉnh sửa giao dịch tài chính thủ công' })
  @ApiResponse({ status: 200, description: 'Cập nhật giao dịch thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giao dịch' })
  @ApiResponse({
    status: 422,
    description: 'Không thể chỉnh sửa giao dịch tự động',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    const data = await this.transactionsService.update(id, dto);
    return { data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa giao dịch tài chính thủ công' })
  @ApiResponse({ status: 200, description: 'Xóa giao dịch thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giao dịch' })
  @ApiResponse({
    status: 422,
    description: 'Không thể xóa giao dịch tự động',
  })
  async remove(@Param('id') id: string) {
    return this.transactionsService.remove(id);
  }
}
