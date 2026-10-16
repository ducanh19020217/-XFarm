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

describe('Cycles API E2E', () => {
  let app: INestApplication;
  let ownerCookies: string[];
  let managerCookies: string[];
  let workerCookies: string[];
  let areaId: string;
  const users = [
    ['cycle-owner@xfarm.local', 'OWNER'],
    ['cycle-manager@xfarm.local', 'MANAGER'],
    ['cycle-worker@xfarm.local', 'WORKER'],
  ] as const;

  async function login(email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Admin@123' });
    const rawCookies = response.headers['set-cookie'];
    return Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];
  }

  beforeAll(async () => {
    execSync(
      `DATABASE_URL="${testDbUrl}" pnpm --filter @xfarm/db exec prisma db push --skip-generate --accept-data-loss`,
      { stdio: 'pipe' },
    );
    const { prisma } = await import('@xfarm/db');
    const argon2 = await import('argon2');
    await prisma.auditLog.deleteMany();
    await prisma.animalEvent.deleteMany();
    await prisma.animal.deleteMany();
    await prisma.animalGroup.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.cycle.deleteMany();
    await prisma.area.deleteMany();
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: users.map(([email]) => email) } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: users.map(([email]) => email) } } });

    const passwordHash = await argon2.hash('Admin@123');
    for (const user of users) {
      await prisma.user.create({
        data: { email: user[0], fullName: user[1], role: user[1], passwordHash },
      });
    }
    const area = await prisma.area.create({
      data: { code: 'TEST-FIELD', name: 'Lô kiểm thử', type: 'FIELD' },
    });
    areaId = area.id;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();

    ownerCookies = await login('cycle-owner@xfarm.local');
    managerCookies = await login('cycle-manager@xfarm.local');
    workerCookies = await login('cycle-worker@xfarm.local');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('đi đủ luồng hợp lệ và trả chi tiết mùa vụ', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/cycles')
      .set('Cookie', managerCookies)
      .send({
        name: 'Rau cải vụ test',
        kind: 'CROP',
        areaId,
        species: 'Cải xanh',
        startDate: '2026-10-16',
      });
    expect(created.status).toBe(201);
    expect(created.body.data.code).toMatch(/^CY-\d{4}-\d{4}$/);
    expect(created.body.data.status).toBe('PLANNED');
    const id = created.body.data.id;

    for (const to of ['ACTIVE', 'HARVESTING', 'CLOSED']) {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/cycles/${id}/transition`)
        .set('Cookie', managerCookies)
        .send({ to });
      expect(response.status).toBe(201);
    }

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/cycles/${id}`)
      .set('Cookie', workerCookies);
    expect(detail.status).toBe(200);
    expect(detail.body.data.area.id).toBe(areaId);
    expect(detail.body.data.activityCount).toBe(0);
    expect(detail.body.data.latestActivityAt).toBeNull();
  });

  it('chặn chuyển tắt, chuyển từ CLOSED và quyền WORKER', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/cycles')
      .set('Cookie', ownerCookies)
      .send({
        name: 'Mùa vụ chuyển trạng thái',
        kind: 'AQUA',
        areaId,
        species: 'Cá rô phi',
        startDate: '2026-10-16',
      });
    const id = create.body.data.id;

    const shortcut = await request(app.getHttpServer())
      .post(`/api/v1/cycles/${id}/transition`)
      .set('Cookie', ownerCookies)
      .send({ to: 'CLOSED' });
    expect(shortcut.status).toBe(422);

    const forbidden = await request(app.getHttpServer())
      .post(`/api/v1/cycles/${id}/transition`)
      .set('Cookie', workerCookies)
      .send({ to: 'ACTIVE' });
    expect(forbidden.status).toBe(403);

    for (const to of ['ACTIVE', 'HARVESTING', 'CLOSED']) {
      await request(app.getHttpServer())
        .post(`/api/v1/cycles/${id}/transition`)
        .set('Cookie', ownerCookies)
        .send({ to });
    }
    const afterClosed = await request(app.getHttpServer())
      .post(`/api/v1/cycles/${id}/transition`)
      .set('Cookie', ownerCookies)
      .send({ to: 'ACTIVE' });
    expect(afterClosed.status).toBe(422);
  });

  it('sinh mã không trùng khi tạo đồng thời', async () => {
    const payload = {
      name: 'Mùa vụ đồng thời',
      kind: 'LIVESTOCK',
      areaId,
      species: 'Gà',
      startDate: '2026-10-16',
    };
    const responses = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post('/api/v1/cycles')
          .set('Cookie', ownerCookies)
          .send(payload),
      ),
    );
    expect(responses.every((response) => response.status === 201)).toBe(true);
    expect(new Set(responses.map((response) => response.body.data.code)).size).toBe(2);
  });

  it('chỉ cho một request chuyển trạng thái đồng thời thành công', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/cycles')
      .set('Cookie', ownerCookies)
      .send({
        name: 'Mùa vụ race transition',
        kind: 'CROP',
        areaId,
        species: 'Rau cải',
        startDate: '2026-10-16',
      });
    const id = create.body.data.id;

    await request(app.getHttpServer())
      .post(`/api/v1/cycles/${id}/transition`)
      .set('Cookie', ownerCookies)
      .send({ to: 'ACTIVE' })
      .expect(201);

    const [harvesting, cancelled] = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/v1/cycles/${id}/transition`)
        .set('Cookie', ownerCookies)
        .send({ to: 'HARVESTING' }),
      request(app.getHttpServer())
        .post(`/api/v1/cycles/${id}/transition`)
        .set('Cookie', ownerCookies)
        .send({ to: 'CANCELLED' }),
    ]);
    const responses = [harvesting, cancelled];
    const successful = responses.filter((response) => response.status === 201);
    const failed = responses.filter((response) => response.status !== 201);

    expect(successful).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect([409, 422]).toContain(failed[0].status);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/cycles/${id}`)
      .set('Cookie', workerCookies)
      .expect(200);
    expect(detail.body.data.status).toBe(successful[0].body.data.status);
  });
});
