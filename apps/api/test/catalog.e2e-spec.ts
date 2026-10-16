import path from 'path';
import * as dotenv from 'dotenv';

// Load env before importing app modules
const rootEnvPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnvPath });

const testDbUrl =
  process.env.DATABASE_URL_TEST ||
  'postgresql://xfarm:xfarm_secret@localhost:5442/xfarm_test_s3?schema=public';

process.env.DATABASE_URL = testDbUrl;
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import * as argon2 from 'argon2';
import { prisma, Prisma, ItemCategory, StockMoveType } from '@xfarm/db';
import { AppModule } from '../src/app.module';
import { cleanupDatabase } from './helpers/cleanup';

describe('Catalog E2E Tests (/api/v1/items, /api/v1/warehouses, /api/v1/suppliers)', () => {
  let app: INestApplication;
  let ownerCookies: string[];
  let managerCookies: string[];
  let accountantCookies: string[];
  let salesCookies: string[];
  let workerCookies: string[];

  async function login(email: string) {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email,
      password: 'Admin@123',
    });
    expect(response.status).toBe(200);
    const cookies = response.headers['set-cookie'];
    return Array.isArray(cookies) ? cookies : [cookies as string];
  }

  async function ensureSeed() {
    // 1. Ensure stock_balances view exists
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE VIEW "stock_balances" AS
      WITH movements AS (
        SELECT "itemId", "stockLotId", "toWarehouseId" AS "warehouseId", "quantity" AS quantity
        FROM "stock_moves"
        WHERE "type" = 'IN' AND "toWarehouseId" IS NOT NULL
        UNION ALL
        SELECT "itemId", "stockLotId", "fromWarehouseId", -"quantity"
        FROM "stock_moves"
        WHERE "type" = 'OUT' AND "fromWarehouseId" IS NOT NULL
        UNION ALL
        SELECT "itemId", "stockLotId", "fromWarehouseId", -"quantity"
        FROM "stock_moves"
        WHERE "type" = 'TRANSFER' AND "fromWarehouseId" IS NOT NULL
        UNION ALL
        SELECT "itemId", "stockLotId", "toWarehouseId", "quantity"
        FROM "stock_moves"
        WHERE "type" = 'TRANSFER' AND "toWarehouseId" IS NOT NULL
        UNION ALL
        SELECT "itemId", "stockLotId", "toWarehouseId", CASE WHEN "direction" = 'IN' THEN "quantity" ELSE -"quantity" END
        FROM "stock_moves"
        WHERE "type" = 'ADJUST' AND "toWarehouseId" IS NOT NULL
      )
      SELECT "itemId", "stockLotId", "warehouseId", SUM(quantity) AS quantity
      FROM movements
      GROUP BY "itemId", "stockLotId", "warehouseId";
    `);

    // 2. Ensure Warehouses
    const materialWarehouse = await prisma.warehouse.upsert({
      where: { code: 'WH-MATERIAL' },
      update: { name: 'Kho vật tư' },
      create: { code: 'WH-MATERIAL', name: 'Kho vật tư' },
    });
    await prisma.warehouse.upsert({
      where: { code: 'WH-FINISHED' },
      update: { name: 'Kho thành phẩm' },
      create: { code: 'WH-FINISHED', name: 'Kho thành phẩm' },
    });

    // 3. Ensure Items
    const inventoryItems = [
      {
        sku: 'NPK-16-16-8',
        name: 'Phân NPK 16-16-8',
        category: ItemCategory.FERTILIZER,
        unit: 'kg',
        minStock: 5,
      },
      {
        sku: 'BIO-PEST',
        name: 'Thuốc trừ sâu sinh học',
        category: ItemCategory.PESTICIDE,
        unit: 'lít',
        minStock: 2,
      },
      {
        sku: 'CHICKEN-FEED',
        name: 'Cám gà',
        category: ItemCategory.FEED,
        unit: 'kg',
        minStock: 20,
      },
      {
        sku: 'FISH-FEED',
        name: 'Thức ăn cá',
        category: ItemCategory.FEED,
        unit: 'kg',
        minStock: 20,
      },
      {
        sku: 'KALE-SEED',
        name: 'Hạt giống cải',
        category: ItemCategory.SEED,
        unit: 'gói',
        minStock: 10,
      },
      {
        sku: 'PACK-BAG',
        name: 'Bao bì',
        category: ItemCategory.PACKAGING,
        unit: 'cái',
        minStock: 50,
      },
    ] as const;

    const items = new Map<string, { id: string }>();
    for (const item of inventoryItems) {
      const saved = await prisma.item.upsert({
        where: { sku: item.sku },
        update: {
          name: item.name,
          category: item.category,
          unit: item.unit,
          minStock: item.minStock,
          isActive: true,
        },
        create: { ...item, isSellable: false, isActive: true },
        select: { id: true },
      });
      items.set(item.sku, saved);
    }

    // 4. Ensure Suppliers
    const suppliers = [
      { code: 'SUP-AGRI', name: 'Công ty Vật tư Nông nghiệp Xanh', phone: '0901000001' },
      { code: 'SUP-FEED', name: 'Nhà cung cấp Thức ăn Chăn nuôi Việt', phone: '0901000002' },
    ] as const;
    for (const supplier of suppliers) {
      await prisma.supplier.upsert({
        where: { code: supplier.code },
        update: supplier,
        create: supplier,
      });
    }

    // 5. Ensure Opening Stock for NPK (10 kg total)
    const npk = items.get('NPK-16-16-8')!;
    const openingLots = [
      {
        lotCode: 'NPK-OPEN-01',
        quantity: new Prisma.Decimal(4),
        unitCost: new Prisma.Decimal(12000),
        expiryDate: new Date('2026-10-30T00:00:00Z'),
      },
      {
        lotCode: 'NPK-OPEN-02',
        quantity: new Prisma.Decimal(6),
        unitCost: new Prisma.Decimal(12500),
        expiryDate: new Date('2027-04-30T00:00:00Z'),
      },
    ];
    for (const opening of openingLots) {
      const lot = await prisma.stockLot.upsert({
        where: { itemId_lotCode: { itemId: npk.id, lotCode: opening.lotCode } },
        update: {
          expiryDate: opening.expiryDate,
          warehouseId: materialWarehouse.id,
          unitCost: opening.unitCost,
        },
        create: {
          itemId: npk.id,
          warehouseId: materialWarehouse.id,
          lotCode: opening.lotCode,
          expiryDate: opening.expiryDate,
          unitCost: opening.unitCost,
        },
      });
      const refId = `OPENING-${opening.lotCode}`;
      const move = await prisma.stockMove.findFirst({ where: { refType: 'OPENING', refId } });
      if (!move) {
        await prisma.stockMove.create({
          data: {
            type: StockMoveType.IN,
            itemId: npk.id,
            stockLotId: lot.id,
            toWarehouseId: materialWarehouse.id,
            quantity: opening.quantity,
            unitCost: opening.unitCost,
            refType: 'OPENING',
            refId,
          },
        });
      }
    }
  }

  beforeAll(async () => {
    await cleanupDatabase(prisma);

    // 1. Ensure test users exist
    const passwordHash = await argon2.hash('Admin@123');
    const users = [
      { email: 'admin@xfarm.local', fullName: 'Admin Owner', role: 'OWNER' as const },
      { email: 'manager@xfarm.local', fullName: 'Manager User', role: 'MANAGER' as const },
      { email: 'accountant@xfarm.local', fullName: 'Accountant User', role: 'ACCOUNTANT' as const },
      { email: 'sales@xfarm.local', fullName: 'Sales User', role: 'SALES' as const },
      { email: 'worker@xfarm.local', fullName: 'Worker User', role: 'WORKER' as const },
    ];

    for (const u of users) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: { passwordHash, isActive: true },
        create: {
          email: u.email,
          passwordHash,
          fullName: u.fullName,
          role: u.role,
          isActive: true,
        },
      });
    }

    // 2. Ensure seed data
    await ensureSeed();

    // 3. Compile Nest Application
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');

    await app.init();

    // 4. Login all roles
    ownerCookies = await login('admin@xfarm.local');
    managerCookies = await login('manager@xfarm.local');
    accountantCookies = await login('accountant@xfarm.local');
    salesCookies = await login('sales@xfarm.local');
    workerCookies = await login('worker@xfarm.local');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ========================================================================
  // Items Tests
  // ========================================================================
  describe('Items Module (/api/v1/items)', () => {
    it('GET /items returns paginated items with onHand for all roles', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/items')
        .set('Cookie', workerCookies)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.data)).toBe(true);

      const npk = res.body.data.find((item: { sku: string }) => item.sku === 'NPK-16-16-8');
      expect(npk).toBeDefined();
      expect(npk.onHand).toBe(10);
      expect(npk.minStock).toBe(5);

      const pest = res.body.data.find((item: { sku: string }) => item.sku === 'BIO-PEST');
      expect(pest).toBeDefined();
      expect(pest.onHand).toBe(0);
    });

    it('GET /items with belowMinStock=true filters items where onHand < minStock according to seed', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/items?belowMinStock=true')
        .set('Cookie', ownerCookies)
        .expect(200);

      const skus = res.body.data.map((item: { sku: string }) => item.sku);
      // NPK-16-16-8 has onHand = 10, minStock = 5 -> NOT below minStock
      expect(skus).not.toContain('NPK-16-16-8');

      // The 5 items with onHand = 0 < minStock should be included
      expect(skus).toContain('BIO-PEST');
      expect(skus).toContain('CHICKEN-FEED');
      expect(skus).toContain('FISH-FEED');
      expect(skus).toContain('KALE-SEED');
      expect(skus).toContain('PACK-BAG');
    });

    it('GET /items with category filter returns matching items', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/items?category=FERTILIZER')
        .set('Cookie', salesCookies)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      for (const item of res.body.data) {
        expect(item.category).toBe('FERTILIZER');
      }
    });

    it('GET /items with search filter searches sku and name', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/items?search=NPK')
        .set('Cookie', accountantCookies)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].sku).toContain('NPK');
    });

    it('GET /items/:id returns item detail with onHand', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/items?search=NPK-16-16-8')
        .set('Cookie', workerCookies)
        .expect(200);

      const id = listRes.body.data[0].id;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/items/${id}`)
        .set('Cookie', workerCookies)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(id);
      expect(res.body.data.onHand).toBe(10);
    });

    it('GET /items/:id returns 404 for nonexistent id', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/items/nonexistent-id')
        .set('Cookie', ownerCookies)
        .expect(404);
    });

    it('POST /items fails with 403 when called by WORKER', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/items')
        .set('Cookie', workerCookies)
        .send({
          name: 'Vật tư test worker',
          category: 'SEED',
          unit: 'gói',
        })
        .expect(403);
    });

    it('POST /items fails with 403 when called by ACCOUNTANT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/items')
        .set('Cookie', accountantCookies)
        .send({
          name: 'Vật tư test accountant',
          category: 'SEED',
          unit: 'gói',
        })
        .expect(403);
    });

    it('POST /items creates item with explicit sku when called by OWNER', async () => {
      const explicitSku = `IT-TEST-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/items')
        .set('Cookie', ownerCookies)
        .send({
          sku: explicitSku,
          name: 'Vật tư test OWNER',
          category: 'TOOL',
          unit: 'cái',
          minStock: 3,
          isSellable: true,
        })
        .expect(201);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.sku).toBe(explicitSku);
      expect(res.body.data.name).toBe('Vật tư test OWNER');
      expect(res.body.data.onHand).toBe(0);
      expect(res.body.data.isActive).toBe(true);
    });

    it('POST /items auto-generates sku via nextCode when sku is empty or omitted', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/items')
        .set('Cookie', managerCookies)
        .send({
          name: 'Vật tư tự sinh mã',
          category: 'SEED',
          unit: 'hạt',
        })
        .expect(201);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.sku).toMatch(/^IT-\d{4}$/);
      expect(res.body.data.name).toBe('Vật tư tự sinh mã');
    });

    it('POST /items returns 409 if sku already exists', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/items')
        .set('Cookie', ownerCookies)
        .send({
          sku: 'NPK-16-16-8',
          name: 'Trùng mã NPK',
          category: 'FERTILIZER',
          unit: 'kg',
        })
        .expect(409);
    });

    it('PATCH /items/:id updates item and prevents duplicate sku', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/items')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Vật tư sắp sửa',
          category: 'TOOL',
          unit: 'cái',
        })
        .expect(201);

      const itemId = createRes.body.data.id;

      // WORKER cannot update
      await request(app.getHttpServer())
        .patch(`/api/v1/items/${itemId}`)
        .set('Cookie', workerCookies)
        .send({ name: 'Worker sửa' })
        .expect(403);

      // Duplicate sku -> 409
      await request(app.getHttpServer())
        .patch(`/api/v1/items/${itemId}`)
        .set('Cookie', ownerCookies)
        .send({ sku: 'NPK-16-16-8' })
        .expect(409);

      // OWNER updates successfully
      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/items/${itemId}`)
        .set('Cookie', ownerCookies)
        .send({ name: 'Vật tư đã sửa', minStock: 15 })
        .expect(200);

      expect(patchRes.body.data.name).toBe('Vật tư đã sửa');
      expect(patchRes.body.data.minStock).toBe(15);
    });

    it('DELETE /items/:id performs soft delete using isActive', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/items')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Vật tư sắp khóa mềm',
          category: 'TOOL',
          unit: 'cái',
        })
        .expect(201);

      const itemId = createRes.body.data.id;

      // WORKER cannot delete
      await request(app.getHttpServer())
        .delete(`/api/v1/items/${itemId}`)
        .set('Cookie', workerCookies)
        .expect(403);

      // OWNER soft-deletes
      await request(app.getHttpServer())
        .delete(`/api/v1/items/${itemId}`)
        .set('Cookie', ownerCookies)
        .expect(200);

      // Verify item isActive is now false
      const getRes = await request(app.getHttpServer())
        .get(`/api/v1/items/${itemId}`)
        .set('Cookie', ownerCookies)
        .expect(200);

      expect(getRes.body.data.isActive).toBe(false);
    });
  });

  // ========================================================================
  // Warehouses Tests
  // ========================================================================
  describe('Warehouses Module (/api/v1/warehouses)', () => {
    it('GET /warehouses returns paginated warehouse list for all roles', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/warehouses')
        .set('Cookie', workerCookies)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /warehouses/:id returns warehouse details with relations', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/warehouses?search=WH-MATERIAL')
        .set('Cookie', salesCookies)
        .expect(200);

      const warehouse = listRes.body.data[0];
      const res = await request(app.getHttpServer())
        .get(`/api/v1/warehouses/${warehouse.id}`)
        .set('Cookie', accountantCookies)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.code).toBe('WH-MATERIAL');
    });

    it('POST /warehouses fails with 403 when called by WORKER', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/warehouses')
        .set('Cookie', workerCookies)
        .send({ name: 'Kho worker' })
        .expect(403);
    });

    it('POST /warehouses creates warehouse with explicit code', async () => {
      const explicitCode = `WH-EXP-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/warehouses')
        .set('Cookie', ownerCookies)
        .send({
          code: explicitCode,
          name: 'Kho mới explicit',
        })
        .expect(201);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.code).toBe(explicitCode);
      expect(res.body.data.name).toBe('Kho mới explicit');
    });

    it('POST /warehouses auto-generates code via nextCode when code is empty', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/warehouses')
        .set('Cookie', managerCookies)
        .send({
          name: 'Kho tự sinh mã',
        })
        .expect(201);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.code).toMatch(/^WH-\d{4}$/);
    });

    it('POST /warehouses returns 409 if code already exists', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/warehouses')
        .set('Cookie', ownerCookies)
        .send({
          code: 'WH-MATERIAL',
          name: 'Trùng mã kho',
        })
        .expect(409);
    });

    it('POST /warehouses returns 422 if areaId does not exist', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/warehouses')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Kho khu vực sai',
          areaId: 'nonexistent-area',
        })
        .expect(422);
    });

    it('PATCH /warehouses/:id updates warehouse', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/warehouses')
        .set('Cookie', ownerCookies)
        .send({ name: 'Kho test patch' })
        .expect(201);

      const id = createRes.body.data.id;

      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/warehouses/${id}`)
        .set('Cookie', managerCookies)
        .send({ name: 'Kho test patch đổi tên' })
        .expect(200);

      expect(patchRes.body.data.name).toBe('Kho test patch đổi tên');
    });

    it('DELETE /warehouses/:id returns 422 when warehouse has transactions', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/warehouses?search=WH-MATERIAL')
        .set('Cookie', ownerCookies)
        .expect(200);

      const materialWarehouse = listRes.body.data[0];

      // Deleting WH-MATERIAL (which has stockLots and stockMoves) must fail with 422
      await request(app.getHttpServer())
        .delete(`/api/v1/warehouses/${materialWarehouse.id}`)
        .set('Cookie', ownerCookies)
        .expect(422);
    });

    it('DELETE /warehouses/:id succeeds when warehouse has no transactions', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/warehouses')
        .set('Cookie', ownerCookies)
        .send({ name: 'Kho không giao dịch' })
        .expect(201);

      const id = createRes.body.data.id;

      // WORKER cannot delete
      await request(app.getHttpServer())
        .delete(`/api/v1/warehouses/${id}`)
        .set('Cookie', workerCookies)
        .expect(403);

      // OWNER can delete
      await request(app.getHttpServer())
        .delete(`/api/v1/warehouses/${id}`)
        .set('Cookie', ownerCookies)
        .expect(200);

      // Now 404
      await request(app.getHttpServer())
        .get(`/api/v1/warehouses/${id}`)
        .set('Cookie', ownerCookies)
        .expect(404);
    });
  });

  // ========================================================================
  // Suppliers Tests
  // ========================================================================
  describe('Suppliers Module (/api/v1/suppliers)', () => {
    it('GET /suppliers returns paginated supplier list for all roles', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/suppliers')
        .set('Cookie', workerCookies)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /suppliers/:id returns supplier details', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/suppliers?search=SUP-AGRI')
        .set('Cookie', salesCookies)
        .expect(200);

      const supplier = listRes.body.data[0];
      const res = await request(app.getHttpServer())
        .get(`/api/v1/suppliers/${supplier.id}`)
        .set('Cookie', workerCookies)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.code).toBe('SUP-AGRI');
    });

    it('POST /suppliers fails with 403 when called by WORKER or SALES', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Cookie', workerCookies)
        .send({ name: 'NCC worker' })
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Cookie', salesCookies)
        .send({ name: 'NCC sales' })
        .expect(403);
    });

    it('POST /suppliers succeeds when called by ACCOUNTANT', async () => {
      const explicitCode = `SUP-ACC-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Cookie', accountantCookies)
        .send({
          code: explicitCode,
          name: 'NCC do Kế toán tạo',
          phone: '0988776655',
          taxCode: '0123456789',
        })
        .expect(201);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.code).toBe(explicitCode);
      expect(res.body.data.name).toBe('NCC do Kế toán tạo');
    });

    it('POST /suppliers auto-generates code via nextCode when code is empty', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Cookie', ownerCookies)
        .send({
          name: 'NCC tự sinh mã',
        })
        .expect(201);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.code).toMatch(/^SUP-\d{4}$/);
    });

    it('POST /suppliers returns 409 if code already exists', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Cookie', managerCookies)
        .send({
          code: 'SUP-AGRI',
          name: 'Trùng mã NCC',
        })
        .expect(409);
    });

    it('PATCH /suppliers/:id allows ACCOUNTANT to update', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Cookie', ownerCookies)
        .send({ name: 'NCC sắp sửa' })
        .expect(201);

      const id = createRes.body.data.id;

      // WORKER cannot update
      await request(app.getHttpServer())
        .patch(`/api/v1/suppliers/${id}`)
        .set('Cookie', workerCookies)
        .send({ name: 'Worker update' })
        .expect(403);

      // ACCOUNTANT can update
      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/suppliers/${id}`)
        .set('Cookie', accountantCookies)
        .send({ name: 'NCC đã được sửa', phone: '0911223344' })
        .expect(200);

      expect(patchRes.body.data.name).toBe('NCC đã được sửa');
      expect(patchRes.body.data.phone).toBe('0911223344');
    });

    it('DELETE /suppliers/:id returns 422 if supplier has purchase orders', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Cookie', accountantCookies)
        .send({ name: 'NCC có PO' })
        .expect(201);

      const supplierId = createRes.body.data.id;

      // Create a purchase order for this supplier
      await prisma.purchaseOrder.create({
        data: {
          code: `PO-TEST-${Date.now()}`,
          supplierId,
          total: 100000,
        },
      });

      // Attempting to delete must fail with 422
      await request(app.getHttpServer())
        .delete(`/api/v1/suppliers/${supplierId}`)
        .set('Cookie', accountantCookies)
        .expect(422);
    });

    it('DELETE /suppliers/:id succeeds when supplier has no transactions', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Cookie', accountantCookies)
        .send({ name: 'NCC không giao dịch' })
        .expect(201);

      const id = createRes.body.data.id;

      // WORKER cannot delete
      await request(app.getHttpServer())
        .delete(`/api/v1/suppliers/${id}`)
        .set('Cookie', workerCookies)
        .expect(403);

      // ACCOUNTANT can delete
      await request(app.getHttpServer())
        .delete(`/api/v1/suppliers/${id}`)
        .set('Cookie', accountantCookies)
        .expect(200);

      // Now 404
      await request(app.getHttpServer())
        .get(`/api/v1/suppliers/${id}`)
        .set('Cookie', ownerCookies)
        .expect(404);
    });
  });
});
