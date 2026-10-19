import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  'postgresql://xfarm:xfarm_secret@localhost:5442/xfarm_test?schema=public';
process.env.NODE_ENV = 'test';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanupDatabase } from './helpers/cleanup';

describe('IoT API E2E', () => {
  let app: INestApplication;
  let cookies: string[];
  let areaId: string;
  let sensorId: string;
  let apiKey: string;

  beforeAll(async () => {
    const { prisma } = await import('@xfarm/db');
    await cleanupDatabase(prisma);
    const argon2 = await import('argon2');
    await prisma.user.create({
      data: {
        email: 'iot-owner@xfarm.local',
        fullName: 'IoT Owner',
        passwordHash: await argon2.hash('Admin@123'),
        role: 'OWNER',
      },
    });
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'iot-owner@xfarm.local', password: 'Admin@123' });
    cookies = login.headers['set-cookie'];
    const area = await request(app.getHttpServer())
      .post('/api/v1/areas')
      .set('Cookie', cookies)
      .send({ name: 'Ao cá IoT', type: 'POND' });
    areaId = area.body.data.id;
    const sensor = await request(app.getHttpServer())
      .post('/api/v1/sensors')
      .set('Cookie', cookies)
      .send({ name: 'DO', type: 'DO', unit: 'mg/L', areaId });
    sensorId = sensor.body.data.id;
    apiKey = sensor.body.apiKey;
    await request(app.getHttpServer())
      .post('/api/v1/alert-rules')
      .set('Cookie', cookies)
      .send({ sensorId, op: 'LT', threshold: 4, cooldownMinutes: 30 });
  }, 90000);

  afterAll(async () => app?.close());

  it('từ chối key sai và nhận batch, tạo đúng một alert trong cooldown', async () => {
    const invalid = await request(app.getHttpServer())
      .post('/api/v1/iot/readings')
      .set('X-Sensor-Key', 'invalid')
      .send({ readings: [{ value: 3.2 }] });
    expect(invalid.status).toBe(401);
    const first = await request(app.getHttpServer())
      .post('/api/v1/iot/readings')
      .set('X-Sensor-Key', apiKey)
      .send({ readings: [{ value: 5 }, { value: 3.2 }, { value: 5 }] });
    expect(first.status).toBe(201);
    const second = await request(app.getHttpServer())
      .post('/api/v1/iot/readings')
      .set('X-Sensor-Key', apiKey)
      .send({ readings: [{ value: 3 }] });
    expect(second.status).toBe(201);
    const alerts = await request(app.getHttpServer())
      .get('/api/v1/alerts')
      .set('Cookie', cookies)
      .query({ type: 'SENSOR_THRESHOLD' });
    expect(alerts.body.data).toHaveLength(1);
  });

  it('tổng hợp bucket 1h bằng AVG và không lộ hash sensor', async () => {
    const from = new Date(Date.now() - 60_000).toISOString();
    const to = new Date(Date.now() + 60_000).toISOString();
    const series = await request(app.getHttpServer())
      .get('/api/v1/iot/series')
      .set('Cookie', cookies)
      .query({ sensorId, from, to, bucket: '1h' });
    expect(series.status).toBe(200);
    expect(series.body.data[0].avg).toBeCloseTo(4.04, 1);
    const sensors = await request(app.getHttpServer())
      .get('/api/v1/sensors')
      .set('Cookie', cookies);
    expect(sensors.body.data[0].apiKeyHash).toBeUndefined();
    expect(sensors.body.data[0].apiKey).toBeUndefined();
  });
});
