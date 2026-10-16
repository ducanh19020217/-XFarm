import { Controller, Post, Body, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { PresignMediaDto, CreateMediaDto } from './media.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(@Inject(MediaService) private mediaService: MediaService) {}

  @Post('presign')
  @ApiOperation({ summary: 'Lấy URL presigned để tải lên tệp' })
  @ApiResponse({ status: 201, description: 'Lấy presigned URL thành công' })
  @ApiResponse({ status: 400, description: 'Định dạng hoặc kích thước tệp không hợp lệ' })
  async presign(@Body() dto: PresignMediaDto) {
    const result = await this.mediaService.getPresignedUrl(dto);
    return { data: result };
  }

  @Post()
  @ApiOperation({ summary: 'Lưu thông tin tệp sau khi đã tải lên thành công' })
  @ApiResponse({ status: 201, description: 'Lưu thông tin tệp thành công' })
  async create(@Body() dto: CreateMediaDto, @CurrentUser('id') userId: string) {
    const media = await this.mediaService.create(dto, userId);
    return { data: media };
  }
}
