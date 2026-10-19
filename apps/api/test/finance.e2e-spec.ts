import path from 'path';
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
import { prisma, Prisma, TransactionType } from '@xfarm/db';
import { AppModule } from '../src/app.module';
import { cleanupDatabase } from './helpers/cleanup';

interface CategoryTreeNode {
  id: string;
  name: string;
  children: CategoryTreeNode[];
}

interface CustomerReceivableItem {
  customerId: string;
  debt: number;
}

interface OrderReceivableItem {
  customerId: string;
  isOverdue: boolean;
  daysOverdue: number;
}

describe('Finance E2E Tests (Categories, Transactions, Payments, PO Pay, Receivables)', () => {
  let app: INestApplication;
  let ownerCookies: string[];
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

  beforeAll(async () => {
    // 1. Clean previous test data
    await cleanupDatabase();

    // 2. Ensure test users exist
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

    // 3. Ensure system finance categories exist
    await prisma.financeCategory.upsert({
      where: { systemKey: 'SALES' },
      update: { name: 'Bán hàng', type: TransactionType.INCOME, isActive: true },
      create: { name: 'Bán hàng', type: TransactionType.INCOME, systemKey: 'SALES', isActive: true },
    });
    await prisma.financeCategory.upsert({
      where: { systemKey: 'PURCHASE' },
      update: { name: 'Mua vật tư', type: TransactionType.EXPENSE, isActive: true },
      create: { name: 'Mua vật tư', type: TransactionType.EXPENSE, systemKey: 'PURCHASE', isActive: true },
    });

    // 4. Compile Nest Application
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');

    await app.init();

    // 5. Login all roles
    ownerCookies = await login('admin@xfarm.local');
    accountantCookies = await login('accountant@xfarm.local');
    salesCookies = await login('sales@xfarm.local');
    workerCookies = await login('worker@xfarm.local');
  });

  afterAll(async () => {
    await cleanupDatabase();
    if (app) {
      await app.close();
    }
  });

  describe('Finance Categories', () => {
    let parentCatId: string;
    let childCatId: string;

    it('creates root and child categories (tree structure)', async () => {
      const resParent = await request(app.getHttpServer())
        .post('/api/v1/finance-categories')
        .set('Cookie', accountantCookies)
        .send({
          name: 'Chi phí canh tác',
          type: 'EXPENSE',
        });
      expect(resParent.status).toBe(201);
      expect(resParent.body.data.name).toBe('Chi phí canh tác');
      parentCatId = resParent.body.data.id;

      const resChild = await request(app.getHttpServer())
        .post('/api/v1/finance-categories')
        .set('Cookie', accountantCookies)
        .send({
          name: 'Phân bón hữu cơ',
          type: 'EXPENSE',
          parentId: parentCatId,
        });
      expect(resChild.status).toBe(201);
      expect(resChild.body.data.parentId).toBe(parentCatId);
      childCatId = resChild.body.data.id;
    });

    it('retrieves categories as a hierarchical tree', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance-categories/tree?type=EXPENSE')
        .set('Cookie', accountantCookies);
      expect(res.status).toBe(200);
      const parentInTree = (res.body.data as CategoryTreeNode[]).find(c => c.id === parentCatId);
      expect(parentInTree).toBeDefined();
      expect(parentInTree!.children.some(c => c.id === childCatId)).toBe(true);
    });

    it('rejects circular parent assignment with 422', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/finance-categories/${parentCatId}`)
        .set('Cookie', accountantCookies)
        .send({ parentId: childCatId });
      expect(res.status).toBe(422);
    });

    it('prevents deleting category with systemKey with 422', async () => {
      const salesCat = await prisma.financeCategory.findUnique({
        where: { systemKey: 'SALES' },
      });
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/finance-categories/${salesCat!.id}`)
        .set('Cookie', ownerCookies);
      expect(res.status).toBe(422);
      expect(res.body.message).toContain('hệ thống');
    });

    it('prevents deleting category that has child categories with 422', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/finance-categories/${parentCatId}`)
        .set('Cookie', ownerCookies);
      expect(res.status).toBe(422);
      expect(res.body.message).toContain('danh mục con');
    });

    it('allows deleting an unused leaf category', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/finance-categories/${childCatId}`)
        .set('Cookie', ownerCookies);
      expect(res.status).toBe(200);
    });
  });

  describe('Transactions (Manual & Automated Protections)', () => {
    let manualTxId: string;
    let expenseCatId: string;

    beforeAll(async () => {
      await prisma.financeCategory.create({
        data: { name: 'Thu nhập phụ phẩm', type: 'INCOME' },
      });
      const expCat = await prisma.financeCategory.create({
        data: { name: 'Bảo trì máy móc', type: 'EXPENSE' },
      });
      expenseCatId = expCat.id;
    });

    it('allows ACCOUNTANT to create manual transaction with TX- code', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Cookie', accountantCookies)
        .send({
          type: 'EXPENSE',
          categoryId: expenseCatId,
          amount: 250000,
          date: new Date().toISOString(),
          method: 'CASH',
          notes: 'Thay nhớt máy cày',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.code).toMatch(/^TX-\d{4}-\d+/);
      expect(Number(res.body.data.amount)).toBe(250000);
      manualTxId = res.body.data.id;
    });

    it('forbids SALES from creating manual transaction with 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Cookie', salesCookies)
        .send({
          type: 'EXPENSE',
          categoryId: expenseCatId,
          amount: 50000,
          date: new Date().toISOString(),
          method: 'CASH',
        });
      expect(res.status).toBe(403);
    });

    it('forbids WORKER from viewing transactions with 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .set('Cookie', workerCookies);
      expect(res.status).toBe(403);
    });

    it('allows updating a manual transaction', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/transactions/${manualTxId}`)
        .set('Cookie', accountantCookies)
        .send({
          amount: 300000,
          notes: 'Thay nhớt và lọc dầu máy cày',
        });
      expect(res.status).toBe(200);
      expect(Number(res.body.data.amount)).toBe(300000);
    });

    it('allows deleting a manual transaction', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/transactions/${manualTxId}`)
        .set('Cookie', accountantCookies);
      expect(res.status).toBe(200);
    });
  });

  describe('Sales Orders & Payments Workflow', () => {
    let customerId: string;
    let itemId: string;
    let orderId: string;
    let payment1Id: string;

    beforeAll(async () => {
      const customer = await prisma.customer.create({
        data: {
          code: 'CU-TEST-PAY-01',
          name: 'Khách hàng Test Thu Tiền',
          phone: '0981112233',
          type: 'RETAIL',
        },
      });
      customerId = customer.id;

      const item = await prisma.item.create({
        data: {
          sku: 'ITEM-TEST-PAY',
          name: 'Dưa lưới hoàng kim',
          category: 'PRODUCE',
          unit: 'kg',
        },
      });
      itemId = item.id;

      // Create an order: total 1,000,000
      const order = await prisma.salesOrder.create({
        data: {
          code: 'SO-TEST-PAY-01',
          customerId,
          channel: 'ADMIN',
          status: 'CONFIRMED',
          paymentStatus: 'UNPAID',
          paymentMethod: 'BANK_TRANSFER',
          shippingAddress: 'Hà Nội',
          subtotal: new Prisma.Decimal(1000000),
          discount: new Prisma.Decimal(0),
          shippingFee: new Prisma.Decimal(0),
          total: new Prisma.Decimal(1000000),
          lines: {
            create: {
              itemId,
              quantity: new Prisma.Decimal(20),
              unitPrice: new Prisma.Decimal(50000),
            },
          },
        },
      });
      orderId = order.id;
    });

    it('records first partial payment: updates to PARTIAL and creates 1 Transaction INCOME', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/sales-orders/${orderId}/payments`)
        .set('Cookie', salesCookies)
        .send({
          amount: 400000,
          method: 'BANK_TRANSFER',
          notes: 'Thu trước đợt 1',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.code).toMatch(/^PM-\d{4}-\d+/);
      expect(Number(res.body.data.amount)).toBe(400000);
      payment1Id = res.body.data.id;

      // Verify order status is PARTIAL
      const order = await prisma.salesOrder.findUnique({ where: { id: orderId } });
      expect(order?.paymentStatus).toBe('PARTIAL');

      // Verify 1 Transaction INCOME was created with category SALES and refType Payment
      const txs = await prisma.transaction.findMany({
        where: { refType: 'Payment', refId: payment1Id },
        include: { category: true },
      });
      expect(txs.length).toBe(1);
      expect(txs[0].type).toBe('INCOME');
      expect(txs[0].category.systemKey).toBe('SALES');
      expect(Number(txs[0].amount)).toBe(400000);
    });

    it('rejects overpayment exceeding order total with 422', async () => {
      // Current paid: 400,000. Total: 1,000,000. Paying 700,000 -> 1,100,000 > 1,000,000 -> 422
      const res = await request(app.getHttpServer())
        .post(`/api/v1/sales-orders/${orderId}/payments`)
        .set('Cookie', salesCookies)
        .send({
          amount: 700000,
          method: 'CASH',
        });
      expect(res.status).toBe(422);
      expect(res.body.message).toContain('vượt quá');
    });

    it('records second payment for remaining balance: updates to PAID and has exactly 2 Transaction INCOME', async () => {
      // Remaining: 600,000
      const res = await request(app.getHttpServer())
        .post(`/api/v1/sales-orders/${orderId}/payments`)
        .set('Cookie', accountantCookies)
        .send({
          amount: 600000,
          method: 'CASH',
          notes: 'Thu đủ tiền',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();

      // Verify order status is PAID
      const order = await prisma.salesOrder.findUnique({ where: { id: orderId } });
      expect(order?.paymentStatus).toBe('PAID');

      // Verify exactly 2 Transaction INCOME exist for this order's payments
      const orderPayments = await prisma.payment.findMany({ where: { orderId } });
      expect(orderPayments.length).toBe(2);

      const incomeTxs = await prisma.transaction.findMany({
        where: {
          refType: 'Payment',
          refId: { in: orderPayments.map((p) => p.id) },
        },
      });
      expect(incomeTxs.length).toBe(2);
      expect(incomeTxs.every((t) => t.type === 'INCOME')).toBe(true);
    });

    it('rejects paying an already fully PAID order with 422', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/sales-orders/${orderId}/payments`)
        .set('Cookie', salesCookies)
        .send({
          amount: 50000,
          method: 'CASH',
        });
      expect(res.status).toBe(422);
    });

    it('rejects paying a CANCELLED order with 422', async () => {
      const cancelledOrder = await prisma.salesOrder.create({
        data: {
          code: 'SO-CANCELLED-TEST',
          customerId,
          channel: 'ADMIN',
          status: 'CANCELLED',
          paymentStatus: 'UNPAID',
          paymentMethod: 'COD',
          shippingAddress: 'Hà Nội',
          subtotal: new Prisma.Decimal(200000),
          discount: new Prisma.Decimal(0),
          shippingFee: new Prisma.Decimal(0),
          total: new Prisma.Decimal(200000),
        },
      });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/sales-orders/${cancelledOrder.id}/payments`)
        .set('Cookie', accountantCookies)
        .send({
          amount: 100000,
          method: 'CASH',
        });
      expect(res.status).toBe(422);
      expect(res.body.message).toContain('đã hủy');
    });

    it('prevents manual update or deletion of automated payment transaction with 422', async () => {
      const paymentRecord = await prisma.payment.findUnique({ where: { id: payment1Id } });
      const txId = paymentRecord!.transactionId!;

      // Attempt PATCH -> 422
      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/transactions/${txId}`)
        .set('Cookie', ownerCookies)
        .send({ amount: 999999 });
      expect(patchRes.status).toBe(422);
      expect(patchRes.body.message).toContain('tự động');

      // Attempt DELETE -> 422
      const delRes = await request(app.getHttpServer())
        .delete(`/api/v1/transactions/${txId}`)
        .set('Cookie', ownerCookies);
      expect(delRes.status).toBe(422);
      expect(delRes.body.message).toContain('tự động');
    });

    it('prevents deleting category SALES while transactions exist with 422', async () => {
      const salesCat = await prisma.financeCategory.findUnique({ where: { systemKey: 'SALES' } });
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/finance-categories/${salesCat!.id}`)
        .set('Cookie', ownerCookies);
      expect(res.status).toBe(422);
    });

    it('lists payments via GET /payments', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments?orderId=${orderId}`)
        .set('Cookie', salesCookies);
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe('Purchase Order Payment Workflow (POST /purchase-orders/:id/pay)', () => {
    let poId: string;
    let supplierId: string;
    let itemId: string;

    beforeAll(async () => {
      const supplier = await prisma.supplier.create({
        data: {
          code: 'SUP-PAY-E2E',
          name: 'Nhà cung cấp phân bón Hà Nội',
        },
      });
      supplierId = supplier.id;

      const item = await prisma.item.create({
        data: {
          sku: 'ITEM-PO-PAY',
          name: 'Phân NPK 16-16-8',
          category: 'FERTILIZER',
          unit: 'bao',
        },
      });
      itemId = item.id;

      const po = await prisma.purchaseOrder.create({
        data: {
          code: 'PO-TEST-PAY-01',
          supplierId,
          status: 'ORDERED',
          total: new Prisma.Decimal(500000),
          lines: {
            create: {
              itemId,
              quantity: new Prisma.Decimal(5),
              unitPrice: new Prisma.Decimal(100000),
            },
          },
        },
      });
      poId = po.id;
    });

    it('pays PO partially: creates Transaction EXPENSE with category PURCHASE and returns paidAmount', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${poId}/pay`)
        .set('Cookie', accountantCookies)
        .send({
          amount: 200000,
          method: 'BANK_TRANSFER',
          notes: 'Chi đợt 1',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.paidAmount).toBe(200000);

      // Verify Transaction EXPENSE created
      const txs = await prisma.transaction.findMany({
        where: { refType: 'PurchaseOrder', refId: poId },
        include: { category: true },
      });
      expect(txs.length).toBe(1);
      expect(txs[0].type).toBe('EXPENSE');
      expect(txs[0].category.systemKey).toBe('PURCHASE');
      expect(Number(txs[0].amount)).toBe(200000);
    });

    it('blocks paying over PO total with 422', async () => {
      // Currently paid: 200,000 / 500,000. Attempt 400,000 -> 600,000 > 500,000 -> 422
      const res = await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${poId}/pay`)
        .set('Cookie', accountantCookies)
        .send({
          amount: 400000,
          method: 'CASH',
        });
      expect(res.status).toBe(422);
      expect(res.body.message).toContain('vượt quá');
    });

    it('pays remainder when amount is omitted', async () => {
      // Omitting amount pays remaining 300,000
      const res = await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${poId}/pay`)
        .set('Cookie', accountantCookies)
        .send({
          method: 'BANK_TRANSFER',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.paidAmount).toBe(500000);

      const txs = await prisma.transaction.findMany({
        where: { refType: 'PurchaseOrder', refId: poId },
      });
      expect(txs.length).toBe(2);
      const totalPaid = txs.reduce((sum, t) => sum.plus(t.amount), new Prisma.Decimal(0));
      expect(Number(totalPaid)).toBe(500000);
    });

    it('GET /purchase-orders/:id returns computed paidAmount', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/purchase-orders/${poId}`)
        .set('Cookie', accountantCookies);
      expect(res.status).toBe(200);
      expect(res.body.data.paidAmount).toBe(500000);
    });

    it('cannot edit or delete automated PO expense transaction with 422', async () => {
      const tx = await prisma.transaction.findFirst({
        where: { refType: 'PurchaseOrder', refId: poId },
      });
      const delRes = await request(app.getHttpServer())
        .delete(`/api/v1/transactions/${tx!.id}`)
        .set('Cookie', ownerCookies);
      expect(delRes.status).toBe(422);
      expect(delRes.body.message).toContain('tự động');
    });
  });

  describe('Receivables (GET /finance/receivables)', () => {
    let overdueCustomerId: string;

    beforeAll(async () => {
      const custOverdue = await prisma.customer.create({
        data: {
          code: 'CU-OVERDUE-01',
          name: 'Khách Nợ Quá Hạn',
          phone: '0977889900',
          type: 'WHOLESALE',
        },
      });
      overdueCustomerId = custOverdue.id;

      // Create an order completed 10 days ago, total 800,000, unpaid
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      await prisma.salesOrder.create({
        data: {
          code: 'SO-OVERDUE-01',
          customerId: overdueCustomerId,
          channel: 'ADMIN',
          status: 'COMPLETED',
          paymentStatus: 'UNPAID',
          paymentMethod: 'BANK_TRANSFER',
          shippingAddress: 'Nam Định',
          subtotal: new Prisma.Decimal(800000),
          discount: new Prisma.Decimal(0),
          shippingFee: new Prisma.Decimal(0),
          total: new Prisma.Decimal(800000),
          confirmedAt: tenDaysAgo,
          createdAt: tenDaysAgo,
        },
      });
    });

    it('returns debt by customer and marks orders overdue if completed > 7 days without full payment', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/receivables')
        .set('Cookie', accountantCookies);
      expect(res.status).toBe(200);

      const customerDebt = (res.body.data.byCustomer as CustomerReceivableItem[]).find(
        c => c.customerId === overdueCustomerId,
      );
      expect(customerDebt).toBeDefined();
      expect(customerDebt!.debt).toBe(800000);

      const orderDebt = (res.body.data.byOrder as OrderReceivableItem[]).find(
        o => o.customerId === overdueCustomerId,
      );
      expect(orderDebt).toBeDefined();
      expect(orderDebt!.isOverdue).toBe(true);
      expect(orderDebt!.daysOverdue).toBeGreaterThanOrEqual(2);

      expect(res.body.data.summary.totalReceivable).toBeGreaterThanOrEqual(800000);
      expect(res.body.data.summary.totalOverdue).toBeGreaterThanOrEqual(800000);
    });

    it('forbids WORKER from viewing receivables with 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/receivables')
        .set('Cookie', workerCookies);
      expect(res.status).toBe(403);
    });
  });
});
