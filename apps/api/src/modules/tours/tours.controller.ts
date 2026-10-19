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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ToursService } from './tours.service';
import {
  CreateTourDto,
  UpdateTourDto,
  QueryTourDto,
  CreateTourSlotDto,
  UpdateTourSlotDto,
  BatchCreateTourSlotsDto,
} from './tours.dto';

@ApiTags('tours')
@Controller('tours')
export class ToursController {
  constructor(@Inject(ToursService) private readonly toursService: ToursService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.SALES, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Danh sách tour (phân trang, tìm kiếm, lọc publish)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() query: QueryTourDto) {
    return this.toursService.findTours(query);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.SALES, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Chi tiết tour' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tour' })
  async findById(@Param('id') id: string) {
    const tour = await this.toursService.findTourById(id);
    return { data: tour };
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Tạo tour mới' })
  @ApiResponse({ status: 201, description: 'Tạo tour thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc slug trùng' })
  async create(@Body() dto: CreateTourDto, @CurrentUser() user: { id: string }) {
    const tour = await this.toursService.createTour(dto, user?.id);
    return { data: tour };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật tour' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tour' })
  async update(@Param('id') id: string, @Body() dto: UpdateTourDto) {
    const tour = await this.toursService.updateTour(id, dto);
    return { data: tour };
  }

  @Patch(':id/publish')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Publish tour' })
  @ApiResponse({ status: 200, description: 'Publish thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tour' })
  async publish(@Param('id') id: string) {
    const tour = await this.toursService.setTourPublished(id, true);
    return { data: tour };
  }

  @Patch(':id/unpublish')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Unpublish tour' })
  @ApiResponse({ status: 200, description: 'Unpublish thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tour' })
  async unpublish(@Param('id') id: string) {
    const tour = await this.toursService.setTourPublished(id, false);
    return { data: tour };
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Xóa tour' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 400, description: 'Không thể xóa tour đã có booking' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tour' })
  async remove(@Param('id') id: string) {
    return this.toursService.deleteTour(id);
  }

  // ==========================================
  // TOUR SLOTS SUB-ROUTES
  // ==========================================

  @Get(':id/slots')
  @Roles(Role.OWNER, Role.MANAGER, Role.SALES, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Danh sách slot của tour theo khoảng thời gian from/to' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách slot thành công' })
  async findSlots(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.toursService.findTourSlots(id, { from, to, page, pageSize });
  }

  @Post(':id/slots/bulk')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Tạo hàng loạt slot cho tour' })
  @ApiResponse({ status: 201, description: 'Tạo slot hàng loạt thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async batchCreateSlots(
    @Param('id') id: string,
    @Body() dto: BatchCreateTourSlotsDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.toursService.batchCreateSlots(id, dto, user?.id);
  }

  @Post(':id/slots')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Tạo một slot đơn cho tour' })
  @ApiResponse({ status: 201, description: 'Tạo slot thành công' })
  async createSlot(
    @Param('id') id: string,
    @Body() dto: CreateTourSlotDto,
    @CurrentUser() user: { id: string },
  ) {
    const slot = await this.toursService.createSlot(id, dto, user?.id);
    return { data: slot };
  }

  @Patch(':id/slots/:slotId')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật slot qua tour sub-route' })
  async updateSlotUnderTour(
    @Param('slotId') slotId: string,
    @Body() dto: UpdateTourSlotDto,
  ) {
    const slot = await this.toursService.updateSlot(slotId, dto);
    return { data: slot };
  }

  @Delete(':id/slots/:slotId')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Xóa slot qua tour sub-route' })
  async removeSlotUnderTour(@Param('slotId') slotId: string) {
    return this.toursService.deleteSlot(slotId);
  }
}
