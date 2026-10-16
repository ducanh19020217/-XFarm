import { PrismaClient, Role, AreaType, CycleKind, CycleStatus, ActivityType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const users = [
  { email: 'admin@xfarm.local', fullName: 'Admin Owner', role: Role.OWNER },
  { email: 'manager@xfarm.local', fullName: 'Manager User', role: Role.MANAGER },
  { email: 'accountant@xfarm.local', fullName: 'Accountant User', role: Role.ACCOUNTANT },
  { email: 'sales@xfarm.local', fullName: 'Sales User', role: Role.SALES },
  { email: 'worker@xfarm.local', fullName: 'Worker User', role: Role.WORKER },
];

async function ensureSequence(key: string, year: number, minCurrent: number) {
  const existing = await prisma.sequence.findUnique({
    where: { key_year: { key, year } },
  });
  if (!existing) {
    await prisma.sequence.create({
      data: { key, year, current: minCurrent },
    });
  } else if (existing.current < minCurrent) {
    await prisma.sequence.update({
      where: { key_year: { key, year } },
      data: { current: minCurrent },
    });
  }
}

async function main() {
  const currentYear = new Date().getFullYear();
  const passwordHash = await argon2.hash('Admin@123');

  // 1. Seed Users
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        passwordHash,
        fullName: user.fullName,
        role: user.role,
        isActive: true,
      },
    });
    console.log(`Seeded user: ${user.email} (${user.role})`);
  }

  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: 'admin@xfarm.local' },
  });
  const worker = await prisma.user.findUniqueOrThrow({
    where: { email: 'worker@xfarm.local' },
  });

  // 2. Seed Areas
  // Khu A (ZONE)
  const khuA = await prisma.area.upsert({
    where: { code: 'AR-0001' },
    update: {
      name: 'Khu A',
      type: AreaType.ZONE,
      areaM2: 50000,
      description: 'Khu sản xuất nông nghiệp công nghệ cao A',
      isActive: true,
    },
    create: {
      code: 'AR-0001',
      name: 'Khu A',
      type: AreaType.ZONE,
      areaM2: 50000,
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [105.8001, 21.0001],
            [105.805, 21.0001],
            [105.805, 21.005],
            [105.8001, 21.005],
            [105.8001, 21.0001],
          ],
        ],
      },
      description: 'Khu sản xuất nông nghiệp công nghệ cao A',
      isActive: true,
      createdById: admin.id,
    },
  });

  // Lô rau 1 (FIELD) con của Khu A
  const loRau1 = await prisma.area.upsert({
    where: { code: 'AR-0002' },
    update: {
      name: 'Lô rau 1',
      type: AreaType.FIELD,
      parentId: khuA.id,
      areaM2: 5000,
      description: 'Lô chuyên canh rau ăn lá hữu cơ',
      isActive: true,
    },
    create: {
      code: 'AR-0002',
      name: 'Lô rau 1',
      type: AreaType.FIELD,
      parentId: khuA.id,
      areaM2: 5000,
      description: 'Lô chuyên canh rau ăn lá hữu cơ',
      isActive: true,
      createdById: admin.id,
    },
  });

  // Nhà kính 1 (GREENHOUSE) con của Khu A
  const nhaKinh1 = await prisma.area.upsert({
    where: { code: 'AR-0003' },
    update: {
      name: 'Nhà kính 1',
      type: AreaType.GREENHOUSE,
      parentId: khuA.id,
      areaM2: 1200,
      description: 'Nhà kính công nghệ cao hệ thống tưới tự động',
      isActive: true,
    },
    create: {
      code: 'AR-0003',
      name: 'Nhà kính 1',
      type: AreaType.GREENHOUSE,
      parentId: khuA.id,
      areaM2: 1200,
      description: 'Nhà kính công nghệ cao hệ thống tưới tự động',
      isActive: true,
      createdById: admin.id,
    },
  });

  // Chuồng gà 1 (BARN)
  const chuongGa1 = await prisma.area.upsert({
    where: { code: 'AR-0004' },
    update: {
      name: 'Chuồng gà 1',
      type: AreaType.BARN,
      areaM2: 800,
      description: 'Chuồng nuôi gà thả vườn đệm lót sinh học',
      isActive: true,
    },
    create: {
      code: 'AR-0004',
      name: 'Chuồng gà 1',
      type: AreaType.BARN,
      areaM2: 800,
      description: 'Chuồng nuôi gà thả vườn đệm lót sinh học',
      isActive: true,
      createdById: admin.id,
    },
  });

  // Ao cá 1 (POND)
  const aoCa1 = await prisma.area.upsert({
    where: { code: 'AR-0005' },
    update: {
      name: 'Ao cá 1',
      type: AreaType.POND,
      areaM2: 3000,
      description: 'Ao nuôi thủy sản nước ngọt tuần hoàn',
      isActive: true,
    },
    create: {
      code: 'AR-0005',
      name: 'Ao cá 1',
      type: AreaType.POND,
      areaM2: 3000,
      description: 'Ao nuôi thủy sản nước ngọt tuần hoàn',
      isActive: true,
      createdById: admin.id,
    },
  });
  console.log(
    `Seeded areas: ${khuA.code}, ${loRau1.code}, ${nhaKinh1.code}, ${chuongGa1.code}, ${aoCa1.code}`,
  );

  // Cập nhật sequence cho Area
  // Mã khu/lô không theo năm (AR-0001): SequenceService.nextSimple dùng year = 0.
  await ensureSequence('AR', 0, 5);

  // 3. Seed Cycles
  // Cycle CROP rau cải ở Lô rau 1
  const cycleCrop = await prisma.cycle.upsert({
    where: { code: 'CY-2026-0001' },
    update: {
      name: 'Vụ rau cải ngọt mùa xuân 2026',
      kind: CycleKind.CROP,
      areaId: loRau1.id,
      species: 'Rau cải',
      variety: 'Cải ngọt F1',
      startDate: new Date('2026-02-01T00:00:00Z'),
      expectedEndDate: new Date('2026-03-20T00:00:00Z'),
      status: CycleStatus.ACTIVE,
      expectedYield: 2500,
      yieldUnit: 'kg',
      notes: 'Trồng rau cải ngọt theo tiêu chuẩn VietGAP',
    },
    create: {
      code: 'CY-2026-0001',
      name: 'Vụ rau cải ngọt mùa xuân 2026',
      kind: CycleKind.CROP,
      areaId: loRau1.id,
      species: 'Rau cải',
      variety: 'Cải ngọt F1',
      startDate: new Date('2026-02-01T00:00:00Z'),
      expectedEndDate: new Date('2026-03-20T00:00:00Z'),
      status: CycleStatus.ACTIVE,
      expectedYield: 2500,
      yieldUnit: 'kg',
      notes: 'Trồng rau cải ngọt theo tiêu chuẩn VietGAP',
      createdById: admin.id,
    },
  });

  // Cycle LIVESTOCK ở Chuồng gà 1
  const cycleLivestock = await prisma.cycle.upsert({
    where: { code: 'CY-2026-0002' },
    update: {
      name: 'Lứa gà thịt thả vườn Q1/2026',
      kind: CycleKind.LIVESTOCK,
      areaId: chuongGa1.id,
      species: 'Gà',
      variety: 'Gà Ri Lạc Thủy',
      startDate: new Date('2026-01-10T00:00:00Z'),
      expectedEndDate: new Date('2026-04-25T00:00:00Z'),
      status: CycleStatus.ACTIVE,
      initialQuantity: 200,
      expectedYield: 360,
      yieldUnit: 'kg',
      notes: 'Nuôi gà thả vườn sử dụng đệm lót sinh học',
    },
    create: {
      code: 'CY-2026-0002',
      name: 'Lứa gà thịt thả vườn Q1/2026',
      kind: CycleKind.LIVESTOCK,
      areaId: chuongGa1.id,
      species: 'Gà',
      variety: 'Gà Ri Lạc Thủy',
      startDate: new Date('2026-01-10T00:00:00Z'),
      expectedEndDate: new Date('2026-04-25T00:00:00Z'),
      status: CycleStatus.ACTIVE,
      initialQuantity: 200,
      expectedYield: 360,
      yieldUnit: 'kg',
      notes: 'Nuôi gà thả vườn sử dụng đệm lót sinh học',
      createdById: admin.id,
    },
  });

  // Cycle AQUA ở Ao cá 1
  const cycleAqua = await prisma.cycle.upsert({
    where: { code: 'CY-2026-0003' },
    update: {
      name: 'Vụ cá rô phi đơn tính 2026',
      kind: CycleKind.AQUA,
      areaId: aoCa1.id,
      species: 'Cá rô phi',
      variety: 'Rô phi Đường Nghiệp',
      startDate: new Date('2026-01-15T00:00:00Z'),
      expectedEndDate: new Date('2026-06-30T00:00:00Z'),
      status: CycleStatus.ACTIVE,
      initialQuantity: 3000,
      expectedYield: 2000,
      yieldUnit: 'kg',
      notes: 'Nuôi cá rô phi thâm canh ao nổi',
    },
    create: {
      code: 'CY-2026-0003',
      name: 'Vụ cá rô phi đơn tính 2026',
      kind: CycleKind.AQUA,
      areaId: aoCa1.id,
      species: 'Cá rô phi',
      variety: 'Rô phi Đường Nghiệp',
      startDate: new Date('2026-01-15T00:00:00Z'),
      expectedEndDate: new Date('2026-06-30T00:00:00Z'),
      status: CycleStatus.ACTIVE,
      initialQuantity: 3000,
      expectedYield: 2000,
      yieldUnit: 'kg',
      notes: 'Nuôi cá rô phi thâm canh ao nổi',
      createdById: admin.id,
    },
  });
  console.log(`Seeded cycles: ${cycleCrop.code}, ${cycleLivestock.code}, ${cycleAqua.code}`);

  // Cập nhật sequence cho Cycle
  await ensureSequence('CY', currentYear, 3);

  // 4. Seed AnimalGroup (200 con gà)
  const animalGroup = await prisma.animalGroup.upsert({
    where: { code: 'AG-0001' },
    update: {
      cycleId: cycleLivestock.id,
      species: 'Gà',
      breed: 'Gà Ri Lạc Thủy',
      headCount: 200,
      areaId: chuongGa1.id,
      notes: 'Đàn gà 200 con giống 21 ngày tuổi nhập từ trại giống',
    },
    create: {
      code: 'AG-0001',
      cycleId: cycleLivestock.id,
      species: 'Gà',
      breed: 'Gà Ri Lạc Thủy',
      headCount: 200,
      areaId: chuongGa1.id,
      notes: 'Đàn gà 200 con giống 21 ngày tuổi nhập từ trại giống',
      createdById: admin.id,
    },
  });
  console.log(`Seeded animal group: ${animalGroup.code} (${animalGroup.headCount} con)`);

  // Cập nhật sequence cho AnimalGroup
  // Mã đàn không theo năm (AG-0001): SequenceService.nextCode('AG') dùng year = 0.
  await ensureSequence('AG', 0, 1);

  // 5. Seed Activities (3-5 activity mẫu cho mỗi cycle)
  const sampleActivities = [
    // Cycle CROP: SOWING, IRRIGATION, FERTILIZING
    {
      cycleId: cycleCrop.id,
      areaId: loRau1.id,
      type: ActivityType.SOWING,
      performedAt: new Date('2026-02-01T08:00:00Z'),
      quantity: 5,
      unit: 'kg',
      data: { method: 'Gieo hạt đều trên luống', seedLot: 'SEED-CAI-2026' },
      notes: 'Gieo hạt cải ngọt sau khi làm đất và bón lót',
      performedById: worker.id,
      createdById: admin.id,
    },
    {
      cycleId: cycleCrop.id,
      areaId: loRau1.id,
      type: ActivityType.IRRIGATION,
      performedAt: new Date('2026-02-05T07:00:00Z'),
      quantity: 1500,
      unit: 'lít',
      data: { durationMin: 45, volumeL: 1500 },
      notes: 'Tưới phun sương buổi sáng giữ ẩm cho hạt nảy mầm',
      performedById: worker.id,
      createdById: admin.id,
    },
    {
      cycleId: cycleCrop.id,
      areaId: loRau1.id,
      type: ActivityType.FERTILIZING,
      performedAt: new Date('2026-02-15T09:00:00Z'),
      quantity: 20,
      unit: 'kg',
      data: { product: 'Phân trùn quế vi sinh', dosage: '20kg/lô' },
      notes: 'Bón thúc lần 1 kết hợp xới xáo nhẹ',
      performedById: worker.id,
      createdById: admin.id,
    },

    // Cycle LIVESTOCK: FEEDING, VACCINATION, WEIGHING
    {
      cycleId: cycleLivestock.id,
      areaId: chuongGa1.id,
      type: ActivityType.FEEDING,
      performedAt: new Date('2026-01-10T07:30:00Z'),
      quantity: 15,
      unit: 'kg',
      data: { feedKg: 15 },
      notes: 'Cho ăn cám khởi động giai đoạn 1',
      performedById: worker.id,
      createdById: admin.id,
    },
    {
      cycleId: cycleLivestock.id,
      areaId: chuongGa1.id,
      type: ActivityType.VACCINATION,
      performedAt: new Date('2026-01-18T09:00:00Z'),
      quantity: 200,
      unit: 'liều',
      data: { vaccine: 'Newcastle + Gumboro', method: 'Nhỏ mắt mũi', doseCount: 200 },
      notes: 'Tiêm phòng vaccine định kỳ cho toàn đàn',
      performedById: worker.id,
      createdById: admin.id,
    },
    {
      cycleId: cycleLivestock.id,
      areaId: chuongGa1.id,
      type: ActivityType.WEIGHING,
      performedAt: new Date('2026-02-10T10:00:00Z'),
      data: { avgWeightKg: 0.65, sampleSize: 20 },
      notes: 'Cân mẫu ngẫu nhiên 20 con gà kiểm tra tốc độ tăng trưởng',
      performedById: worker.id,
      createdById: admin.id,
    },

    // Cycle AQUA: STOCKING, FEEDING, WATER_TEST
    {
      cycleId: cycleAqua.id,
      areaId: aoCa1.id,
      type: ActivityType.STOCKING,
      performedAt: new Date('2026-01-15T08:00:00Z'),
      quantity: 3000,
      unit: 'con',
      data: { count: 3000, avgWeightG: 15 },
      notes: 'Thả 3000 con cá rô phi giống khỏe mạnh vào ao',
      performedById: worker.id,
      createdById: admin.id,
    },
    {
      cycleId: cycleAqua.id,
      areaId: aoCa1.id,
      type: ActivityType.FEEDING,
      performedAt: new Date('2026-01-20T08:00:00Z'),
      quantity: 25,
      unit: 'kg',
      data: { feedKg: 25 },
      notes: 'Cho ăn thức ăn viên nổi độ đạm 32%',
      performedById: worker.id,
      createdById: admin.id,
    },
    {
      cycleId: cycleAqua.id,
      areaId: aoCa1.id,
      type: ActivityType.WATER_TEST,
      performedAt: new Date('2026-01-25T06:30:00Z'),
      data: { pH: 7.4, DO: 5.6, temp: 26.5, salinity: 0, NH3: 0.01 },
      notes: 'Đo chất lượng nước ao định kỳ buổi sáng, môi trường nước tốt',
      performedById: worker.id,
      createdById: admin.id,
    },
  ];

  for (const act of sampleActivities) {
    const existing = await prisma.activity.findFirst({
      where: {
        cycleId: act.cycleId,
        areaId: act.areaId,
        type: act.type,
        performedAt: act.performedAt,
      },
    });

    if (!existing) {
      await prisma.activity.create({ data: act });
      console.log(`Created activity ${act.type} for cycle ${act.cycleId}`);
    } else {
      await prisma.activity.update({
        where: { id: existing.id },
        data: act,
      });
      console.log(`Updated activity ${act.type} for cycle ${act.cycleId}`);
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
