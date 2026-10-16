import path from 'path';
import * as dotenv from 'dotenv';

// Load env before importing app modules
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
import { prisma, Prisma, ItemCategory, PurchaseOrderStatus } from '@xfarm/db';
import { AppModule } from '../src/app.module';

describe('Purchase Orders E2E Tests (/api/v1/purchase-orders)', () => {
  let app: INestApplication;
  let ownerCookies: string[];
  let managerCookies: string[];
  let accountantCookies: string[];
  let salesCookies: string[];
  let workerCookies: string[];

  let supplierId: string;
  let warehouseId: string;
  let seedItemId: string;
  let fertItemId: string;

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

    // 2. Ensure test Warehouse
    const wh = await prisma.warehouse.upsert({
      where: { code: 'WH-PO-E2E' },
      update: { name: 'Kho Mua Hàng Test' },
      create: { code: 'WH-PO-E2E', name: 'Kho Mua Hàng Test' },
    });
    warehouseId = wh.id;

    // 3. Ensure test Supplier
    const sup = await prisma.supplier.upsert({
      where: { code: 'SUP-PO-E2E' },
      update: { name: 'Nhà cung cấp Giống Xanh', phone: '0988776655' },
      create: {
        code: 'SUP-PO-E2E',
        name: 'Nhà cung cấp Giống Xanh',
        phone: '0988776655',
        address: '100 Nông Trường',
      },
    });
    supplierId = sup.id;

    // 4. Ensure test Items
    const seed = await prisma.item.upsert({
      where: { sku: 'SEED-LUA-TEST' },
      update: { name: 'Lúa giống Test', category: ItemCategory.SEED, unit: 'kg' },
      create: {
        sku: 'SEED-LUA-TEST',
        name: 'Lúa giống Test',
        category: ItemCategory.SEED,
        unit: 'kg',
      },
    });
    seedItemId = seed.id;

    const fert = await prisma.item.upsert({
      where: { sku: 'FERT-UREA-TEST' },
      update: { name: 'Phân đạm Urê Test', category: ItemCategory.FERTILIZER, unit: 'bao' },
      create: {
        sku: 'FERT-UREA-TEST',
        name: 'Phân đạm Urê Test',
        category: ItemCategory.FERTILIZER,
        unit: 'bao',
      },
    });
    fertItemId = fert.id;
  }

  beforeAll(async () => {
    // 0. Clean any leftover purchase orders from prior runs
    await prisma.purchaseOrderLine.deleteMany();
    await prisma.purchaseOrder.deleteMany();

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
    await prisma.purchaseOrderLine.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.stockMove.deleteMany({ where: { refType: 'PO' } });
    if (app) {
      await app.close();
    }
  });

  // ========================================================================
  // 1. CRUD PO & Sequence Generation
  // ========================================================================
  describe('CRUD PO & Sequence Code Generation', () => {
    let createdPoId: string;
    const currentYear = new Date().getFullYear();

    it('Tạo PO mới sinh mã PO-YYYY-0001, tính total chính xác bằng Decimal và lưu ở trạng thái DRAFT', async () => {
      const payload = {
        supplierId,
        orderDate: '2026-05-01T00:00:00.000Z',
        lines: [
          { itemId: seedItemId, quantity: 10, unitPrice: 25000 },
          { itemId: fertItemId, quantity: 5, unitPrice: 10000 },
        ],
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Cookie', ownerCookies)
        .send(payload)
        .expect(201);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();
      createdPoId = res.body.data.id;

      // Mã có dạng PO-YYYY-XXXX (ví dụ PO-2026-0001)
      expect(res.body.data.code).toMatch(new RegExp(`^PO-${currentYear}-\\d{4}$`));
      expect(res.body.data.status).toBe(PurchaseOrderStatus.DRAFT);
      // 10 * 25000 + 5 * 10000 = 250000 + 50000 = 300000
      expect(Number(res.body.data.total)).toBe(300000);
      expect(res.body.data.lines).toHaveLength(2);
      expect(Number(res.body.data.lines[0].receivedQty)).toBe(0);
    });

    it('GET /purchase-orders trả về danh sách phân trang và hỗ trợ lọc theo trạng thái / nhà cung cấp', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/purchase-orders')
        .query({ page: 1, pageSize: 10, status: PurchaseOrderStatus.DRAFT, supplierId })
        .set('Cookie', accountantCookies)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body.data.some((p: { id: string }) => p.id === createdPoId)).toBe(true);
    });

    it('GET /purchase-orders/:id trả về chi tiết đơn mua hàng kèm quan hệ supplier và lines', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/purchase-orders/${createdPoId}`)
        .set('Cookie', managerCookies)
        .expect(200);

      expect(res.body.data.id).toBe(createdPoId);
      expect(res.body.data.supplier.id).toBe(supplierId);
      expect(res.body.data.lines).toHaveLength(2);
      expect(res.body.data.lines[0].item).toBeDefined();
    });

    it('PATCH /purchase-orders/:id cho phép sửa dòng khi DRAFT và tính lại total', async () => {
      const updatePayload = {
        lines: [{ itemId: seedItemId, quantity: 20, unitPrice: 30000 }],
      };

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/purchase-orders/${createdPoId}`)
        .set('Cookie', ownerCookies)
        .send(updatePayload)
        .expect(200);

      expect(res.body.data.lines).toHaveLength(1);
      expect(Number(res.body.data.lines[0].quantity)).toBe(20);
      expect(Number(res.body.data.lines[0].unitPrice)).toBe(30000);
      // 20 * 30000 = 600000
      expect(Number(res.body.data.total)).toBe(600000);
    });

    it('DELETE /purchase-orders/:id xóa thành công đơn hàng ở trạng thái DRAFT', async () => {
      const tempPo = await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Cookie', ownerCookies)
        .send({
          supplierId,
          lines: [{ itemId: seedItemId, quantity: 2, unitPrice: 10000 }],
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/v1/purchase-orders/${tempPo.body.data.id}`)
        .set('Cookie', ownerCookies)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/purchase-orders/${tempPo.body.data.id}`)
        .set('Cookie', ownerCookies)
        .expect(404);
    });
  });

  // ========================================================================
  // 2. Vòng đời đơn mua hàng (Lifecycle: DRAFT -> ORDERED -> CANCELLED)
  // ========================================================================
  describe('Vòng đời PO: DRAFT -> ORDERED -> CANCELLED', () => {
    let orderPoId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Cookie', ownerCookies)
        .send({
          supplierId,
          lines: [{ itemId: seedItemId, quantity: 15, unitPrice: 20000 }],
        })
        .expect(201);
      orderPoId = res.body.data.id;
    });

    it('POST /purchase-orders/:id/order chuyển trạng thái từ DRAFT sang ORDERED', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${orderPoId}/order`)
        .set('Cookie', accountantCookies)
        .expect(200);

      expect(res.body.data.status).toBe(PurchaseOrderStatus.ORDERED);

      // Đặt hàng lần 2 khi đã ORDERED phải bị từ chối 422
      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${orderPoId}/order`)
        .set('Cookie', accountantCookies)
        .expect(422);
    });

    it('Không cho phép sửa dòng khi PO đã ORDERED (trả về 422)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${orderPoId}/order`)
        .set('Cookie', ownerCookies)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/purchase-orders/${orderPoId}`)
        .set('Cookie', ownerCookies)
        .send({
          lines: [{ itemId: seedItemId, quantity: 5, unitPrice: 10000 }],
        })
        .expect(422);
    });

    it('POST /purchase-orders/:id/cancel hủy được khi DRAFT', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${orderPoId}/cancel`)
        .set('Cookie', managerCookies)
        .expect(200);

      expect(res.body.data.status).toBe(PurchaseOrderStatus.CANCELLED);
    });

    it('POST /purchase-orders/:id/cancel hủy được khi ORDERED (chưa nhận gì)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${orderPoId}/order`)
        .set('Cookie', ownerCookies)
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${orderPoId}/cancel`)
        .set('Cookie', ownerCookies)
        .expect(200);

      expect(res.body.data.status).toBe(PurchaseOrderStatus.CANCELLED);
    });
  });

  // ========================================================================
  // 3. Nghiệm thu Nhận hàng & Tồn kho theo PLAN
  // ========================================================================
  describe('Nghiệm thu PLAN: Nhận hàng, cập nhật PARTIAL/RECEIVED và tăng tồn kho', () => {
    let poId: string;
    let lineId: string;

    beforeEach(async () => {
      // Dọn dẹp stock moves và lots cho seedItemId tại warehouseId
      await prisma.stockMove.deleteMany({
        where: { itemId: seedItemId },
      });
      await prisma.stockLot.deleteMany({
        where: { itemId: seedItemId },
      });

      // Tạo đơn mua 10 kg giống
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Cookie', ownerCookies)
        .send({
          supplierId,
          lines: [{ itemId: seedItemId, quantity: 10, unitPrice: 20000 }],
        })
        .expect(201);

      poId = createRes.body.data.id;
      lineId = createRes.body.data.lines[0].id;

      // Chuyển sang ORDERED
      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${poId}/order`)
        .set('Cookie', ownerCookies)
        .expect(200);
    });

    it('Nhận hàng khi chưa ORDERED (DRAFT) thì bị chặn 422', async () => {
      const draftPo = await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Cookie', ownerCookies)
        .send({
          supplierId,
          lines: [{ itemId: seedItemId, quantity: 5, unitPrice: 20000 }],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${draftPo.body.data.id}/receive`)
        .set('Cookie', ownerCookies)
        .send({
          warehouseId,
          lines: [{ lineId: draftPo.body.data.lines[0].id, quantity: 2 }],
        })
        .expect(422);
    });

    it('Nhận một phần: PO chuyển sang PARTIAL; nhận nốt: PO chuyển sang RECEIVED và tồn tăng đúng', async () => {
      // Bước 1: Nhận một phần (4 kg trên tổng 10 kg)
      const rec1 = await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${poId}/receive`)
        .set('Cookie', managerCookies)
        .send({
          warehouseId,
          lines: [
            {
              lineId,
              quantity: 4,
              lotCode: 'LOT-SEED-P1',
              expiryDate: '2027-01-01T00:00:00.000Z',
            },
          ],
        })
        .expect(200);

      expect(rec1.body.data.status).toBe(PurchaseOrderStatus.PARTIAL);
      expect(Number(rec1.body.data.lines[0].receivedQty)).toBe(4);

      // Kiểm tra tồn kho sau lần nhận 1
      const balanceRows1 = await prisma.$queryRaw<Array<{ quantity: Prisma.Decimal }>>`
        SELECT COALESCE(SUM(quantity), 0) AS quantity
        FROM "stock_balances"
        WHERE "itemId" = ${seedItemId} AND "warehouseId" = ${warehouseId}
      `;
      expect(Number(balanceRows1[0]?.quantity ?? 0)).toBe(4);

      // Kiểm tra stock_move được tạo với refType='PO', refId=poId
      const moves1 = await prisma.stockMove.findMany({
        where: { refType: 'PO', refId: poId },
      });
      expect(moves1).toHaveLength(1);
      expect(Number(moves1[0].quantity)).toBe(4);
      expect(moves1[0].type).toBe('IN');

      // Bước 2: Nhận nốt 6 kg còn lại
      const rec2 = await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${poId}/receive`)
        .set('Cookie', ownerCookies)
        .send({
          warehouseId,
          lines: [
            {
              lineId,
              quantity: 6,
              lotCode: 'LOT-SEED-P2',
              expiryDate: '2027-06-01T00:00:00.000Z',
            },
          ],
        })
        .expect(200);

      expect(rec2.body.data.status).toBe(PurchaseOrderStatus.RECEIVED);
      expect(Number(rec2.body.data.lines[0].receivedQty)).toBe(10);

      // Kiểm tra tồn kho sau khi nhận đủ: 4 + 6 = 10
      const balanceRows2 = await prisma.$queryRaw<Array<{ quantity: Prisma.Decimal }>>`
        SELECT COALESCE(SUM(quantity), 0) AS quantity
        FROM "stock_balances"
        WHERE "itemId" = ${seedItemId} AND "warehouseId" = ${warehouseId}
      `;
      expect(Number(balanceRows2[0]?.quantity ?? 0)).toBe(10);

      // 2 bản ghi stockMove IN
      const moves2 = await prisma.stockMove.findMany({
        where: { refType: 'PO', refId: poId },
      });
      expect(moves2).toHaveLength(2);
    });

    it('Nhận vượt số lượng đặt bị chặn với mã 422 và không tạo stockMove', async () => {
      // Đơn đặt 10 kg, cố tình nhận 11 kg
      const res = await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${poId}/receive`)
        .set('Cookie', ownerCookies)
        .send({
          warehouseId,
          lines: [{ lineId, quantity: 11 }],
        })
        .expect(422);

      expect(res.body.message).toContain('vượt quá số lượng');

      // Tồn kho không tăng
      const moves = await prisma.stockMove.findMany({
        where: { refType: 'PO', refId: poId },
      });
      expect(moves).toHaveLength(0);
    });

    it('Hủy PO đã nhận hàng (PARTIAL) bị chặn với mã 422', async () => {
      // Nhận trước 3 kg
      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${poId}/receive`)
        .set('Cookie', ownerCookies)
        .send({
          warehouseId,
          lines: [{ lineId, quantity: 3 }],
        })
        .expect(200);

      // Cố gắng hủy đơn
      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${poId}/cancel`)
        .set('Cookie', ownerCookies)
        .expect(422);
    });

    it('Khóa PO bằng FOR UPDATE: 2 lần nhận song song không vượt số đặt', async () => {
      // PO đã đặt 10 kg, nhận trước 6 kg (còn thiếu 4 kg)
      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${poId}/receive`)
        .set('Cookie', ownerCookies)
        .send({
          warehouseId,
          lines: [{ lineId, quantity: 6 }],
        })
        .expect(200);

      // 2 yêu cầu nhận song song, mỗi yêu cầu xin nhận 3 kg (tổng 3 + 3 = 6 > 4 kg còn lại)
      const results = await Promise.all([
        request(app.getHttpServer())
          .post(`/api/v1/purchase-orders/${poId}/receive`)
          .set('Cookie', ownerCookies)
          .send({
            warehouseId,
            lines: [{ lineId, quantity: 3 }],
          }),
        request(app.getHttpServer())
          .post(`/api/v1/purchase-orders/${poId}/receive`)
          .set('Cookie', managerCookies)
          .send({
            warehouseId,
            lines: [{ lineId, quantity: 3 }],
          }),
      ]);

      const statusCodes = results.map((r) => r.status).sort();
      // Chính xác 1 request thành công 200, 1 request thất bại 422
      expect(statusCodes).toEqual([200, 422]);

      // Tổng đã nhận trong DB chính xác là 6 + 3 = 9 (không bao giờ vượt 10)
      const finalPo = await prisma.purchaseOrder.findUniqueOrThrow({
        where: { id: poId },
        include: { lines: true },
      });
      expect(Number(finalPo.lines[0].receivedQty)).toBe(9);
      expect(finalPo.status).toBe(PurchaseOrderStatus.PARTIAL);
    });
  });

  // ========================================================================
  // 4. Phân quyền RBAC (Role-based access control)
  // ========================================================================
  describe('Phân quyền RBAC', () => {
    let rbacPoId: string;
    let rbacLineId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Cookie', accountantCookies)
        .send({
          supplierId,
          lines: [{ itemId: fertItemId, quantity: 10, unitPrice: 15000 }],
        })
        .expect(201);

      rbacPoId = res.body.data.id;
      rbacLineId = res.body.data.lines[0].id;

      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${rbacPoId}/order`)
        .set('Cookie', accountantCookies)
        .expect(200);
    });

    it('ACCOUNTANT có quyền tạo và đặt PO nhưng KHÔNG có quyền nhận hàng (403)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${rbacPoId}/receive`)
        .set('Cookie', accountantCookies)
        .send({
          warehouseId,
          lines: [{ lineId: rbacLineId, quantity: 2 }],
        })
        .expect(403);
    });

    it('WORKER không có quyền tạo đơn, nhận hàng hoặc xem đơn mua hàng (403)', async () => {
      // WORKER tạo PO -> 403
      await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Cookie', workerCookies)
        .send({
          supplierId,
          lines: [{ itemId: fertItemId, quantity: 1, unitPrice: 10000 }],
        })
        .expect(403);

      // WORKER nhận hàng -> 403
      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${rbacPoId}/receive`)
        .set('Cookie', workerCookies)
        .send({
          warehouseId,
          lines: [{ lineId: rbacLineId, quantity: 1 }],
        })
        .expect(403);

      // WORKER xem PO -> 403
      await request(app.getHttpServer())
        .get(`/api/v1/purchase-orders/${rbacPoId}`)
        .set('Cookie', workerCookies)
        .expect(403);
    });

    it('SALES không có quyền tạo đơn mua hàng (403)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Cookie', salesCookies)
        .send({
          supplierId,
          lines: [{ itemId: fertItemId, quantity: 1, unitPrice: 10000 }],
        })
        .expect(403);
    });

    it('OWNER và MANAGER có toàn quyền nhận hàng (200)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${rbacPoId}/receive`)
        .set('Cookie', managerCookies)
        .send({
          warehouseId,
          lines: [{ lineId: rbacLineId, quantity: 2 }],
        })
        .expect(200);
    });
  });
});
