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
import { PurchaseOrdersService } from './purchase-orders.service';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
  QueryPurchaseOrderDto,
  PayPurchaseOrderDto,
} from './purchase-orders.dto';

@ApiTags('purchase-orders')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(
    @Inject(PurchaseOrdersService)
    private readonly purchaseOrdersService: PurchaseOrdersService,
  ) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Danh sách đơn mua hàng (phân trang, lọc trạng thái & tìm kiếm)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() query: QueryPurchaseOrderDto) {
    return this.purchaseOrdersService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Chi tiết đơn mua hàng' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn mua hàng' })
  async findById(@Param('id') id: string) {
    const po = await this.purchaseOrdersService.findById(id);
    return { data: po };
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Tạo đơn mua hàng mới (trạng thái DRAFT)' })
  @ApiResponse({ status: 201, description: 'Tạo đơn mua hàng thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Nhà cung cấp hoặc mặt hàng không tồn tại' })
  async create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser('id') userId?: string) {
    const po = await this.purchaseOrdersService.create(dto, userId);
    return { data: po };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Cập nhật đơn mua hàng (chỉ khi DRAFT)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn mua hàng' })
  @ApiResponse({
    status: 422,
    description: 'Chỉ có thể chỉnh sửa đơn mua hàng ở trạng thái Nháp',
  })
  async update(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto) {
    const po = await this.purchaseOrdersService.update(id, dto);
    return { data: po };
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Xóa đơn mua hàng (chỉ khi DRAFT hoặc CANCELLED chưa nhận hàng)' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn mua hàng' })
  @ApiResponse({
    status: 422,
    description: 'Không thể xóa đơn mua hàng đang hoạt động hoặc đã nhận hàng',
  })
  async remove(@Param('id') id: string) {
    return this.purchaseOrdersService.remove(id);
  }

  @Post(':id/order')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Duyệt đặt hàng đơn mua (DRAFT -> ORDERED)' })
  @ApiResponse({ status: 200, description: 'Đặt hàng thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn mua hàng' })
  @ApiResponse({
    status: 422,
    description: 'Chỉ có thể đặt hàng đơn mua ở trạng thái Nháp',
  })
  async order(@Param('id') id: string) {
    const po = await this.purchaseOrdersService.order(id);
    return { data: po };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Hủy đơn mua hàng (khi DRAFT hoặc ORDERED chưa nhận gì)' })
  @ApiResponse({ status: 200, description: 'Hủy đơn mua hàng thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn mua hàng' })
  @ApiResponse({
    status: 422,
    description: 'Không thể hủy đơn mua hàng đã nhận hàng hoặc không đúng trạng thái',
  })
  async cancel(@Param('id') id: string) {
    const po = await this.purchaseOrdersService.cancel(id);
    return { data: po };
  }

  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Nhận hàng vào kho (chỉ OWNER và MANAGER)' })
  @ApiResponse({ status: 200, description: 'Nhận hàng thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn mua hoặc kho' })
  @ApiResponse({
    status: 422,
    description: 'Nhận hàng vượt số lượng hoặc trạng thái đơn không hợp lệ',
  })
  async receive(@Param('id') id: string, @Body() dto: ReceivePurchaseOrderDto) {
    const po = await this.purchaseOrdersService.receive(id, dto);
    return { data: po };
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.OWNER, Role.MANAGER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Thanh toán tiền cho đơn mua hàng' })
  @ApiResponse({ status: 200, description: 'Thanh toán thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn mua hàng' })
  @ApiResponse({
    status: 422,
    description: 'Thanh toán vượt giá trị đơn mua hoặc trạng thái không hợp lệ',
  })
  async pay(
    @Param('id') id: string,
    @Body() dto: PayPurchaseOrderDto,
    @CurrentUser('id') userId?: string,
  ) {
    const po = await this.purchaseOrdersService.pay(id, dto, userId);
    return { data: po };
  }
}
