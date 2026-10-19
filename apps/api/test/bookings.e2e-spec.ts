import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
process.env.NODE_ENV = 'test';
process.env.SMTP_HOST = process.env.SMTP_HOST || 'localhost';
process.env.SMTP_PORT = process.env.SMTP_PORT || '1025';

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
  let workerCookie: string[];
  let singleSlotId: string;
  let multiSlotId: string;
  let paymentSlotId: string;

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
    await prisma.user.create({
      data: {
        email: 'booking-worker@xfarm.local',
        passwordHash,
        fullName: 'Booking Worker',
        role: 'WORKER',
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
    const payment = await prisma.tourSlot.create({
      data: { tourId: tour.id, startAt: new Date(start.getTime() + 7200000), capacity: 2 },
    });
    singleSlotId = one.id;
    multiSlotId = three.id;
    paymentSlotId = payment.id;
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();
    const login = async (email: string) => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Admin@123' });
      const cookies = response.headers['set-cookie'];
      return (Array.isArray(cookies) ? cookies : [cookies]).map(
        (cookie) => cookie.split(';', 1)[0],
      );
    };
    ownerCookie = await login('booking-owner@xfarm.local');
    workerCookie = await login('booking-worker@xfarm.local');
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

  it('rejects WORKER access to the booking list', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/bookings')
      .set('Cookie', workerCookie)
      .expect(403);
  });

  it('records a booking payment and TOUR income transaction atomically', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/public/bookings')
      .send({
        slotId: paymentSlotId,
        customerName: 'Khách thanh toán',
        phone: '0912345678',
        adults: 1,
      })
      .expect(201);
    const booking = await prisma.booking.findUnique({ where: { code: created.body.code } });
    expect(booking).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/api/v1/bookings/${booking?.id}/payments`)
      .set('Cookie', ownerCookie)
      .send({ amount: 100000, method: 'BANK_TRANSFER' })
      .expect(201);

    const updated = await prisma.booking.findUnique({ where: { id: booking?.id } });
    expect(updated?.paymentStatus).toBe('PAID');
    expect(await prisma.payment.count({ where: { bookingId: booking?.id } })).toBe(1);
    expect(
      await prisma.transaction.count({
        where: {
          refType: 'Booking',
          refId: booking?.id,
          type: TransactionType.INCOME,
          category: { systemKey: 'TOUR' },
        },
      }),
    ).toBe(1);

    await request(app.getHttpServer())
      .post(`/api/v1/bookings/${booking?.id}/payments`)
      .set('Cookie', ownerCookie)
      .send({ amount: 1, method: 'BANK_TRANSFER' })
      .expect(422);
    expect(await prisma.payment.count({ where: { bookingId: booking?.id } })).toBe(1);

    const detailRes = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${booking?.id}`)
      .set('Cookie', ownerCookie)
      .expect(200);
    expect(detailRes.body.data.id).toBe(booking?.id);
    expect(detailRes.body.data.payments).toHaveLength(1);
  });

  it('sends the booking email when Mailpit is available', async () => {
    let mailpitAvailable = false;
    try {
      mailpitAvailable = (await fetch('http://localhost:8025/api/v1/messages')).ok;
    } catch {
      // Mailpit is optional in environments that do not run the email acceptance check.
    }
    if (!mailpitAvailable) {
      console.warn('SKIP email booking: Mailpit không chạy tại localhost:8025');
      return;
    }

    const created = await request(app.getHttpServer())
      .post('/api/v1/public/bookings')
      .send({
        slotId: paymentSlotId,
        customerName: 'Khách nhận email',
        phone: '0987654321',
        email: 'booking-test@example.com',
        adults: 1,
      })
      .expect(201);
    let messages = '';
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await fetch('http://localhost:8025/api/v1/messages');
      messages = await response.text();
      if (messages.includes(created.body.code)) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(messages).toContain(created.body.code);
  });
});
