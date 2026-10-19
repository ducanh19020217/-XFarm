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
import { cleanupDatabase } from './helpers/cleanup';

describe('Animal & AnimalGroup & AnimalEvent API (e2e)', () => {
  let app: INestApplication;
  let ownerCookies: string[];
  let managerCookies: string[];
  let workerCookies: string[];
  let accountantCookies: string[];

  let barnAreaId: string;
  let cropCycleId: string;
  let livestockCycleId: string;
  let aquaCycleId: string;

  beforeAll(async () => {
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

    const barn = await prisma.area.create({
      data: {
        code: 'BARN-01',
        name: 'Chuồng bò số 1',
        type: 'BARN',
        isActive: true,
      },
    });
    barnAreaId = barn.id;

    const cropCycle = await prisma.cycle.create({
      data: {
        code: 'CY-CROP-01',
        name: 'Vụ lúa hè thu',
        kind: 'CROP',
        areaId: barn.id,
        species: 'Lúa',
        startDate: new Date(),
      },
    });
    cropCycleId = cropCycle.id;

    const livestockCycle = await prisma.cycle.create({
      data: {
        code: 'CY-LIVE-01',
        name: 'Đàn bò sinh sản 2026',
        kind: 'LIVESTOCK',
        areaId: barn.id,
        species: 'Bò',
        startDate: new Date(),
      },
    });
    livestockCycleId = livestockCycle.id;

    const aquaCycle = await prisma.cycle.create({
      data: {
        code: 'CY-AQUA-01',
        name: 'Lứa cá tra 2026',
        kind: 'AQUA',
        areaId: barn.id,
        species: 'Cá tra',
        startDate: new Date(),
      },
    });
    aquaCycleId = aquaCycle.id;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');

    await app.init();

    // Helper to login and get cookies
    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Admin@123' });
      const raw = res.headers['set-cookie'];
      return Array.isArray(raw) ? raw : [raw as string];
    };

    ownerCookies = await login('admin@xfarm.local');
    managerCookies = await login('manager@xfarm.local');
    workerCookies = await login('worker@xfarm.local');
    accountantCookies = await login('accountant@xfarm.local');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('AnimalGroup Endpoints', () => {
    let createdGroupId: string;

    it('tạo đàn gắn vào cycle CROP thì trả về 422', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/animal-groups')
        .set('Cookie', ownerCookies)
        .send({
          cycleId: cropCycleId,
          areaId: barnAreaId,
          species: 'Bò',
          headCount: 10,
        });

      expect(res.status).toBe(422);
    });

    it('tạo đàn gắn vào cycle LIVESTOCK thành công với mã tự sinh AG-0001', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/animal-groups')
        .set('Cookie', ownerCookies)
        .send({
          cycleId: livestockCycleId,
          areaId: barnAreaId,
          species: 'Bò Wagyu',
          breed: 'Wagyu F1',
          headCount: 15,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.code).toBe('AG-0001');
      expect(res.body.data.species).toBe('Bò Wagyu');
      expect(res.body.data.headCount).toBe(15);

      createdGroupId = res.body.data.id;
    });

    it('tạo đàn thứ hai tự sinh AG-0002', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/animal-groups')
        .set('Cookie', managerCookies)
        .send({
          cycleId: aquaCycleId,
          areaId: barnAreaId,
          species: 'Cá tra',
          headCount: 1000,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('AG-0002');
    });

    it('WORKER không có quyền tạo đàn (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/animal-groups')
        .set('Cookie', workerCookies)
        .send({
          cycleId: livestockCycleId,
          areaId: barnAreaId,
          species: 'Bò',
          headCount: 5,
        });

      expect(res.status).toBe(403);
    });

    it('GET /animal-groups hỗ trợ lọc theo cycleId và areaId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/animal-groups?cycleId=${livestockCycleId}&areaId=${barnAreaId}`)
        .set('Cookie', workerCookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].id).toBe(createdGroupId);
    });

    it('PATCH /animal-groups/:id sửa headCount và notes thành công', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/animal-groups/${createdGroupId}`)
        .set('Cookie', managerCookies)
        .send({
          headCount: 18,
          notes: 'Nhập thêm 3 con',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.headCount).toBe(18);
      expect(res.body.data.notes).toBe('Nhập thêm 3 con');
    });

    it('GET /animal-groups/:id kèm số con theo status', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/animal-groups/${createdGroupId}`)
        .set('Cookie', accountantCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdGroupId);
      expect(res.body.data.animalCounts).toBeDefined();
      expect(res.body.data.animalCounts.ALIVE).toBe(0);
      expect(res.body.data.animalCounts.DEAD).toBe(0);
      expect(res.body.data.animalCounts.SOLD).toBe(0);
    });
  });

  describe('Animal Endpoints', () => {
    let motherId: string;
    let maleId: string;
    let animalGroupId: string;

    beforeAll(async () => {
      const groupRes = await request(app.getHttpServer())
        .get('/api/v1/animal-groups')
        .set('Cookie', ownerCookies);
      animalGroupId = groupRes.body.data[0].id;
    });

    it('tạo mẹ (con cái) thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/animals')
        .set('Cookie', ownerCookies)
        .send({
          tag: 'COW-MOTHER-01',
          groupId: animalGroupId,
          species: 'Bò Wagyu',
          breed: 'Wagyu',
          sex: 'FEMALE',
          status: 'ALIVE',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.tag).toBe('COW-MOTHER-01');
      expect(res.body.data.sex).toBe('FEMALE');

      motherId = res.body.data.id;
    });

    it('tạo con đực thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/animals')
        .set('Cookie', managerCookies)
        .send({
          tag: 'COW-BULL-01',
          groupId: animalGroupId,
          species: 'Bò Wagyu',
          sex: 'MALE',
        });

      expect(res.status).toBe(201);
      maleId = res.body.data.id;
    });

    it('tag trùng thì trả về 409 hoặc 422', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/animals')
        .set('Cookie', ownerCookies)
        .send({
          tag: 'COW-MOTHER-01',
          species: 'Bò',
        });

      expect([409, 422]).toContain(res.status);
    });

    it('tạo animal với motherId không phải con cái thì 422', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/animals')
        .set('Cookie', ownerCookies)
        .send({
          tag: 'CALF-FAIL-01',
          species: 'Bò Wagyu',
          motherId: maleId, // maleId is MALE
        });

      expect(res.status).toBe(422);
    });

    it('tạo con non với motherId là con cái thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/animals')
        .set('Cookie', ownerCookies)
        .send({
          tag: 'CALF-SUCCESS-01',
          species: 'Bò Wagyu',
          motherId,
          sex: 'MALE',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.motherId).toBe(motherId);
    });

    it('GET /animals lọc groupId, status, species và search theo tag', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/animals?groupId=${animalGroupId}&status=ALIVE&search=COW-MOTHER`)
        .set('Cookie', workerCookies);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].tag).toBe('COW-MOTHER-01');
    });

    it('GET /animals/:id kèm mẹ, danh sách con, sự kiện', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/animals/${motherId}`)
        .set('Cookie', workerCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(motherId);
      expect(res.body.data.offspring).toBeDefined();
      expect(res.body.data.offspring.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.events).toBeDefined();
    });

    it('PATCH /animals/:id cập nhật ghi chú thành công', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/animals/${motherId}`)
        .set('Cookie', managerCookies)
        .send({
          notes: 'Mẹ khỏe mạnh, đã tiêm phòng',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.notes).toBe('Mẹ khỏe mạnh, đã tiêm phòng');
    });
  });

  describe('AnimalEvent Endpoints & Rules', () => {
    let testAnimalId: string;
    let motherForBirthId: string;

    beforeAll(async () => {
      // Create animal for event tests
      const res1 = await request(app.getHttpServer())
        .post('/api/v1/animals')
        .set('Cookie', ownerCookies)
        .send({
          tag: 'EVENT-TEST-01',
          species: 'Bò Wagyu',
          sex: 'FEMALE',
        });
      testAnimalId = res1.body.data.id;

      const res2 = await request(app.getHttpServer())
        .post('/api/v1/animals')
        .set('Cookie', ownerCookies)
        .send({
          tag: 'BIRTH-MOTHER-01',
          species: 'Bò Wagyu',
          sex: 'FEMALE',
        });
      motherForBirthId = res2.body.data.id;
    });

    it('WORKER ghi event SALE thì trả về 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/animals/${testAnimalId}/events`)
        .set('Cookie', workerCookies)
        .send({
          type: 'SALE',
          notes: 'Bán cho đối tác',
        });

      expect(res.status).toBe(403);
    });

    it('WORKER ghi event VACCINATION, TREATMENT, WEIGHING thành công (201)', async () => {
      const resVac = await request(app.getHttpServer())
        .post(`/api/v1/animals/${testAnimalId}/events`)
        .set('Cookie', workerCookies)
        .send({
          type: 'VACCINATION',
          notes: 'Tiêm tụ huyết trùng',
        });
      expect(resVac.status).toBe(201);

      const resTreat = await request(app.getHttpServer())
        .post(`/api/v1/animals/${testAnimalId}/events`)
        .set('Cookie', workerCookies)
        .send({
          type: 'TREATMENT',
          notes: 'Sát trùng vết thương',
        });
      expect(resTreat.status).toBe(201);

      const resWeigh = await request(app.getHttpServer())
        .post(`/api/v1/animals/${testAnimalId}/events`)
        .set('Cookie', workerCookies)
        .send({
          type: 'WEIGHING',
          notes: 'Cân định kỳ',
          data: { weightKg: 350 },
        });
      expect(resWeigh.status).toBe(201);
    });

    it('BIRTH tạo con non với motherId đúng khi truyền offspring[]', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/animals/${motherForBirthId}/events`)
        .set('Cookie', ownerCookies)
        .send({
          type: 'BIRTH',
          notes: 'Đẻ 2 con sinh đôi',
          offspring: [
            { tag: 'TWIN-01', sex: 'FEMALE', breed: 'Wagyu F1' },
            { tag: 'TWIN-02', sex: 'MALE', breed: 'Wagyu F1' },
          ],
        });

      expect(res.status).toBe(201);

      // Verify offspring exist with motherId
      const twin1Res = await request(app.getHttpServer())
        .get('/api/v1/animals?search=TWIN-01')
        .set('Cookie', ownerCookies);
      expect(twin1Res.status).toBe(200);
      expect(twin1Res.body.data.length).toBe(1);
      expect(twin1Res.body.data[0].motherId).toBe(motherForBirthId);
      expect(twin1Res.body.data[0].sex).toBe('FEMALE');

      const twin2Res = await request(app.getHttpServer())
        .get('/api/v1/animals?search=TWIN-02')
        .set('Cookie', ownerCookies);
      expect(twin2Res.status).toBe(200);
      expect(twin2Res.body.data.length).toBe(1);
      expect(twin2Res.body.data[0].motherId).toBe(motherForBirthId);
      expect(twin2Res.body.data[0].sex).toBe('MALE');
    });

    it('DEATH thì status DEAD, sau đó ghi event tiếp thì 422', async () => {
      // Ghi event DEATH
      const deathRes = await request(app.getHttpServer())
        .post(`/api/v1/animals/${testAnimalId}/events`)
        .set('Cookie', ownerCookies)
        .send({
          type: 'DEATH',
          notes: 'Chết do tai nạn',
        });

      expect(deathRes.status).toBe(201);

      // Check status animal is DEAD
      const checkRes = await request(app.getHttpServer())
        .get(`/api/v1/animals/${testAnimalId}`)
        .set('Cookie', ownerCookies);
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.status).toBe('DEAD');

      // Ghi event tiếp theo trên con đã DEAD -> 422
      const nextEventRes = await request(app.getHttpServer())
        .post(`/api/v1/animals/${testAnimalId}/events`)
        .set('Cookie', ownerCookies)
        .send({
          type: 'TREATMENT',
          notes: 'Thử chữa trị',
        });

      expect(nextEventRes.status).toBe(422);
    });

    it('SALE thì status SOLD, sau đó ghi event tiếp thì 422', async () => {
      // Create another animal to test SALE
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/animals')
        .set('Cookie', ownerCookies)
        .send({
          tag: 'SALE-TEST-01',
          species: 'Bò',
        });
      const saleAnimalId = createRes.body.data.id;

      // OWNER records SALE
      const saleRes = await request(app.getHttpServer())
        .post(`/api/v1/animals/${saleAnimalId}/events`)
        .set('Cookie', ownerCookies)
        .send({
          type: 'SALE',
          notes: 'Đã xuất chuồng',
        });
      expect(saleRes.status).toBe(201);

      // Check status is SOLD
      const checkRes = await request(app.getHttpServer())
        .get(`/api/v1/animals/${saleAnimalId}`)
        .set('Cookie', ownerCookies);
      expect(checkRes.body.data.status).toBe('SOLD');

      // Ghi event tiếp theo trên con đã SOLD -> 422
      const nextEventRes = await request(app.getHttpServer())
        .post(`/api/v1/animals/${saleAnimalId}/events`)
        .set('Cookie', ownerCookies)
        .send({
          type: 'VACCINATION',
          notes: 'Tiêm phòng sau bán',
        });
      expect(nextEventRes.status).toBe(422);
    });

    it('GET /animals/:id/events trả về danh sách sự kiện', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/animals/${testAnimalId}/events`)
        .set('Cookie', accountantCookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4); // VACCINATION, TREATMENT, WEIGHING, DEATH
    });
  });
});
