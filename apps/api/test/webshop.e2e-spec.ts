import * as path from 'path';
import * as dotenv from 'dotenv';

const rootEnvPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnvPath });
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  'postgresql://xfarm:xfarm_secret@localhost:5442/xfarm_test?schema=public';
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { ItemCategory, prisma } from '@xfarm/db';
import { AppModule } from '../src/app.module';
import { cleanupDatabase } from './helpers/cleanup';

describe('Webshop API E2E Tests', () => {
  let app: INestApplication;
  let productId: string;
  let draftProductId: string;

  beforeAll(async () => {
    await cleanupDatabase(prisma);
    const warehouse = await prisma.warehouse.create({
      data: { code: 'WH-WEBSHOP', name: 'Kho webshop' },
    });
    const item = await prisma.item.create({
      data: {
        sku: 'WEBSHOP-ITEM',
        name: 'Rau webshop',
        category: ItemCategory.PRODUCE,
        unit: 'kg',
        isSellable: true,
      },
    });
    await prisma.stockLot.create({
      data: {
        itemId: item.id,
        warehouseId: warehouse.id,
        lotCode: 'WEBSHOP-LOT',
        unitCost: 20,
      },
    });
    const lot = await prisma.stockLot.findFirstOrThrow({ where: { itemId: item.id } });
    await prisma.stockMove.create({
      data: {
        type: 'IN',
        itemId: item.id,
        stockLotId: lot.id,
        toWarehouseId: warehouse.id,
        quantity: 10,
        unitCost: 20,
      },
    });
    const product = await prisma.product.create({
      data: {
        slug: 'webshop-rau',
        name: 'Rau webshop',
        itemId: item.id,
        description: 'Rau sạch',
        price: 125,
        unit: 'kg',
        isPublished: true,
      },
    });
    productId = product.id;
    const draft = await prisma.product.create({
      data: {
        slug: 'webshop-draft',
        name: 'Sản phẩm nháp',
        itemId: item.id,
        description: 'Chưa công khai',
        price: 100,
        unit: 'kg',
        isPublished: false,
      },
    });
    draftProductId = draft.id;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await cleanupDatabase(prisma);
  });

  it('bỏ qua giá client, dùng giá Product và tái sử dụng Customer theo SĐT', async () => {
    const payload = {
      fullName: 'Khách webshop',
      phone: '0912345678',
      address: 'Hà Nội',
      paymentMethod: 'COD',
      items: [{ productId, quantity: 2, price: 1 }],
    };
    const first = await request(app.getHttpServer())
      .post('/api/v1/public/orders')
      .send(payload)
      .expect(201);
    expect(first.body.total).toBe(250);

    const second = await request(app.getHttpServer())
      .post('/api/v1/public/orders')
      .send({ ...payload, fullName: 'Tên mới' })
      .expect(201);
    expect(await prisma.customer.count({ where: { phone: payload.phone } })).toBe(1);
    const order = await prisma.salesOrder.findUniqueOrThrow({
      where: { code: first.body.code },
      include: { lines: true },
    });
    expect(order.total.toNumber()).toBe(250);
    expect(order.lines[0]?.unitPrice.toNumber()).toBe(125);
    expect(second.body.code).not.toBe(first.body.code);
  });

  it('tra cứu đúng cần cả mã đơn và SĐT, sản phẩm chưa publish trả 422', async () => {
    const order = await prisma.salesOrder.findFirstOrThrow({ orderBy: { createdAt: 'asc' } });
    await request(app.getHttpServer())
      .get('/api/v1/public/orders/lookup')
      .query({ code: order.code, phone: '0912345678' })
      .expect(200)
      .expect((response) => {
        expect(response.body.lines[0].productName).toBe('Rau webshop');
        expect(response.body).not.toHaveProperty('customer');
      });
    await request(app.getHttpServer())
      .get('/api/v1/public/orders/lookup')
      .query({ code: order.code, phone: '0987654321' })
      .expect(404);
    await request(app.getHttpServer())
      .post('/api/v1/public/orders')
      .send({
        fullName: 'Khách nháp',
        phone: '0934567890',
        address: 'Hà Nội',
        paymentMethod: 'COD',
        items: [{ productId: draftProductId, quantity: 1 }],
      })
      .expect(422);
  });
});
