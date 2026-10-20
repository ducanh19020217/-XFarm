import * as dotenv from 'dotenv';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import request from 'supertest';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
process.env.NODE_ENV = 'development';

async function main() {
  const [{ Test }, { AppModule }, { prisma }] = await Promise.all([
    import('@nestjs/testing'),
    // Use the tsc output so Nest receives emitDecoratorMetadata (tsx does not emit it).
    import('../dist/src/app.module.js'),
    import('@xfarm/db'),
  ]);
  const { default: cookieParser } = await import('cookie-parser');
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  await app.init();

  const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
    email: 'admin@xfarm.local',
    password: 'Admin@123',
  });
  if (login.status !== 200) throw new Error(`OWNER login failed: ${login.status}`);
  const cookies = login.headers['set-cookie'];
  const sensor = await prisma.sensor.findFirst({ where: { isActive: true }, select: { id: true } });
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const to = now.toISOString();
  const endpoints = [
    { name: 'activities', path: (size: number) => `/api/v1/activities?page=1&pageSize=${size}` },
    {
      name: 'stock/balances',
      path: (size: number) => `/api/v1/stock/balances?page=1&pageSize=${size}`,
    },
    { name: 'stock/moves', path: (size: number) => `/api/v1/stock/moves?page=1&pageSize=${size}` },
    {
      name: 'sales-orders',
      path: (size: number) => `/api/v1/sales-orders?page=1&pageSize=${size}`,
    },
    {
      name: 'transactions',
      path: (size: number) => `/api/v1/transactions?page=1&pageSize=${size}`,
    },
    { name: 'bookings', path: (size: number) => `/api/v1/bookings?page=1&pageSize=${size}` },
    {
      name: 'iot/series',
      path: () =>
        `/api/v1/iot/series?${sensor ? `sensorId=${sensor.id}` : 'areaId=missing'}&bucket=1h&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    },
    { name: 'dashboard/summary', path: () => '/api/v1/dashboard/summary' },
    { name: 'dashboard/charts', path: () => '/api/v1/dashboard/charts?months=12' },
    { name: 'reports/cycles', path: () => '/api/v1/reports/cycles' },
  ];
  const results: Array<{
    endpoint: string;
    pageSize: number | string;
    status: number;
    queries: number;
    ms: number;
  }> = [];
  let queryTotal = 0;
  prisma.$on('query', () => {
    queryTotal += 1;
  });
  for (const endpoint of endpoints) {
    for (const pageSize of endpoint.name.startsWith('dashboard') ||
    endpoint.name.startsWith('reports') ||
    endpoint.name === 'iot/series'
      ? ['-']
      : [20, 100]) {
      const queryStart = queryTotal;
      const started = performance.now();
      const response = await request(app.getHttpServer())
        .get(endpoint.path(Number(pageSize)))
        .set('Cookie', cookies);
      const ms = Math.round(performance.now() - started);
      results.push({
        endpoint: endpoint.name,
        pageSize,
        status: response.status,
        queries: queryTotal - queryStart,
        ms,
      });
    }
  }
  console.log('| Endpoint | pageSize | HTTP | Queries | ms |');
  console.log('|---|---:|---:|---:|---:|');
  for (const result of results)
    console.log(
      `| ${result.endpoint} | ${result.pageSize} | ${result.status} | ${result.queries} | ${result.ms} |`,
    );
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
