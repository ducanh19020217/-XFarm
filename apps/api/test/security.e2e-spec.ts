import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  'postgresql://xfarm:xfarm_secret@localhost:5442/xfarm_test?schema=public';
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { configureSecurity } from '../src/config/security.config';

describe('API security', () => {
  let app: INestApplication;
  let ownerCookies: string[];

  beforeAll(async () => {
    const { prisma } = await import('@xfarm/db');
    await prisma.user.upsert({
      where: { email: 'security-owner@xfarm.local' },
      update: { isActive: true },
      create: {
        email: 'security-owner@xfarm.local',
        passwordHash: await argon2.hash('Admin@123'),
        fullName: 'Security Owner',
        role: 'OWNER',
        isActive: true,
      },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureSecurity(app);
    app.setGlobalPrefix('api/v1');
    await app.init();

    const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: 'security-owner@xfarm.local',
      password: 'Admin@123',
    });
    const rawCookies = login.headers['set-cookie'];
    ownerCookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
  });

  afterAll(async () => {
    await app.close();
  });

  it('có header bảo mật của Helmet', async () => {
    const response = await request(app.getHttpServer()).get('/docs');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('từ chối CORS từ origin lạ', async () => {
    const response = await request(app.getHttpServer())
      .options('/api/v1/auth/login')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('giới hạn login ở 10 request mỗi phút trên một IP', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app.getHttpServer()).post('/api/v1/auth/login').send({
          email: 'security-owner@xfarm.local',
          password: 'Admin@123',
        }),
      ),
    );

    expect(responses.filter((response) => response.status === 429)).toHaveLength(1);
  });

  it('từ chối MIME không nằm trong danh sách cho phép khi presign', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/media/presign')
      .set('Cookie', ownerCookies)
      .send({ filename: 'script.sh', mime: 'application/x-sh', size: 100 });

    expect([400, 422]).toContain(response.status);
  });
});
