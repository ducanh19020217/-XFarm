import { Controller, Get, Param, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CmsService } from './cms.service';
import { PublicQueryProductDto, PublicQueryPostDto } from './cms.dto';

@ApiTags('public')
@Controller('public')
@Public()
export class PublicCmsController {
  constructor(@Inject(CmsService) private readonly cmsService: CmsService) {}

  @Get('products')
  @ApiOperation({
    summary: 'Danh sách sản phẩm public (đã publish, sắp theo sortOrder, có giá, đơn vị, ảnh)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getProducts(@Query() query: PublicQueryProductDto) {
    return this.cmsService.findPublicProducts(query);
  }

  @Get('products/:slug')
  @ApiOperation({
    summary:
      'Chi tiết sản phẩm public kèm trạng thái còn hàng (inStock: boolean, không lộ giá vốn/số tồn)',
  })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  async getProductBySlug(@Param('slug') slug: string) {
    const product = await this.cmsService.findPublicProductBySlug(slug);
    return { data: product };
  }

  @Get('posts')
  @ApiOperation({ summary: 'Danh sách bài viết public (PUBLISHED, phân trang)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getPosts(@Query() query: PublicQueryPostDto) {
    return this.cmsService.findPublicPosts(query);
  }

  @Get('posts/:slug')
  @ApiOperation({ summary: 'Chi tiết bài viết public' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết' })
  async getPostBySlug(@Param('slug') slug: string) {
    const post = await this.cmsService.findPublicPostBySlug(slug);
    return { data: post };
  }

  @Get('pages/:slug')
  @ApiOperation({ summary: 'Nội dung trang tĩnh public theo slug' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết trang thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy trang' })
  async getPageBySlug(@Param('slug') slug: string) {
    const page = await this.cmsService.findPublicPageBySlug(slug);
    return { data: page };
  }

  @Get('site-settings')
  @ApiOperation({
    summary: 'Cấu hình website public (chỉ các key trong PUBLIC_SITE_SETTING_KEYS)',
  })
  @ApiResponse({ status: 200, description: 'Lấy cấu hình thành công' })
  async getSiteSettings() {
    const settings = await this.cmsService.findPublicSiteSettings();
    return { data: settings };
  }
}
