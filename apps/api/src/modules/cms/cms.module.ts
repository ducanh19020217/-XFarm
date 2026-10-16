import { Module } from '@nestjs/common';
import { CmsService } from './cms.service';
import { ProductsController } from './products.controller';
import { PostsController } from './posts.controller';
import { PagesController } from './pages.controller';
import { SiteSettingsController } from './site-settings.controller';
import { PublicCmsController } from './public-cms.controller';

@Module({
  controllers: [
    ProductsController,
    PostsController,
    PagesController,
    SiteSettingsController,
    PublicCmsController,
  ],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}
