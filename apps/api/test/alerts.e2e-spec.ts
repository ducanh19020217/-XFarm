import path from 'path';
import * as dotenv from 'dotenv';

const rootEnvPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnvPath });
const testDbUrl =
  process.env.DATABASE_URL_TEST ||
  'postgresql://xfarm:xfarm_secret@localhost:5442/xfarm_test?schema=public';
process.env.DATABASE_URL = testDbUrl;
process.env.NODE_ENV = 'test';

import { execSync } from 'child_process';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanupDatabase } from './helpers/cleanup';

describe('Alerts API E2E', () => {
  let app: INestApplication;
  let ownerCookies: string[];
  let workerCookies: string[];

  async function login(email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Admin@123' });
    const rawCookies = response.headers['set-cookie'];
    return Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];
  }

  beforeAll(async () => {
    const { prisma } = await import('@xfarm/db');
    await cleanupDatabase(prisma);

    // 1. Sync and seed test database
    execSync(
      `DATABASE_URL="${testDbUrl}" pnpm --filter @xfarm/db exec prisma db push --skip-generate --accept-data-loss`,
      { stdio: 'pipe' },
    );
    execSync(`DATABASE_URL="${testDbUrl}" pnpm --filter @xfarm/db exec tsx prisma/seed.ts`, {
      stdio: 'pipe',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();

    ownerCookies = await login('admin@xfarm.local');
    workerCookies = await login('worker@xfarm.local');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('chặn người dùng không phải OWNER gọi POST /alerts/run-inventory-check', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/alerts/run-inventory-check')
      .set('Cookie', workerCookies);

    expect(res.status).toBe(403);
  });

  it('dữ liệu seed sinh đúng cảnh báo LOW_STOCK và LOT_EXPIRING khi chạy run-inventory-check', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/alerts/run-inventory-check')
      .set('Cookie', ownerCookies);

    expect([200, 201]).toContain(res.status);
    expect(res.body.data.lowStockCount).toBeGreaterThan(0);
    expect(res.body.data.expiringCount).toBeGreaterThan(0);

    const { prisma } = await import('@xfarm/db');
    const alerts = await prisma.alert.findMany();
    expect(alerts.length).toBeGreaterThan(0);

    const lowStockAlerts = alerts.filter((a) => a.type === 'LOW_STOCK');
    const lotExpiringAlerts = alerts.filter((a) => a.type === 'LOT_EXPIRING');

    expect(lowStockAlerts.length).toBeGreaterThan(0);
    expect(lotExpiringAlerts.length).toBeGreaterThan(0);

    // Kiểm tra message tiếng Việt
    expect(lowStockAlerts[0].message).toContain('dưới mức tối thiểu');
    expect(lotExpiringAlerts[0].message).toContain('sẽ hết hạn');
  });

  it('chạy lần 2 không tạo trùng cảnh báo nhờ dedupeKey', async () => {
    const { prisma } = await import('@xfarm/db');
    const countBefore = await prisma.alert.count();

    const res = await request(app.getHttpServer())
      .post('/api/v1/alerts/run-inventory-check')
      .set('Cookie', ownerCookies);

    expect([200, 201]).toContain(res.status);

    const countAfter = await prisma.alert.count();
    expect(countAfter).toBe(countBefore);
  });

  it('GET /alerts/unread-count trả về số cảnh báo chưa đọc', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/alerts/unread-count')
      .set('Cookie', ownerCookies);

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBeGreaterThan(0);
  });

  it('GET /alerts hỗ trợ phân trang và lọc theo unread và type', async () => {
    const resAll = await request(app.getHttpServer())
      .get('/api/v1/alerts?unread=true')
      .set('Cookie', ownerCookies);

    expect(resAll.status).toBe(200);
    expect(resAll.body.data).toBeDefined();
    expect(resAll.body.total).toBeGreaterThan(0);

    const resType = await request(app.getHttpServer())
      .get('/api/v1/alerts?type=LOW_STOCK')
      .set('Cookie', ownerCookies);

    expect(resType.status).toBe(200);
    expect(resType.body.data.every((a: { type: string }) => a.type === 'LOW_STOCK')).toBe(true);
  });

  it('đánh dấu một cảnh báo đã đọc thì unread-count giảm', async () => {
    const unreadResBefore = await request(app.getHttpServer())
      .get('/api/v1/alerts/unread-count')
      .set('Cookie', ownerCookies);
    const countBefore = unreadResBefore.body.data.count;

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/alerts?unread=true')
      .set('Cookie', ownerCookies);
    const firstAlert = listRes.body.data[0];
    expect(firstAlert).toBeDefined();

    const patchRes = await request(app.getHttpServer())
      .patch(`/api/v1/alerts/${firstAlert.id}/read`)
      .set('Cookie', ownerCookies);

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.readAt).not.toBeNull();

    const unreadResAfter = await request(app.getHttpServer())
      .get('/api/v1/alerts/unread-count')
      .set('Cookie', ownerCookies);
    expect(unreadResAfter.body.data.count).toBe(countBefore - 1);
  });

  it('POST /alerts/read-all đánh dấu toàn bộ cảnh báo là đã đọc', async () => {
    const readAllRes = await request(app.getHttpServer())
      .post('/api/v1/alerts/read-all')
      .set('Cookie', ownerCookies);

    expect([200, 201]).toContain(readAllRes.status);

    const unreadRes = await request(app.getHttpServer())
      .get('/api/v1/alerts/unread-count')
      .set('Cookie', ownerCookies);
    expect(unreadRes.body.data.count).toBe(0);
  });
});
