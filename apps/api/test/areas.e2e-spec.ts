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
import * as argon2 from 'argon2';
import { prisma, AreaType, CycleKind, CycleStatus } from '@xfarm/db';
import { AppModule } from '../src/app.module';

describe('Areas E2E Tests (/api/v1/areas)', () => {
  let app: INestApplication;
  let ownerCookies: string[];
  let managerCookies: string[];
  let workerCookies: string[];

  beforeAll(async () => {
    // Ensure test users exist
    const passwordHash = await argon2.hash('Admin@123');
    const users = [
      { email: 'admin@xfarm.local', fullName: 'Admin Owner', role: 'OWNER' as const },
      { email: 'manager@xfarm.local', fullName: 'Manager User', role: 'MANAGER' as const },
      { email: 'worker@xfarm.local', fullName: 'Worker User', role: 'WORKER' as const },
    ];

    for (const u of users) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: { passwordHash, isActive: true },
        create: {
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

    // Login OWNER
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@xfarm.local', password: 'Admin@123' });
    const ownerRaw = ownerRes.headers['set-cookie'];
    ownerCookies = Array.isArray(ownerRaw) ? ownerRaw : [ownerRaw as string];

    // Login MANAGER
    const managerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'manager@xfarm.local', password: 'Admin@123' });
    const managerRaw = managerRes.headers['set-cookie'];
    managerCookies = Array.isArray(managerRaw) ? managerRaw : [managerRaw as string];

    // Login WORKER
    const workerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'worker@xfarm.local', password: 'Admin@123' });
    const workerRaw = workerRes.headers['set-cookie'];
    workerCookies = Array.isArray(workerRaw) ? workerRaw : [workerRaw as string];
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    // Clean related tables
    await prisma.animalEvent.deleteMany();
    await prisma.animal.deleteMany();
    await prisma.animalGroup.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.cycle.deleteMany();
    await prisma.area.updateMany({ data: { parentId: null } });
    await prisma.area.deleteMany();
    await prisma.sequence.deleteMany({ where: { key: 'AR' } });
  });

  describe('RBAC permissions', () => {
    it('WORKER ghi (POST /areas) thì nhận 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/areas')
        .set('Cookie', workerCookies)
        .send({
          name: 'Khu Trồng Trọt A',
          type: AreaType.FIELD,
        });

      expect(res.status).toBe(403);
    });

    it('WORKER cập nhật (PATCH /areas/:id) thì nhận 403', async () => {
      const area = await prisma.area.create({
        data: {
          code: 'AR-TEST-01',
          name: 'Khu Gốc',
          type: AreaType.ZONE,
        },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/areas/${area.id}`)
        .set('Cookie', workerCookies)
        .send({
          name: 'Khu Đã Đổi Tên',
        });

      expect(res.status).toBe(403);
    });

    it('WORKER đọc (GET /areas, /areas/tree, /areas/:id) thành công (200)', async () => {
      const area = await prisma.area.create({
        data: {
          code: 'AR-TEST-02',
          name: 'Khu Vườn Cây',
          type: AreaType.FIELD,
        },
      });

      const listRes = await request(app.getHttpServer())
        .get('/api/v1/areas')
        .set('Cookie', workerCookies);
      expect(listRes.status).toBe(200);

      const treeRes = await request(app.getHttpServer())
        .get('/api/v1/areas/tree')
        .set('Cookie', workerCookies);
      expect(treeRes.status).toBe(200);

      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/areas/${area.id}`)
        .set('Cookie', workerCookies);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.id).toBe(area.id);
    });

    it('MANAGER tạo khu/lô thành công (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/areas')
        .set('Cookie', managerCookies)
        .send({
          name: 'Khu Nuôi Tôm B',
          type: AreaType.POND,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Khu Nuôi Tôm B');
    });
  });

  describe('Tự sinh mã Sequence (AR-0001)', () => {
    it('tự sinh AR-0001 khi không truyền code', async () => {
      const res1 = await request(app.getHttpServer())
        .post('/api/v1/areas')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Khu A1',
          type: AreaType.FIELD,
        });

      expect(res1.status).toBe(201);
      expect(res1.body.data.code).toBe('AR-0001');

      const res2 = await request(app.getHttpServer())
        .post('/api/v1/areas')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Khu A2',
          type: AreaType.FIELD,
        });

      expect(res2.status).toBe(201);
      expect(res2.body.data.code).toBe('AR-0002');
    });

    it('giữ nguyên mã tự định nghĩa khi có truyền code', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/areas')
        .set('Cookie', ownerCookies)
        .send({
          code: 'CUSTOM-ZONE-01',
          name: 'Khu Đặc Biệt',
          type: AreaType.GREENHOUSE,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('CUSTOM-ZONE-01');
    });
  });

  describe('Kiểm tra GeoJSON', () => {
    it('chấp nhận GeoJSON Polygon hợp lệ', async () => {
      const validPolygon = {
        type: 'Polygon',
        coordinates: [
          [
            [105.854444, 21.028511],
            [105.855444, 21.028511],
            [105.855444, 21.029511],
            [105.854444, 21.029511],
            [105.854444, 21.028511],
          ],
        ],
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/areas')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Lô Polygon',
          type: AreaType.FIELD,
          geojson: validPolygon,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.geojson).toEqual(validPolygon);
    });

    it('chấp nhận GeoJSON MultiPolygon hợp lệ', async () => {
      const validMultiPolygon = {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [105.854444, 21.028511],
              [105.855444, 21.028511],
              [105.855444, 21.029511],
              [105.854444, 21.028511],
            ],
          ],
        ],
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/areas')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Lô MultiPolygon',
          type: AreaType.FIELD,
          geojson: validMultiPolygon,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.geojson).toEqual(validMultiPolygon);
    });

    it('geojson sai thì nhận 400 (Point hoặc cấu trúc sai)', async () => {
      // 1. Point thay vì Polygon/MultiPolygon
      const pointRes = await request(app.getHttpServer())
        .post('/api/v1/areas')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Lô Sai Point',
          type: AreaType.FIELD,
          geojson: {
            type: 'Point',
            coordinates: [105.854444, 21.028511],
          },
        });
      expect(pointRes.status).toBe(400);

      // 2. Chuỗi sai cấu trúc
      const invalidRes = await request(app.getHttpServer())
        .post('/api/v1/areas')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Lô Sai Cấu Trúc',
          type: AreaType.FIELD,
          geojson: {
            type: 'Polygon',
            coordinates: 'invalid-string',
          },
        });
      expect(invalidRes.status).toBe(400);

      // 3. Thiếu tọa độ
      const emptyRes = await request(app.getHttpServer())
        .post('/api/v1/areas')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Lô Tọa Độ Rỗng',
          type: AreaType.FIELD,
          geojson: {
            type: 'Polygon',
            coordinates: [],
          },
        });
      expect(emptyRes.status).toBe(400);
    });
  });

  describe('Tạo cây 2 cấp và GET /areas/tree', () => {
    it('tạo cây 2 cấp và truy vấn GET /areas/tree trả về đúng cây lồng nhau', async () => {
      // Tạo cấp 1 (Khu Vực Tổng)
      const parentRes = await request(app.getHttpServer())
        .post('/api/v1/areas')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Khu Trồng Trọt Bắc',
          type: AreaType.ZONE,
        });
      expect(parentRes.status).toBe(201);
      const parentId = parentRes.body.data.id;

      // Tạo 2 con cấp 2 thuộc Khu Vực Tổng
      const child1Res = await request(app.getHttpServer())
        .post('/api/v1/areas')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Lô Rau Cải B1',
          type: AreaType.FIELD,
          parentId,
        });
      expect(child1Res.status).toBe(201);

      const child2Res = await request(app.getHttpServer())
        .post('/api/v1/areas')
        .set('Cookie', ownerCookies)
        .send({
          name: 'Lô Cà Chua B2',
          type: AreaType.FIELD,
          parentId,
        });
      expect(child2Res.status).toBe(201);

      // Tạo thêm 1 khu độc lập khác nhưng isActive = false
      await prisma.area.create({
        data: {
          code: 'AR-INACTIVE',
          name: 'Khu Không Hoạt Động',
          type: AreaType.ZONE,
          isActive: false,
        },
      });

      // Lấy cây qua GET /areas/tree
      const treeRes = await request(app.getHttpServer())
        .get('/api/v1/areas/tree')
        .set('Cookie', ownerCookies);

      expect(treeRes.status).toBe(200);
      expect(treeRes.body.data).toBeDefined();

      interface TestTreeNode {
        id: string;
        code: string;
        children: TestTreeNode[];
      }
      const tree = treeRes.body.data as TestTreeNode[];
      // Khu inactive không có trong cây
      const inactiveInTree = tree.find((node) => node.code === 'AR-INACTIVE');
      expect(inactiveInTree).toBeUndefined();

      // Cây có node cha và 2 con lồng trong children
      const rootNode = tree.find((node) => node.id === parentId);
      expect(rootNode).toBeDefined();
      expect(rootNode!.children).toHaveLength(2);
      const childIds = rootNode!.children.map((c) => c.id);
      expect(childIds).toContain(child1Res.body.data.id);
      expect(childIds).toContain(child2Res.body.data.id);
    });
  });

  describe('Chặn vòng cha-con (kể cả gián tiếp), trả 422', () => {
    it('chặn tự chọn chính mình làm cha (vòng trực tiếp) trả 422', async () => {
      const area = await prisma.area.create({
        data: {
          code: 'AR-SELF',
          name: 'Khu A',
          type: AreaType.ZONE,
        },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/areas/${area.id}`)
        .set('Cookie', ownerCookies)
        .send({
          parentId: area.id,
        });

      expect(res.status).toBe(422);
    });

    it('chặn vòng gián tiếp (A -> B -> C, gán parentId của A là C) trả 422', async () => {
      // Tạo cấp 1: Node A
      const nodeA = await prisma.area.create({
        data: {
          code: 'AR-NODE-A',
          name: 'Khu A',
          type: AreaType.ZONE,
        },
      });

      // Tạo cấp 2: Node B (cha là A)
      const nodeB = await prisma.area.create({
        data: {
          code: 'AR-NODE-B',
          name: 'Khu B',
          type: AreaType.FIELD,
          parentId: nodeA.id,
        },
      });

      // Tạo cấp 3: Node C (cha là B)
      const nodeC = await prisma.area.create({
        data: {
          code: 'AR-NODE-C',
          name: 'Lô C',
          type: AreaType.FIELD,
          parentId: nodeB.id,
        },
      });

      // Cố gắng cập nhật Node A có parentId là Node C -> Tạo vòng A -> B -> C -> A
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/areas/${nodeA.id}`)
        .set('Cookie', ownerCookies)
        .send({
          parentId: nodeC.id,
        });

      expect(res.status).toBe(422);

      // Cố gắng cập nhật Node A có parentId là Node B -> Tạo vòng A -> B -> A
      const res2 = await request(app.getHttpServer())
        .patch(`/api/v1/areas/${nodeA.id}`)
        .set('Cookie', ownerCookies)
        .send({
          parentId: nodeB.id,
        });

      expect(res2.status).toBe(422);
    });
  });

  describe('Khóa mềm khu và kiểm tra cycle ACTIVE / HARVESTING (422)', () => {
    it('khóa khu có cycle ACTIVE thì trả 422', async () => {
      const area = await prisma.area.create({
        data: {
          code: 'AR-WITH-ACTIVE-CYCLE',
          name: 'Khu Đang Trồng',
          type: AreaType.FIELD,
          isActive: true,
        },
      });

      // Tạo cycle ACTIVE gắn vào area
      await prisma.cycle.create({
        data: {
          code: 'CYC-ACTIVE-01',
          name: 'Vụ Cải Xuân',
          kind: CycleKind.CROP,
          areaId: area.id,
          species: 'Rau cải',
          startDate: new Date(),
          status: CycleStatus.ACTIVE,
        },
      });

      // Gửi PATCH { isActive: false }
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/areas/${area.id}`)
        .set('Cookie', ownerCookies)
        .send({
          isActive: false,
        });

      expect(res.status).toBe(422);
    });

    it('khóa khu có cycle HARVESTING thì trả 422', async () => {
      const area = await prisma.area.create({
        data: {
          code: 'AR-WITH-HARVEST-CYCLE',
          name: 'Khu Đang Thu Hoạch',
          type: AreaType.FIELD,
          isActive: true,
        },
      });

      // Tạo cycle HARVESTING gắn vào area
      await prisma.cycle.create({
        data: {
          code: 'CYC-HARVEST-01',
          name: 'Vụ Cà Chua Thu',
          kind: CycleKind.CROP,
          areaId: area.id,
          species: 'Cà chua',
          startDate: new Date(),
          status: CycleStatus.HARVESTING,
        },
      });

      // Gửi PATCH { isActive: false }
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/areas/${area.id}`)
        .set('Cookie', ownerCookies)
        .send({
          isActive: false,
        });

      expect(res.status).toBe(422);
    });

    it('khóa khu có cycle CLOSED hoặc không có cycle thì thành công (200)', async () => {
      const area = await prisma.area.create({
        data: {
          code: 'AR-WITH-CLOSED-CYCLE',
          name: 'Khu Đã Hoàn Thành',
          type: AreaType.FIELD,
          isActive: true,
        },
      });

      // Tạo cycle CLOSED gắn vào area
      await prisma.cycle.create({
        data: {
          code: 'CYC-CLOSED-01',
          name: 'Vụ Cải Xong',
          kind: CycleKind.CROP,
          areaId: area.id,
          species: 'Rau cải',
          startDate: new Date(),
          status: CycleStatus.CLOSED,
        },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/areas/${area.id}`)
        .set('Cookie', ownerCookies)
        .send({
          isActive: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });
  });

  describe('GET /areas/:id', () => {
    it('trả về chi tiết kèm parent, children, và số cycle đang ACTIVE', async () => {
      const parent = await prisma.area.create({
        data: {
          code: 'AR-PARENT',
          name: 'Khu Vực Mẹ',
          type: AreaType.ZONE,
        },
      });

      const mainArea = await prisma.area.create({
        data: {
          code: 'AR-MAIN',
          name: 'Khu Vực Chính',
          type: AreaType.FIELD,
          parentId: parent.id,
        },
      });

      const child1 = await prisma.area.create({
        data: {
          code: 'AR-SUB-1',
          name: 'Lô Con 1',
          type: AreaType.FIELD,
          parentId: mainArea.id,
        },
      });

      const child2 = await prisma.area.create({
        data: {
          code: 'AR-SUB-2',
          name: 'Lô Con 2',
          type: AreaType.FIELD,
          parentId: mainArea.id,
        },
      });

      // Tạo 2 cycle ACTIVE và 1 cycle CLOSED
      await prisma.cycle.createMany({
        data: [
          {
            code: 'CYC-ACT-1',
            name: 'Vụ 1',
            kind: CycleKind.CROP,
            areaId: mainArea.id,
            species: 'Cải bắp',
            startDate: new Date(),
            status: CycleStatus.ACTIVE,
          },
          {
            code: 'CYC-ACT-2',
            name: 'Vụ 2',
            kind: CycleKind.CROP,
            areaId: mainArea.id,
            species: 'Cà rốt',
            startDate: new Date(),
            status: CycleStatus.ACTIVE,
          },
          {
            code: 'CYC-CLOSED-X',
            name: 'Vụ cũ',
            kind: CycleKind.CROP,
            areaId: mainArea.id,
            species: 'Khoai tây',
            startDate: new Date(),
            status: CycleStatus.CLOSED,
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/areas/${mainArea.id}`)
        .set('Cookie', ownerCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(mainArea.id);
      expect(res.body.data.parent).toBeDefined();
      expect(res.body.data.parent.id).toBe(parent.id);
      expect(res.body.data.children).toHaveLength(2);
      const subIds = (res.body.data.children as Array<{ id: string }>).map((c) => c.id);
      expect(subIds).toContain(child1.id);
      expect(subIds).toContain(child2.id);
      expect(res.body.data.activeCyclesCount).toBe(2);
    });

    it('trả về 404 khi không tìm thấy khu/lô', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/areas/non-existent-id')
        .set('Cookie', ownerCookies);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /areas (phân trang, lọc, tìm kiếm)', () => {
    beforeEach(async () => {
      await prisma.area.createMany({
        data: [
          { code: 'ZONE-A', name: 'Khu Trồng Rau', type: AreaType.FIELD, isActive: true },
          { code: 'ZONE-B', name: 'Khu Nuôi Gà', type: AreaType.BARN, isActive: true },
          { code: 'ZONE-C', name: 'Khu Nuôi Cá', type: AreaType.POND, isActive: false },
        ],
      });
    });

    it('lọc theo search', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/areas?search=Rau')
        .set('Cookie', ownerCookies);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].code).toBe('ZONE-A');
    });

    it('lọc theo type', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/areas?type=${AreaType.BARN}`)
        .set('Cookie', ownerCookies);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].type).toBe(AreaType.BARN);
    });

    it('lọc theo isActive=false', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/areas?isActive=false')
        .set('Cookie', ownerCookies);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].code).toBe('ZONE-C');
    });
  });
});
