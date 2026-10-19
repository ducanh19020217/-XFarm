import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { ToursService } from './tours.service';
import { UpdateTourSlotDto } from './tours.dto';

@ApiTags('tour-slots')
@Controller('tour-slots')
export class TourSlotsController {
  constructor(@Inject(ToursService) private readonly toursService: ToursService) {}

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.SALES, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Chi tiết tour slot' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy slot' })
  async findById(@Param('id') id: string) {
    const slot = await this.toursService.findSlotById(id);
    return { data: slot };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật slot (sức chứa, tắt/bật slot; capacity < bookedCount -> 422)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy slot' })
  @ApiResponse({ status: 422, description: 'Sức chứa không được nhỏ hơn số lượng vé đã đặt' })
  async update(@Param('id') id: string, @Body() dto: UpdateTourSlotDto) {
    const slot = await this.toursService.updateSlot(id, dto);
    return { data: slot };
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Xóa slot (chỉ khi chưa có booking)' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 400, description: 'Không thể xóa slot đã có lượt đặt chỗ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy slot' })
  async remove(@Param('id') id: string) {
    return this.toursService.deleteSlot(id);
  }
}
