import * as crypto from 'crypto';
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
import { AppModule } from '../src/app.module';
import { SequenceService } from '../src/common/sequence/sequence.service';
import { cleanupDatabase } from './helpers/cleanup';

describe('XFarm API E2E Tests', () => {
  let app: INestApplication;
  let sequenceService: SequenceService;

  beforeAll(async () => {
    // Direct clean and seed using prisma client
    const { prisma } = await import('@xfarm/db');
    const argon2 = await import('argon2');

    await cleanupDatabase(prisma);

    const passwordHash = await argon2.hash('Admin@123');
    const users = [
      { email: 'admin@xfarm.local', fullName: 'Admin Owner', role: 'OWNER' as const },
      { email: 'manager@xfarm.local', fullName: 'Manager User', role: 'MANAGER' as const },
      { email: 'accountant@xfarm.local', fullName: 'Accountant User', role: 'ACCOUNTANT' as const },
      { email: 'sales@xfarm.local', fullName: 'Sales User', role: 'SALES' as const },
      { email: 'worker@xfarm.local', fullName: 'Worker User', role: 'WORKER' as const },
    ];

    for (const u of users) {
      await prisma.user.create({
        data: {
          email: u.email,
          passwordHash,
          fullName: u.fullName,
          role: u.role,
          isActive: true,
        },
      });
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');

    await app.init();
    sequenceService = app.get<SequenceService>(SequenceService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('SequenceService', () => {
    it('sinh mã tăng dần đúng định dạng KEY-YYYY-0001', async () => {
      const year = new Date().getFullYear();
      const code1 = await sequenceService.next('TEST');
      const code2 = await sequenceService.next('TEST');

      expect(code1).toBe(`TEST-${year}-0001`);
      expect(code2).toBe(`TEST-${year}-0002`);
    });
  });

  it('có view stock_balances sau khi dựng database bằng migration', async () => {
    const rows = await (
      await import('@xfarm/db')
    ).prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'stock_balances'
      ) AS exists
    `;
    expect(rows[0]?.exists).toBe(true);
  });

  describe('Auth', () => {
    let ownerCookies: string[];

    it('login sai trả về 401', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'admin@xfarm.local',
        password: 'WrongPassword',
      });

      expect(res.status).toBe(401);
    });

    it('login đúng trả về 200 và chỉ trả user, token nằm trong cookies', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'admin@xfarm.local',
        password: 'Admin@123',
      });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('admin@xfarm.local');
      expect(res.body.user.role).toBe('OWNER');
      expect(res.body.accessToken).toBeUndefined();
      expect(res.body.refreshToken).toBeUndefined();

      // Check cookies
      const rawCookies = res.headers['set-cookie'];
      expect(rawCookies).toBeDefined();
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];
      ownerCookies = cookies;

      const accessTokenCookie = cookies.find((c: string) => c.startsWith('access_token='));
      const refreshTokenCookie = cookies.find((c: string) => c.startsWith('refresh_token='));

      expect(accessTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('Path=/api/v1/auth');
      expect(cookies.find((c: string) => c.startsWith('session='))).toContain('Path=/');
    });

    it('/auth/me khi không có token trả về 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('/auth/me khi có token trả về thông tin user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', ownerCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('admin@xfarm.local');
      expect(res.body.data.role).toBe('OWNER');
    });

    it('hai refresh đồng thời không hủy phiên và token mới vẫn dùng được', async () => {
      const results = await Promise.all(
        [1, 2].map(() =>
          request(app.getHttpServer()).post('/api/v1/auth/refresh').set('Cookie', ownerCookies),
        ),
      );

      expect(results.map((result) => result.status).sort()).toEqual([200, 401]);
      const successfulRefresh = results.find((result) => result.status === 200);
      expect(successfulRefresh?.body.accessToken).toBeUndefined();
      const newCookies = successfulRefresh?.headers['set-cookie'];
      expect(newCookies).toBeDefined();

      const nextRefresh = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', Array.isArray(newCookies) ? newCookies : [newCookies as string]);
      expect(nextRefresh.status).toBe(200);
    });

    it('dùng lại token đã revoke quá 30 giây sẽ hủy toàn bộ phiên', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@xfarm.local', password: 'Admin@123' });
      const initialCookies = Array.isArray(loginRes.headers['set-cookie'])
        ? loginRes.headers['set-cookie']
        : [loginRes.headers['set-cookie'] as string];
      const firstRefresh = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', initialCookies);
      const newCookies = Array.isArray(firstRefresh.headers['set-cookie'])
        ? firstRefresh.headers['set-cookie']
        : [firstRefresh.headers['set-cookie'] as string];
      const refreshCookie = initialCookies.find((cookie) => cookie.startsWith('refresh_token='));
      const rawToken = refreshCookie?.split(';')[0]?.slice('refresh_token='.length);
      const { prisma } = await import('@xfarm/db');
      const token = await prisma.refreshToken.findFirst({
        where: {
          tokenHash: crypto
            .createHash('sha256')
            .update(rawToken ?? '')
            .digest('hex'),
        },
      });
      expect(token).toBeDefined();
      await prisma.refreshToken.update({
        where: { id: token!.id },
        data: { revokedAt: new Date(Date.now() - 31_000) },
      });

      const reuseRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', initialCookies);
      expect(reuseRes.status).toBe(401);

      const afterReuseRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', newCookies);
      expect(afterReuseRes.status).toBe(401);
    });
  });

  describe('Users & RBAC', () => {
    let workerCookies: string[];
    let ownerCookies: string[];
    let createdUserId: string;

    beforeAll(async () => {
      // Login as WORKER
      const workerRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'worker@xfarm.local',
        password: 'Admin@123',
      });
      const workerRaw = workerRes.headers['set-cookie'];
      workerCookies = Array.isArray(workerRaw) ? workerRaw : [workerRaw as string];

      // Login as OWNER
      const ownerRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'admin@xfarm.local',
        password: 'Admin@123',
      });
      const ownerRaw = ownerRes.headers['set-cookie'];
      ownerCookies = Array.isArray(ownerRaw) ? ownerRaw : [ownerRaw as string];
    });

    it('WORKER gọi GET /users nhận 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Cookie', workerCookies);

      expect(res.status).toBe(403);
    });

    it('OWNER tạo user được, response không có passwordHash', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Cookie', ownerCookies)
        .send({
          email: 'newuser@xfarm.local',
          password: 'Password@123',
          fullName: 'Nguyễn Văn Mới',
          role: 'WORKER',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.email).toBe('newuser@xfarm.local');
      expect(res.body.data.passwordHash).toBeUndefined();

      createdUserId = res.body.data.id;
    });

    it('user mới đăng nhập được', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'newuser@xfarm.local',
        password: 'Password@123',
      });

      expect(res.status).toBe(200);
    });

    it('OWNER khóa user và user bị khóa không login được', async () => {
      // Khóa user
      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/users/${createdUserId}/status`)
        .set('Cookie', ownerCookies)
        .send({ isActive: false });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.isActive).toBe(false);

      // Thử đăng nhập lại -> 401
      const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'newuser@xfarm.local',
        password: 'Password@123',
      });

      expect(loginRes.status).toBe(401);
    });
  });

  describe('Media', () => {
    let ownerCookies: string[];

    beforeAll(async () => {
      const ownerRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'admin@xfarm.local',
        password: 'Admin@123',
      });
      const ownerRaw = ownerRes.headers['set-cookie'];
      ownerCookies = Array.isArray(ownerRaw) ? ownerRaw : [ownerRaw as string];
    });

    it('presign tệp ảnh trả về presigned PUT url', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/media/presign')
        .set('Cookie', ownerCookies)
        .send({
          filename: 'test.png',
          mime: 'image/png',
          size: 1024 * 50,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.uploadUrl).toBeDefined();
      expect(res.body.data.key).toContain('uploads/');
      expect(res.body.data.url).toContain('xfarm-media');
    });

    it('presign tệp quá 10MB trả về 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/media/presign')
        .set('Cookie', ownerCookies)
        .send({
          filename: 'large.png',
          mime: 'image/png',
          size: 11 * 1024 * 1024,
        });

      expect(res.status).toBe(400);
    });

    it('presign mime không hợp lệ trả về 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/media/presign')
        .set('Cookie', ownerCookies)
        .send({
          filename: 'virus.exe',
          mime: 'application/x-msdownload',
          size: 1024,
        });

      expect(res.status).toBe(400);
    });

    it('tải lên tệp qua presigned PUT URL và lưu media thành công', async () => {
      const presignRes = await request(app.getHttpServer())
        .post('/api/v1/media/presign')
        .set('Cookie', ownerCookies)
        .send({
          filename: 'avatar.png',
          mime: 'image/png',
          size: 16,
        });

      expect(presignRes.status).toBe(201);
      const { uploadUrl, key } = presignRes.body.data;

      // PUT file via presigned URL
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/png',
          'Content-Length': '16',
        },
        body: Buffer.from('test-image-bytes'),
      });
      expect(uploadRes.status).toBe(200);

      // POST /media to save record
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/media')
        .set('Cookie', ownerCookies)
        .send({
          key,
          alt: 'Avatar kiểm thử',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.id).toBeDefined();
      expect(createRes.body.data.key).toBe(key);
      expect(createRes.body.data.alt).toBe('Avatar kiểm thử');
      expect(createRes.body.data.size).toBe(16);
      expect(createRes.body.data.mime).toBe('image/png');
    });
  });
});
