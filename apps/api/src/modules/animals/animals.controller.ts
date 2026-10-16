import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@xfarm/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateAnimalDto,
  CreateAnimalEventDto,
  QueryAnimalDto,
  QueryAnimalEventDto,
  UpdateAnimalDto,
} from './animals.dto';
import { AnimalsService } from './animals.service';

@ApiTags('animals')
@Controller('animals')
export class AnimalsController {
  constructor(private readonly animalsService: AnimalsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách cá thể vật nuôi (phân trang & lọc)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() query: QueryAnimalDto) {
    return this.animalsService.findAnimals(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết vật nuôi kèm mẹ, con và sự kiện' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vật nuôi' })
  async findById(@Param('id') id: string) {
    const animal = await this.animalsService.findAnimalById(id);
    return { data: animal };
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Tạo cá thể vật nuôi mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @ApiResponse({ status: 409, description: 'Mã tai/thẻ đã tồn tại' })
  @ApiResponse({ status: 422, description: 'Mẹ không phải con cái hoặc dữ liệu không hợp lệ' })
  async create(@Body() dto: CreateAnimalDto, @CurrentUser('id') userId: string) {
    const animal = await this.animalsService.createAnimal(dto, userId);
    return { data: animal };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật thông tin vật nuôi' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vật nuôi' })
  async update(@Param('id') id: string, @Body() dto: UpdateAnimalDto) {
    const animal = await this.animalsService.updateAnimal(id, dto);
    return { data: animal };
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Lịch sử sự kiện của vật nuôi' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách sự kiện thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vật nuôi' })
  async findEvents(@Param('id') id: string, @Query() query: QueryAnimalEventDto) {
    return this.animalsService.findAnimalEvents(id, query);
  }

  @Post(':id/events')
  @Roles(Role.OWNER, Role.MANAGER, Role.WORKER)
  @ApiOperation({ summary: 'Ghi nhận sự kiện cho vật nuôi' })
  @ApiResponse({ status: 201, description: 'Ghi nhận sự kiện thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền thực hiện thao tác' })
  @ApiResponse({ status: 422, description: 'Vật nuôi đã chết/bán không thể ghi sự kiện' })
  async createEvent(
    @Param('id') id: string,
    @Body() dto: CreateAnimalEventDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const event = await this.animalsService.createAnimalEvent(id, dto, user);
    return { data: event };
  }
}
