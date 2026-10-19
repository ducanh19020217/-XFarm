import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
process.env.NODE_ENV = 'test';

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { cleanupDatabase } from './helpers/cleanup';
import { prisma, Prisma, TransactionType } from '@xfarm/db';

describe('Booking concurrency E2E', () => {
  let app: INestApplication;
  let ownerCookie: string[];
  let singleSlotId: string;
  let multiSlotId: string;

  beforeAll(async () => {
    await cleanupDatabase(prisma);
    const passwordHash = await argon2.hash('Admin@123');
    await prisma.user.create({
      data: {
        email: 'booking-owner@xfarm.local',
        passwordHash,
        fullName: 'Booking Owner',
        role: 'OWNER',
      },
    });
    await prisma.financeCategory.create({
      data: { name: 'Tour trải nghiệm', type: TransactionType.INCOME, systemKey: 'TOUR' },
    });
    const tour = await prisma.tour.create({
      data: {
        slug: `booking-${Date.now()}`,
        name: 'Tour booking test',
        description: 'Test',
        durationMinutes: 60,
        priceAdult: new Prisma.Decimal(100000),
        priceChild: new Prisma.Decimal(50000),
        capacity: 10,
        isPublished: true,
      },
    });
    const start = new Date(Date.now() + 86400000);
    const one = await prisma.tourSlot.create({
      data: { tourId: tour.id, startAt: start, capacity: 1 },
    });
    const three = await prisma.tourSlot.create({
      data: { tourId: tour.id, startAt: new Date(start.getTime() + 3600000), capacity: 3 },
    });
    singleSlotId = one.id;
    multiSlotId = three.id;
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'booking-owner@xfarm.local', password: 'Admin@123' });
    const cookies = login.headers['set-cookie'];
    ownerCookie = (Array.isArray(cookies) ? cookies : [cookies]).map(
      (cookie) => cookie.split(';', 1)[0],
    );
  });

  afterAll(async () => {
    await app.close();
    await cleanupDatabase(prisma);
  });

  it('accepts one of two concurrent requests for one remaining place', async () => {
    const responses = await Promise.all(
      [1, 2].map((i) =>
        request(app.getHttpServer())
          .post('/api/v1/public/bookings')
          .send({
            slotId: singleSlotId,
            customerName: `Khách ${i}`,
            phone: `09012345${String(i).padStart(2, '0')}`,
            adults: 1,
          }),
      ),
    );
    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
    expect(responses.filter((r) => r.status === 422)).toHaveLength(1);
    expect((await prisma.tourSlot.findUnique({ where: { id: singleSlotId } }))?.bookedCount).toBe(
      1,
    );
  });

  it('accepts only three of ten concurrent requests and returns a cancelled place', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        request(app.getHttpServer())
          .post('/api/v1/public/bookings')
          .send({
            slotId: multiSlotId,
            customerName: `Khách ${i}`,
            phone: `0901234${String(i).padStart(3, '0')}`,
            adults: 1,
          }),
      ),
    );
    expect(responses.filter((r) => r.status === 201)).toHaveLength(3);
    expect(responses.filter((r) => r.status === 422)).toHaveLength(7);
    const code = responses.find((r) => r.status === 201)?.body.code;
    const booking = await prisma.booking.findUnique({ where: { code } });
    await request(app.getHttpServer())
      .post(`/api/v1/bookings/${booking?.id}/cancel`)
      .set('Cookie', ownerCookie)
      .expect(201);
    expect((await prisma.tourSlot.findUnique({ where: { id: multiSlotId } }))?.bookedCount).toBe(2);
  });
});
