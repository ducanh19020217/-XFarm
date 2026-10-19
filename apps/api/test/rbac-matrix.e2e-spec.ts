import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  'postgresql://xfarm:xfarm_secret@localhost:5442/xfarm_test?schema=public';
process.env.NODE_ENV = 'test';

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { cleanupDatabase } from './helpers/cleanup';

type Role = 'OWNER' | 'MANAGER' | 'ACCOUNTANT' | 'SALES' | 'WORKER';

const password = 'Admin@123';
const users: Record<Role, string> = {
  OWNER: 'admin@xfarm.local',
  MANAGER: 'manager@xfarm.local',
  ACCOUNTANT: 'accountant@xfarm.local',
  SALES: 'sales@xfarm.local',
  WORKER: 'worker@xfarm.local',
};

const modules = [
  { name: 'users', list: '/users', write: '/users', roles: ['OWNER'], readRoles: ['OWNER'] },
  {
    name: 'areas',
    list: '/areas',
    write: '/areas',
    roles: ['OWNER', 'MANAGER'],
    readRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'SALES', 'WORKER'],
  },
  {
    name: 'cycles',
    list: '/cycles',
    write: '/cycles',
    roles: ['OWNER', 'MANAGER'],
    readRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'SALES', 'WORKER'],
  },
  {
    name: 'activities',
    list: '/activities',
    write: '/activities',
    roles: ['OWNER', 'MANAGER', 'WORKER'],
    readRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'SALES', 'WORKER'],
  },
  {
    name: 'animal-groups',
    list: '/animal-groups',
    write: '/animal-groups',
    roles: ['OWNER', 'MANAGER'],
    readRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'SALES', 'WORKER'],
  },
  {
    name: 'animals',
    list: '/animals',
    write: '/animals',
    roles: ['OWNER', 'MANAGER'],
    readRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'SALES', 'WORKER'],
  },
  {
    name: 'calendar',
    list: '/calendar?month=2026-10',
    write: null,
    roles: [],
    readRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'SALES', 'WORKER'],
  },
  {
    name: 'items',
    list: '/items',
    write: '/items',
    roles: ['OWNER', 'MANAGER'],
    readRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'SALES', 'WORKER'],
  },
  {
    name: 'warehouses',
    list: '/warehouses',
    write: '/warehouses',
    roles: ['OWNER', 'MANAGER'],
    readRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'SALES', 'WORKER'],
  },
  {
    name: 'stock',
    list: '/stock/balances',
    write: '/stock/receipts',
    roles: ['OWNER', 'MANAGER'],
    readRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'WORKER'],
  },
  {
    name: 'suppliers',
    list: '/suppliers',
    write: '/suppliers',
    roles: ['OWNER', 'MANAGER', 'ACCOUNTANT'],
    readRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'SALES', 'WORKER'],
  },
  {
    name: 'purchase-orders',
    list: '/purchase-orders',
    write: '/purchase-orders',
    roles: ['OWNER', 'MANAGER', 'ACCOUNTANT'],
  },
  {
    name: 'harvest-lots',
    list: '/harvest-lots',
    write: '/harvest-lots/example',
    writeMethod: 'patch',
    roles: ['OWNER', 'MANAGER'],
    readRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'SALES'],
  },
  { name: 'alerts', list: '/alerts', write: '/alerts/read-all', roles: ['OWNER', 'MANAGER'] },
  {
    name: 'tasks',
    list: '/tasks',
    write: '/tasks',
    roles: ['OWNER', 'MANAGER'],
    readRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'WORKER'],
  },
  {
    name: 'employees',
    list: '/employees',
    write: '/employees',
    roles: ['OWNER', 'MANAGER'],
    readRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT'],
  },
  {
    name: 'attendance',
    list: '/attendance',
    write: '/attendance',
    roles: ['OWNER', 'MANAGER'],
    readRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'WORKER'],
  },
  { name: 'payrolls', list: '/payrolls', write: '/payrolls', roles: ['OWNER', 'ACCOUNTANT'] },
  { name: 'sync', list: null, write: '/sync/batch', roles: ['OWNER', 'MANAGER', 'WORKER'] },
  { name: 'media', list: null, write: '/media/presign', roles: ['OWNER', 'MANAGER', 'WORKER'] },
  {
    name: 'pages',
    list: '/pages',
    write: '/pages',
    roles: ['OWNER', 'MANAGER'],
    readRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'SALES'],
  },
  {
    name: 'posts',
    list: '/posts',
    write: '/posts',
    roles: ['OWNER', 'MANAGER', 'SALES'],
    readRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'SALES'],
  },
  {
    name: 'products',
    list: '/products',
    write: '/products',
    roles: ['OWNER', 'MANAGER', 'SALES'],
    readRoles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'SALES'],
  },
  {
    name: 'site-settings',
    list: '/site-settings',
    write: '/site-settings',
    roles: ['OWNER', 'MANAGER'],
  },
];

describe('RBAC matrix', () => {
  let app: INestApplication;
  const cookies = new Map<Role, string[]>();

  beforeAll(async () => {
    const { prisma } = await import('@xfarm/db');
    const argon2 = await import('argon2');
    await cleanupDatabase(prisma);
    const passwordHash = await argon2.hash(password);
    for (const [role, email] of Object.entries(users) as [Role, string][]) {
      await prisma.user.create({
        data: { email, passwordHash, fullName: `${role} User`, role, isActive: true },
      });
    }

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();

    for (const [role, email] of Object.entries(users) as [Role, string][]) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password });
      expect(response.status).toBe(200);
      const raw = response.headers['set-cookie'];
      cookies.set(role, Array.isArray(raw) ? raw : [raw as string]);
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each(modules)('$name: GET list và route ghi áp dụng đúng role', async (module) => {
    for (const role of Object.keys(users) as Role[]) {
      const cookie = cookies.get(role);
      if (module.list) {
        const listResponse = await request(app.getHttpServer())
          .get(`/api/v1${module.list}`)
          .set('Cookie', cookie!);
        expect(listResponse.status).toBe(
          (module.readRoles ?? module.roles).includes(role) ? 200 : 403,
        );
      }

      if (module.write) {
        const writeRequest = (
          module.writeMethod === 'patch'
            ? request(app.getHttpServer()).patch(`/api/v1${module.write}`)
            : request(app.getHttpServer()).post(`/api/v1${module.write}`)
        )
          .set('Cookie', cookie!)
          .send({});
        const writeResponse = await writeRequest;
        if (!module.roles.includes(role)) {
          expect(writeResponse.status).toBe(403);
        } else {
          // Body nghiệp vụ rỗng có thể bị validation; điều cần khẳng định ở đây là
          // request đã qua RolesGuard (không bị trả 403).
          expect([200, 201, 400, 404, 422]).toContain(writeResponse.status);
        }
      }
    }
  });
});
