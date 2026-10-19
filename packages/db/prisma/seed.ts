import {
  PrismaClient,
  Role,
  AreaType,
  CycleKind,
  CycleStatus,
  ActivityType,
  ItemCategory,
  StockMoveType,
  PostStatus,
  CustomerType,
  SalesChannel,
  SalesOrderStatus,
  PaymentStatus,
  PaymentMethod,
  TransactionType,
  BookingStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';

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

  // 2. Seed inventory master data and opening stock.
  const materialWarehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-MATERIAL' },
    update: { name: 'Kho vật tư' },
    create: { code: 'WH-MATERIAL', name: 'Kho vật tư' },
  });
  const finishedWarehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-FINISHED' },
    update: { name: 'Kho thành phẩm' },
    create: { code: 'WH-FINISHED', name: 'Kho thành phẩm' },
  });

  const inventoryItems = [
    {
      sku: 'NPK-16-16-8',
      name: 'Phân NPK 16-16-8',
      category: ItemCategory.FERTILIZER,
      unit: 'kg',
      minStock: 5,
    },
    {
      sku: 'BIO-PEST',
      name: 'Thuốc trừ sâu sinh học',
      category: ItemCategory.PESTICIDE,
      unit: 'lít',
      minStock: 2,
    },
    { sku: 'CHICKEN-FEED', name: 'Cám gà', category: ItemCategory.FEED, unit: 'kg', minStock: 20 },
    { sku: 'FISH-FEED', name: 'Thức ăn cá', category: ItemCategory.FEED, unit: 'kg', minStock: 20 },
    {
      sku: 'KALE-SEED',
      name: 'Hạt giống cải',
      category: ItemCategory.SEED,
      unit: 'gói',
      minStock: 10,
    },
    {
      sku: 'PACK-BAG',
      name: 'Bao bì',
      category: ItemCategory.PACKAGING,
      unit: 'cái',
      minStock: 50,
    },
  ] as const;
  const items = new Map<string, { id: string }>();
  for (const item of inventoryItems) {
    const saved = await prisma.item.upsert({
      where: { sku: item.sku },
      update: {
        name: item.name,
        category: item.category,
        unit: item.unit,
        minStock: item.minStock,
      },
      create: { ...item, isSellable: false, isActive: true },
      select: { id: true },
    });
    items.set(item.sku, saved);
  }

  const suppliers = [
    { code: 'SUP-AGRI', name: 'Công ty Vật tư Nông nghiệp Xanh', phone: '0901000001' },
    { code: 'SUP-FEED', name: 'Nhà cung cấp Thức ăn Chăn nuôi Việt', phone: '0901000002' },
  ] as const;
  for (const supplier of suppliers) {
    await prisma.supplier.upsert({
      where: { code: supplier.code },
      update: supplier,
      create: { ...supplier, createdById: admin.id },
    });
  }

  const npk = items.get('NPK-16-16-8');
  if (!npk) throw new Error('NPK item was not seeded');
  const openingLots = [
    {
      lotCode: 'NPK-OPEN-01',
      quantity: new Prisma.Decimal(4),
      unitCost: new Prisma.Decimal(12000),
      expiryDate: new Date('2026-10-30T00:00:00Z'),
    },
    {
      lotCode: 'NPK-OPEN-02',
      quantity: new Prisma.Decimal(6),
      unitCost: new Prisma.Decimal(12500),
      expiryDate: new Date('2027-04-30T00:00:00Z'),
    },
  ];
  for (const opening of openingLots) {
    const lot = await prisma.stockLot.upsert({
      where: { itemId_lotCode: { itemId: npk.id, lotCode: opening.lotCode } },
      update: {
        expiryDate: opening.expiryDate,
        warehouseId: materialWarehouse.id,
        unitCost: opening.unitCost,
      },
      create: {
        itemId: npk.id,
        warehouseId: materialWarehouse.id,
        lotCode: opening.lotCode,
        expiryDate: opening.expiryDate,
        unitCost: opening.unitCost,
      },
    });
    const refId = `OPENING-${opening.lotCode}`;
    const move = await prisma.stockMove.findFirst({ where: { refType: 'OPENING', refId } });
    if (!move) {
      await prisma.stockMove.create({
        data: {
          type: StockMoveType.IN,
          itemId: npk.id,
          stockLotId: lot.id,
          toWarehouseId: materialWarehouse.id,
          quantity: opening.quantity,
          unitCost: opening.unitCost,
          refType: 'OPENING',
          refId,
          movedAt: new Date('2026-10-16T00:00:00Z'),
          notes: 'Nhập tồn đầu kỳ',
        },
      });
    }
  }
  console.log(
    `Seeded inventory: ${materialWarehouse.name}, ${finishedWarehouse.name}, ${inventoryItems.length} items`,
  );

  const produceItems = [
    { sku: 'PRODUCE-CAI-NGOT', name: 'Rau cải ngọt', category: ItemCategory.PRODUCE, unit: 'kg' },
    { sku: 'EGG-CHICKEN', name: 'Trứng gà', category: ItemCategory.LIVESTOCK_PRODUCT, unit: 'quả' },
    { sku: 'AQUA-RO-PHI', name: 'Cá rô phi', category: ItemCategory.AQUA_PRODUCT, unit: 'kg' },
  ] as const;
  for (const item of produceItems) {
    const saved = await prisma.item.upsert({
      where: { sku: item.sku },
      update: {
        name: item.name,
        category: item.category,
        unit: item.unit,
        isSellable: true,
        isActive: true,
      },
      create: { ...item, isSellable: true, isActive: true },
      select: { id: true },
    });
    items.set(item.sku, saved);
  }

  // 3. Seed Areas
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

  // 6. Seed harvest traceability, CMS content, and public site settings.
  const harvestItem = items.get('PRODUCE-CAI-NGOT');
  if (!harvestItem) throw new Error('Produce item was not seeded');
  const harvestDate = new Date('2026-03-20T08:00:00Z');
  const harvestActivity = await prisma.activity.upsert({
    where: { id: 'seed-harvest-activity-2026' },
    update: {
      cycleId: cycleCrop.id,
      areaId: loRau1.id,
      type: ActivityType.HARVEST,
      performedAt: harvestDate,
      quantity: new Prisma.Decimal(1200),
      unit: 'kg',
      data: {
        itemId: harvestItem.id,
        quantity: 1200,
        unit: 'kg',
        warehouseId: finishedWarehouse.id,
        qualityGrade: 'A',
        certification: 'VietGAP',
        isPublic: true,
      },
      notes: 'Thu hoạch lô rau cải ngọt mẫu',
      performedById: worker.id,
      createdById: admin.id,
    },
    create: {
      id: 'seed-harvest-activity-2026',
      cycleId: cycleCrop.id,
      areaId: loRau1.id,
      type: ActivityType.HARVEST,
      performedAt: harvestDate,
      quantity: new Prisma.Decimal(1200),
      unit: 'kg',
      data: {
        itemId: harvestItem.id,
        quantity: 1200,
        unit: 'kg',
        warehouseId: finishedWarehouse.id,
        qualityGrade: 'A',
        certification: 'VietGAP',
        isPublic: true,
      },
      notes: 'Thu hoạch lô rau cải ngọt mẫu',
      performedById: worker.id,
      createdById: admin.id,
    },
  });
  const harvestLot = await prisma.harvestLot.upsert({
    where: { activityId: harvestActivity.id },
    update: {
      code: 'HL-2026-0001',
      traceCode: 'DEMO000001',
      cycleId: cycleCrop.id,
      itemId: harvestItem.id,
      quantity: new Prisma.Decimal(1200),
      unit: 'kg',
      harvestedAt: harvestDate,
      warehouseId: finishedWarehouse.id,
      qualityGrade: 'A',
      certification: 'VietGAP',
      isPublic: true,
      createdById: admin.id,
    },
    create: {
      code: 'HL-2026-0001',
      traceCode: 'DEMO000001',
      cycleId: cycleCrop.id,
      activityId: harvestActivity.id,
      itemId: harvestItem.id,
      quantity: new Prisma.Decimal(1200),
      unit: 'kg',
      harvestedAt: harvestDate,
      warehouseId: finishedWarehouse.id,
      qualityGrade: 'A',
      certification: 'VietGAP',
      isPublic: true,
      createdById: admin.id,
    },
  });
  const harvestStockLot = await prisma.stockLot.upsert({
    where: { itemId_lotCode: { itemId: harvestItem.id, lotCode: 'HL-2026-0001' } },
    update: {
      harvestLotId: harvestLot.id,
      warehouseId: finishedWarehouse.id,
      unitCost: new Prisma.Decimal(0),
    },
    create: {
      itemId: harvestItem.id,
      lotCode: 'HL-2026-0001',
      harvestLotId: harvestLot.id,
      warehouseId: finishedWarehouse.id,
      unitCost: new Prisma.Decimal(0),
    },
  });
  const harvestRefId = 'HARVEST-HL-2026-0001';
  const existingHarvestMove = await prisma.stockMove.findFirst({
    where: { refType: 'HARVEST', refId: harvestRefId },
  });
  if (!existingHarvestMove) {
    await prisma.stockMove.create({
      data: {
        type: StockMoveType.IN,
        itemId: harvestItem.id,
        stockLotId: harvestStockLot.id,
        toWarehouseId: finishedWarehouse.id,
        quantity: new Prisma.Decimal(1200),
        unitCost: new Prisma.Decimal(0),
        refType: 'HARVEST',
        refId: harvestRefId,
        movedAt: harvestDate,
        notes: 'Nhập kho từ lô thu hoạch mẫu',
      },
    });
  }

  const products = [
    {
      slug: 'rau-cai-ngot',
      name: 'Rau cải ngọt',
      itemId: harvestItem.id,
      price: 35000,
      unit: 'kg',
      sortOrder: 1,
    },
    {
      slug: 'trung-ga-tuoi',
      name: 'Trứng gà tươi',
      itemId: items.get('EGG-CHICKEN')!.id,
      price: 4500,
      unit: 'quả',
      sortOrder: 2,
    },
    {
      slug: 'ca-ro-phi-tuoi',
      name: 'Cá rô phi tươi',
      itemId: items.get('AQUA-RO-PHI')!.id,
      price: 75000,
      unit: 'kg',
      sortOrder: 3,
    },
  ];
  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        ...product,
        description: `<p>${product.name} từ XFarm.</p>`,
        isPublished: true,
        createdById: admin.id,
      },
      create: {
        ...product,
        description: `<p>${product.name} từ XFarm.</p>`,
        isPublished: true,
        createdById: admin.id,
      },
    });
  }

  const posts = [
    {
      slug: 'vuon-rau-huu-co',
      title: 'Một ngày ở vườn rau hữu cơ',
      excerpt: 'Khám phá quy trình chăm sóc rau tại XFarm.',
      content: '<p>Rau được chăm sóc theo quy trình thân thiện với môi trường.</p>',
      status: PostStatus.PUBLISHED,
      publishedAt: new Date('2026-03-01T08:00:00Z'),
    },
    {
      slug: 'tu-trang-trai-den-ban-an',
      title: 'Từ trang trại đến bàn ăn',
      excerpt: 'Hành trình minh bạch của nông sản XFarm.',
      content: '<p>Mỗi sản phẩm đều có mã truy xuất riêng.</p>',
      status: PostStatus.PUBLISHED,
      publishedAt: new Date('2026-03-10T08:00:00Z'),
    },
    {
      slug: 'lich-tham-quan-xfarm',
      title: 'Lịch tham quan XFarm',
      excerpt: 'Thông tin lịch tham quan sắp tới.',
      content: '<p>Nội dung đang được cập nhật.</p>',
      status: PostStatus.DRAFT,
      publishedAt: null,
    },
  ];
  for (const post of posts) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: { ...post, createdById: admin.id },
      create: { ...post, createdById: admin.id },
    });
  }
  await prisma.page.upsert({
    where: { slug: 'gioi-thieu' },
    update: {
      title: 'Giới thiệu XFarm',
      content: '<p>XFarm là nông trại sinh thái phát triển bền vững.</p>',
      createdById: admin.id,
    },
    create: {
      slug: 'gioi-thieu',
      title: 'Giới thiệu XFarm',
      content: '<p>XFarm là nông trại sinh thái phát triển bền vững.</p>',
      createdById: admin.id,
    },
  });
  await prisma.page.upsert({
    where: { slug: 'lien-he' },
    update: {
      title: 'Liên hệ',
      content: '<p>Hãy liên hệ với XFarm để được hỗ trợ.</p>',
      createdById: admin.id,
    },
    create: {
      slug: 'lien-he',
      title: 'Liên hệ',
      content: '<p>Hãy liên hệ với XFarm để được hỗ trợ.</p>',
      createdById: admin.id,
    },
  });
  const settings: Record<string, unknown> = {
    'farm.name': 'XFarm – Nông trại sinh thái',
    'farm.slogan': 'Tươi lành từ đất, an tâm đến bàn ăn',
    'farm.about': 'Nông trại sinh thái kết nối con người với thiên nhiên.',
    'contact.phone': '0901 234 567',
    'contact.email': 'hello@xfarm.local',
    'contact.address': 'Khu nông nghiệp sinh thái XFarm, Hà Nội',
    'social.facebook': 'https://facebook.com/xfarm',
    'social.zalo': 'https://zalo.me/0901234567',
    'social.youtube': 'https://youtube.com/@xfarm',
    'home.banners': ['/images/banner-1.jpg', '/images/banner-2.jpg'],
    'bank.vietqr': { bank: 'VCB', accountNumber: '0123456789', accountName: 'XFARM' },
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  // 7. Seed sales and finance master/sample data.
  const financeCategories = [
    { name: 'Bán hàng', type: TransactionType.INCOME, systemKey: 'SALES' },
    { name: 'Tour', type: TransactionType.INCOME, systemKey: 'TOUR' },
    { name: 'Thu khác', type: TransactionType.INCOME, systemKey: 'OTHER_INCOME' },
    { name: 'Mua vật tư', type: TransactionType.EXPENSE, systemKey: 'PURCHASE' },
    { name: 'Lương', type: TransactionType.EXPENSE, systemKey: 'PAYROLL' },
    { name: 'Điện nước', type: TransactionType.EXPENSE, systemKey: 'UTILITIES' },
    { name: 'Thuê đất', type: TransactionType.EXPENSE, systemKey: 'LAND_RENT' },
    { name: 'Chi khác', type: TransactionType.EXPENSE, systemKey: 'OTHER_EXPENSE' },
  ] as const;
  const categoryIds = new Map<string, string>();
  for (const category of financeCategories) {
    const saved = await prisma.financeCategory.upsert({
      where: { systemKey: category.systemKey },
      update: { name: category.name, type: category.type, isActive: true },
      create: { ...category, isActive: true },
      select: { id: true },
    });
    categoryIds.set(category.systemKey, saved.id);
  }

  const customers = [
    { code: 'CU-0001', name: 'Nguyễn Minh Anh', phone: '0909000001', type: CustomerType.RETAIL },
    { code: 'CU-0002', name: 'Trần Thu Hà', phone: '0909000002', type: CustomerType.RETAIL },
    {
      code: 'CU-0003',
      name: 'Cửa hàng Nông sản Sạch Hà Nội',
      phone: '0909000003',
      type: CustomerType.WHOLESALE,
    },
    {
      code: 'CU-0004',
      name: 'Đại lý Xanh Miền Bắc',
      phone: '0909000004',
      type: CustomerType.AGENT,
    },
  ] as const;
  const customerIds = new Map<string, string>();
  for (const customer of customers) {
    const saved = await prisma.customer.upsert({
      where: { code: customer.code },
      update: { ...customer, isActive: true },
      create: { ...customer, isActive: true },
      select: { id: true },
    });
    customerIds.set(customer.code, saved.id);
  }

  const rauProduct = await prisma.product.findUniqueOrThrow({ where: { slug: 'rau-cai-ngot' } });
  const eggProduct = await prisma.product.findUniqueOrThrow({ where: { slug: 'trung-ga-tuoi' } });
  const salesCategoryId = categoryIds.get('SALES');
  const purchaseCategoryId = categoryIds.get('PURCHASE');
  const payrollCategoryId = categoryIds.get('PAYROLL');
  if (!salesCategoryId || !purchaseCategoryId || !payrollCategoryId) {
    throw new Error('Finance categories were not seeded');
  }

  const pendingOrder = await prisma.salesOrder.upsert({
    where: { code: 'SO-2026-0001' },
    update: {
      customerId: customerIds.get('CU-0001')!,
      channel: SalesChannel.WEBSHOP,
      status: SalesOrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      paymentMethod: PaymentMethod.COD,
      shippingAddress: '12 Phố Huế, Hà Nội',
      subtotal: 70000,
      discount: 0,
      shippingFee: 15000,
      total: 85000,
      notes: 'Đơn webshop mẫu',
    },
    create: {
      code: 'SO-2026-0001',
      customerId: customerIds.get('CU-0001')!,
      channel: SalesChannel.WEBSHOP,
      status: SalesOrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      paymentMethod: PaymentMethod.COD,
      shippingAddress: '12 Phố Huế, Hà Nội',
      subtotal: 70000,
      discount: 0,
      shippingFee: 15000,
      total: 85000,
      notes: 'Đơn webshop mẫu',
    },
    select: { id: true },
  });
  const completedOrder = await prisma.salesOrder.upsert({
    where: { code: 'SO-2026-0002' },
    update: {
      customerId: customerIds.get('CU-0003')!,
      channel: SalesChannel.ADMIN,
      status: SalesOrderStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      shippingAddress: '25 Nguyễn Trãi, Hà Nội',
      subtotal: 450000,
      discount: 0,
      shippingFee: 0,
      total: 450000,
      confirmedAt: new Date('2026-10-17T08:00:00Z'),
    },
    create: {
      code: 'SO-2026-0002',
      customerId: customerIds.get('CU-0003')!,
      channel: SalesChannel.ADMIN,
      status: SalesOrderStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      shippingAddress: '25 Nguyễn Trãi, Hà Nội',
      subtotal: 450000,
      discount: 0,
      shippingFee: 0,
      total: 450000,
      confirmedAt: new Date('2026-10-17T08:00:00Z'),
    },
    select: { id: true },
  });

  const orderLines = [
    {
      id: 'seed-order-line-2026-0001',
      orderId: pendingOrder.id,
      productId: rauProduct.id,
      itemId: harvestItem.id,
      quantity: new Prisma.Decimal(2),
      unitPrice: new Prisma.Decimal(35000),
    },
    {
      id: 'seed-order-line-2026-0002',
      orderId: completedOrder.id,
      productId: eggProduct.id,
      itemId: items.get('EGG-CHICKEN')!.id,
      quantity: new Prisma.Decimal(100),
      unitPrice: new Prisma.Decimal(4500),
    },
  ];
  for (const line of orderLines) {
    await prisma.salesOrderLine.upsert({ where: { id: line.id }, update: line, create: line });
  }

  await prisma.payment.upsert({
    where: { code: 'PM-2026-0001' },
    update: {
      orderId: completedOrder.id,
      amount: 450000,
      method: PaymentMethod.BANK_TRANSFER,
      paidAt: new Date('2026-10-17T08:30:00Z'),
      transactionId: 'DEMO-BANK-2026-0001',
      notes: 'Thanh toán đơn mẫu',
    },
    create: {
      code: 'PM-2026-0001',
      orderId: completedOrder.id,
      amount: 450000,
      method: PaymentMethod.BANK_TRANSFER,
      paidAt: new Date('2026-10-17T08:30:00Z'),
      transactionId: 'DEMO-BANK-2026-0001',
      notes: 'Thanh toán đơn mẫu',
    },
  });

  const transactions = [
    {
      code: 'TX-2026-0001',
      type: TransactionType.INCOME,
      categoryId: salesCategoryId,
      amount: new Prisma.Decimal(450000),
      date: new Date('2026-10-17T08:30:00Z'),
      refType: 'SALES_ORDER',
      refId: completedOrder.id,
      method: PaymentMethod.BANK_TRANSFER,
      notes: 'Doanh thu đơn SO-2026-0002',
    },
    {
      code: 'TX-2026-0002',
      type: TransactionType.EXPENSE,
      categoryId: purchaseCategoryId,
      amount: new Prisma.Decimal(120000),
      date: new Date('2026-10-16T09:00:00Z'),
      cycleId: cycleCrop.id,
      refType: 'SEED',
      refId: 'PURCHASE-DEMO-2026',
      method: PaymentMethod.CASH,
      notes: 'Chi vật tư cho vụ rau mẫu',
    },
    {
      code: 'TX-2026-0003',
      type: TransactionType.EXPENSE,
      categoryId: payrollCategoryId,
      amount: new Prisma.Decimal(300000),
      date: new Date('2026-10-18T09:00:00Z'),
      cycleId: cycleCrop.id,
      refType: 'PAYROLL',
      refId: 'PAYROLL-DEMO-2026',
      method: PaymentMethod.CASH,
      notes: 'Chi công chăm sóc vụ rau mẫu',
    },
  ] as const;
  for (const transaction of transactions) {
    await prisma.transaction.upsert({
      where: { code: transaction.code },
      update: transaction,
      create: transaction,
    });
  }
  await ensureSequence('CU', 0, 4);
  await ensureSequence('SO', currentYear, 2);
  await ensureSequence('PM', currentYear, 2);
  await ensureSequence('TX', currentYear, 3);

  // 8. Seed Phase 5: Tours, TourSlots, and Bookings
  const existingMedia = await prisma.media.findMany({ take: 3, select: { id: true } });
  const mediaIds = existingMedia.map((m) => m.id);

  const toursData = [
    {
      slug: 'trai-nghiem-thu-hoach-rau',
      name: 'Trải nghiệm thu hoạch rau',
      description:
        '<p>Tham quan vườn rau hữu cơ đạt chuẩn sinh thái, tìm hiểu quy trình canh tác thuận tự nhiên và tự tay thu hoạch những bó rau tươi ngon nhất mang về cho gia đình.</p>',
      durationMinutes: 120,
      priceAdult: new Prisma.Decimal(150000),
      priceChild: new Prisma.Decimal(80000),
      capacity: 20,
      mediaIds: mediaIds.slice(0, 1),
      isPublished: true,
      sortOrder: 1,
    },
    {
      slug: 'cau-ca-ao',
      name: 'Câu cá ao',
      description:
        '<p>Trải nghiệm câu cá giải trí thư giãn bên bờ ao sinh thái thoáng mát, tận hưởng không gian trong lành vùng ngoại ô và chế biến cá tươi tại chỗ.</p>',
      durationMinutes: 180,
      priceAdult: new Prisma.Decimal(200000),
      priceChild: new Prisma.Decimal(100000),
      capacity: 15,
      mediaIds: mediaIds.slice(1, 2),
      isPublished: true,
      sortOrder: 2,
    },
    {
      slug: 'cho-ga-an-nhat-trung',
      name: 'Cho gà ăn & nhặt trứng',
      description:
        '<p>Hoạt động giáo dục nông nghiệp bổ ích cho trẻ em và gia đình: vào chuồng gà an toàn sinh học, tìm hiểu tập tính đàn gà, cho gà ăn và tự tay nhặt những quả trứng ấm nóng.</p>',
      durationMinutes: 90,
      priceAdult: new Prisma.Decimal(120000),
      priceChild: new Prisma.Decimal(80000),
      capacity: 10,
      mediaIds: mediaIds.slice(2, 3),
      isPublished: true,
      sortOrder: 3,
    },
  ];

  const savedTours = new Map<string, { id: string; capacity: number }>();
  for (const tour of toursData) {
    const saved = await prisma.tour.upsert({
      where: { slug: tour.slug },
      update: {
        name: tour.name,
        description: tour.description,
        durationMinutes: tour.durationMinutes,
        priceAdult: tour.priceAdult,
        priceChild: tour.priceChild,
        capacity: tour.capacity,
        mediaIds: tour.mediaIds,
        isPublished: tour.isPublished,
        sortOrder: tour.sortOrder,
      },
      create: {
        ...tour,
        createdById: admin.id,
      },
    });
    savedTours.set(tour.slug, { id: saved.id, capacity: saved.capacity });
  }

  // Generate slots for Saturdays (6) and Sundays (0) at 08:00 and 14:00 for the next 4 weeks
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekendSlotDates: Date[] = [];
  for (let i = 1; i <= 28; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      weekendSlotDates.push(new Date(`${yyyy}-${mm}-${dd}T08:00:00+07:00`));
      weekendSlotDates.push(new Date(`${yyyy}-${mm}-${dd}T14:00:00+07:00`));
    }
  }

  const tourSlotsByTourSlug = new Map<string, string[]>();
  for (const [slug, tourInfo] of savedTours.entries()) {
    const slotIds: string[] = [];
    for (const slotDate of weekendSlotDates) {
      const savedSlot = await prisma.tourSlot.upsert({
        where: {
          tourId_startAt: {
            tourId: tourInfo.id,
            startAt: slotDate,
          },
        },
        update: {
          capacity: tourInfo.capacity,
          isActive: true,
        },
        create: {
          tourId: tourInfo.id,
          startAt: slotDate,
          capacity: tourInfo.capacity,
          bookedCount: 0,
          isActive: true,
          createdById: admin.id,
        },
        select: { id: true },
      });
      slotIds.push(savedSlot.id);
    }
    tourSlotsByTourSlug.set(slug, slotIds);
  }

  // 3 sample bookings:
  // 1 slot only has 1 spot left (Tour 3 capacity 10 -> booking has 4 adults + 5 children = 9 guests -> bookedCount = 9, 1 spot left)
  const tour1Slots = tourSlotsByTourSlug.get('trai-nghiem-thu-hoach-rau') ?? [];
  const tour2Slots = tourSlotsByTourSlug.get('cau-ca-ao') ?? [];
  const tour3Slots = tourSlotsByTourSlug.get('cho-ga-an-nhat-trung') ?? [];

  const slot1Id = tour1Slots[0];
  const slot2Id = tour2Slots[0];
  const slot3Id = tour3Slots[0];

  if (slot1Id && slot2Id && slot3Id) {
    // Booking 1: Confirmed and paid
    const booking1 = await prisma.booking.upsert({
      where: { code: 'BK-2026-0001' },
      update: {
        slotId: slot1Id,
        customerName: 'Nguyễn Minh Anh',
        phone: '0909000001',
        email: 'minhanh.nguyen@example.com',
        adults: 2,
        children: 1,
        total: new Prisma.Decimal(380000),
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        customerId: customerIds.get('CU-0001'),
        confirmedAt: new Date('2026-10-18T10:00:00Z'),
        notes: 'Gia đình có bé 5 tuổi',
      },
      create: {
        code: 'BK-2026-0001',
        slotId: slot1Id,
        customerName: 'Nguyễn Minh Anh',
        phone: '0909000001',
        email: 'minhanh.nguyen@example.com',
        adults: 2,
        children: 1,
        total: new Prisma.Decimal(380000),
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        customerId: customerIds.get('CU-0001'),
        confirmedAt: new Date('2026-10-18T10:00:00Z'),
        notes: 'Gia đình có bé 5 tuổi',
        createdById: admin.id,
      },
    });

    await prisma.tourSlot.update({
      where: { id: slot1Id },
      data: { bookedCount: 3 },
    });

    // Payment for booking 1
    await prisma.payment.upsert({
      where: { code: 'PM-2026-0002' },
      update: {
        bookingId: booking1.id,
        amount: new Prisma.Decimal(380000),
        method: PaymentMethod.BANK_TRANSFER,
      },
      create: {
        code: 'PM-2026-0002',
        bookingId: booking1.id,
        amount: new Prisma.Decimal(380000),
        method: PaymentMethod.BANK_TRANSFER,
        createdById: admin.id,
      },
    });

    // Booking 2: Pending booking
    await prisma.booking.upsert({
      where: { code: 'BK-2026-0002' },
      update: {
        slotId: slot2Id,
        customerName: 'Trần Thu Hà',
        phone: '0909000002',
        email: 'thuha.tran@example.com',
        adults: 1,
        children: 0,
        total: new Prisma.Decimal(200000),
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        paymentMethod: PaymentMethod.COD,
        customerId: customerIds.get('CU-0002'),
        notes: 'Cần mượn thêm cần câu đơn',
      },
      create: {
        code: 'BK-2026-0002',
        slotId: slot2Id,
        customerName: 'Trần Thu Hà',
        phone: '0909000002',
        email: 'thuha.tran@example.com',
        adults: 1,
        children: 0,
        total: new Prisma.Decimal(200000),
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        paymentMethod: PaymentMethod.COD,
        customerId: customerIds.get('CU-0002'),
        notes: 'Cần mượn thêm cần câu đơn',
        createdById: admin.id,
      },
    });

    await prisma.tourSlot.update({
      where: { id: slot2Id },
      data: { bookedCount: 1 },
    });

    // Booking 3: Slot 3 has capacity 10; booked 9 guests (4 adults + 5 children) => exactly 1 spot left for concurrency test!
    await prisma.booking.upsert({
      where: { code: 'BK-2026-0003' },
      update: {
        slotId: slot3Id,
        customerName: 'Đoàn trường Mầm non Ánh Sao',
        phone: '0912345678',
        email: 'anhsao.edu@example.com',
        adults: 4,
        children: 5,
        total: new Prisma.Decimal(880000),
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        confirmedAt: new Date('2026-10-18T14:30:00Z'),
        notes: 'Đoàn thực tế ngoại khóa cho các bé lớp lá',
      },
      create: {
        code: 'BK-2026-0003',
        slotId: slot3Id,
        customerName: 'Đoàn trường Mầm non Ánh Sao',
        phone: '0912345678',
        email: 'anhsao.edu@example.com',
        adults: 4,
        children: 5,
        total: new Prisma.Decimal(880000),
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        confirmedAt: new Date('2026-10-18T14:30:00Z'),
        notes: 'Đoàn thực tế ngoại khóa cho các bé lớp lá',
        createdById: admin.id,
      },
    });

    await prisma.tourSlot.update({
      where: { id: slot3Id },
      data: { bookedCount: 9 }, // capacity 10, bookedCount 9 => exactly 1 spot left!
    });
  }

  await ensureSequence('BK', currentYear, 3);

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
