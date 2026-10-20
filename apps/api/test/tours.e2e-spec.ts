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
import { prisma } from '@xfarm/db';
import { AppModule } from '../src/app.module';
import { cleanupDatabase } from './helpers/cleanup';

describe('Tours and Tour Slots API E2E Tests (Admin & Public)', () => {
  let app: INestApplication;
  let ownerCookies: string[];
  let managerCookies: string[];
  let salesCookies: string[];
  let workerCookies: string[];

  beforeAll(async () => {
    await cleanupDatabase(prisma);

    const passwordHash = await argon2.hash('Admin@123');

    // Create users for RBAC testing
    await prisma.user.create({
      data: {
        email: 'tour_owner@xfarm.local',
        passwordHash,
        fullName: 'Tour Owner',
        role: 'OWNER',
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        email: 'tour_manager@xfarm.local',
        passwordHash,
        fullName: 'Tour Manager',
        role: 'MANAGER',
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        email: 'tour_sales@xfarm.local',
        passwordHash,
        fullName: 'Tour Sales',
        role: 'SALES',
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        email: 'tour_worker@xfarm.local',
        passwordHash,
        fullName: 'Tour Worker',
        role: 'WORKER',
        isActive: true,
      },
    });

    // Init Nest Application
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();

    async function getCookies(email: string) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Admin@123' });
      const raw = res.headers['set-cookie'];
      return Array.isArray(raw) ? raw : [raw];
    }

    ownerCookies = await getCookies('tour_owner@xfarm.local');
    managerCookies = await getCookies('tour_manager@xfarm.local');
    salesCookies = await getCookies('tour_sales@xfarm.local');
    workerCookies = await getCookies('tour_worker@xfarm.local');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await cleanupDatabase(prisma);
  });

  // =========================================================================
  // 1. TOURS CRUD & PUBLISH / UNPUBLISH
  // =========================================================================
  describe('Tour CRUD & Slug Generation', () => {
    let createdTourId: string;
    let autoSlug: string;

    it('Tạo tour thành công và tự sinh slug từ tên khi để trống slug', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tours')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Tour Trải Nghiệm Làm Nông Dân',
          description: '<p>Trải nghiệm trồng rau và chăm sóc gia súc 1 ngày</p>',
          durationMinutes: 180,
          priceAdult: 250000,
          priceChild: 120000,
          capacity: 30,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Tour Trải Nghiệm Làm Nông Dân');
      expect(res.body.data.slug).toContain('tour-trai-nghiem-lam-nong-dan');
      expect(res.body.data.isPublished).toBe(false);

      createdTourId = res.body.data.id;
      autoSlug = res.body.data.slug;
    });

    it('Tạo tour thứ hai cùng tên sẽ tự sinh slug có hậu tố tránh trùng', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tours')
        .set('Cookie', managerCookies)
        .send({
          name: 'Tour Trải Nghiệm Làm Nông Dân',
          description: '<p>Tour ca 2</p>',
          durationMinutes: 120,
          priceAdult: 200000,
          priceChild: 100000,
          capacity: 25,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.slug).toBe(`${autoSlug}-1`);
    });

    it('Tạo tour chỉ định slug đã tồn tại bị báo lỗi 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tours')
        .set('Cookie', ownerCookies)
        .send({
          slug: autoSlug,
          name: 'Tour Trùng Slug',
          description: 'Mô tả',
          durationMinutes: 60,
          priceAdult: 100000,
          priceChild: 50000,
          capacity: 20,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Slug đã tồn tại');
    });

    it('WORKER không có quyền tạo tour (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tours')
        .set('Cookie', workerCookies)
        .send({
          name: 'Tour Của Worker',
          description: 'Mô tả',
          durationMinutes: 60,
          priceAdult: 100000,
          priceChild: 50000,
          capacity: 20,
        });

      expect(res.status).toBe(403);
    });

    it('Lấy danh sách tour có phân trang và tìm kiếm', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tours?search=Nông Dân')
        .set('Cookie', salesCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('Lấy chi tiết tour theo id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tours/${createdTourId}`)
        .set('Cookie', salesCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdTourId);
    });

    it('Cập nhật thông tin tour', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tours/${createdTourId}`)
        .set('Cookie', ownerCookies)
        .send({
          priceAdult: 280000,
          capacity: 35,
        });

      expect(res.status).toBe(200);
      expect(Number(res.body.data.priceAdult)).toBe(280000);
      expect(res.body.data.capacity).toBe(35);
    });

    it('Publish và unpublish tour', async () => {
      const pubRes = await request(app.getHttpServer())
        .patch(`/api/v1/tours/${createdTourId}/publish`)
        .set('Cookie', ownerCookies);

      expect(pubRes.status).toBe(200);
      expect(pubRes.body.data.isPublished).toBe(true);

      const unpubRes = await request(app.getHttpServer())
        .patch(`/api/v1/tours/${createdTourId}/unpublish`)
        .set('Cookie', managerCookies);

      expect(unpubRes.status).toBe(200);
      expect(unpubRes.body.data.isPublished).toBe(false);
    });
  });

  // =========================================================================
  // 2. TOUR SLOTS: BULK CREATION & TIMEZONE & DUPLICATES
  // =========================================================================
  describe('Tour Slots: Bulk Creation & Timezone', () => {
    let testTourId: string;

    beforeAll(async () => {
      const tour = await prisma.tour.create({
        data: {
          slug: 'tour-bulk-slot-test',
          name: 'Tour Test Bulk Slot',
          description: 'Mô tả test',
          durationMinutes: 120,
          priceAdult: 200000,
          priceChild: 100000,
          capacity: 25,
          isPublished: true,
        },
      });
      testTourId = tour.id;
    });

    it('bulk T7+CN 08:00,14:00 trong 3 tháng ra đúng số slot và gọi lại không nhân đôi', async () => {
      // 2026-11-01 (CN) đến 2027-01-31 (CN) = 3 tháng = 92 ngày = 27 ngày T7/CN
      // 27 ngày * 2 khung giờ (08:00 và 14:00) = 54 slot
      const bulkPayload = {
        from: '2026-11-01',
        to: '2027-01-31',
        weekdays: [0, 6], // Chủ Nhật (0) và Thứ Bảy (6)
        times: ['08:00', '14:00'],
      };

      // Lần gọi 1: Tạo mới 54 slot
      const firstRes = await request(app.getHttpServer())
        .post(`/api/v1/tours/${testTourId}/slots/bulk`)
        .set('Cookie', ownerCookies)
        .send(bulkPayload);

      expect(firstRes.status).toBe(201);
      expect(firstRes.body.created).toBe(54);
      expect(firstRes.body.skipped).toBe(0);

      // Kiểm tra trong DB
      const dbSlotsCount1 = await prisma.tourSlot.count({
        where: { tourId: testTourId },
      });
      expect(dbSlotsCount1).toBe(54);

      // Kiểm tra slot đầu tiên đúng giờ VN: 2026-11-01 08:00 VN = 2026-11-01T01:00:00.000Z
      const firstSlot = await prisma.tourSlot.findFirst({
        where: { tourId: testTourId },
        orderBy: { startAt: 'asc' },
      });
      expect(firstSlot).toBeDefined();
      expect(firstSlot!.startAt.toISOString()).toBe('2026-11-01T01:00:00.000Z');

      // Lần gọi 2: Gọi lại với cùng payload không nhân đôi, trả {created: 0, skipped: 54}
      const secondRes = await request(app.getHttpServer())
        .post(`/api/v1/tours/${testTourId}/slots/bulk`)
        .set('Cookie', ownerCookies)
        .send(bulkPayload);

      expect(secondRes.status).toBe(201);
      expect(secondRes.body.created).toBe(0);
      expect(secondRes.body.skipped).toBe(54);

      // Số lượng slot trong DB vẫn là 54, không bị nhân đôi
      const dbSlotsCount2 = await prisma.tourSlot.count({
        where: { tourId: testTourId },
      });
      expect(dbSlotsCount2).toBe(54);
    });

    it('GET /tours/:id/slots?from&to lọc theo khoảng ngày', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tours/${testTourId}/slots?from=2026-11-01&to=2026-11-08`)
        .set('Cookie', salesCookies);

      expect(res.status).toBe(200);
      // Weekend ngày 1 (CN: 2 slot), ngày 7 (T7: 2 slot), ngày 8 (CN: 2 slot) = 6 slot
      expect(res.body.data.length).toBe(6);
      expect(res.body.data[0].remaining).toBeDefined();
    });
  });

  // =========================================================================
  // 3. TOUR SLOTS: CAPACITY VALIDATION & DELETION RULES
  // =========================================================================
  describe('Tour Slots: Capacity Update & Deletion Rules', () => {
    let testSlotId: string;
    let slotWithBookingId: string;

    beforeAll(async () => {
      const tour = await prisma.tour.create({
        data: {
          slug: 'tour-slot-capacity-test',
          name: 'Tour Slot Capacity Test',
          description: 'Mô tả',
          durationMinutes: 60,
          priceAdult: 100000,
          priceChild: 50000,
          capacity: 20,
          isPublished: true,
        },
      });

      // Slot 1: chưa có booking
      const slot1 = await prisma.tourSlot.create({
        data: {
          tourId: tour.id,
          startAt: new Date('2026-11-10T08:00:00+07:00'),
          capacity: 20,
          bookedCount: 0,
          isActive: true,
        },
      });
      testSlotId = slot1.id;

      // Slot 2: đã có bookedCount = 8
      const slot2 = await prisma.tourSlot.create({
        data: {
          tourId: tour.id,
          startAt: new Date('2026-11-10T14:00:00+07:00'),
          capacity: 20,
          bookedCount: 8,
          isActive: true,
        },
      });
      slotWithBookingId = slot2.id;
    });

    it('giảm capacity dưới bookedCount bị 422', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tour-slots/${slotWithBookingId}`)
        .set('Cookie', ownerCookies)
        .send({ capacity: 5 }); // 5 < 8 bookedCount

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('Sức chứa không được nhỏ hơn');
    });

    it('cập nhật capacity >= bookedCount thành công', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tour-slots/${slotWithBookingId}`)
        .set('Cookie', ownerCookies)
        .send({ capacity: 10 }); // 10 >= 8

      expect(res.status).toBe(200);
      expect(res.body.data.capacity).toBe(10);
      expect(res.body.data.remaining).toBe(2);
    });

    it('tắt slot bằng isActive: false thành công', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tour-slots/${testSlotId}`)
        .set('Cookie', managerCookies)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it('xóa slot đã có booking/bookedCount bị chặn (400)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/tour-slots/${slotWithBookingId}`)
        .set('Cookie', ownerCookies);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Không thể xóa slot');
    });

    it('xóa slot chưa có booking thành công', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/tour-slots/${testSlotId}`)
        .set('Cookie', ownerCookies);

      expect(res.status).toBe(200);

      const check = await prisma.tourSlot.findUnique({
        where: { id: testSlotId },
      });
      expect(check).toBeNull();
    });
  });

  // =========================================================================
  // 4. PUBLIC TOURS ENDPOINTS
  // =========================================================================
  describe('Public Tours API', () => {
    let publishedTourSlug: string;
    let unpublishedTourSlug: string;

    beforeAll(async () => {
      // Create a published tour
      const pubTour = await prisma.tour.create({
        data: {
          slug: 'tour-public-published-sample',
          name: 'Tour Khám Phá Nông Trại Xanh',
          description: '<p>Chi tiết tour khám phá</p>',
          durationMinutes: 150,
          priceAdult: 220000,
          priceChild: 110000,
          capacity: 30,
          mediaIds: ['media-1', 'media-2'],
          isPublished: true,
          sortOrder: 1,
        },
      });
      publishedTourSlug = pubTour.slug;

      // Slot 1: Trong tương lai (ngày mai), còn chỗ, active
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await prisma.tourSlot.create({
        data: {
          tourId: pubTour.id,
          startAt: tomorrow,
          capacity: 30,
          bookedCount: 5,
          isActive: true,
        },
      });

      // Slot 2: Trong tương lai, nhưng hết chỗ (capacity == bookedCount)
      const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      await prisma.tourSlot.create({
        data: {
          tourId: pubTour.id,
          startAt: inTwoDays,
          capacity: 30,
          bookedCount: 30,
          isActive: true,
        },
      });

      // Slot 3: Trong tương lai, nhưng bị tắt (isActive = false)
      const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      await prisma.tourSlot.create({
        data: {
          tourId: pubTour.id,
          startAt: inThreeDays,
          capacity: 30,
          bookedCount: 0,
          isActive: false,
        },
      });

      // Slot 4: Trong quá khứ (hôm qua)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await prisma.tourSlot.create({
        data: {
          tourId: pubTour.id,
          startAt: yesterday,
          capacity: 30,
          bookedCount: 0,
          isActive: true,
        },
      });

      // Create an unpublished tour
      const unpubTour = await prisma.tour.create({
        data: {
          slug: 'tour-public-unpublished-draft',
          name: 'Tour Nháp Chưa Publish',
          description: '<p>Bản nháp</p>',
          durationMinutes: 60,
          priceAdult: 50000,
          priceChild: 20000,
          capacity: 10,
          isPublished: false,
        },
      });
      unpublishedTourSlug = unpubTour.slug;
    });

    it('GET /public/tours chỉ trả tour đã publish, kèm giá, thời lượng, ảnh', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/public/tours');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      const publishedTour = res.body.data.find(
        (t: { slug: string }) => t.slug === publishedTourSlug,
      );
      expect(publishedTour).toBeDefined();
      expect(Number(publishedTour.priceAdult)).toBe(220000);
      expect(Number(publishedTour.priceChild)).toBe(110000);
      expect(publishedTour.durationMinutes).toBe(150);
      expect(publishedTour.mediaIds).toEqual(['media-1', 'media-2']);
      expect(publishedTour.createdById).toBeUndefined();

      // Đảm bảo không có tour chưa publish
      const unpub = res.body.data.find((t: { slug: string }) => t.slug === unpublishedTourSlug);
      expect(unpub).toBeUndefined();
    });

    it('GET /public/tours/:slug với tour chưa publish trả về 404', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/v1/public/tours/${unpublishedTourSlug}`,
      );

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Không tìm thấy tour');
    });

    it('GET /public/tours/:slug với tour đã publish trả chi tiết và chỉ trả slot tương lai, active, còn chỗ', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/v1/public/tours/${publishedTourSlug}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe(publishedTourSlug);
      expect(res.body.data.createdById).toBeUndefined();

      const slots = res.body.data.slots;
      expect(Array.isArray(slots)).toBe(true);
      // Trong 4 slot đã tạo, chỉ có Slot 1 (ngày mai, active, còn 25 chỗ) thỏa mãn
      expect(slots.length).toBe(1);
      expect(slots[0].capacity).toBe(30);
      expect(slots[0].bookedCount).toBe(5);
      expect(slots[0].remaining).toBe(25);
      expect(slots[0].isActive).toBe(true);
    });
  });
});
