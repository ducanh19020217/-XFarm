import path from 'path';
import * as dotenv from 'dotenv';

const rootEnvPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnvPath });
const testDbUrl =
  process.env.DATABASE_URL_TEST ||
  'postgresql://xfarm:xfarm_secret@localhost:5442/xfarm_test?schema=public';
process.env.DATABASE_URL = testDbUrl;
process.env.NODE_ENV = 'test';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AreaType, ActivityType, ItemCategory, Role } from '@xfarm/shared';
import { prisma, Prisma } from '@xfarm/db';
import { AppModule } from '../src/app.module';
import { cleanupDatabase } from './helpers/cleanup';

describe('Public Trace API E2E', () => {
  let app: INestApplication;
  let publicTraceCode: string;
  let privateTraceCode: string;
  let noProductTraceCode: string;
  const secretEmail = 'secret-worker@xfarm.local';
  const secretFullName = 'Nguyễn Văn Tuyệt Mật';
  const secretNotes = 'Ghi chú nội bộ không được tiết lộ ra ngoài';

  beforeAll(async () => {
    const argon2 = await import('argon2');
    await cleanupDatabase(prisma);

    const passwordHash = await argon2.hash('Secret@123');
    const user = await prisma.user.create({
      data: {
        email: secretEmail,
        fullName: secretFullName,
        role: Role.WORKER,
        passwordHash,
      },
    });

    const area = await prisma.area.create({
      data: {
        code: 'AR-TRACE-01',
        name: 'Khu Trồng Rau Thủy Canh',
        type: AreaType.GREENHOUSE,
        createdById: user.id,
      },
    });

    const cycle = await prisma.cycle.create({
      data: {
        code: 'CY-TRACE-01',
        name: 'Vụ Cải Xoăn Thuỷ Canh K1',
        kind: 'CROP',
        areaId: area.id,
        species: 'Cải xoăn Kale',
        variety: 'Dwarf Blue Curled',
        startDate: new Date('2026-08-01T08:00:00Z'),
        createdById: user.id,
      },
    });

    const item = await prisma.item.create({
      data: {
        sku: 'PROD-KALE-01',
        name: 'Cải xoăn Kale tươi',
        category: ItemCategory.PRODUCE,
        unit: 'kg',
        isSellable: true,
      },
    });

    const itemNoProd = await prisma.item.create({
      data: {
        sku: 'PROD-XALACH-01',
        name: 'Xà lách mỡ',
        category: ItemCategory.PRODUCE,
        unit: 'kg',
        isSellable: true,
      },
    });

    const warehouse = await prisma.warehouse.create({
      data: {
        code: 'WH-TRACE-01',
        name: 'Kho Bảo Quản Mát',
      },
    });

    const media1 = await prisma.media.create({
      data: {
        url: 'http://localhost:9010/xfarm-media/kale-sowing.jpg',
        key: 'uploads/kale-sowing.jpg',
        mime: 'image/jpeg',
        size: 1024,
        alt: 'Ảnh gieo hạt cải kale',
        uploadedById: user.id,
      },
    });

    const media2 = await prisma.media.create({
      data: {
        url: 'http://localhost:9010/xfarm-media/kale-irrigation.jpg',
        key: 'uploads/kale-irrigation.jpg',
        mime: 'image/jpeg',
        size: 2048,
        alt: 'Ảnh tưới dinh dưỡng',
        uploadedById: user.id,
      },
    });

    const mediaLot = await prisma.media.create({
      data: {
        url: 'http://localhost:9010/xfarm-media/kale-harvest-lot.jpg',
        key: 'uploads/kale-harvest-lot.jpg',
        mime: 'image/jpeg',
        size: 4096,
        alt: 'Ảnh thu hoạch đóng gói',
        uploadedById: user.id,
      },
    });

    // Activity 1: Sowing (before harvest) with money/cost data and secret notes
    await prisma.activity.create({
      data: {
        cycleId: cycle.id,
        areaId: area.id,
        type: ActivityType.SOWING,
        performedAt: new Date('2026-08-02T08:00:00Z'),
        performedById: user.id,
        createdById: user.id,
        notes: secretNotes,
        mediaIds: [media1.id],
        data: {
          seedWeightG: 200,
          unitCost: 150000,
          price: 180000,
          amount: 360000,
          tienHat: 360000,
          workerName: secretFullName,
          notes: 'Dữ liệu nội bộ hạt giống',
        },
      },
    });

    // Activity 2: Irrigation (before harvest)
    await prisma.activity.create({
      data: {
        cycleId: cycle.id,
        areaId: area.id,
        type: ActivityType.IRRIGATION,
        performedAt: new Date('2026-08-15T09:00:00Z'),
        performedById: user.id,
        createdById: user.id,
        notes: 'Tưới nước định kỳ hàng ngày',
        mediaIds: [media2.id],
        data: {
          durationMin: 45,
          volumeL: 1200,
        },
      },
    });

    // Activity 3: Harvest activity (lot activity itself)
    const harvestActivity = await prisma.activity.create({
      data: {
        cycleId: cycle.id,
        areaId: area.id,
        type: ActivityType.HARVEST,
        performedAt: new Date('2026-09-01T07:00:00Z'),
        performedById: user.id,
        createdById: user.id,
        notes: 'Thu hoạch đợt 1',
        mediaIds: [mediaLot.id],
        quantity: new Prisma.Decimal(350),
        unit: 'kg',
        data: {
          itemId: item.id,
          quantity: 350,
          unit: 'kg',
          warehouseId: warehouse.id,
          qualityGrade: 'A',
          certification: 'VietGAP',
          isPublic: true,
        },
      },
    });

    // Activity 4: Post-harvest activity (MUST NOT be in timeline)
    await prisma.activity.create({
      data: {
        cycleId: cycle.id,
        areaId: area.id,
        type: ActivityType.CLEANING,
        performedAt: new Date('2026-09-10T10:00:00Z'),
        performedById: user.id,
        createdById: user.id,
        notes: 'Vệ sinh giàn sau thu hoạch',
        data: {
          areaCleanedM2: 500,
        },
      },
    });

    publicTraceCode = 'KALE202601';
    await prisma.harvestLot.create({
      data: {
        code: 'HL-2026-0888',
        traceCode: publicTraceCode,
        cycleId: cycle.id,
        activityId: harvestActivity.id,
        itemId: item.id,
        quantity: new Prisma.Decimal(350),
        unit: 'kg',
        harvestedAt: new Date('2026-09-01T07:00:00Z'),
        warehouseId: warehouse.id,
        qualityGrade: 'A',
        certification: 'VietGAP',
        isPublic: true,
        createdById: user.id,
      },
    });

    // Published Product for item
    await prisma.product.create({
      data: {
        slug: 'cai-kale-thuy-canh',
        name: 'Cải Kale Thủy Canh VietGAP',
        itemId: item.id,
        description: 'Cải xoăn tươi hữu cơ trồng thủy canh.',
        price: new Prisma.Decimal(45000),
        unit: 'kg',
        isPublished: true,
        sortOrder: 1,
        createdById: user.id,
      },
    });

    // Harvest activity and lot for PRIVATE lot
    const privateHarvestActivity = await prisma.activity.create({
      data: {
        cycleId: cycle.id,
        areaId: area.id,
        type: ActivityType.HARVEST,
        performedAt: new Date('2026-09-02T07:00:00Z'),
        performedById: user.id,
        createdById: user.id,
        quantity: new Prisma.Decimal(100),
        unit: 'kg',
        data: {
          itemId: item.id,
          quantity: 100,
          unit: 'kg',
          warehouseId: warehouse.id,
          isPublic: false,
        },
      },
    });

    privateTraceCode = 'KALEPRIV99';
    await prisma.harvestLot.create({
      data: {
        code: 'HL-2026-0889',
        traceCode: privateTraceCode,
        cycleId: cycle.id,
        activityId: privateHarvestActivity.id,
        itemId: item.id,
        quantity: new Prisma.Decimal(100),
        unit: 'kg',
        harvestedAt: new Date('2026-09-02T07:00:00Z'),
        warehouseId: warehouse.id,
        isPublic: false,
        createdById: user.id,
      },
    });

    // Lot with item that has NO published product (only draft product)
    const noProdHarvestActivity = await prisma.activity.create({
      data: {
        cycleId: cycle.id,
        areaId: area.id,
        type: ActivityType.HARVEST,
        performedAt: new Date('2026-09-03T07:00:00Z'),
        performedById: user.id,
        createdById: user.id,
        quantity: new Prisma.Decimal(150),
        unit: 'kg',
        data: {
          itemId: itemNoProd.id,
          quantity: 150,
          unit: 'kg',
          warehouseId: warehouse.id,
          isPublic: true,
        },
      },
    });

    noProductTraceCode = 'SALAD20261';
    await prisma.harvestLot.create({
      data: {
        code: 'HL-2026-0890',
        traceCode: noProductTraceCode,
        cycleId: cycle.id,
        activityId: noProdHarvestActivity.id,
        itemId: itemNoProd.id,
        quantity: new Prisma.Decimal(150),
        unit: 'kg',
        harvestedAt: new Date('2026-09-03T07:00:00Z'),
        warehouseId: warehouse.id,
        isPublic: true,
        createdById: user.id,
      },
    });

    await prisma.product.create({
      data: {
        slug: 'xa-lach-mo-chua-publish',
        name: 'Xà lách mỡ draft',
        itemId: itemNoProd.id,
        description: 'Sản phẩm chưa công bố',
        price: new Prisma.Decimal(25000),
        unit: 'kg',
        isPublished: false,
        createdById: user.id,
      },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Lô public trả về 200 với đúng whitelist các key và không cần cookie', async () => {
    const res = await request(app.getHttpServer()).get(`/api/v1/public/trace/${publicTraceCode}`);

    expect(res.status).toBe(200);

    // Whitelist top-level keys
    expect(Object.keys(res.body).sort()).toEqual([
      'area',
      'cycle',
      'lot',
      'photos',
      'product',
      'timeline',
    ]);

    // Product keys
    expect(Object.keys(res.body.product).sort()).toEqual(['name', 'slug', 'unit']);
    expect(res.body.product).toEqual({
      name: 'Cải Kale Thủy Canh VietGAP',
      slug: 'cai-kale-thuy-canh',
      unit: 'kg',
    });

    // Lot keys
    expect(Object.keys(res.body.lot).sort()).toEqual([
      'certification',
      'code',
      'harvestedAt',
      'qualityGrade',
      'quantity',
      'traceCode',
      'unit',
    ]);
    expect(res.body.lot.code).toBe('HL-2026-0888');
    expect(res.body.lot.traceCode).toBe(publicTraceCode);
    expect(Number(res.body.lot.quantity)).toBe(350);
    expect(res.body.lot.unit).toBe('kg');
    expect(res.body.lot.qualityGrade).toBe('A');
    expect(res.body.lot.certification).toBe('VietGAP');

    // Area keys
    expect(Object.keys(res.body.area).sort()).toEqual(['name', 'type']);
    expect(res.body.area).toEqual({
      name: 'Khu Trồng Rau Thủy Canh',
      type: AreaType.GREENHOUSE,
    });

    // Cycle keys
    expect(Object.keys(res.body.cycle).sort()).toEqual(['name', 'species', 'startDate', 'variety']);
    expect(res.body.cycle.name).toBe('Vụ Cải Xoăn Thuỷ Canh K1');
    expect(res.body.cycle.species).toBe('Cải xoăn Kale');
    expect(res.body.cycle.variety).toBe('Dwarf Blue Curled');

    // Timeline keys & content: only activities before harvest date, excludes harvest activity & post-harvest activity
    expect(res.body.timeline).toHaveLength(2);
    for (const item of res.body.timeline) {
      expect(Object.keys(item).sort()).toEqual(['data', 'mediaUrl', 'performedAt', 'type']);
    }

    expect(res.body.timeline[0].type).toBe(ActivityType.SOWING);
    expect(res.body.timeline[0].data).toEqual({ seedWeightG: 200 });
    expect(res.body.timeline[0].mediaUrl).toBe('http://localhost:9010/xfarm-media/kale-sowing.jpg');

    expect(res.body.timeline[1].type).toBe(ActivityType.IRRIGATION);
    expect(res.body.timeline[1].data).toEqual({ durationMin: 45, volumeL: 1200 });
    expect(res.body.timeline[1].mediaUrl).toBe(
      'http://localhost:9010/xfarm-media/kale-irrigation.jpg',
    );

    // Photos: includes media from timeline and from the harvest lot
    expect(res.body.photos).toHaveLength(3);
    for (const photo of res.body.photos) {
      expect(Object.keys(photo).sort()).toEqual(['alt', 'id', 'url']);
    }
    const photoUrls = res.body.photos.map((p: { url: string }) => p.url);
    expect(photoUrls).toContain('http://localhost:9010/xfarm-media/kale-sowing.jpg');
    expect(photoUrls).toContain('http://localhost:9010/xfarm-media/kale-irrigation.jpg');
    expect(photoUrls).toContain('http://localhost:9010/xfarm-media/kale-harvest-lot.jpg');
  });

  it('Lô private thì 404; mã không tồn tại thì 404 với cùng message', async () => {
    const resPrivate = await request(app.getHttpServer()).get(
      `/api/v1/public/trace/${privateTraceCode}`,
    );
    const resNotExist = await request(app.getHttpServer()).get(
      '/api/v1/public/trace/NONEXISTENT999',
    );

    expect(resPrivate.status).toBe(404);
    expect(resNotExist.status).toBe(404);

    expect(resPrivate.body.message).toBe('Không tìm thấy thông tin truy xuất nguồn gốc');
    expect(resNotExist.body.message).toBe('Không tìm thấy thông tin truy xuất nguồn gốc');
    expect(resPrivate.body.message).toBe(resNotExist.body.message);
  });

  it('Test không lộ dữ liệu: response không chứa thông tin nhạy cảm', async () => {
    const res = await request(app.getHttpServer()).get(`/api/v1/public/trace/${publicTraceCode}`);
    expect(res.status).toBe(200);

    const serialized = JSON.stringify(res.body);

    // Không chứa email nhân viên
    expect(serialized).not.toContain(secretEmail);
    // Không chứa họ tên nhân viên
    expect(serialized).not.toContain(secretFullName);
    // Không chứa unitCost
    expect(serialized).not.toContain('unitCost');
    // Không chứa giá / tiền
    expect(serialized).not.toContain('price');
    expect(serialized).not.toContain('amount');
    expect(serialized).not.toContain('tienHat');
    // Không chứa notes hay ghi chú nội bộ
    expect(serialized).not.toContain('notes');
    expect(serialized).not.toContain(secretNotes);
    expect(serialized).not.toContain('Ghi chú');
    // Không chứa createdById hay performedById
    expect(serialized).not.toContain('createdById');
    expect(serialized).not.toContain('performedById');
    expect(serialized).not.toContain('uploadedById');
  });

  it('Lô public có product chưa publish hoặc không có product thì product trả null', async () => {
    const res = await request(app.getHttpServer()).get(
      `/api/v1/public/trace/${noProductTraceCode}`,
    );

    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual([
      'area',
      'cycle',
      'lot',
      'photos',
      'product',
      'timeline',
    ]);
    expect(res.body.product).toBeNull();
    expect(res.body.lot.traceCode).toBe(noProductTraceCode);
  });
});
