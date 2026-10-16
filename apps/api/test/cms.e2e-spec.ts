import * as path from 'path';
import * as dotenv from 'dotenv';

const rootEnvPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnvPath });

const testDbUrl =
  process.env.DATABASE_URL_TEST ||
  'postgresql://xfarm:xfarm_secret@localhost:5442/xfarm_test?schema=public';

process.env.DATABASE_URL = testDbUrl;
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import * as argon2 from 'argon2';
import { prisma, StockMoveType, ItemCategory } from '@xfarm/db';
import { PUBLIC_SITE_SETTING_KEYS } from '@xfarm/shared';
import { AppModule } from '../src/app.module';
import { cleanupDatabase } from './helpers/cleanup';

describe('CMS API E2E Tests (Admin & Public)', () => {
  let app: INestApplication;
  let ownerCookies: string[];
  let managerCookies: string[];
  let salesCookies: string[];
  let workerCookies: string[];
  let warehouseId: string;
  let sellableItemId: string;
  let nonSellableItemId: string;

  beforeAll(async () => {
    await cleanupDatabase(prisma);

    const passwordHash = await argon2.hash('Admin@123');

    // Create users
    await prisma.user.create({
      data: {
        email: 'cms_owner@xfarm.local',
        passwordHash,
        fullName: 'CMS Owner',
        role: 'OWNER',
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        email: 'cms_manager@xfarm.local',
        passwordHash,
        fullName: 'CMS Manager',
        role: 'MANAGER',
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        email: 'cms_sales@xfarm.local',
        passwordHash,
        fullName: 'CMS Sales',
        role: 'SALES',
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        email: 'cms_worker@xfarm.local',
        passwordHash,
        fullName: 'CMS Worker',
        role: 'WORKER',
        isActive: true,
      },
    });

    // Create warehouse
    const wh = await prisma.warehouse.create({
      data: {
        code: 'WH-CMS-1',
        name: 'Kho Thành Phẩm CMS',
      },
    });
    warehouseId = wh.id;

    // Create Items
    const sellableItem = await prisma.item.create({
      data: {
        sku: 'ITEM-SELL-1',
        name: 'Rau Muống Hữu Cơ',
        category: ItemCategory.PRODUCE,
        unit: 'kg',
        isSellable: true,
        isActive: true,
      },
    });
    sellableItemId = sellableItem.id;

    const nonSellableItem = await prisma.item.create({
      data: {
        sku: 'ITEM-NONSELL-1',
        name: 'Phân Bón NPK',
        category: ItemCategory.FERTILIZER,
        unit: 'bao',
        isSellable: false,
        isActive: true,
      },
    });
    nonSellableItemId = nonSellableItem.id;

    // Init Nest Application
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();

    // Logins
    async function getCookies(email: string) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Admin@123' });
      const raw = res.headers['set-cookie'];
      return Array.isArray(raw) ? raw : [raw];
    }

    ownerCookies = await getCookies('cms_owner@xfarm.local');
    managerCookies = await getCookies('cms_manager@xfarm.local');
    salesCookies = await getCookies('cms_sales@xfarm.local');
    workerCookies = await getCookies('cms_worker@xfarm.local');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await cleanupDatabase(prisma);
  });

  // =========================================================================
  // 1. PRODUCTS
  // =========================================================================
  describe('Product Management (Admin & Public)', () => {
    it('Product: itemId phải là item isSellable (chặn item non-sellable)', async () => {
      // 1. Non-existent itemId -> 404
      const res404 = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Sản phẩm lỗi',
          itemId: 'non-existent-id',
          description: 'Mô tả',
          price: 50000,
          unit: 'kg',
        });
      expect(res404.status).toBe(404);

      // 2. Non-sellable itemId -> 400
      const res400 = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Sản phẩm lỗi sellable',
          itemId: nonSellableItemId,
          description: 'Mô tả',
          price: 50000,
          unit: 'kg',
        });
      expect(res400.status).toBe(400);
      expect(res400.body.message).toContain('isSellable');
    });

    it('Slug tự sinh từ tên bằng slugify; trùng thì thêm hậu tố -2, -3', async () => {
      // First product
      const res1 = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Cà chua bi',
          itemId: sellableItemId,
          description: '<p>Cà chua bi ngọt mát</p>',
          price: 45000,
          unit: 'hộp',
          isPublished: true,
        });
      expect(res1.status).toBe(201);
      expect(res1.body.data.slug).toBe('ca-chua-bi');

      // Second product with identical name
      const res2 = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Cà chua bi',
          itemId: sellableItemId,
          description: '<p>Cà chua bi đợt 2</p>',
          price: 45000,
          unit: 'hộp',
          isPublished: true,
        });
      expect(res2.status).toBe(201);
      expect(res2.body.data.slug).toBe('ca-chua-bi-2');

      // Third product with identical name
      const res3 = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Cà chua bi',
          itemId: sellableItemId,
          description: '<p>Cà chua bi đợt 3</p>',
          price: 45000,
          unit: 'hộp',
          isPublished: true,
        });
      expect(res3.status).toBe(201);
      expect(res3.body.data.slug).toBe('ca-chua-bi-3');
    });

    it('HTML chứa <script> hoặc onerror bị loại bỏ khi lưu Product', async () => {
      const maliciousHtml =
        '<p>Rau sạch chất lượng cao</p><script>alert("hacked")</script><img src="x" onerror="alert(1)" /><a href="javascript:alert(2)">Xem chi tiết</a>';

      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Rau XSS Test',
          itemId: sellableItemId,
          description: maliciousHtml,
          price: 25000,
          unit: 'kg',
          isPublished: true,
        });
      expect(res.status).toBe(201);
      const desc = res.body.data.description;
      expect(desc).not.toContain('<script>');
      expect(desc).not.toContain('alert("hacked")');
      expect(desc).not.toContain('onerror');
      expect(desc).not.toContain('javascript:');
      expect(desc).toContain('<p>Rau sạch chất lượng cao</p>');
    });

    it('Draft không lộ ra ở public: Product isPublished=false không xuất hiện ở /public/products', async () => {
      // Create a draft product
      const draftRes = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Sản phẩm Nháp Bí Mật',
          itemId: sellableItemId,
          description: '<p>Chưa mở bán</p>',
          price: 99000,
          unit: 'kg',
          isPublished: false,
        });
      expect(draftRes.status).toBe(201);
      const draftSlug = draftRes.body.data.slug;

      // GET /public/products list
      const listRes = await request(app.getHttpServer()).get('/api/v1/public/products');
      expect(listRes.status).toBe(200);
      const slugs = (listRes.body.data as Array<{ slug: string }>).map((p) => p.slug);
      expect(slugs).not.toContain(draftSlug);

      // GET /public/products/:slug directly -> 404
      const detailRes = await request(app.getHttpServer()).get(
        `/api/v1/public/products/${draftSlug}`,
      );
      expect(detailRes.status).toBe(404);
    });

    it('/public/products/:slug kèm inStock: boolean, KHÔNG trả số tồn chi tiết hay giá vốn', async () => {
      // 1. Product with 0 inventory -> inStock = false
      const prodRes = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Dưa leo baby',
          itemId: sellableItemId,
          description: '<p>Dưa leo baby giòn ngọt</p>',
          price: 30000,
          unit: 'kg',
          isPublished: true,
        });
      expect(prodRes.status).toBe(201);
      const slug = prodRes.body.data.slug;

      const pubRes1 = await request(app.getHttpServer()).get(`/api/v1/public/products/${slug}`);
      expect(pubRes1.status).toBe(200);
      expect(pubRes1.body.data.slug).toBe(slug);
      expect(pubRes1.body.data.inStock).toBe(false);

      // Verify no sensitive fields leaked
      expect(pubRes1.body.data.itemId).toBeUndefined();
      expect(pubRes1.body.data.createdById).toBeUndefined();
      expect(pubRes1.body.data.createdBy).toBeUndefined();
      expect(pubRes1.body.data.cost).toBeUndefined();
      expect(pubRes1.body.data.unitCost).toBeUndefined();
      expect(pubRes1.body.data.onHand).toBeUndefined();

      // 2. Add stock via IN move
      await prisma.stockMove.create({
        data: {
          type: StockMoveType.IN,
          itemId: sellableItemId,
          toWarehouseId: warehouseId,
          quantity: 100,
          unitCost: 15000,
          movedAt: new Date(),
          notes: 'Nhập kho phục vụ bán hàng',
        },
      });

      const pubRes2 = await request(app.getHttpServer()).get(`/api/v1/public/products/${slug}`);
      expect(pubRes2.status).toBe(200);
      expect(pubRes2.body.data.inStock).toBe(true);
      expect(pubRes2.body.data.onHand).toBeUndefined();
      expect(pubRes2.body.data.unitCost).toBeUndefined();
    });

    it('SALES được sửa products (create, update, delete)', async () => {
      // Sales creates product
      const resCreate = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Cookie', salesCookies)
        .send({
          name: 'Xà lách Romaine',
          itemId: sellableItemId,
          description: '<p>Xà lách tươi</p>',
          price: 35000,
          unit: 'gói',
          isPublished: true,
        });
      expect(resCreate.status).toBe(201);
      const productId = resCreate.body.data.id;

      // Sales updates product
      const resUpdate = await request(app.getHttpServer())
        .patch(`/api/v1/products/${productId}`)
        .set('Cookie', salesCookies)
        .send({
          price: 38000,
        });
      expect(resUpdate.status).toBe(200);
      expect(resUpdate.body.data.price).toBe('38000');

      // Sales deletes product
      const resDelete = await request(app.getHttpServer())
        .delete(`/api/v1/products/${productId}`)
        .set('Cookie', salesCookies);
      expect(resDelete.status).toBe(200);
    });

    it('WORKER không được sửa product (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Cookie', workerCookies)
        .send({
          name: 'Thử nghiệm Worker',
          itemId: sellableItemId,
          description: '<p>Worker tạo</p>',
          price: 20000,
          unit: 'kg',
        });
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 2. POSTS
  // =========================================================================
  describe('Post Management (Admin & Public)', () => {
    it('Slug tự sinh từ tiêu đề bằng slugify; trùng thì thêm hậu tố -2', async () => {
      const res1 = await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Cookie', ownerCookies)
        .send({
          title: 'Kỹ thuật nuôi cá tự nhiên',
          excerpt: 'Cách nuôi cá không hóa chất',
          content: '<p>Chi tiết kỹ thuật nuôi cá</p>',
          status: 'PUBLISHED',
        });
      expect(res1.status).toBe(201);
      expect(res1.body.data.slug).toBe('ky-thuat-nuoi-ca-tu-nhien');

      const res2 = await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Cookie', ownerCookies)
        .send({
          title: 'Kỹ thuật nuôi cá tự nhiên',
          excerpt: 'Bài viết phần 2',
          content: '<p>Phần 2 kỹ thuật nuôi cá</p>',
          status: 'PUBLISHED',
        });
      expect(res2.status).toBe(201);
      expect(res2.body.data.slug).toBe('ky-thuat-nuoi-ca-tu-nhien-2');
    });

    it('Post: chuyển sang PUBLISHED thì set publishedAt nếu trống', async () => {
      // 1. Create draft without publishedAt
      const resDraft = await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Cookie', ownerCookies)
        .send({
          title: 'Bài viết nháp chưa công bố',
          excerpt: 'Bản nháp ban đầu',
          content: '<p>Nội dung bản thảo</p>',
          status: 'DRAFT',
        });
      expect(resDraft.status).toBe(201);
      expect(resDraft.body.data.status).toBe('DRAFT');
      expect(resDraft.body.data.publishedAt).toBeNull();

      const postId = resDraft.body.data.id;

      // 2. Update to PUBLISHED without sending publishedAt
      const resPublish = await request(app.getHttpServer())
        .patch(`/api/v1/posts/${postId}`)
        .set('Cookie', ownerCookies)
        .send({
          status: 'PUBLISHED',
        });
      expect(resPublish.status).toBe(200);
      expect(resPublish.body.data.status).toBe('PUBLISHED');
      expect(resPublish.body.data.publishedAt).not.toBeNull();
      expect(new Date(resPublish.body.data.publishedAt).getTime()).toBeLessThanOrEqual(
        Date.now() + 5000,
      );
    });

    it('HTML chứa <script> hoặc onerror bị loại bỏ khi lưu Post', async () => {
      const maliciousHtml =
        '<p>Nội dung bài viết bổ ích</p><script>alert("xss post")</script><img src="x" onerror="alert(2)" />';

      const res = await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Cookie', ownerCookies)
        .send({
          title: 'Bài viết kiểm tra bảo mật',
          excerpt: 'Tóm tắt bài viết an toàn',
          content: maliciousHtml,
          status: 'PUBLISHED',
        });
      expect(res.status).toBe(201);
      const content = res.body.data.content;
      expect(content).not.toContain('<script>');
      expect(content).not.toContain('onerror');
      expect(content).toContain('<p>Nội dung bài viết bổ ích</p>');
    });

    it('Draft không lộ ra ở public: Post status=DRAFT không xuất hiện ở /public/posts', async () => {
      // Create draft post
      const res = await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Cookie', ownerCookies)
        .send({
          title: 'Bài viết nháp riêng tư',
          excerpt: 'Không ai được thấy ngoài admin',
          content: '<p>Nội dung kín</p>',
          status: 'DRAFT',
        });
      expect(res.status).toBe(201);
      const draftSlug = res.body.data.slug;

      // Public list check
      const pubList = await request(app.getHttpServer()).get('/api/v1/public/posts');
      expect(pubList.status).toBe(200);
      const slugs = (pubList.body.data as Array<{ slug: string }>).map((p) => p.slug);
      expect(slugs).not.toContain(draftSlug);

      // Public detail check -> 404
      const pubDetail = await request(app.getHttpServer()).get(`/api/v1/public/posts/${draftSlug}`);
      expect(pubDetail.status).toBe(404);
    });

    it('Public post không lộ tên nhân viên, email, hay createdById', async () => {
      const resCreate = await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Cookie', ownerCookies)
        .send({
          title: 'Mùa thu hoạch lúa',
          excerpt: 'Vụ lúa rộn ràng',
          content: '<p>Chi tiết vụ thu hoạch lúa</p>',
          status: 'PUBLISHED',
        });
      expect(resCreate.status).toBe(201);
      const slug = resCreate.body.data.slug;

      const pubRes = await request(app.getHttpServer()).get(`/api/v1/public/posts/${slug}`);
      expect(pubRes.status).toBe(200);
      expect(pubRes.body.data.title).toBe('Mùa thu hoạch lúa');
      expect(pubRes.body.data.createdById).toBeUndefined();
      expect(pubRes.body.data.createdBy).toBeUndefined();
      expect(pubRes.body.data.author).toBeUndefined();
      expect(pubRes.body.data.email).toBeUndefined();
    });

    it('SALES được sửa posts (create, update, delete)', async () => {
      const resCreate = await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Cookie', salesCookies)
        .send({
          title: 'Tin khuyến mãi từ Sales',
          excerpt: 'Chương trình ưu đãi nông sản',
          content: '<p>Ưu đãi 10% tuần này</p>',
          status: 'PUBLISHED',
        });
      expect(resCreate.status).toBe(201);
      const postId = resCreate.body.data.id;

      const resUpdate = await request(app.getHttpServer())
        .patch(`/api/v1/posts/${postId}`)
        .set('Cookie', salesCookies)
        .send({
          title: 'Tin khuyến mãi lớn từ Sales',
        });
      expect(resUpdate.status).toBe(200);
      expect(resUpdate.body.data.title).toBe('Tin khuyến mãi lớn từ Sales');

      const resDelete = await request(app.getHttpServer())
        .delete(`/api/v1/posts/${postId}`)
        .set('Cookie', salesCookies);
      expect(resDelete.status).toBe(200);
    });

    it('WORKER không được sửa post (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Cookie', workerCookies)
        .send({
          title: 'Thử nghiệm Worker Post',
          excerpt: 'Tóm tắt',
          content: '<p>Nội dung</p>',
        });
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 3. PAGES
  // =========================================================================
  describe('Page Management (Admin & Public)', () => {
    let testPageId: string;
    let testPageSlug: string;

    it('OWNER tạo trang thành công, tự sinh slug và sanitize HTML', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/pages')
        .set('Cookie', ownerCookies)
        .send({
          title: 'Chính sách bảo mật thông tin',
          content:
            '<h2>Chính sách</h2><p>Cam kết bảo mật</p><script>alert("page xss")</script><img src="x" onerror="bad()" />',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.slug).toBe('chinh-sach-bao-mat-thong-tin');
      expect(res.body.data.content).not.toContain('<script>');
      expect(res.body.data.content).not.toContain('onerror');
      expect(res.body.data.content).toContain('<h2>Chính sách</h2>');

      testPageId = res.body.data.id;
      testPageSlug = res.body.data.slug;
    });

    it('MANAGER cũng có quyền sửa trang', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/pages/${testPageId}`)
        .set('Cookie', managerCookies)
        .send({
          title: 'Chính sách bảo mật cập nhật bởi Manager',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Chính sách bảo mật cập nhật bởi Manager');
    });

    it('Slug trùng thì có hậu tố -2 cho Page', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/pages')
        .set('Cookie', ownerCookies)
        .send({
          title: 'Chính sách bảo mật thông tin',
          content: '<p>Trang trùng tên</p>',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.slug).toBe('chinh-sach-bao-mat-thong-tin-2');
    });

    it('GET /public/pages/:slug trả đúng nội dung và không lộ createdById', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/public/pages/${testPageSlug}`);
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Chính sách bảo mật cập nhật bởi Manager');
      expect(res.body.data.content).toContain('Cam kết bảo mật');
      expect(res.body.data.createdById).toBeUndefined();
      expect(res.body.data.createdBy).toBeUndefined();
    });

    it('SALES sửa page thì 403 (CRITICAL E2E REQUIREMENT)', async () => {
      // 1. SALES creates page -> 403
      const resCreate = await request(app.getHttpServer())
        .post('/api/v1/pages')
        .set('Cookie', salesCookies)
        .send({
          title: 'Trang của Sales',
          content: '<p>Sales tạo</p>',
        });
      expect(resCreate.status).toBe(403);

      // 2. SALES updates page -> 403
      const resUpdate = await request(app.getHttpServer())
        .patch(`/api/v1/pages/${testPageId}`)
        .set('Cookie', salesCookies)
        .send({
          title: 'Sales cố tình sửa',
        });
      expect(resUpdate.status).toBe(403);

      // 3. SALES deletes page -> 403
      const resDelete = await request(app.getHttpServer())
        .delete(`/api/v1/pages/${testPageId}`)
        .set('Cookie', salesCookies);
      expect(resDelete.status).toBe(403);
    });
  });

  // =========================================================================
  // 4. SITE SETTINGS
  // =========================================================================
  describe('Site Settings (Admin & Public)', () => {
    it('SiteSetting: PUT /site-settings/:key, value validate theo key', async () => {
      // 1. Invalid email
      const resBadEmail = await request(app.getHttpServer())
        .put('/api/v1/site-settings/contact.email')
        .set('Cookie', ownerCookies)
        .send({ value: 'invalid-email-address' });
      expect(resBadEmail.status).toBe(400);

      // 2. Valid email
      const resGoodEmail = await request(app.getHttpServer())
        .put('/api/v1/site-settings/contact.email')
        .set('Cookie', ownerCookies)
        .send({ value: 'lienhe@xfarm.local' });
      expect(resGoodEmail.status).toBe(200);
      expect(resGoodEmail.body.data.value).toBe('lienhe@xfarm.local');

      // 3. Invalid vietqr shape
      const resBadQr = await request(app.getHttpServer())
        .put('/api/v1/site-settings/bank.vietqr')
        .set('Cookie', ownerCookies)
        .send({ value: { bank: 'VCB' } }); // missing accountNumber and accountName
      expect(resBadQr.status).toBe(400);

      // 4. Valid vietqr shape
      const resGoodQr = await request(app.getHttpServer())
        .put('/api/v1/site-settings/bank.vietqr')
        .set('Cookie', ownerCookies)
        .send({
          value: {
            bank: 'MBBank',
            accountNumber: '999988887777',
            accountName: 'CONG TY CP NONG NGHIEP XFARM',
          },
        });
      expect(resGoodQr.status).toBe(200);
      expect(resGoodQr.body.data.value.bank).toBe('MBBank');

      // 5. Invalid banners (string instead of array)
      const resBadBanners = await request(app.getHttpServer())
        .put('/api/v1/site-settings/home.banners')
        .set('Cookie', ownerCookies)
        .send({ value: 'banner-single.jpg' });
      expect(resBadBanners.status).toBe(400);

      // 6. Valid banners
      const resGoodBanners = await request(app.getHttpServer())
        .put('/api/v1/site-settings/home.banners')
        .set('Cookie', ownerCookies)
        .send({ value: ['/banner-1.jpg', '/banner-2.jpg'] });
      expect(resGoodBanners.status).toBe(200);
      expect(resGoodBanners.body.data.value).toEqual(['/banner-1.jpg', '/banner-2.jpg']);
    });

    it('site-settings public không trả key ngoài whitelist (CRITICAL E2E REQUIREMENT)', async () => {
      // Set public settings
      await request(app.getHttpServer())
        .put('/api/v1/site-settings/farm.name')
        .set('Cookie', ownerCookies)
        .send({ value: 'XFarm Eco Farm' });

      await request(app.getHttpServer())
        .put('/api/v1/site-settings/contact.phone')
        .set('Cookie', ownerCookies)
        .send({ value: '0987654321' });

      // Directly insert secret internal settings into DB
      await prisma.siteSetting.upsert({
        where: { key: 'secret.stripe_secret_key' },
        update: { value: 'sk_live_very_secret_key' },
        create: { key: 'secret.stripe_secret_key', value: 'sk_live_very_secret_key' },
      });
      await prisma.siteSetting.upsert({
        where: { key: 'internal.admin_notes' },
        update: { value: 'Ghi chú mật' },
        create: { key: 'internal.admin_notes', value: 'Ghi chú mật' },
      });

      // GET /public/site-settings
      const res = await request(app.getHttpServer()).get('/api/v1/public/site-settings');
      expect(res.status).toBe(200);

      // Verify public keys exist
      expect(res.body.data['farm.name']).toBe('XFarm Eco Farm');
      expect(res.body.data['contact.phone']).toBe('0987654321');

      // Verify non-whitelisted keys NEVER leak
      expect(res.body.data['secret.stripe_secret_key']).toBeUndefined();
      expect(res.body.data['internal.admin_notes']).toBeUndefined();

      // Ensure every single key returned is in PUBLIC_SITE_SETTING_KEYS
      const returnedKeys = Object.keys(res.body.data);
      for (const k of returnedKeys) {
        expect(PUBLIC_SITE_SETTING_KEYS).toContain(k as (typeof PUBLIC_SITE_SETTING_KEYS)[number]);
      }
    });

    it('SALES không được sửa site-settings (403)', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/v1/site-settings/farm.name')
        .set('Cookie', salesCookies)
        .send({ value: 'Tên mới do Sales đặt' });
      expect(res.status).toBe(403);
    });
  });
});
