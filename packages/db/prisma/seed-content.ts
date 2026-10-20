import {
  PrismaClient,
  Prisma,
  AreaType,
  ItemCategory,
  PostStatus,
  PayType,
  CustomerType,
  EquipmentStatus,
  MaintenanceType,
  SensorType,
  AlertOp,
  AnimalSex,
  AnimalStatus,
  CycleKind,
  CycleStatus,
  Role,
  StockMoveType,
} from '@prisma/client';
import { createHash } from 'node:crypto';

const prisma = new PrismaClient();

function hashApiKey(rawKey: string): { apiKeyHash: string; apiKeyPrefix: string } {
  const apiKeyHash = createHash('sha256').update(rawKey).digest('hex');
  const apiKeyPrefix = rawKey.slice(0, 8);
  return { apiKeyHash, apiKeyPrefix };
}

async function resetDemoContent() {
  console.log('--- Đang xóa nội dung demo (--reset-content) ---');

  // 1. AlertRule & Readings for demo sensors
  const demoSensors = await prisma.sensor.findMany({
    where: { code: { startsWith: 'DEMO-SN-' } },
    select: { id: true },
  });
  const sensorIds = demoSensors.map((s) => s.id);
  if (sensorIds.length > 0) {
    await prisma.alert.deleteMany({ where: { rule: { sensorId: { in: sensorIds } } } });
    await prisma.alertRule.deleteMany({ where: { sensorId: { in: sensorIds } } });
    await prisma.sensorReading.deleteMany({ where: { sensorId: { in: sensorIds } } });
    await prisma.sensor.deleteMany({ where: { id: { in: sensorIds } } });
    console.log(`Đã xóa ${sensorIds.length} cảm biến demo và dữ liệu đo.`);
  }

  // 2. Equipment & maintenance
  const demoEquip = await prisma.equipment.findMany({
    where: { code: { startsWith: 'DEMO-EQ-' } },
    select: { id: true },
  });
  const equipIds = demoEquip.map((e) => e.id);
  if (equipIds.length > 0) {
    await prisma.maintenanceLog.deleteMany({ where: { equipmentId: { in: equipIds } } });
    await prisma.maintenanceSchedule.deleteMany({ where: { equipmentId: { in: equipIds } } });
    await prisma.equipment.deleteMany({ where: { id: { in: equipIds } } });
    console.log(`Đã xóa ${equipIds.length} thiết bị demo.`);
  }

  // 3. Animals & AnimalGroups
  const delAnimals = await prisma.animal.deleteMany({
    where: { tag: { startsWith: 'DEMO-ANI-' } },
  });
  const delGroups = await prisma.animalGroup.deleteMany({
    where: { code: { startsWith: 'DEMO-AG-' } },
  });
  console.log(`Đã xóa ${delAnimals.count} cá thể và ${delGroups.count} đàn vật nuôi demo.`);

  // 4. Tours & TourSlots & Bookings
  const demoTours = await prisma.tour.findMany({
    where: { slug: { startsWith: 'demo-tour-' } },
    select: { id: true },
  });
  const tourIds = demoTours.map((t) => t.id);
  if (tourIds.length > 0) {
    const demoSlots = await prisma.tourSlot.findMany({
      where: { tourId: { in: tourIds } },
      select: { id: true },
    });
    const slotIds = demoSlots.map((s) => s.id);
    if (slotIds.length > 0) {
      await prisma.booking.deleteMany({ where: { slotId: { in: slotIds } } });
      await prisma.tourSlot.deleteMany({ where: { id: { in: slotIds } } });
    }
    await prisma.tour.deleteMany({ where: { id: { in: tourIds } } });
    console.log(`Đã xóa ${tourIds.length} tour demo.`);
  }

  // 5. Products & Blog Posts & Pages
  const delProducts = await prisma.product.deleteMany({
    where: { slug: { startsWith: 'demo-prod-' } },
  });
  const delPosts = await prisma.post.deleteMany({
    where: { slug: { startsWith: 'demo-post-' } },
  });
  const delPages = await prisma.page.deleteMany({
    where: { slug: { in: ['gioi-thieu', 'chinh-sach-giao-hang', 'lien-he'] } },
  });
  console.log(
    `Đã xóa ${delProducts.count} sản phẩm, ${delPosts.count} bài viết, ${delPages.count} trang tĩnh.`,
  );

  // 6. Customers, Employees, Suppliers
  const delCust = await prisma.customer.deleteMany({
    where: { code: { startsWith: 'DEMO-CU-' } },
  });
  const delEmp = await prisma.employee.deleteMany({
    where: { code: { startsWith: 'DEMO-NV-' } },
  });
  const delSup = await prisma.supplier.deleteMany({
    where: { code: { startsWith: 'DEMO-NCC-' } },
  });
  console.log(
    `Đã xóa ${delCust.count} khách hàng, ${delEmp.count} nhân viên, ${delSup.count} nhà cung cấp demo.`,
  );

  // 7. Cycles
  const delCycles = await prisma.cycle.deleteMany({
    where: { code: { startsWith: 'DEMO-CY-' } },
  });
  console.log(`Đã xóa ${delCycles.count} chu kỳ demo.`);

  // 8. Items
  const delItems = await prisma.item.deleteMany({
    where: {
      OR: [{ sku: { startsWith: 'DEMO-ITEM-' } }, { sku: { startsWith: 'DEMO-PROD-ITEM-' } }],
    },
  });
  console.log(`Đã xóa ${delItems.count} vật tư & sản phẩm demo.`);

  // 9. Areas (children first, then parents)
  const delChildAreas = await prisma.area.deleteMany({
    where: {
      code: { startsWith: 'DEMO-AR-' },
      parentId: { not: null },
    },
  });
  const delParentAreas = await prisma.area.deleteMany({
    where: {
      code: { startsWith: 'DEMO-AR-' },
    },
  });
  console.log(`Đã xóa ${delChildAreas.count + delParentAreas.count} khu vực demo.`);

  // 10. Media
  const delMedia = await prisma.media.deleteMany({
    where: { key: { startsWith: 'demo/' } },
  });
  console.log(`Đã xóa ${delMedia.count} bản ghi Media demo.`);

  console.log('--- Hoàn tất dọn dẹp nội dung demo ---');
}

async function main() {
  const isReset = process.argv.includes('--reset-content');
  if (isReset) {
    await resetDemoContent();
    return;
  }

  console.log('Bắt đầu gieo mầm dữ liệu nội dung demo (seed-content.ts)...');

  // Find admin user for audit/owner references
  const admin = await prisma.user.findFirst({
    where: { role: Role.OWNER },
  });

  // ==========================================
  // 1. MEDIA (~32 SVG illustrations)
  // ==========================================
  console.log('1. Seeding Media...');
  const mediaList = [
    {
      key: 'demo/rau-cai.svg',
      url: '/demo/rau-cai.svg',
      alt: 'Rau cải xanh tươi hữu cơ XFarm',
      size: 2260,
    },
    {
      key: 'demo/xa-lach.svg',
      url: '/demo/xa-lach.svg',
      alt: 'Xà lách mỡ tươi giòn Đà Lạt',
      size: 2060,
    },
    {
      key: 'demo/ca-chua.svg',
      url: '/demo/ca-chua.svg',
      alt: 'Cà chua bi hữu cơ mọng nước',
      size: 2360,
    },
    {
      key: 'demo/dua-luoi.svg',
      url: '/demo/dua-luoi.svg',
      alt: 'Dưa lưới ruột cam tiêu chuẩn VietGAP',
      size: 2380,
    },
    {
      key: 'demo/ga-ri.svg',
      url: '/demo/ga-ri.svg',
      alt: 'Gà ri thả vườn đồi tự nhiên',
      size: 2880,
    },
    {
      key: 'demo/trung-ga.svg',
      url: '/demo/trung-ga.svg',
      alt: 'Trứng gà ta thảo mộc tươi sạch',
      size: 2460,
    },
    {
      key: 'demo/ca-ro-phi.svg',
      url: '/demo/ca-ro-phi.svg',
      alt: 'Cá rô phi sông sinh thái tự nhiên',
      size: 2560,
    },
    {
      key: 'demo/ao-ca.svg',
      url: '/demo/ao-ca.svg',
      alt: 'Ao cá sinh thái tuần hoàn nước',
      size: 2470,
    },
    {
      key: 'demo/nha-kinh.svg',
      url: '/demo/nha-kinh.svg',
      alt: 'Nhà kính nông nghiệp thông minh công nghệ cao',
      size: 2570,
    },
    {
      key: 'demo/canh-dong.svg',
      url: '/demo/canh-dong.svg',
      alt: 'Cánh đồng rau hữu cơ bạt ngàn',
      size: 2160,
    },
    {
      key: 'demo/tour-thu-hoach.svg',
      url: '/demo/tour-thu-hoach.svg',
      alt: 'Tour trải nghiệm thu hoạch nông sản sạch',
      size: 2570,
    },
    {
      key: 'demo/cau-ca.svg',
      url: '/demo/cau-ca.svg',
      alt: 'Tour câu cá thư giãn bên hồ sinh thái',
      size: 2370,
    },
    {
      key: 'demo/cho-ga-an.svg',
      url: '/demo/cho-ga-an.svg',
      alt: 'Trải nghiệm cho gà ăn & nhặt trứng cho gia đình',
      size: 2270,
    },
    {
      key: 'demo/may-bom.svg',
      url: '/demo/may-bom.svg',
      alt: 'Hệ thống máy bơm tưới tự động tiết kiệm nước',
      size: 2470,
    },
    {
      key: 'demo/cam-bien.svg',
      url: '/demo/cam-bien.svg',
      alt: 'Cảm biến thông minh IoT đo độ ẩm nhiệt độ đất',
      size: 2670,
    },
    {
      key: 'demo/kho-hang.svg',
      url: '/demo/kho-hang.svg',
      alt: 'Kho bảo quản nông sản và trung tâm logistics XFarm',
      size: 2270,
    },
    {
      key: 'demo/banner-1.svg',
      url: '/demo/banner-1.svg',
      alt: 'Banner nông nghiệp sinh thái tuần hoàn bền vững',
      size: 2370,
    },
    {
      key: 'demo/banner-2.svg',
      url: '/demo/banner-2.svg',
      alt: 'Banner nông sản tươi lành an tâm mỗi ngày',
      size: 2570,
    },
    {
      key: 'demo/banner-3.svg',
      url: '/demo/banner-3.svg',
      alt: 'Banner tour trải nghiệm du lịch nông trại sinh thái',
      size: 2770,
    },
    {
      key: 'demo/dua-leo.svg',
      url: '/demo/dua-leo.svg',
      alt: 'Dưa leo baby giòn ngọt',
      size: 1850,
    },
    {
      key: 'demo/ot-chuong.svg',
      url: '/demo/ot-chuong.svg',
      alt: 'Ớt chuông ngọt tươi giòn Đà Lạt',
      size: 1750,
    },
    {
      key: 'demo/bap-cai.svg',
      url: '/demo/bap-cai.svg',
      alt: 'Bắp cải hữu cơ cuộn chặt tự nhiên',
      size: 1850,
    },
    {
      key: 'demo/ca-tim.svg',
      url: '/demo/ca-tim.svg',
      alt: 'Cà tím sinh thái quả dài bóng mượt',
      size: 1750,
    },
    {
      key: 'demo/vit-co.svg',
      url: '/demo/vit-co.svg',
      alt: 'Đàn vịt cỏ sinh thái thả cánh đồng',
      size: 1950,
    },
    {
      key: 'demo/ca-dieu-hong.svg',
      url: '/demo/ca-dieu-hong.svg',
      alt: 'Cá diêu hồng tươi sống nuôi lồng bè tự nhiên',
      size: 1950,
    },
    {
      key: 'demo/phan-huu-co.svg',
      url: '/demo/phan-huu-co.svg',
      alt: 'Phân bón vi sinh hữu cơ ủ hoai mục cao cấp',
      size: 2050,
    },
    {
      key: 'demo/thuc-an-chan-nuoi.svg',
      url: '/demo/thuc-an-chan-nuoi.svg',
      alt: 'Cám sinh học cao cấp cho gia súc gia cầm',
      size: 2150,
    },
    {
      key: 'demo/chuong-nuoi.svg',
      url: '/demo/chuong-nuoi.svg',
      alt: 'Chuồng nuôi gia cầm thoáng khí đệm lót sinh học',
      size: 2150,
    },
    {
      key: 'demo/tour-cam-trai.svg',
      url: '/demo/tour-cam-trai.svg',
      alt: 'Tour cắm trại dã ngoại picnic nông trại',
      size: 2150,
    },
    {
      key: 'demo/tour-lop-hoc-xanh.svg',
      url: '/demo/tour-lop-hoc-xanh.svg',
      alt: 'Lớp học thiên nhiên và nông nghiệp xanh cho bé',
      size: 2250,
    },
    {
      key: 'demo/may-suc-khi.svg',
      url: '/demo/may-suc-khi.svg',
      alt: 'Máy sục khí nano khuếch tán oxy ao cá',
      size: 1950,
    },
    {
      key: 'demo/trung-vit.svg',
      url: '/demo/trung-vit.svg',
      alt: 'Trứng vịt sạch vỏ trắng tự nhiên',
      size: 1950,
    },
  ];

  for (const item of mediaList) {
    const existing = await prisma.media.findFirst({ where: { key: item.key } });
    if (!existing) {
      await prisma.media.create({
        data: {
          key: item.key,
          url: item.url,
          mime: 'image/svg+xml',
          size: item.size,
          alt: item.alt,
          uploadedById: admin?.id,
        },
      });
    } else {
      await prisma.media.update({
        where: { id: existing.id },
        data: {
          url: item.url,
          alt: item.alt,
          size: item.size,
        },
      });
    }
  }

  // ==========================================
  // 2. AREAS (~23 areas with valid GeoJSON)
  // ==========================================
  console.log('2. Seeding Areas with valid GeoJSON polygons (Lam Dong 11.94N, 108.44E)...');

  // Root Parent Zones
  const parentZones = [
    {
      code: 'DEMO-AR-ZONE-VEG',
      name: 'Vùng trồng trọt hữu cơ XFarm',
      type: AreaType.ZONE,
      areaM2: new Prisma.Decimal(50000),
      description: 'Vùng chuyên canh rau ăn lá, củ quả và hệ thống nhà kính công nghệ cao.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.436, 11.94],
            [108.44, 11.94],
            [108.44, 11.944],
            [108.436, 11.944],
            [108.436, 11.94],
          ],
        ],
      },
    },
    {
      code: 'DEMO-AR-ZONE-LIVESTOCK',
      name: 'Vùng chăn nuôi sinh thái XFarm',
      type: AreaType.ZONE,
      areaM2: new Prisma.Decimal(30000),
      description: 'Khu chuồng trại gà ri đệm lót sinh học và bãi chăn thả vịt cỏ tự nhiên.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.44, 11.94],
            [108.444, 11.94],
            [108.444, 11.944],
            [108.44, 11.944],
            [108.44, 11.94],
          ],
        ],
      },
    },
    {
      code: 'DEMO-AR-ZONE-AQUA',
      name: 'Vùng thủy sản tuần hoàn XFarm',
      type: AreaType.ZONE,
      areaM2: new Prisma.Decimal(35000),
      description: 'Chuỗi ao nuôi cá rô phi, cá diêu hồng và ao sinh học tuần hoàn xử lý nước.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.436, 11.936],
            [108.44, 11.936],
            [108.44, 11.94],
            [108.436, 11.94],
            [108.436, 11.936],
          ],
        ],
      },
    },
    {
      code: 'DEMO-AR-ZONE-TOURISM',
      name: 'Vùng du lịch trải nghiệm XFarm',
      type: AreaType.ZONE,
      areaM2: new Prisma.Decimal(25000),
      description:
        'Khu vực đón tiếp du khách, trải nghiệm nông nghiệp cho trẻ em và dã ngoại cắm trại.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.44, 11.936],
            [108.444, 11.936],
            [108.444, 11.9385],
            [108.44, 11.9385],
            [108.44, 11.936],
          ],
        ],
      },
    },
    {
      code: 'DEMO-AR-ZONE-LOGISTICS',
      name: 'Vùng điều hành & kho bãi XFarm',
      type: AreaType.ZONE,
      areaM2: new Prisma.Decimal(15000),
      description: 'Khu nhà xưởng sơ chế, đóng gói, bảo quản lạnh và trạm bơm kỹ thuật trung tâm.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.44, 11.9385],
            [108.444, 11.9385],
            [108.444, 11.94],
            [108.44, 11.94],
            [108.44, 11.9385],
          ],
        ],
      },
    },
  ];

  const parentMap = new Map<string, string>();
  for (const zone of parentZones) {
    const area = await prisma.area.upsert({
      where: { code: zone.code },
      update: {
        name: zone.name,
        type: zone.type,
        areaM2: zone.areaM2,
        geojson: zone.geojson,
        description: zone.description,
        isActive: true,
      },
      create: {
        code: zone.code,
        name: zone.name,
        type: zone.type,
        areaM2: zone.areaM2,
        geojson: zone.geojson,
        description: zone.description,
        isActive: true,
        createdById: admin?.id,
      },
    });
    parentMap.set(zone.code, area.id);
  }

  // Child areas
  const childAreas = [
    // In ZONE-VEG
    {
      code: 'DEMO-AR-FIELD-01',
      parentCode: 'DEMO-AR-ZONE-VEG',
      name: 'Lô rau ăn lá hữu cơ 1 (Cải & Xà lách)',
      type: AreaType.FIELD,
      areaM2: new Prisma.Decimal(8000),
      description: 'Đất phù sa giàu mùn hữu cơ, chuyên canh rau cải ngọt, cải thìa, xà lách mỡ.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.4362, 11.9422],
            [108.4378, 11.9422],
            [108.4378, 11.9438],
            [108.4362, 11.9438],
            [108.4362, 11.9422],
          ],
        ],
      },
    },
    {
      code: 'DEMO-AR-FIELD-02',
      parentCode: 'DEMO-AR-ZONE-VEG',
      name: 'Lô rau ăn lá hữu cơ 2 (Rau thơm & Thảo mộc)',
      type: AreaType.FIELD,
      areaM2: new Prisma.Decimal(8000),
      description:
        'Luống rau thơm hữu cơ, húng quế, kinh giới, ngò gai với hệ thống tưới phun tự động.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.4382, 11.9422],
            [108.4398, 11.9422],
            [108.4398, 11.9438],
            [108.4382, 11.9438],
            [108.4382, 11.9422],
          ],
        ],
      },
    },
    {
      code: 'DEMO-AR-FIELD-03',
      parentCode: 'DEMO-AR-ZONE-VEG',
      name: 'Lô củ quả ngoài trời 3 (Bắp cải & Cà tím)',
      type: AreaType.FIELD,
      areaM2: new Prisma.Decimal(9000),
      description: 'Canh tác luân canh bắp cải thảo, cà tím và dưa leo giàn ngoài trời.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.4362, 11.9404],
            [108.4378, 11.9404],
            [108.4378, 11.9418],
            [108.4362, 11.9418],
            [108.4362, 11.9404],
          ],
        ],
      },
    },
    {
      code: 'DEMO-AR-GH-A',
      parentCode: 'DEMO-AR-ZONE-VEG',
      name: 'Nhà kính A - Dưa lưới công nghệ cao',
      type: AreaType.GREENHOUSE,
      areaM2: new Prisma.Decimal(4500),
      description:
        'Nhà màng Israel kiềm soát nhiệt độ và ẩm độ, tưới nhỏ giọt hồi lưu cho dưa lưới ruột cam.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.4382, 11.9411],
            [108.4398, 11.9411],
            [108.4398, 11.9418],
            [108.4382, 11.9418],
            [108.4382, 11.9411],
          ],
        ],
      },
    },
    {
      code: 'DEMO-AR-GH-B',
      parentCode: 'DEMO-AR-ZONE-VEG',
      name: 'Nhà kính B - Cà chua & Ớt chuông Đà Lạt',
      type: AreaType.GREENHOUSE,
      areaM2: new Prisma.Decimal(4500),
      description:
        'Nhà màng công nghệ cao trồng cà chua bi cherry và ớt chuông ngọt ba màu trên giá thể xơ dừa.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.4382, 11.9404],
            [108.4398, 11.9404],
            [108.4398, 11.941],
            [108.4382, 11.941],
            [108.4382, 11.9404],
          ],
        ],
      },
    },

    // In ZONE-LIVESTOCK
    {
      code: 'DEMO-AR-BARN-01',
      parentCode: 'DEMO-AR-ZONE-LIVESTOCK',
      name: 'Chuồng gà ri thả vườn 1 (Gà thịt)',
      type: AreaType.BARN,
      areaM2: new Prisma.Decimal(4000),
      description:
        'Chuồng đệm lót men vi sinh Balasa kết hợp sân vườn đồi thả tự nhiên cho gà ri vận động.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.4402, 11.9422],
            [108.4418, 11.9422],
            [108.4418, 11.9438],
            [108.4402, 11.9438],
            [108.4402, 11.9422],
          ],
        ],
      },
    },
    {
      code: 'DEMO-AR-BARN-02',
      parentCode: 'DEMO-AR-ZONE-LIVESTOCK',
      name: 'Chuồng gà giống & gà đẻ thảo mộc 2',
      type: AreaType.BARN,
      areaM2: new Prisma.Decimal(4000),
      description:
        'Khu chuồng gà đẻ trứng thảo mộc với hệ thống ổ đẻ sạch và thông gió tự nhiên đối lưu.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.4422, 11.9422],
            [108.4438, 11.9422],
            [108.4438, 11.9438],
            [108.4422, 11.9438],
            [108.4422, 11.9422],
          ],
        ],
      },
    },
    {
      code: 'DEMO-AR-BARN-03',
      parentCode: 'DEMO-AR-ZONE-LIVESTOCK',
      name: 'Chuồng gà hậu bị & úm gà con 3',
      type: AreaType.BARN,
      areaM2: new Prisma.Decimal(4000),
      description:
        'Khu chuồng kiểm soát nhiệt độ sưởi ấm hồng ngoại cho gà con từ 1 đến 21 ngày tuổi.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.4402, 11.9404],
            [108.4418, 11.9404],
            [108.4418, 11.9418],
            [108.4402, 11.9418],
            [108.4402, 11.9404],
          ],
        ],
      },
    },
    {
      code: 'DEMO-AR-BARN-04',
      parentCode: 'DEMO-AR-ZONE-LIVESTOCK',
      name: 'Khu chăn thả vịt cỏ sinh thái',
      type: AreaType.BARN,
      areaM2: new Prisma.Decimal(5000),
      description:
        'Khu ruộng nước và kênh dẫn kết hợp chăn thả vịt cỏ Cánh Trắng bắt sâu bọ và ốc bươu.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.4422, 11.9404],
            [108.4438, 11.9404],
            [108.4438, 11.9418],
            [108.4422, 11.9418],
            [108.4422, 11.9404],
          ],
        ],
      },
    },

    // In ZONE-AQUA
    {
      code: 'DEMO-AR-POND-01',
      parentCode: 'DEMO-AR-ZONE-AQUA',
      name: 'Ao cá rô phi thương phẩm 1',
      type: AreaType.POND,
      areaM2: new Prisma.Decimal(6000),
      description:
        'Ao nuôi thâm canh cá rô phi đơn tính dòng GIFT, trang bị 2 dàn quạt nước sục khí oxy nano.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.4362, 11.9382],
            [108.4378, 11.9382],
            [108.4378, 11.9398],
            [108.4362, 11.9398],
            [108.4362, 11.9382],
          ],
        ],
      },
    },
    {
      code: 'DEMO-AR-POND-02',
      parentCode: 'DEMO-AR-ZONE-AQUA',
      name: 'Ao cá diêu hồng nước ngọt 2',
      type: AreaType.POND,
      areaM2: new Prisma.Decimal(6000),
      description:
        'Ao lót bạt HDPE nuôi cá diêu hồng thịt săn ngọt, nguồn nước luân chuyển liên tục từ ao lắng.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.4382, 11.9382],
            [108.4398, 11.9382],
            [108.4398, 11.9398],
            [108.4382, 11.9398],
            [108.4382, 11.9382],
          ],
        ],
      },
    },
    {
      code: 'DEMO-AR-POND-03',
      parentCode: 'DEMO-AR-ZONE-AQUA',
      name: 'Ao lắng sinh học lọc nước 3',
      type: AreaType.POND,
      areaM2: new Prisma.Decimal(5000),
      description:
        'Hệ thống ao xử lý sinh thái trồng hoa sen, súng và lục bình lọc sinh học loại bỏ cặn bùn.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.4362, 11.9362],
            [108.4378, 11.9362],
            [108.4378, 11.9378],
            [108.4362, 11.9378],
            [108.4362, 11.9362],
          ],
        ],
      },
    },
    {
      code: 'DEMO-AR-POND-04',
      parentCode: 'DEMO-AR-ZONE-AQUA',
      name: 'Ao ươm cá giống & thuần dưỡng 4',
      type: AreaType.POND,
      areaM2: new Prisma.Decimal(5000),
      description:
        'Ao nuôi dưỡng cá giống cỡ nhỏ trước khi thả sang ao thương phẩm, đảm bảo tỷ lệ sống cao.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.4382, 11.9362],
            [108.4398, 11.9362],
            [108.4398, 11.9378],
            [108.4382, 11.9378],
            [108.4382, 11.9362],
          ],
        ],
      },
    },

    // In ZONE-TOURISM
    {
      code: 'DEMO-AR-TOUR-HARVEST',
      parentCode: 'DEMO-AR-ZONE-TOURISM',
      name: 'Khu trải nghiệm thu hoạch nông sản',
      type: AreaType.VISITOR_ZONE,
      areaM2: new Prisma.Decimal(6000),
      description:
        'Khu vực đón tiếp du khách tự tay hái dưa lưới, thu hoạch rau sạch và học kỹ năng làm vườn.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.4402, 11.9374],
            [108.4438, 11.9374],
            [108.4438, 11.9384],
            [108.4402, 11.9384],
            [108.4402, 11.9374],
          ],
        ],
      },
    },
    {
      code: 'DEMO-AR-TOUR-FISHING',
      parentCode: 'DEMO-AR-ZONE-TOURISM',
      name: 'Khu chòi câu cá sinh thái',
      type: AreaType.VISITOR_ZONE,
      areaM2: new Prisma.Decimal(4500),
      description:
        'Chòi lá mát mẻ ven hồ phục vụ du khách câu cá thư giãn giải trí cuối tuần cùng gia đình.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.4402, 11.9362],
            [108.4418, 11.9362],
            [108.4418, 11.9372],
            [108.4402, 11.9372],
            [108.4402, 11.9362],
          ],
        ],
      },
    },
    {
      code: 'DEMO-AR-TOUR-KIDS',
      parentCode: 'DEMO-AR-ZONE-TOURISM',
      name: 'Khu nông trại giáo dục trẻ em & cắm trại',
      type: AreaType.VISITOR_ZONE,
      areaM2: new Prisma.Decimal(5500),
      description:
        'Khu bãi cỏ xanh mở cho trẻ em tham gia lớp học nông nghiệp, cho gà ăn và cắm trại dã ngoại.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.4422, 11.9362],
            [108.4438, 11.9362],
            [108.4438, 11.9372],
            [108.4422, 11.9372],
            [108.4422, 11.9362],
          ],
        ],
      },
    },

    // In ZONE-LOGISTICS
    {
      code: 'DEMO-AR-WH-CENTRAL',
      parentCode: 'DEMO-AR-ZONE-LOGISTICS',
      name: 'Khu kho bảo quản & đóng gói trung tâm',
      type: AreaType.WAREHOUSE_ZONE,
      areaM2: new Prisma.Decimal(4000),
      description:
        'Trung tâm phân loại, kiểm tra chất lượng, dán tem truy xuất QR và bảo quản kho lạnh 50m3.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.4402, 11.9386],
            [108.4422, 11.9386],
            [108.4422, 11.9398],
            [108.4402, 11.9398],
            [108.4402, 11.9386],
          ],
        ],
      },
    },
    {
      code: 'DEMO-AR-PUMP-STATION',
      parentCode: 'DEMO-AR-ZONE-LOGISTICS',
      name: 'Trạm bơm & kỹ thuật năng lượng mặt trời',
      type: AreaType.WAREHOUSE_ZONE,
      areaM2: new Prisma.Decimal(2500),
      description:
        'Nhà vận hành hệ thống cấp thoát nước, tủ điện điều khiển biến tần bơm và máy phát điện 25kVA.',
      geojson: {
        type: 'Polygon',
        coordinates: [
          [
            [108.4426, 11.9386],
            [108.4438, 11.9386],
            [108.4438, 11.9398],
            [108.4426, 11.9398],
            [108.4426, 11.9386],
          ],
        ],
      },
    },
  ];

  for (const child of childAreas) {
    const parentId = parentMap.get(child.parentCode);
    await prisma.area.upsert({
      where: { code: child.code },
      update: {
        name: child.name,
        type: child.type,
        parentId,
        areaM2: child.areaM2,
        geojson: child.geojson,
        description: child.description,
        isActive: true,
      },
      create: {
        code: child.code,
        name: child.name,
        type: child.type,
        parentId,
        areaM2: child.areaM2,
        geojson: child.geojson,
        description: child.description,
        isActive: true,
        createdById: admin?.id,
      },
    });
  }

  // ==========================================
  // 3. INVENTORY ITEMS (~42 items)
  // ==========================================
  console.log('3. Seeding Inventory Master Items (~42 items with minStock)...');
  const inventoryItems = [
    // SEED
    {
      sku: 'DEMO-ITEM-SEED-01',
      name: 'Hạt giống cải ngọt F1 Phú Nông',
      category: ItemCategory.SEED,
      unit: 'gói',
      minStock: 20,
    },
    {
      sku: 'DEMO-ITEM-SEED-02',
      name: 'Hạt giống xà lách mỡ chịu nhiệt Đà Lạt',
      category: ItemCategory.SEED,
      unit: 'gói',
      minStock: 25,
    },
    {
      sku: 'DEMO-ITEM-SEED-03',
      name: 'Hạt giống cà chua bi cherry F1 Rạng Đông',
      category: ItemCategory.SEED,
      unit: 'gói',
      minStock: 15,
    },
    {
      sku: 'DEMO-ITEM-SEED-04',
      name: 'Hạt giống dưa lưới ruột cam Nhật Bản Taki',
      category: ItemCategory.SEED,
      unit: 'hạt',
      minStock: 200,
    },
    {
      sku: 'DEMO-ITEM-SEED-05',
      name: 'Hạt giống dưa leo baby giòn ngọt Hà Lan',
      category: ItemCategory.SEED,
      unit: 'hạt',
      minStock: 300,
    },
    {
      sku: 'DEMO-ITEM-SEED-06',
      name: 'Hạt giống ớt chuông ngọt ba màu F1',
      category: ItemCategory.SEED,
      unit: 'gói',
      minStock: 15,
    },
    {
      sku: 'DEMO-ITEM-SEED-07',
      name: 'Hạt giống bắp cải chịu nhiệt Green Nova',
      category: ItemCategory.SEED,
      unit: 'gói',
      minStock: 20,
    },
    {
      sku: 'DEMO-ITEM-SEED-08',
      name: 'Hạt giống cà tím tròn cao sản quả bóng',
      category: ItemCategory.SEED,
      unit: 'gói',
      minStock: 15,
    },
    {
      sku: 'DEMO-ITEM-SEED-09',
      name: 'Hạt giống rau muống lá tre hữu cơ',
      category: ItemCategory.SEED,
      unit: 'kg',
      minStock: 10,
    },
    {
      sku: 'DEMO-ITEM-SEED-10',
      name: 'Hạt giống rau dền đỏ cao sản VietGAP',
      category: ItemCategory.SEED,
      unit: 'kg',
      minStock: 5,
    },

    // FERTILIZER
    {
      sku: 'DEMO-ITEM-FERT-01',
      name: 'Phân trùn quế nguyên chất cao cấp Vermicompost',
      category: ItemCategory.FERTILIZER,
      unit: 'bao_25kg',
      minStock: 20,
    },
    {
      sku: 'DEMO-ITEM-FERT-02',
      name: 'Phân hữu cơ vi sinh sông Gianh hoai mục',
      category: ItemCategory.FERTILIZER,
      unit: 'bao_50kg',
      minStock: 15,
    },
    {
      sku: 'DEMO-ITEM-FERT-03',
      name: 'Phân bón lá vi lượng hữu cơ Combi sinh học',
      category: ItemCategory.FERTILIZER,
      unit: 'lít',
      minStock: 10,
    },
    {
      sku: 'DEMO-ITEM-FERT-04',
      name: 'Chế phẩm ủ phân vi sinh Trichoderma nấm đối kháng',
      category: ItemCategory.FERTILIZER,
      unit: 'kg',
      minStock: 30,
    },
    {
      sku: 'DEMO-ITEM-FERT-05',
      name: 'Đạm cá ủ lên men vi sinh đậm đặc tự nhiên',
      category: ItemCategory.FERTILIZER,
      unit: 'lít',
      minStock: 40,
    },
    {
      sku: 'DEMO-ITEM-FERT-06',
      name: 'Phân dơi hữu cơ tự nhiên đã khử trùng',
      category: ItemCategory.FERTILIZER,
      unit: 'kg',
      minStock: 25,
    },
    {
      sku: 'DEMO-ITEM-FERT-07',
      name: 'Vôi bột nông nghiệp khử trùng cân bằng pH đất',
      category: ItemCategory.FERTILIZER,
      unit: 'bao_25kg',
      minStock: 10,
    },

    // PESTICIDE
    {
      sku: 'DEMO-ITEM-PEST-01',
      name: 'Chế phẩm sinh học trừ sâu thảo mộc Neem Oil tinh khiết',
      category: ItemCategory.PESTICIDE,
      unit: 'lít',
      minStock: 15,
    },
    {
      sku: 'DEMO-ITEM-PEST-02',
      name: 'Vi khuẩn đối kháng sâu tơ Bacillus thuringiensis (BT)',
      category: ItemCategory.PESTICIDE,
      unit: 'kg',
      minStock: 10,
    },
    {
      sku: 'DEMO-ITEM-PEST-03',
      name: 'Bẫy dính côn trùng vàng hai mặt chống bọ trĩ',
      category: ItemCategory.PESTICIDE,
      unit: 'tấm',
      minStock: 100,
    },
    {
      sku: 'DEMO-ITEM-PEST-04',
      name: 'Chế phẩm trừ nấm nấm xanh Metarhizium sinh học',
      category: ItemCategory.PESTICIDE,
      unit: 'gói',
      minStock: 20,
    },
    {
      sku: 'DEMO-ITEM-PEST-05',
      name: 'Dịch tỏi ớt gừng ngâm sinh học xua đuổi côn trùng',
      category: ItemCategory.PESTICIDE,
      unit: 'lít',
      minStock: 20,
    },

    // FEED
    {
      sku: 'DEMO-ITEM-FEED-01',
      name: 'Cám gà con giai đoạn úm 1-21 ngày tuổi',
      category: ItemCategory.FEED,
      unit: 'bao_25kg',
      minStock: 15,
    },
    {
      sku: 'DEMO-ITEM-FEED-02',
      name: 'Cám gà thịt thả vườn giai đoạn vỗ béo sinh học',
      category: ItemCategory.FEED,
      unit: 'bao_25kg',
      minStock: 30,
    },
    {
      sku: 'DEMO-ITEM-FEED-03',
      name: 'Cám gà đẻ trứng thảo mộc bổ sung Omega-3',
      category: ItemCategory.FEED,
      unit: 'bao_25kg',
      minStock: 20,
    },
    {
      sku: 'DEMO-ITEM-FEED-04',
      name: 'Cám viên nổi cho cá rô phi (28% đạm tiêu hóa)',
      category: ItemCategory.FEED,
      unit: 'bao_25kg',
      minStock: 40,
    },
    {
      sku: 'DEMO-ITEM-FEED-05',
      name: 'Cám viên nổi cá diêu hồng cao đạm (32% đạm)',
      category: ItemCategory.FEED,
      unit: 'bao_25kg',
      minStock: 30,
    },
    {
      sku: 'DEMO-ITEM-FEED-06',
      name: 'Bột ngô đỏ nghiền mịn chăn nuôi tự nhiên',
      category: ItemCategory.FEED,
      unit: 'bao_50kg',
      minStock: 20,
    },
    {
      sku: 'DEMO-ITEM-FEED-07',
      name: 'Cám gạo tươi ủ men tiêu hóa EM',
      category: ItemCategory.FEED,
      unit: 'bao_50kg',
      minStock: 15,
    },
    {
      sku: 'DEMO-ITEM-FEED-08',
      name: 'Cám vịt đẻ trứng bổ sung khoáng chất',
      category: ItemCategory.FEED,
      unit: 'bao_25kg',
      minStock: 15,
    },

    // VETERINARY
    {
      sku: 'DEMO-ITEM-VET-01',
      name: 'Men tiêu hóa probiotic cao đạm cho gia cầm',
      category: ItemCategory.VETERINARY,
      unit: 'kg',
      minStock: 10,
    },
    {
      sku: 'DEMO-ITEM-VET-02',
      name: 'Vitamin C 50% chống sốc nhiệt cho vật nuôi',
      category: ItemCategory.VETERINARY,
      unit: 'hộp_1kg',
      minStock: 12,
    },
    {
      sku: 'DEMO-ITEM-VET-03',
      name: 'Dung dịch sát trùng chuồng trại an toàn Iodine 10%',
      category: ItemCategory.VETERINARY,
      unit: 'lít',
      minStock: 8,
    },
    {
      sku: 'DEMO-ITEM-VET-04',
      name: 'Chế phẩm vi sinh xử lý đáy ao cá EM-Aqua dạng lỏng',
      category: ItemCategory.VETERINARY,
      unit: 'can_5l',
      minStock: 10,
    },
    {
      sku: 'DEMO-ITEM-VET-05',
      name: 'Khoáng tạt ao cá chống cong thân đục cơ CalMag',
      category: ItemCategory.VETERINARY,
      unit: 'bao_10kg',
      minStock: 10,
    },

    // PACKAGING
    {
      sku: 'DEMO-ITEM-PACK-01',
      name: 'Túi đựng rau củ sinh học tự hủy sinh học 1kg',
      category: ItemCategory.PACKAGING,
      unit: 'cuộn',
      minStock: 50,
    },
    {
      sku: 'DEMO-ITEM-PACK-02',
      name: 'Khay giấy carton định hình đựng trứng gà (10 quả)',
      category: ItemCategory.PACKAGING,
      unit: 'khay',
      minStock: 500,
    },
    {
      sku: 'DEMO-ITEM-PACK-03',
      name: 'Thùng carton sóng 5 lớp in thương hiệu XFarm',
      category: ItemCategory.PACKAGING,
      unit: 'thùng',
      minStock: 200,
    },
    {
      sku: 'DEMO-ITEM-PACK-04',
      name: 'Hộp nhựa nguyên sinh PET có lỗ thông khí 500g',
      category: ItemCategory.PACKAGING,
      unit: 'hộp',
      minStock: 400,
    },
    {
      sku: 'DEMO-ITEM-PACK-05',
      name: 'Túi lưới bọc dưa lưới cao cấp chống trầy xước',
      category: ItemCategory.PACKAGING,
      unit: 'cái',
      minStock: 600,
    },

    // TOOL
    {
      sku: 'DEMO-ITEM-TOOL-01',
      name: 'Kéo bấm tỉa cành cuống quả thép không gỉ Nhật Bản',
      category: ItemCategory.TOOL,
      unit: 'cái',
      minStock: 15,
    },
    {
      sku: 'DEMO-ITEM-TOOL-02',
      name: 'Bình xịt vi sinh sinh học chạy ắc quy 18L',
      category: ItemCategory.TOOL,
      unit: 'chiếc',
      minStock: 5,
    },
  ];

  for (const item of inventoryItems) {
    await prisma.item.upsert({
      where: { sku: item.sku },
      update: {
        name: item.name,
        category: item.category,
        unit: item.unit,
        minStock: new Prisma.Decimal(item.minStock),
        isSellable: false,
        isActive: true,
      },
      create: {
        sku: item.sku,
        name: item.name,
        category: item.category,
        unit: item.unit,
        minStock: new Prisma.Decimal(item.minStock),
        isSellable: false,
        isActive: true,
      },
    });
  }

  // ==========================================
  // 4. WEBSHOP PRODUCTS (~20 items + Product records)
  // ==========================================
  console.log('4. Seeding Webshop Products (~20 items)...');
  const webshopProducts = [
    {
      sku: 'DEMO-PROD-ITEM-01',
      slug: 'demo-prod-cai-ngot',
      name: 'Cải ngọt hữu cơ XFarm',
      category: ItemCategory.PRODUCE,
      unit: 'kg',
      price: 28000,
      sortOrder: 1,
      mediaIds: ['/demo/rau-cai.svg'],
      description:
        '<p>Cải ngọt hữu cơ XFarm được gieo trồng trên đất phù sa giàu mùn tại Lô rau ăn lá 1. Cây sinh trưởng tự nhiên trong điều kiện khí hậu mát lành của cao nguyên Lâm Đồng, hoàn toàn không sử dụng phân bón hóa học hay thuốc trừ sâu tổng hợp.</p><p>Thân cải giòn ngọt, mập mạp và lá xanh tươi đậm vị ngọt thanh mát. Mỗi bó rau sau khi thu hoạch lúc sáng sớm đều được sơ chế sạch sẽ, đóng gói trong túi màng tự hủy sinh học giữ trọn độ ẩm và khoáng chất.</p><p>Thích hợp chế biến các món canh sườn thanh mát, xào tỏi giòn ngọt hoặc luộc chấm trứng lòng đào bổ dưỡng cho cả gia đình.</p>',
    },
    {
      sku: 'DEMO-PROD-ITEM-02',
      slug: 'demo-prod-xa-lach-mo',
      name: 'Xà lách mỡ tươi giòn Đà Lạt',
      category: ItemCategory.PRODUCE,
      unit: 'kg',
      price: 35000,
      sortOrder: 2,
      mediaIds: ['/demo/xa-lach.svg'],
      description:
        '<p>Xà lách mỡ XFarm sở hữu những lớp lá cuộn mềm xốp, màu xanh non tươi mát bắt mắt. Giống rau được chọn lọc kỹ càng kết hợp nguồn nước tưới giếng khoan đã qua lọc vi sinh nhiều tầng đảm bảo an toàn tuyệt đối.</p><p>Vị xà lách giòn ngọt dịu, không hề bị đắng chát, giàu vitamin A, C, chất xơ và khoáng chất thiết yếu giúp thanh lọc cơ thể và hỗ trợ hệ tiêu hóa khỏe mạnh.</p><p>Lựa chọn hoàn hảo cho món salad trộn dầu giấm, ăn kèm món cuốn, thịt nướng BBQ hoặc ép nước thanh lọc detox mỗi ngày.</p>',
    },
    {
      sku: 'DEMO-PROD-ITEM-03',
      slug: 'demo-prod-ca-chua-bi',
      name: 'Cà chua bi cherry ngọt mọng',
      category: ItemCategory.PRODUCE,
      unit: 'kg',
      price: 55000,
      sortOrder: 3,
      mediaIds: ['/demo/ca-chua.svg'],
      description:
        '<p>Cà chua bi cherry XFarm được trồng trong nhà màng công nghệ cao với hệ thống tưới nhỏ giọt tự động. Trái chín đỏ au trên cành, vỏ mỏng bóng mượt và vị ngọt đậm đà pha chút chua nhẹ tự nhiên kích thích vị giác.</p><p>Sản phẩm chứa hàm lượng lycopene chống oxy hóa cực cao cùng vitamin A và C dồi dào, giúp làn da căng mịn tươi trẻ và bảo vệ sức khỏe tim mạch.</p><p>Ăn tươi trực tiếp như trái cây tráng miệng, làm món salad khai vị sang trọng hoặc trang trí món ăn thêm phần sinh động, bắt mắt.</p>',
    },
    {
      sku: 'DEMO-PROD-ITEM-04',
      slug: 'demo-prod-dua-luoi-cam',
      name: 'Dưa lưới ruột cam VietGAP',
      category: ItemCategory.PRODUCE,
      unit: 'kg',
      price: 75000,
      sortOrder: 4,
      mediaIds: ['/demo/dua-luoi.svg'],
      description:
        '<p>Dưa lưới ruột cam giống Nhật Bản Taki được chăm sóc tỉ mỉ từng trái trong Nhà kính A. Mỗi cây chỉ giữ lại duy nhất 1 quả đẹp nhất để tập trung toàn bộ dinh dưỡng tinh túy từ đất mẹ và ánh nắng vùng cao nguyên.</p><p>Thịt dưa màu cam rực rỡ, vân lưới nổi đều đặn, kết cấu giòn tan và độ ngọt đo đạt từ 13–15 độ Brix với hương thơm nồng nàn quyến rũ khó quên.</p><p>Món quà sức khỏe trân quý dành tặng người thân, bạn bè đối tác hoặc thưởng thức tráng miệng mát lạnh sau bữa cơm gia đình đầm ấm.</p>',
    },
    {
      sku: 'DEMO-PROD-ITEM-05',
      slug: 'demo-prod-dua-leo-baby',
      name: 'Dưa leo baby ngọt giòn tự nhiên',
      category: ItemCategory.PRODUCE,
      unit: 'kg',
      price: 32000,
      sortOrder: 5,
      mediaIds: ['/demo/dua-leo.svg'],
      description:
        '<p>Dưa leo baby Hà Lan trái thon nhỏ vừa miệng, vỏ xanh mỏng không cần gọt, ruột đặc và hạt non siêu nhỏ ăn không ngán. Dưa được thu hoạch mỗi ngày khi còn vương nụ hoa vàng tươi trên đầu quả.</p><p>Hàm lượng nước tinh khiết lên tới 95% kết hợp chất xơ hòa tan giúp bù khoáng, cấp ẩm cho cơ thể nhanh chóng trong những ngày hè oi bức.</p><p>Rất được trẻ nhỏ yêu thích dùng làm món ăn vặt giòn rụm hoặc làm dưa góp chua ngọt ăn kèm các bữa ăn gia đình.</p>',
    },
    {
      sku: 'DEMO-PROD-ITEM-06',
      slug: 'demo-prod-ot-chuong-da-lat',
      name: 'Ớt chuông ba màu ngọt Đà Lạt',
      category: ItemCategory.PRODUCE,
      unit: 'kg',
      price: 65000,
      sortOrder: 6,
      mediaIds: ['/demo/ot-chuong.svg'],
      description:
        '<p>Ớt chuông đỏ, vàng và xanh trồng tại Nhà kính B đạt chuẩn VietGAP với kỹ thuật thụ phấn tự nhiên. Vỏ quả dày dặn, căng mọng bóng loáng và vị ngọt thanh đặc trưng, hoàn toàn không cay nồng.</p><p>Được mệnh danh là kho báu vitamin C tự nhiên, ớt chuông cung cấp năng lượng dồi dào và hỗ trợ tăng cường hệ miễn dịch cho cả người lớn lẫn trẻ em.</p><p>Tuyệt vời cho các món bò xào lúc lắc, xiên que nướng dã ngoại, salad nhiệt đới rực rỡ sắc màu hay ép nước uống làm đẹp da.</p>',
    },
    {
      sku: 'DEMO-PROD-ITEM-07',
      slug: 'demo-prod-bap-cai-huu-co',
      name: 'Bắp cải cuộn hữu cơ',
      category: ItemCategory.PRODUCE,
      unit: 'kg',
      price: 25000,
      sortOrder: 7,
      mediaIds: ['/demo/bap-cai.svg'],
      description:
        '<p>Bắp cải giống Green Nova sinh trưởng trên đất đồi thoáng gió tự nhiên, cuộn lá tròn đều chắc nịch từ trong ra ngoài. Lớp lá xanh tươi bọc lấy phần ruột trắng nõn mọng nước ngọt lành.</p><p>Phương pháp canh tác hữu cơ ứng dụng bẫy sinh học xua đuổi sâu tơ giúp cây phát triển tự nhiên mà không tồn dư bất kỳ hóa chất BVTV độc hại nào.</p><p>Phù hợp nấu canh tôm bắp cải ngọt lịm, luộc chấm kho quẹt thơm lừng hoặc muối dưa chua bắp cải chống ngấy cực kỳ hấp dẫn.</p>',
    },
    {
      sku: 'DEMO-PROD-ITEM-08',
      slug: 'demo-prod-ca-tim-dai',
      name: 'Cà tím sinh thái quả dài bóng mượt',
      category: ItemCategory.PRODUCE,
      unit: 'kg',
      price: 22000,
      sortOrder: 8,
      mediaIds: ['/demo/ca-tim.svg'],
      description:
        '<p>Cà tím giống dài quả thon đều, vỏ tím sẫm bóng bẩy đẹp mắt. Cây được bón bằng phân hữu cơ ủ hoai và tưới nước sạch định kỳ, cho chất lượng quả xốp mềm ngọt bùi không hạt đắng.</p><p>Cà tím giàu chất xơ, vitamin nhóm B và anthocyanin bảo vệ tế bào não bộ cũng như hỗ trợ điều hòa đường huyết hiệu quả.</p><p>Món cà tím nướng mỡ hành thơm nức mũi, cà tím xào thịt băm lá lốt hay om đậu phụ thịt ba chỉ luôn là lựa chọn hàng đầu cho mâm cơm nhà.</p>',
    },
    {
      sku: 'DEMO-PROD-ITEM-09',
      slug: 'demo-prod-ga-ri-tha-doi',
      name: 'Gà ri thả đồi nguyên con làm sạch',
      category: ItemCategory.LIVESTOCK_PRODUCT,
      unit: 'kg',
      price: 165000,
      sortOrder: 9,
      mediaIds: ['/demo/ga-ri.svg'],
      description:
        '<p>Gà ri thuần chủng được nuôi thả tự do trên triền đồi cỏ tự nhiên tại Vùng chăn nuôi XFarm. Gà chạy nhảy liên tục kiếm ăn, uống nước suối sạch và được bổ sung khẩu phần cám ngô thảo mộc không kháng sinh.</p><p>Thời gian nuôi đạt chuẩn từ 5 đến 6 tháng cho chất thịt săn chắc, da vàng giòn tự nhiên và mùi thơm đậm đà đặc trưng của gà đồi truyền thống.</p><p>Gà được sơ chế đóng gói chân không sạch sẽ kèm lòng mề, vô cùng thuận tiện để nấu lẩu gà lá é, gà luộc chấm muối ớt chanh hoặc nướng mọi than hoa.</p>',
    },
    {
      sku: 'DEMO-PROD-ITEM-10',
      slug: 'demo-prod-trung-ga-thao-moc',
      name: 'Hộp 10 quả trứng gà thảo mộc XFarm',
      category: ItemCategory.LIVESTOCK_PRODUCT,
      unit: 'hộp',
      price: 45000,
      sortOrder: 10,
      mediaIds: ['/demo/trung-ga.svg'],
      description:
        '<p>Trứng gà thảo mộc được thu hoạch từ đàn gà mái đẻ nuôi bằng thức ăn sinh học trộn tinh dầu sả, quế, tỏi và đinh lăng. Trứng nhặt mới mỗi sáng sớm, vỏ màu nâu sáng bóng dày dặn.</p><p>Lòng đỏ trứng tròn căng mọng màu cam sẫm, độ kết dính cao và không hề tanh nồng, giàu Omega-3 và vitamin E tự nhiên tốt cho trí não trẻ nhỏ và người cao tuổi.</p><p>Đóng gói cẩn thận trong khay giấy carton sinh học định hình chống sốc, cam kết đến tay người tiêu dùng nguyên vẹn tươi ngon nhất.</p>',
    },
    {
      sku: 'DEMO-PROD-ITEM-11',
      slug: 'demo-prod-ca-ro-phi-song',
      name: 'Cá rô phi sông sạch tươi sống',
      category: ItemCategory.AQUA_PRODUCT,
      unit: 'kg',
      price: 55000,
      sortOrder: 11,
      mediaIds: ['/demo/ca-ro-phi.svg'],
      description:
        '<p>Cá rô phi dòng GIFT được nuôi trong hệ thống ao sinh thái tuần hoàn nước sâu tại XFarm. Môi trường nước được quạt sục khí oxy nano liên tục và lọc sinh học giúp cá bơi khỏe, thịt săn chắc không mùi bùn rong rêu.</p><p>Nguồn thức ăn viên nổi đạt chuẩn an toàn kết hợp phế phụ phẩm rau xanh hữu cơ băm nhỏ cho thớ thịt cá trắng phau, béo ngậy tự nhiên.</p><p>Thích hợp chiên giòn chấm nước mắm gừng ớt tỏi cay xè, nấu canh chua dọc mùng thanh tao hoặc nướng giấy bạc thơm nức mũi.</p>',
    },
    {
      sku: 'DEMO-PROD-ITEM-12',
      slug: 'demo-prod-ca-dieu-hong',
      name: 'Cá diêu hồng tươi sống tự nhiên',
      category: ItemCategory.AQUA_PRODUCT,
      unit: 'kg',
      price: 68000,
      sortOrder: 12,
      mediaIds: ['/demo/ca-dieu-hong.svg'],
      description:
        '<p>Cá diêu hồng vảy hồng ánh đỏ rực rỡ, thân dẹt mình dày thịt, được tuyển chọn kỹ lưỡng từ Ao cá 2. Hệ thống nuôi lót bạt HDPE giữ đáy ao luôn sạch bóng, ngăn chặn hoàn toàn nguy cơ nhiễm khuẩn đáy ao.</p><p>Thịt cá ngọt đậm đà, ít xương dăm, tỷ lệ nạc cao rất phù hợp cho thực đơn ăn dặm của trẻ nhỏ cũng như các bữa tiệc gia đình sum vầy cuối tuần.</p><p>Cá diêu hồng hấp xì dầu gừng hành, sốt cà chua bi chua ngọt hoặc nướng muối ớt đều mang lại trải nghiệm ẩm thực tuyệt đỉnh.</p>',
    },
    {
      sku: 'DEMO-PROD-ITEM-13',
      slug: 'demo-prod-vit-co-chay-dong',
      name: 'Vịt cỏ chạy đồng làm sạch',
      category: ItemCategory.LIVESTOCK_PRODUCT,
      unit: 'kg',
      price: 135000,
      sortOrder: 13,
      mediaIds: ['/demo/vit-co.svg'],
      description:
        '<p>Vịt cỏ Cánh Trắng thả tự nhiên tại Vùng chăn nuôi XFarm kết hợp kênh dẫn nước sinh thái. Vịt bơi lội tìm mồi ốc bươu, sâu bọ và bèo hoa dâu tự nhiên nên cơ bắp săn chắc, ít mỡ dưới da.</p><p>Thịt vịt ngọt đậm, mềm mà không bở, mùi thơm thanh nhã không bị hôi tanh như vịt nuôi công nghiệp thúc béo.</p><p>Lý tưởng cho món vịt om sấu Hà Nội chua thanh, vịt nướng chao béo ngậy hoặc nấu cháo vịt hạt sen bồi bổ sức khỏe cho cả gia đình.</p>',
    },
    {
      sku: 'DEMO-PROD-ITEM-14',
      slug: 'demo-prod-trung-vit-sach',
      name: 'Hộp 10 quả trứng vịt sạch vỏ trắng',
      category: ItemCategory.LIVESTOCK_PRODUCT,
      unit: 'hộp',
      price: 38000,
      sortOrder: 14,
      mediaIds: ['/demo/trung-vit.svg'],
      description:
        '<p>Trứng vịt sạch thu hoạch từ đàn vịt cỏ chăn thả bãi tự nhiên. Vỏ trứng màu trắng ngà nhẵn mịn, kích thước đều đặn và được làm sạch bụi bẩn bằng máy sấy chuyên dụng trước khi đóng khay.</p><p>Lòng đỏ to tròn chứa lượng sắt, canxi và lecithin dồi dào, giúp tăng cường hồng cầu và bồi bổ sinh lực cơ thể hữu hiệu.</p><p>Dùng để làm món thịt kho tàu trứng vịt thơm béo, chiên cơm dương châu vàng ruộm hoặc làm bánh nướng bánh dẻo truyền thống.</p>',
    },
    {
      sku: 'DEMO-PROD-ITEM-15',
      slug: 'demo-prod-rau-muong-huu-co',
      name: 'Rau muống nước sinh thái tự nhiên',
      category: ItemCategory.PRODUCE,
      unit: 'kg',
      price: 20000,
      sortOrder: 15,
      mediaIds: ['/demo/canh-dong.svg'],
      description:
        '<p>Rau muống lá tre được gieo cấy tại vùng đất ẩm ven ao sinh thái, tưới bằng nguồn nước tự nhiên dồi dào khoáng chất. Ngọn rau non mởn, thân mảnh giòn sần sật không xơ già.</p><p>Rau được hái tay cẩn thận vào sớm tinh sương khi từng giọt sương mai còn đọng trên kẽ lá, giữ nguyên độ tươi mới tự nhiên nhất.</p><p>Món rau muống luộc vắt chanh đánh nước canh ngọt lịm hoặc xào tỏi ớt lửa to xanh mướt là linh hồn của mâm cơm Việt Nam quê nhà.</p>',
    },
    {
      sku: 'DEMO-PROD-ITEM-16',
      slug: 'demo-prod-combo-rau-tuan',
      name: 'Combo rau xanh gia đình 5kg/tuần',
      category: ItemCategory.PRODUCE,
      unit: 'combo',
      price: 149000,
      sortOrder: 16,
      mediaIds: ['/demo/tour-thu-hoach.svg'],
      description:
        '<p>Gói rau tiện lợi giao tận bếp mỗi tuần gồm 5kg nông sản tuyển chọn theo mùa: cải ngọt, xà lách, dưa leo baby, cà chua bi, bắp cải và rau gia vị thơm ngon.</p><p>Giúp người nội trợ tiết kiệm thời gian đi chợ mà vẫn luôn an tâm tuyệt đối về nguồn gốc thực phẩm sạch đạt chuẩn VietGAP cho tổ ấm thân yêu.</p><p>Được đóng gói trong thùng carton giữ nhiệt thân thiện môi trường, kèm thực đơn gợi ý các món ăn ngon mỗi ngày trong tuần.</p>',
    },
    {
      sku: 'DEMO-PROD-ITEM-17',
      slug: 'demo-prod-combo-lau-song',
      name: 'Combo lẩu đồng quê XFarm (Gà + Cá + Rau)',
      category: ItemCategory.PRODUCE,
      unit: 'combo',
      price: 289000,
      sortOrder: 17,
      mediaIds: ['/demo/tour-cam-trai.svg'],
      description:
        '<p>Set ăn sum vầy ấm cúng chuẩn bị sẵn gồm 1 con gà ri thả đồi làm sạch (1.2kg), 1 con cá rô phi sông tươi rói (0.8kg) cùng rổ rau nhúng lẩu hữu cơ tổng hợp tươi roi rói.</p><p>Kèm gói gia vị nước dùng bí truyền nấu từ xương hầm và thảo mộc tự nhiên của đầu bếp nông trại XFarm, chỉ cần đun sôi là có ngay nồi lẩu thơm nức mũi.</p><p>Lựa chọn số 1 cho những bữa tiệc gia đình, gặp mặt bạn bè cuối tuần vừa ngon miệng, vừa đong đầy hương vị đồng quê thuần khiết.</p>',
    },
    {
      sku: 'DEMO-PROD-ITEM-18',
      slug: 'demo-prod-dua-luoi-hop-qua',
      name: 'Hộp quà 2 quả dưa lưới biếu tặng cao cấp',
      category: ItemCategory.PRODUCE,
      unit: 'hộp',
      price: 220000,
      sortOrder: 18,
      mediaIds: ['/demo/dua-luoi.svg'],
      description:
        '<p>Cặp dưa lưới ruột cam Nhật Bản được tuyển chọn kỹ lưỡng: trọng lượng đều đặn 1.5–1.7kg/quả, cuống xanh tươi chữ T truyền thống và vân lưới sắc nét hoàn mỹ.</p><p>Được đặt trong hộp quà cao cấp thiết kế quai xách sang trọng, lót rơm gỗ chống va đập và gửi gắm thông điệp chúc phúc Sức Khỏe – Thịnh Vượng – An Khang.</p><p>Món quà ngoại giao và tri ân tinh tế dành tặng người thân, sếp, đối tác kinh doanh trong các dịp lễ tết và sự kiện quan trọng.</p>',
    },
    {
      sku: 'DEMO-PROD-ITEM-19',
      slug: 'demo-prod-phan-trun-que-sach',
      name: 'Túi 5kg phân trùn quế bón hoa cây cảnh',
      category: ItemCategory.PRODUCE,
      unit: 'túi',
      price: 65000,
      sortOrder: 19,
      mediaIds: ['/demo/phan-huu-co.svg'],
      description:
        '<p>Phân trùn quế nguyên chất 100% thu hoạch từ khu ủ vi sinh tuần hoàn XFarm. Phân được giảm ẩm, ray mịn và bổ sung vi sinh vật có lợi cố định đạm và phân giải lân hữu hiệu.</p><p>Cực kỳ an toàn, không mùi hôi khó chịu, không gây nóng cháy rễ cây, phù hợp bón lót và bón thúc cho hoa hồng, cây cảnh ban công và vườn rau sân thượng đô thị.</p><p>Cải tạo độ tơi xốp của đất trồng lâu năm, kích thích rễ phát triển mạnh mẽ và tăng sức đề kháng tự nhiên cho cây trồng.</p>',
    },
    {
      sku: 'DEMO-PROD-ITEM-20',
      slug: 'demo-prod-ga-ac-tiem-thuoc-bac',
      name: 'Gà ác nguyên con làm sạch bổ dưỡng',
      category: ItemCategory.LIVESTOCK_PRODUCT,
      unit: 'con',
      price: 85000,
      sortOrder: 20,
      mediaIds: ['/demo/ga-ri.svg'],
      description:
        '<p>Gà ác lông trắng hoặc đen tuyền, thịt và xương đen nhánh đặc trưng, được nuôi dưỡng theo quy trình bán chăn thả tự nhiên ăn ngô hạt và thảo dược bổ dưỡng.</p><p>Chất thịt mềm ngọt thanh tao, chứa hàm lượng axit amin và vi khoáng cao gấp nhiều lần so với các giống gà thông thường.</p><p>Thần dược quý báu trong các bài thuốc dân gian dùng tiềm thuốc bắc hạt sen, nấu cháo bồi bổ cho phụ nữ mang thai, người mới ốm dậy và trẻ nhỏ còi xương.</p>',
    },
  ];

  for (const prod of webshopProducts) {
    // 1. Ensure Item exists
    const item = await prisma.item.upsert({
      where: { sku: prod.sku },
      update: {
        name: prod.name,
        category: prod.category,
        unit: prod.unit,
        isSellable: true,
        isActive: true,
      },
      create: {
        sku: prod.sku,
        name: prod.name,
        category: prod.category,
        unit: prod.unit,
        isSellable: true,
        isActive: true,
      },
    });

    // 2. Ensure Product exists
    await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {
        name: prod.name,
        itemId: item.id,
        description: prod.description,
        price: new Prisma.Decimal(prod.price),
        unit: prod.unit,
        mediaIds: prod.mediaIds,
        isPublished: true,
        sortOrder: prod.sortOrder,
      },
      create: {
        slug: prod.slug,
        name: prod.name,
        itemId: item.id,
        description: prod.description,
        price: new Prisma.Decimal(prod.price),
        unit: prod.unit,
        mediaIds: prod.mediaIds,
        isPublished: true,
        sortOrder: prod.sortOrder,
        createdById: admin?.id,
      },
    });

    // 3. Ensure stock exists in finished warehouse
    const finishedWarehouse = await prisma.warehouse.findUnique({
      where: { code: 'WH-FINISHED' },
    });
    if (finishedWarehouse) {
      const lot = await prisma.stockLot.upsert({
        where: { itemId_lotCode: { itemId: item.id, lotCode: `LOT-${prod.sku}` } },
        update: { warehouseId: finishedWarehouse.id },
        create: {
          itemId: item.id,
          warehouseId: finishedWarehouse.id,
          lotCode: `LOT-${prod.sku}`,
          unitCost: new Prisma.Decimal(prod.price * 0.5),
        },
      });
      const refId = `DEMO-OPENING-${prod.sku}`;
      const move = await prisma.stockMove.findFirst({ where: { refType: 'OPENING', refId } });
      if (!move) {
        await prisma.stockMove.create({
          data: {
            type: StockMoveType.IN,
            itemId: item.id,
            stockLotId: lot.id,
            toWarehouseId: finishedWarehouse.id,
            quantity: new Prisma.Decimal(500),
            unitCost: new Prisma.Decimal(prod.price * 0.5),
            refType: 'OPENING',
            refId,
            movedAt: new Date(),
            notes: 'Nhập tồn demo sản phẩm',
          },
        });
      }
    }
  }

  // ==========================================
  // 5. BLOG POSTS (~12 posts spread over 12 months)
  // ==========================================
  console.log('5. Seeding Blog Posts (~12 rich articles)...');
  const now = new Date();
  const postsData = [
    {
      slug: 'demo-post-canh-tac-huu-co-tuan-hoan',
      title: 'Canh tác hữu cơ tuần hoàn: Giải pháp xanh cho nông nghiệp bền vững',
      coverMediaId: '/demo/canh-dong.svg',
      monthOffset: 11,
      excerpt:
        'Khám phá cách XFarm xây dựng hệ sinh thái khép kín: chất thải chăn nuôi trở thành phân bón hữu cơ, phế phẩm rau nuôi cá, bảo vệ đất và nước.',
      content:
        '<p>Nông nghiệp tuần hoàn không chỉ là một xu hướng nhất thời mà là con đường tất yếu để bảo vệ môi trường sinh thái và sức khỏe của các thế hệ mai sau. Tại nông trại XFarm ở Lâm Đồng, chúng tôi bắt đầu hành trình từ việc khôi phục sự sống cho mảnh đất canh tác.</p><p>Mỗi khâu trong trang trại đều được tính toán để không có khái niệm "rác thải". Chất thải hữu cơ từ các chuồng gà đệm lót sinh học được ủ cùng men vi sinh Trichoderma và vỏ trấu hoai mục suốt 60 ngày để tạo thành nguồn phân bón hữu cơ giàu mùn cho các luống rau và nhà kính trồng dưa lưới.</p><p>Ngược lại, các phần rau thừa, vỏ củ và phụ phẩm sau thu hoạch được tận dụng làm thức ăn giàu chất xơ cho đàn cá rô phi và cá diêu hồng trong các ao nuôi tuần hoàn. Bùn ao lắng sinh học định kỳ được nạo vét để bón lót cho các đồi cây lâu năm. Chu trình khép kín này giúp giảm tới 80% phát thải và tiết kiệm chi phí vật tư đầu vào một cách bền vững.</p><p>Chúng tôi tin rằng khi người nông dân nâng niu đất mẹ, đất mẹ sẽ đáp lại bằng những mùa màng tươi tốt, ngọt lành và an tâm nhất trên bàn ăn mỗi gia đình Việt Nam.</p>',
    },
    {
      slug: 'demo-post-nuoi-ga-ri-tha-vuon',
      title: 'Bí quyết nuôi gà ri thả đồi khỏe mạnh, thịt săn chắc không dùng kháng sinh',
      coverMediaId: '/demo/ga-ri.svg',
      monthOffset: 10,
      excerpt:
        'Chế độ nuôi thả đồi tự nhiên kết hợp thức ăn sinh học thảo mộc giúp đàn gà ri XFarm đề kháng tự nhiên, thớ thịt săn chắc thơm ngon.',
      content:
        '<p>Gà ri là giống gia cầm bản địa quý của Việt Nam, nổi tiếng với phẩm chất thịt thơm ngon, săn chắc và đậm đà. Tuy nhiên, để nuôi đàn gà quy mô hàng ngàn con mà hoàn toàn nói không với kháng sinh là một thách thức không hề nhỏ đối với người làm nông nghiệp sinh thái.</p><p>Bí quyết của XFarm nằm ở ba trụ cột cốt lõi: môi trường sống thoáng khí, đệm lót sinh học Balasa và khẩu phần thức ăn thảo dược phòng bệnh chủ động. Đàn gà được thả tự do trên những sườn đồi thoai thoải nhiều bóng râm từ sáng sớm, thỏa sức bới đất tìm côn trùng và vận động dưới ánh nắng tự nhiên.</p><p>Trong khẩu phần thức ăn hàng ngày, kỹ sư chăn nuôi bổ sung tỏi tươi băm nhuyễn, bột gừng, nghệ vàng và men vi sinh probiotic cao cấp. Tinh chất allicin trong tỏi đóng vai trò như một loại kháng sinh tự nhiên mạnh mẽ, giúp đường ruột gà khỏe mạnh và ngăn ngừa tối đa các bệnh hô hấp khi thời tiết giao mùa.</p><p>Nhờ quy trình chăm sóc khắt khe kéo dài trọn vẹn 5 đến 6 tháng, gà ri XFarm khi xuất chuồng đạt chất lượng tuyệt hảo: da vàng óng ánh giòn sần sật, mỡ mỏng không ngấy và thớ thịt ngọt lịm khó quên.</p>',
    },
    {
      slug: 'demo-post-ao-ca-tuan-hoan-nuoc',
      title: 'Hệ thống ao cá tuần hoàn kín: Tiết kiệm nước và nâng cao chất lượng thủy sản',
      coverMediaId: '/demo/ao-ca.svg',
      monthOffset: 9,
      excerpt:
        'Mô hình xử lý nước đa tầng bằng thực vật thủy sinh và vi sinh hữu hiệu EM giúp ao cá XFarm luôn trong lành, không mùi tanh bùn rêu.',
      content:
        '<p>Trong nuôi trồng thủy sản truyền thống, việc xả thải nước ao chưa qua xử lý ra môi trường gây ra nguy cơ ô nhiễm nguồn nước mặt rất lớn. Tại XFarm, chúng tôi đã áp dụng thành công mô hình ao nuôi tuần hoàn khép kín Recirculating Aquaculture System sinh thái.</p><p>Nguồn nước từ các ao nuôi cá thương phẩm được dẫn qua kênh thu gom về ao lắng sinh học thứ nhất để loại bỏ chất thải rắn và thức ăn dư thừa. Tại đây, quần thể vi sinh vật bản địa EM-Aqua nhanh chóng phân giải các hợp chất hữu cơ thành muối khoáng vô hại.</p><p>Tiếp theo, nước được bơm qua ao thực vật trồng hoa súng, hoa sen và lục bình. Hệ thống rễ cây chằng chịt hoạt động như một màng lọc tự nhiên hấp thụ nitrat và phốt pho hòa tan, đồng thời làm giàu lượng oxy hòa tan tự nhiên trước khi bơm ngược trở lại các ao nuôi cá.</p><p>Nhờ quy trình tuần hoàn liên tục này, nông trại tiết kiệm được hơn 70% lượng nước ngọt mỗi năm. Đàn cá rô phi và cá diêu hồng luôn bơi lội trong làn nước sạch mát, thịt săn chắc, trắng phau và tuyệt đối không vướng mùi tanh bùn hay hóa chất tồn dư.</p>',
    },
    {
      slug: 'demo-post-nha-kinh-thong-minh',
      title: 'Ứng dụng IoT và cảm biến thông minh trong nhà kính dưa lưới XFarm',
      coverMediaId: '/demo/nha-kinh.svg',
      monthOffset: 8,
      excerpt:
        'Hệ thống cảm biến đo nhiệt độ, ẩm độ và EC tự động điều tiết châm phân tưới nhỏ giọt, đảm bảo từng trái dưa lưới ngọt đều hoàn hảo.',
      content:
        '<p>Nông nghiệp công nghệ cao 4.0 không phải là điều gì xa vời mà đang hiện diện sống động trong từng mét vuông Nhà kính A và B tại nông trại XFarm. Từng luống dưa lưới ruột cam Nhật Bản đều được quản lý chính xác nhờ mạng lưới cảm biến IoT không dây.</p><p>Các đầu dò chuyên dụng cắm sâu vào bầu giá thể xơ dừa liên tục gửi dữ liệu về độ ẩm đất, nhiệt độ không khí và nồng độ dinh dưỡng EC về máy chủ điều hành cứ mỗi 30 phút một lần. Khi độ ẩm đất giảm xuống dưới ngưỡng tối ưu 65%, van điện từ tự động mở để kích hoạt hệ thống tưới nhỏ giọt chuẩn xác đến từng mililit nước.</p><p>Hơn thế nữa, hệ thống mái che cơ động và quạt đối lưu thông minh tự động kích hoạt khi nhiệt độ trong nhà kính vượt quá 32°C, giúp duy trì tiểu khí hậu lý tưởng cho cây quang hợp và tích tụ lượng đường tự nhiên.</p><p>Kết quả của sự kết hợp giữa nông nghiệp hữu cơ và công nghệ hiện đại là những quả dưa lưới tròn đều tăm tắp, vân lưới nổi khối tinh tế và độ ngọt đo đạt ổn định từ 13 đến 15 độ Brix khiến người tiêu dùng mê mẩn.</p>',
    },
    {
      slug: 'demo-post-cham-soc-rau-an-toan',
      title: 'Quy trình ủ phân vi sinh và kiểm soát sâu bọ tự nhiên cho vườn rau',
      coverMediaId: '/demo/rau-cai.svg',
      monthOffset: 7,
      excerpt:
        'Tìm hiểu cách XFarm sử dụng dịch chiết thảo mộc tỏi ớt gừng và bẫy dính sinh học để bảo vệ rau ăn lá mà không dùng thuốc hóa học.',
      content:
        '<p>Một trong những câu hỏi mà khách tham quan thường đặt ra nhất cho đội ngũ kỹ sư XFarm là: "Làm thế nào để giữ cho luống rau cải và xà lách luôn xanh mướt nguyên lành mà không dùng một giọt thuốc trừ sâu hóa học nào?"</p><p>Câu trả lời nằm ở phương pháp quản lý dịch hại tổng hợp IPM dựa trên sự tôn trọng cân bằng sinh thái. Thay vì tiêu diệt tận diệt, chúng tôi thiết lập vành đai sinh học xung quanh vườn rau bằng các loại cây dẫn dụ như cúc vạn thọ, hoa cánh bướm và cỏ sả để thu hút thiên địch như bọ rùa và ong ký sinh.</p><p>Đối với sâu tơ và rầy mềm, nông trại sử dụng chế phẩm dịch chiết thảo mộc ngâm từ tỏi, ớt hiểm và gừng tươi kết hợp dầu neem oil ép lạnh. Mùi cay nồng tự nhiên xua đuổi côn trùng hiệu quả mà hoàn toàn an toàn cho người chăm sóc cũng như người tiêu dùng.</p><p>Đồng thời, chúng tôi luân phiên sử dụng chế phẩm vi khuẩn sinh học Bacillus thuringiensis (BT) để kiểm soát sâu hại một cách có chọn lọc, bảo vệ môi trường đất và nguồn nước ngầm luôn trong sạch nguyên sơ.</p>',
    },
    {
      slug: 'demo-post-trai-nghiem-nong-dan-nhi',
      title: 'Giáo dục trải nghiệm: Cho trẻ hòa mình vào thiên nhiên tại nông trại',
      coverMediaId: '/demo/tour-lop-hoc-xanh.svg',
      monthOffset: 6,
      excerpt:
        'Tour du lịch nông trại cuối tuần mang đến cho các bé cơ hội lội bùn bắt cá, gieo hạt trồng cây và học bài học quý về giá trị lao động.',
      content:
        '<p>Giữa nhịp sống đô thị hiện đại đầy ắp màn hình điện thoại và máy tính bảng, việc đưa con trẻ về với thiên nhiên là món quà vô giá mà cha mẹ có thể dành cho các thiên thần nhỏ. Vùng du lịch trải nghiệm XFarm ra đời từ chính khát khao ấy.</p><p>Tại đây, các bé được hóa thân thành những "nông dân nhí" thực thụ với nón lá nhỏ, ủng cao su và găng tay làm vườn. Dưới sự hướng dẫn tận tình của các kỹ sư nông trại, bé tự tay gieo những hạt giống cải ngọt vào khay xốp, tưới nước cho mầm xanh hé nở và học cách phân biệt các loại rau củ quen thuộc.</p><p>Khoảnh khắc hào hứng nhất là khi các em bước vào chuồng gà đệm lót sinh học, cầm trên tay những nắm ngô vàng óng gọi bầy gà ri lại gần, hay reo vang thích thú khi tìm thấy những quả trứng ấm nóng còn nằm nguyên trong ổ rơm vàng.</p><p>Những trải nghiệm lấm lem bùn đất mộc mạc ấy không chỉ rèn luyện thể chất dẻo dai mà còn khơi gợi trong tâm hồn con trẻ tình yêu thiên nhiên sâu sắc và lòng biết ơn chân thành đối với từng hạt cơm trên bàn ăn mỗi ngày.</p>',
    },
    {
      slug: 'demo-post-mua-thu-hoach-dua-luoi',
      title: 'Rộn ràng mùa thu hoạch dưa lưới ruột cam tiêu chuẩn VietGAP',
      coverMediaId: '/demo/dua-luoi.svg',
      monthOffset: 5,
      excerpt:
        'Không khí hối hả những ngày thu hoạch dưa lưới vụ thu tại XFarm: tuyển chọn kỹ càng từng trái, dán tem QR truy xuất và vận chuyển nhanh.',
      content:
        '<p>Sáng sớm tại Nhà kính A, màn sương mỏng cao nguyên Lâm Đồng vừa tan cũng là lúc đội ngũ thu hoạch XFarm bắt đầu một ngày làm việc bận rộn. Những hàng dưa lưới ruột cam thẳng tắp đã ngả sang màu vàng ươm, tỏa hương thơm ngát khắp không gian.</p><p>Mỗi trái dưa trước khi cắt khỏi giàn đều được kiểm tra độ chín và kích thước cẩn thận. Bằng cây kéo tỉa chuyên dụng, người công nhân khéo léo cắt giữ lại cuống hình chữ T truyền thống – minh chứng cho độ tươi mới vừa thu hoạch.</p><p>Ngay sau đó, dưa được chuyển bằng xe kéo điện về khu kho đóng gói trung tâm. Tại đây, kỹ thuật viên tiến hành đo ngẫu nhiên chỉ số đường ngọt Brix bằng khúc xạ kế quang học và cân phân loại chính xác từng quả.</p><p>Mỗi trái dưa đạt chuẩn được bọc trong túi lưới xốp chống sốc, dán tem QR truy xuất nguồn gốc minh bạch đầy đủ thông tin ngày thụ phấn và ngày thu hoạch, sẵn sàng lên đường đến với kệ hàng của quý khách hàng thân thiết.</p>',
    },
    {
      slug: 'demo-post-dinh-duong-trung-thao-moc',
      title: 'Giá trị dinh dưỡng vượt trội từ trứng gà nuôi thảo mộc tự nhiên',
      coverMediaId: '/demo/trung-ga.svg',
      monthOffset: 4,
      excerpt:
        'Nghiên cứu về hàm lượng protein, Omega-3 và vitamin E trong trứng gà thảo mộc XFarm: thơm ngon, bổ dưỡng và hoàn toàn không tanh.',
      content:
        '<p>Trứng gà là một trong những thực phẩm phổ biến và hoàn hảo nhất cho bữa ăn hàng ngày. Tuy nhiên, chất lượng của quả trứng phụ thuộc trực tiếp vào thức ăn và môi trường sống của đàn gà mái đẻ.</p><p>Tại nông trại XFarm, đàn gà đẻ trứng thảo mộc được hưởng chế độ dinh dưỡng đặc biệt. Bên cạnh ngô vàng đỏ giàu caroten và cám gạo hữu cơ, khẩu phần ăn hàng ngày được bổ sung bột lá đinh lăng, quế chi, hoa hồi và tinh dầu tỏi kháng khuẩn.</p><p>Kết quả kiểm nghiệm dinh dưỡng cho thấy trứng gà thảo mộc XFarm sở hữu hàm lượng axit béo Omega-3 cao gấp 2.5 lần và vitamin E cao gấp 3 lần so với trứng gà công nghiệp nuôi nhốt chuồng lồng. Lòng đỏ trứng tròn căng sẫm màu cam tự nhiên, tỷ lệ lòng đỏ chiếm tới 35% thể tích quả trứng.</p><p>Khi luộc lòng đào hoặc ốp la, trứng có vị béo ngậy thanh nhẹ đặc trưng mà tuyệt đối không hề có mùi tanh nồng, là nguồn dinh dưỡng vàng cho sự phát triển toàn diện của não bộ và thị lực trẻ em.</p>',
    },
    {
      slug: 'demo-post-cau-ca-sinh-thai',
      title: 'Thư giãn cuối tuần với hoạt động câu cá giải trí bên hồ sinh thái',
      coverMediaId: '/demo/cau-ca.svg',
      monthOffset: 3,
      excerpt:
        'Tạm gác lại âu lo nơi phố thị, đắm mình trong không gian yên bình bên hồ nước mát rượi và thưởng thức cá tươi nướng tại chỗ.',
      content:
        '<p>Nếu bạn đang tìm kiếm một địa điểm để tái tạo năng lượng sau một tuần làm việc căng thẳng, khu chòi câu cá sinh thái tại XFarm chắc chắn là điểm đến không thể bỏ qua.</p><p>Nằm nép mình bên hồ nước trong xanh rộng hơn 3 hecta rợp bóng cây cối mát rượi, những chòi câu lợp mái lá mộc mạc mang đến không gian tĩnh lặng tuyệt đối. Tiếng gió reo qua tán cây hòa cùng tiếng quạt nước sủi bọt tạo nên bản hòa ca thiên nhiên êm đềm.</p><p>Dưới làn nước trong vắt là những đàn cá rô phi và cá diêu hồng bơi lội tung tăng. Cảm giác hồi hộp ngắm nhìn chiếc phao nhấp nháy rồi bất ngờ chìm nghỉm, tiếng máy câu rít giòn tan khi kéo lên một chú cá sông nặng trĩu tay đem lại niềm vui sướng khó tả cho các cần thủ.</p><p>Đặc biệt, số chiến lợi phẩm câu được có thể nhờ đầu bếp nông trại chế biến ngay tại chỗ thành món cá nướng muối ớt cuốn bánh tráng rau rừng thơm lừng, thưởng thức cùng ly trà atiso thanh mát giữa thiên nhiên trong lành.</p>',
    },
    {
      slug: 'demo-post-minh-bach-truy-xuat',
      title: 'Minh bạch chuỗi cung ứng thực phẩm nhờ tem truy xuất nguồn gốc',
      coverMediaId: '/demo/kho-hang.svg',
      monthOffset: 2,
      excerpt:
        'Mỗi sản phẩm nông sản XFarm mang một mã định danh duy nhất, cho phép người tiêu dùng quét mã QR để tra cứu nhật ký sản xuất chi tiết.',
      content:
        '<p>Trong thời đại mà vấn đề an toàn vệ sinh thực phẩm luôn là nỗi băn khoăn hàng đầu của người tiêu dùng, niềm tin chỉ có thể được xây dựng bằng sự minh bạch tuyệt đối.</p><p>Tại XFarm, chúng tôi đã số hóa toàn bộ quy trình sản xuất thông qua hệ thống phần mềm ERP nông trại. Từ lúc hạt giống được gieo vào đất, từng lượt tưới nước bón phân hữu cơ, nhật ký kiểm tra sâu bệnh đến ngày thu hoạch thực tế đều được ghi nhận theo thời gian thực.</p><p>Mỗi lô hàng xuất kho đều được cấp một mã truy xuất nguồn gốc duy nhất nanoid in trên tem nhãn. Người tiêu dùng chỉ cần dùng điện thoại thông minh quét mã QR là có thể đọc toàn bộ hồ sơ điện tử của sản phẩm: tên lô đất trồng, tên kỹ sư phụ trách, kết quả xét nghiệm an toàn và hạn sử dụng.</p><p>Sự minh bạch này không chỉ là cam kết trách nhiệm của XFarm đối với cộng đồng mà còn khẳng định sự tự tin vào chất lượng từng bó rau, quả trứng mà nông trại trao gửi đến khách hàng.</p>',
    },
    {
      slug: 'demo-post-cam-trai-cuoi-tuan',
      title: 'Cẩm nang cắm trại picnic ngắm hoàng hôn giữa đồi thông nông trại',
      coverMediaId: '/demo/tour-cam-trai.svg',
      monthOffset: 1,
      excerpt:
        'Trải nghiệm ngủ lều đêm giữa thảo nguyên xanh, quây quần bên đống lửa trại bập bùng và ngắm bầu trời đầy sao tại XFarm.',
      content:
        '<p>Khi ánh hoàng hôn đỏ rực buông xuống nhuộm thắm những rặng đồi thông quanh nông trại XFarm, không gian dường như lắng đọng trong sự bình yên diệu kỳ. Đó là thời khắc tuyệt vời nhất để bắt đầu buổi cắm trại dã ngoại cùng người thân và bạn bè.</p><p>Khu vực cắm trại được bố trí trên bãi cỏ đồi xanh mướt, trang bị đầy đủ lều trại chống thấm cao cấp, đệm ngủ êm ái và hệ thống chiếu sáng năng lượng mặt trời an toàn ấm cúng.</p><p>Đêm về, ngọn lửa trại bập bùng được thắp lên mang theo hương gỗ thông thơm nồng. Mọi người quây quần bên nhau thưởng thức tiệc nướng BBQ với gà đồi ướp thảo mộc, bắp ngọt nướng mỡ hành và khoai lang mật nướng than hoa thơm lừng.</p><p>Ngước nhìn lên bầu trời cao nguyên trong vắt ngập tràn hàng ngàn vì sao lấp lánh, lắng nghe tiếng côn trùng rả rích, mọi âu lo phiền muộn của cuộc sống thường nhật dường như tan biến không còn dấu vết.</p>',
    },
    {
      slug: 'demo-post-mon-ngon-tu-nong-san',
      title: 'Gợi ý thực đơn tươi lành mỗi ngày từ nông sản hữu cơ XFarm',
      coverMediaId: '/demo/banner-2.svg',
      monthOffset: 0,
      excerpt:
        'Biến tấu bữa ăn gia đình phong phú, đủ chất dinh dưỡng và tràn đầy năng lượng với các nguyên liệu tươi sống vừa thu hoạch tại nông trại.',
      content:
        '<p>Một bữa cơm gia đình đầm ấm với các món ăn nóng hổi, tươi ngon luôn là sợi dây gắn kết yêu thương bền chặt nhất giữa các thành viên. Hãy cùng XFarm khám phá thực đơn 7 ngày phong phú từ nguồn nông sản sinh thái tươi sạch.</p><p>Mở đầu tuần mới tràn đầy năng lượng với món súp gà ác hạt sen bùi ngậy bồi bổ khí huyết, kèm đĩa salad xà lách mỡ cà chua bi sốt chanh leo chua ngọt đánh thức mọi giác quan.</p><p>Giữa tuần nhẹ nhàng với món cá diêu hồng hấp gừng hành giữ trọn vị ngọt tự nhiên của thớ thịt trắng mịn, canh cải ngọt nấu tôm đồng thanh mát giải nhiệt cơ thể sau những giờ làm việc mệt mỏi.</p><p>Và cuối tuần sum họp cùng nồi lẩu gà lá é đồng quê nóng hổi bốc khói nghi ngút bên mâm cơm gia đình rộn rã tiếng cười vui. Khi nguyên liệu đầu vào tươi sạch và tinh khiết, mỗi món ăn bạn nấu đều trở thành một tác phẩm ẩm thực chứa chan tình yêu thương.</p>',
    },
  ];

  for (const p of postsData) {
    const publishedAt = new Date(now.getTime() - p.monthOffset * 30 * 24 * 60 * 60 * 1000);
    await prisma.post.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        excerpt: p.excerpt,
        content: p.content,
        coverMediaId: p.coverMediaId,
        publishedAt,
        status: PostStatus.PUBLISHED,
      },
      create: {
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        content: p.content,
        coverMediaId: p.coverMediaId,
        publishedAt,
        status: PostStatus.PUBLISHED,
        createdById: admin?.id,
      },
    });
  }

  // ==========================================
  // 6. STATIC PAGES (gioi-thieu, chinh-sach-giao-hang, lien-he)
  // ==========================================
  console.log('6. Seeding Static Pages (gioi-thieu, chinh-sach-giao-hang, lien-he)...');
  const pagesData = [
    {
      slug: 'gioi-thieu',
      title: 'Giới thiệu Nông trại sinh thái XFarm',
      content: `
        <h2>Câu chuyện hình thành</h2>
        <p>XFarm được ấp ủ và kiến tạo từ tình yêu tha thiết với nông nghiệp bền vững và khát vọng mang đến nguồn thực phẩm an lành, minh bạch nhất cho người tiêu dùng Việt Nam. Tọa lạc tại thung lũng Đạ Sar, huyện Lạc Dương, tỉnh Lâm Đồng, nơi có khí hậu ôn hòa quanh năm và đất đai màu mỡ nguyên sơ, XFarm là mô hình trang trại sinh thái tuần hoàn kiểu mẫu kết hợp trồng trọt, chăn nuôi, thủy sản và du lịch trải nghiệm xanh.</p>
        
        <h2>Tầm nhìn & Sứ mệnh</h2>
        <p><strong>Tầm nhìn:</strong> Trở thành hệ sinh thái nông nghiệp tuần hoàn bền vững hàng đầu Việt Nam, tiên phong kết nối công nghệ số và nông nghiệp sinh thái tự nhiên.</p>
        <p><strong>Sứ mệnh:</strong> Nâng niu đất mẹ, bảo tồn nguồn nước ngầm, gìn giữ đa dạng sinh học và đồng hành cùng sức khỏe vàng của hàng triệu gia đình bằng những sản phẩm tươi lành không hóa chất.</p>

        <h2>Mô hình kinh tế tuần hoàn 4 trụ cột</h2>
        <ul>
          <li><strong>Trồng trọt hữu cơ:</strong> Rau ăn lá, củ quả nhiệt đới và hệ thống nhà kính dưa lưới ứng dụng tưới nhỏ giọt tiết kiệm nước.</li>
          <li><strong>Chăn nuôi sinh thái:</strong> Đàn gà ri đồi và vịt cỏ được nuôi thả tự do với đệm lót men vi sinh và thức ăn bổ sung thảo mộc phòng bệnh chủ động.</li>
          <li><strong>Thủy sản tuần hoàn:</strong> Hệ thống ao cá nước ngọt xử lý nước khép kín bằng thực vật thủy sinh, không xả thải ô nhiễm môi trường.</li>
          <li><strong>Du lịch trải nghiệm:</strong> Không gian giáo dục nông nghiệp bổ ích cho trẻ em và điểm dừng chân nghỉ dưỡng thư thái cho gia đình cuối tuần.</li>
        </ul>
      `,
    },
    {
      slug: 'chinh-sach-giao-hang',
      title: 'Chính sách giao hàng & Đổi trả nông sản XFarm',
      content: `
        <h2>1. Phạm vi & Thời gian giao hàng</h2>
        <p>XFarm phục vụ giao hàng nông sản tươi sạch tận nhà trên toàn khu vực TP. Hồ Chí Minh, Hà Nội, Đà Lạt và các tỉnh lân cận:</p>
        <ul>
          <li><strong>Nội thành TP. HCM & Đà Lạt:</strong> Giao nhanh trong vòng 2–4 giờ hoặc theo khung giờ sáng sớm (07:00 – 09:00) theo yêu cầu.</li>
          <li><strong>Các tỉnh thành khác:</strong> Giao hàng qua dịch vụ vận tải lạnh chuyên dụng trong vòng 24–36 giờ.</li>
        </ul>

        <h2>2. Phí vận chuyển & Đóng gói</h2>
        <ul>
          <li>Miễn phí vận chuyển cho đơn hàng từ <strong>300.000 VNĐ</strong> tại nội thành Đà Lạt.</li>
          <li>Miễn phí vận chuyển cho đơn hàng từ <strong>500.000 VNĐ</strong> tại TP. Hồ Chí Minh.</li>
          <li>Nông sản được đóng gói trong thùng carton sóng giữ nhiệt, túi sinh học tự hủy và đá gel làm mát đảm bảo độ tươi mới 100%.</li>
        </ul>

        <h2>3. Chính sách đổi trả & Bồi hoàn 100%</h2>
        <p>Với tôn chỉ "Khách hàng an tâm tuyệt đối", XFarm cam kết đổi mới hoặc hoàn tiền 100% trong các trường hợp:</p>
        <ul>
          <li>Sản phẩm bị dập nát, hư hỏng trong quá trình vận chuyển.</li>
          <li>Chất lượng sản phẩm không đúng với cam kết mô tả hoặc có dấu hiệu héo úa.</li>
          <li>Giao thiếu số lượng hoặc nhầm lẫn chủng loại sản phẩm.</li>
        </ul>
        <p>Quý khách chỉ cần chụp ảnh sản phẩm và liên hệ hotline <strong>0901 234 567</strong> trong vòng 24 giờ kể từ khi nhận hàng, đội ngũ XFarm sẽ giải quyết bồi hoàn ngay lập tức mà không thu thêm bất kỳ chi phí nào.</p>
      `,
    },
    {
      slug: 'lien-he',
      title: 'Thông tin liên hệ & Hướng dẫn chỉ đường XFarm',
      content: `
        <h2>Địa chỉ Nông trại XFarm</h2>
        <p><strong>Địa chỉ:</strong> Thôn 3, Xã Đạ Sar, Huyện Lạc Dương, Tỉnh Lâm Đồng (Cách trung tâm TP. Đà Lạt khoảng 15km theo hướng đi Nha Trang).</p>
        <p><strong>Hotline đặt hàng & tư vấn:</strong> 0901 234 567</p>
        <p><strong>Email tiếp nhận thông tin:</strong> lienhe@xfarm.local</p>
        <p><strong>Thời gian mở cửa đón khách tham quan:</strong> 08:00 – 17:30 tất cả các ngày trong tuần (kể cả Thứ Bảy, Chủ Nhật và ngày lễ).</p>

        <h2>Hướng dẫn đường đi</h2>
        <p>Từ trung tâm thành phố Đà Lạt (Hồ Xuân Hương), quý khách di chuyển theo hướng đường Hùng Vương (Quốc lộ 20), rẽ vào Quốc lộ 27C (đường đi Nha Trang) khoảng 12km. Đến bảng chỉ dẫn Thôn 3 Đạ Sar, quý khách rẽ phải vào đường liên thôn trải nhựa khoảng 1.5km sẽ thấy cổng chào nông trại sinh thái XFarm với biểu tượng chiếc lá xanh nổi bật.</p>
        <p>Nông trại có bãi đỗ xe ô tô và xe khách 45 chỗ rộng rãi, an toàn có mái che miễn phí.</p>
      `,
    },
  ];

  for (const page of pagesData) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: {
        title: page.title,
        content: page.content,
      },
      create: {
        slug: page.slug,
        title: page.title,
        content: page.content,
        createdById: admin?.id,
      },
    });
  }

  // ==========================================
  // 7. SITE SETTINGS (Farm info, social, banners, vietqr)
  // ==========================================
  console.log('7. Seeding SiteSettings...');
  const siteSettings = [
    { key: 'farm.name', value: 'Nông trại Sinh thái Tuần hoàn XFarm' },
    { key: 'farm.slogan', value: 'Tươi lành từ đất mẹ – An tâm đến bàn ăn' },
    {
      key: 'farm.about',
      value:
        'XFarm là nông trại sinh thái phát triển bền vững theo mô hình kinh tế tuần hoàn tại Lâm Đồng, kết hợp hài hòa giữa trồng trọt hữu cơ VietGAP, chăn nuôi gà đồi thảo mộc, thủy sản nước sạch và du lịch trải nghiệm xanh.',
    },
    { key: 'contact.phone', value: '0901 234 567' },
    { key: 'contact.email', value: 'lienhe@xfarm.local' },
    { key: 'contact.address', value: 'Thôn 3, Xã Đạ Sar, Huyện Lạc Dương, Tỉnh Lâm Đồng' },
    { key: 'social.facebook', value: 'https://facebook.com/xfarm.eco' },
    { key: 'social.zalo', value: 'https://zalo.me/0901234567' },
    { key: 'social.youtube', value: 'https://youtube.com/@xfarm-eco' },
    {
      key: 'home.banners',
      value: [
        {
          title: 'Nông nghiệp sinh thái tuần hoàn bền vững',
          subtitle:
            'Canh tác 100% không hóa chất độc hại, ứng dụng vi sinh hữu cơ tuần hoàn để bảo vệ sức khỏe gia đình bạn.',
          image: '/demo/banner-1.svg',
        },
        {
          title: 'Nông sản tươi ngon từ đất mẹ',
          subtitle:
            'Thu hoạch từ sáng sớm tinh sương, đóng gói đạt chuẩn VietGAP và giao ngay đến tận bếp nhà bạn.',
          image: '/demo/banner-2.svg',
        },
        {
          title: 'Du lịch trải nghiệm sinh thái cuối tuần',
          subtitle:
            'Không gian xanh mát, không khí trong lành với các hoạt động trải nghiệm bổ ích cho gia đình và trẻ nhỏ.',
          image: '/demo/banner-3.svg',
        },
      ],
    },
    {
      key: 'bank.vietqr',
      value: {
        bank: 'VCB',
        accountNumber: '0123456789',
        accountName: 'CONG TY CP NONG TRAI XFARM',
      },
    },
  ];

  for (const s of siteSettings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }

  // ==========================================
  // 8. TOURS (6 tours) & TOUR SLOTS (next 8 weekends)
  // ==========================================
  console.log('8. Seeding Tours (6 tours) & TourSlots (next 8 weekends)...');
  const toursData = [
    {
      slug: 'demo-tour-nong-dan-nhi',
      name: 'Một ngày làm nông dân nhí (Trẻ em & Gia đình)',
      description:
        '<p>Chuyến phiêu lưu thú vị cho các em nhỏ được tự tay xới đất, gieo hạt mầm cải ngọt vào chậu mang về, cho gà ri ăn thóc và lội mương bắt cá nhỏ.</p><p>Hoạt động giúp các bé hiểu về cội nguồn hạt gạo, mớ rau và rèn luyện kỹ năng sống gần gũi thiên nhiên.</p>',
      durationMinutes: 180,
      priceAdult: 150000,
      priceChild: 120000,
      capacity: 40,
      mediaIds: ['/demo/tour-lop-hoc-xanh.svg'],
      sortOrder: 1,
    },
    {
      slug: 'demo-tour-thu-hoach-rau',
      name: 'Trải nghiệm thu hoạch rau quả hữu cơ công nghệ cao',
      description:
        '<p>Thực tế tham quan nhà kính dưa lưới Nhật Bản và các lô rau sạch, học hỏi phương pháp tưới nhỏ giọt thông minh và tự tay hái rau tươi mang về.</p><p>Bao gồm suất quà 2kg nông sản hữu cơ tuyển chọn do chính tay du khách hái từ giàn.</p>',
      durationMinutes: 120,
      priceAdult: 120000,
      priceChild: 80000,
      capacity: 30,
      mediaIds: ['/demo/tour-thu-hoach.svg'],
      sortOrder: 2,
    },
    {
      slug: 'demo-tour-cau-ca-sinh-thai',
      name: 'Khám phá ao cá tuần hoàn & Câu cá giải trí thư giãn',
      description:
        '<p>Nghỉ ngơi tại chòi câu lá ven hồ nước trong lành, tìm hiểu hệ sinh thái thủy sản tuần hoàn và thử tài câu cá rô phi, cá diêu hồng tự nhiên.</p><p>Hỗ trợ cần câu, mồi câu và đầu bếp chế biến món cá nướng muối ớt thưởng thức tại chỗ.</p>',
      durationMinutes: 240,
      priceAdult: 200000,
      priceChild: 100000,
      capacity: 25,
      mediaIds: ['/demo/cau-ca.svg'],
      sortOrder: 3,
    },
    {
      slug: 'demo-tour-chan-nuoi-sinh-thai',
      name: 'Tham quan đồi gà ri & trải nghiệm cho gà ăn nhặt trứng',
      description:
        '<p>Khám phá mô hình chăn nuôi đệm lót sinh học thoáng khí không mùi hôi, dạo bước trên đồi gà ri thả vườn và tự tay nhặt những quả trứng thảo mộc tươi mới.</p><p>Tặng kèm mỗi gia đình 1 hộp 10 quả trứng gà thảo mộc XFarm thượng hạng.</p>',
      durationMinutes: 90,
      priceAdult: 90000,
      priceChild: 60000,
      capacity: 35,
      mediaIds: ['/demo/cho-ga-an.svg'],
      sortOrder: 4,
    },
    {
      slug: 'demo-tour-cam-trai-hoang-hon',
      name: 'Cắm trại dã ngoại & BBQ nông sản hoàng hôn',
      description:
        '<p>Trải nghiệm dựng lều cắm trại trên thảo nguyên xanh, đón hoàng hôn buông xuống thung lũng và quây quần bên đống lửa trại tiệc nướng BBQ đầm ấm.</p><p>Bao gồm trọn gói lều trại cao cấp, suất ăn tối BBQ gà đồi, cá nướng và khoai bắp nướng thơm lừng.</p>',
      durationMinutes: 480,
      priceAdult: 450000,
      priceChild: 250000,
      capacity: 50,
      mediaIds: ['/demo/tour-cam-trai.svg'],
      sortOrder: 5,
    },
    {
      slug: 'demo-tour-tron-ven-xfarm',
      name: 'Tour khám phá trọn vẹn mô hình tuần hoàn XFarm',
      description:
        '<p>Hành trình chuyên sâu tìm hiểu toàn bộ 4 phân hệ Trồng trọt - Chăn nuôi - Thủy sản - Logistics, thưởng thức bữa trưa cơm quê 6 món tươi sạch tại nông trại.</p><p>Phù hợp cho các đoàn trường học, doanh nghiệp, hội nông dân và những ai đam mê nông nghiệp bền vững.</p>',
      durationMinutes: 300,
      priceAdult: 350000,
      priceChild: 200000,
      capacity: 30,
      mediaIds: ['/demo/banner-1.svg'],
      sortOrder: 6,
    },
  ];

  for (const t of toursData) {
    const tour = await prisma.tour.upsert({
      where: { slug: t.slug },
      update: {
        name: t.name,
        description: t.description,
        durationMinutes: t.durationMinutes,
        priceAdult: new Prisma.Decimal(t.priceAdult),
        priceChild: new Prisma.Decimal(t.priceChild),
        capacity: t.capacity,
        mediaIds: t.mediaIds,
        isPublished: true,
        sortOrder: t.sortOrder,
      },
      create: {
        slug: t.slug,
        name: t.name,
        description: t.description,
        durationMinutes: t.durationMinutes,
        priceAdult: new Prisma.Decimal(t.priceAdult),
        priceChild: new Prisma.Decimal(t.priceChild),
        capacity: t.capacity,
        mediaIds: t.mediaIds,
        isPublished: true,
        sortOrder: t.sortOrder,
        createdById: admin?.id,
      },
    });

    // Generate slots for next 8 weekends (Sat and Sun)
    // Morning: 08:30, Afternoon: 14:00
    for (let week = 1; week <= 8; week++) {
      const sat = new Date();
      sat.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7) + (week - 1) * 7);
      const sun = new Date(sat);
      sun.setDate(sat.getDate() + 1);

      const days = [sat, sun];
      for (const d of days) {
        // Slot 1: 08:30
        const slot1Date = new Date(d);
        slot1Date.setHours(8, 30, 0, 0);

        // Slot 2: 14:00
        const slot2Date = new Date(d);
        slot2Date.setHours(14, 0, 0, 0);

        for (const slotDate of [slot1Date, slot2Date]) {
          await prisma.tourSlot.upsert({
            where: {
              tourId_startAt: {
                tourId: tour.id,
                startAt: slotDate,
              },
            },
            update: {
              capacity: tour.capacity,
              isActive: true,
            },
            create: {
              tourId: tour.id,
              startAt: slotDate,
              capacity: tour.capacity,
              bookedCount: 0,
              isActive: true,
              createdById: admin?.id,
            },
          });
        }
      }
    }
  }

  // ==========================================
  // 9. CUSTOMERS (~60 customers)
  // ==========================================
  console.log('9. Seeding Customers (~60 realistic Vietnamese customers)...');
  const firstNames = [
    'Nguyễn',
    'Trần',
    'Lê',
    'Phạm',
    'Hoàng',
    'Huỳnh',
    'Phan',
    'Vũ',
    'Võ',
    'Đặng',
    'Bùi',
    'Đỗ',
    'Hồ',
    'Ngô',
    'Dương',
  ];
  const middleNames = ['Văn', 'Thị', 'Đức', 'Hữu', 'Minh', 'Ngọc', 'Quốc', 'Hoàng', 'Thanh', 'Gia'];
  const lastNames = [
    'An',
    'Bình',
    'Cường',
    'Dũng',
    'Em',
    'Huy',
    'Khoa',
    'Linh',
    'Mai',
    'Nam',
    'Oanh',
    'Phúc',
    'Quân',
    'Sơn',
    'Tú',
    'Uyên',
    'Vy',
    'Xuân',
    'Yến',
  ];
  const cities = [
    'Quận 1, TP. Hồ Chí Minh',
    'Quận 3, TP. Hồ Chí Minh',
    'Quận 7, TP. Hồ Chí Minh',
    'TP. Thủ Đức, TP. Hồ Chí Minh',
    'Quận Bình Thạnh, TP. Hồ Chí Minh',
    'Quận Cầu Giấy, Hà Nội',
    'Quận Đống Đa, Hà Nội',
    'Quận Tây Hồ, Hà Nội',
    'Phường 1, TP. Đà Lạt, Lâm Đồng',
    'Phường 9, TP. Đà Lạt, Lâm Đồng',
    'TP. Biên Hòa, Đồng Nai',
    'TP. Thủ Dầu Một, Bình Dương',
    'TP. Nha Trang, Khánh Hòa',
  ];

  for (let i = 1; i <= 60; i++) {
    const code = `DEMO-CU-${String(i).padStart(4, '0')}`;
    const fn = firstNames[i % firstNames.length];
    const mn = middleNames[(i * 3) % middleNames.length];
    const ln = lastNames[(i * 7) % lastNames.length];
    const name = `${fn} ${mn} ${ln}`;
    const phone = `0912${String(i).padStart(6, '0')}`;
    const email = `customer${i}@demo.xfarm.local`;
    const address = `${10 + (i % 80)} Đường Số ${(i % 20) + 1}, ${cities[i % cities.length]}`;

    let type = CustomerType.RETAIL;
    if (i % 10 === 0) type = CustomerType.AGENT;
    else if (i % 6 === 0) type = CustomerType.WHOLESALE;

    await prisma.customer.upsert({
      where: { code },
      update: {
        name,
        phone,
        email,
        address,
        type,
        isActive: true,
      },
      create: {
        code,
        name,
        phone,
        email,
        address,
        type,
        isActive: true,
        createdById: admin?.id,
      },
    });
  }

  // ==========================================
  // 10. EMPLOYEES (~15 employees)
  // ==========================================
  console.log('10. Seeding Employees (~15 staff members)...');
  const employeesData = [
    {
      code: 'DEMO-NV-0001',
      fullName: 'Trịnh Văn Thành',
      phone: '0981000001',
      position: 'Kỹ sư nông nghiệp trưởng',
      payType: PayType.MONTHLY,
      baseRate: 18000000,
    },
    {
      code: 'DEMO-NV-0002',
      fullName: 'Phan Thị Thu Thảo',
      phone: '0981000002',
      position: 'Chuyên viên vi sinh & dinh dưỡng',
      payType: PayType.MONTHLY,
      baseRate: 14000000,
    },
    {
      code: 'DEMO-NV-0003',
      fullName: 'Vũ Đình Toàn',
      phone: '0981000003',
      position: 'Bác sĩ thú y phụ trách chăn nuôi',
      payType: PayType.MONTHLY,
      baseRate: 15000000,
    },
    {
      code: 'DEMO-NV-0004',
      fullName: 'Nguyễn Hữu Thắng',
      phone: '0981000004',
      position: 'Kỹ sư thủy sản phụ trách ao nuôi',
      payType: PayType.MONTHLY,
      baseRate: 14000000,
    },
    {
      code: 'DEMO-NV-0005',
      fullName: 'Lâm Mỹ Duyên',
      phone: '0981000005',
      position: 'Trưởng bộ phận du lịch trải nghiệm',
      payType: PayType.MONTHLY,
      baseRate: 13000000,
    },
    {
      code: 'DEMO-NV-0006',
      fullName: 'Đinh Quang Minh',
      phone: '0981000006',
      position: 'Hướng dẫn viên du lịch sinh thái',
      payType: PayType.DAILY,
      baseRate: 350000,
    },
    {
      code: 'DEMO-NV-0007',
      fullName: 'Bùi Thị Tuyết',
      phone: '0981000007',
      position: 'Điều phối viên workshop nông dân nhí',
      payType: PayType.DAILY,
      baseRate: 320000,
    },
    {
      code: 'DEMO-NV-0008',
      fullName: 'Hoàng Văn Phúc',
      phone: '0981000008',
      position: 'Kỹ thuật viên cơ điện & IoT',
      payType: PayType.MONTHLY,
      baseRate: 12000000,
    },
    {
      code: 'DEMO-NV-0009',
      fullName: 'Dương Quốc Việt',
      phone: '0981000009',
      position: 'Quản lý kho vận & đóng gói',
      payType: PayType.MONTHLY,
      baseRate: 11500000,
    },
    {
      code: 'DEMO-NV-0010',
      fullName: 'Nguyễn Thị Hạnh',
      phone: '0981000010',
      position: 'Công nhân thu hoạch & sơ chế rau',
      payType: PayType.PIECE,
      baseRate: 1500,
    },
    {
      code: 'DEMO-NV-0011',
      fullName: 'Trần Đình Trọng',
      phone: '0981000011',
      position: 'Công nhân gieo trồng & làm đất',
      payType: PayType.DAILY,
      baseRate: 280000,
    },
    {
      code: 'DEMO-NV-0012',
      fullName: 'Lê Thị Kim Cúc',
      phone: '0981000012',
      position: 'Công nhân chăm sóc chuồng gà',
      payType: PayType.DAILY,
      baseRate: 290000,
    },
    {
      code: 'DEMO-NV-0013',
      fullName: 'Phạm Văn Long',
      phone: '0981000013',
      position: 'Công nhân vận hành ao cá & cho ăn',
      payType: PayType.DAILY,
      baseRate: 290000,
    },
    {
      code: 'DEMO-NV-0014',
      fullName: 'Đỗ Thị Hồng Nhung',
      phone: '0981000014',
      position: 'Nhân viên kinh doanh & CSKH webshop',
      payType: PayType.MONTHLY,
      baseRate: 10000000,
    },
    {
      code: 'DEMO-NV-0015',
      fullName: 'Lương Thế Vinh',
      phone: '0981000015',
      position: 'Nhân viên điều phối xe tải giao hàng',
      payType: PayType.DAILY,
      baseRate: 300000,
    },
  ];

  for (const emp of employeesData) {
    await prisma.employee.upsert({
      where: { code: emp.code },
      update: {
        fullName: emp.fullName,
        phone: emp.phone,
        position: emp.position,
        payType: emp.payType,
        baseRate: new Prisma.Decimal(emp.baseRate),
        isActive: true,
      },
      create: {
        code: emp.code,
        fullName: emp.fullName,
        phone: emp.phone,
        position: emp.position,
        payType: emp.payType,
        baseRate: new Prisma.Decimal(emp.baseRate),
        isActive: true,
      },
    });
  }

  // ==========================================
  // 11. SUPPLIERS (~10 suppliers)
  // ==========================================
  console.log('11. Seeding Suppliers (~10 vendors)...');
  const suppliersData = [
    {
      code: 'DEMO-NCC-0001',
      name: 'Công ty TNHH Hạt Giống Cây Trồng Miền Nam',
      phone: '02838111001',
      address: 'Quận Tân Bình, TP. Hồ Chí Minh',
      taxCode: '0301112221',
    },
    {
      code: 'DEMO-NCC-0002',
      name: 'HTX Phân Bón Hữu Cơ Sinh Học Lâm Đồng',
      phone: '02633811002',
      address: 'Huyện Đức Trọng, Tỉnh Lâm Đồng',
      taxCode: '5800112222',
    },
    {
      code: 'DEMO-NCC-0003',
      name: 'Công ty CP Thức Ăn Chăn Nuôi Xanh Việt Nam',
      phone: '02743811003',
      address: 'KCN Sóng Thần, Tỉnh Bình Dương',
      taxCode: '3700112223',
    },
    {
      code: 'DEMO-NCC-0004',
      name: 'Trung Tâm Giống Gia Cầm Quốc Gia Vạn Phúc',
      phone: '02433811004',
      address: 'Hà Đông, TP. Hà Nội',
      taxCode: '0100112224',
    },
    {
      code: 'DEMO-NCC-0005',
      name: 'Công ty CP Giống Thủy Sản Nước Ngọt Nam Bộ',
      phone: '02733811005',
      address: 'TP. Mỹ Tho, Tỉnh Tiền Giang',
      taxCode: '1200112225',
    },
    {
      code: 'DEMO-NCC-0006',
      name: 'Công ty TNHH Thiết Bị Nông Nghiệp Thông Minh Agrotech',
      phone: '02838111006',
      address: 'Quận 7, TP. Hồ Chí Minh',
      taxCode: '0300112226',
    },
    {
      code: 'DEMO-NCC-0007',
      name: 'Công ty Cổ Phần Bao Bì Sinh Học Xanh EcoPack',
      phone: '02513811007',
      address: 'KCN Amata, Tỉnh Đồng Nai',
      taxCode: '3600112227',
    },
    {
      code: 'DEMO-NCC-0008',
      name: 'Doanh Nghiệp Thú Y & Chế Phẩm Sinh Học BioVet',
      phone: '02838111008',
      address: 'Quận Bình Thạnh, TP. Hồ Chí Minh',
      taxCode: '0300112228',
    },
    {
      code: 'DEMO-NCC-0009',
      name: 'Công ty TNHH Tưới Tự Động Israel RainDrop',
      phone: '02838111009',
      address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
      taxCode: '0300112229',
    },
    {
      code: 'DEMO-NCC-0010',
      name: 'HTX Vật Tư Nông Nghiệp Lạc Dương',
      phone: '02633811010',
      address: 'Thị trấn Lạc Dương, Tỉnh Lâm Đồng',
      taxCode: '5800112230',
    },
  ];

  for (const s of suppliersData) {
    await prisma.supplier.upsert({
      where: { code: s.code },
      update: {
        name: s.name,
        phone: s.phone,
        address: s.address,
        taxCode: s.taxCode,
      },
      create: {
        code: s.code,
        name: s.name,
        phone: s.phone,
        address: s.address,
        taxCode: s.taxCode,
        createdById: admin?.id,
      },
    });
  }

  // ==========================================
  // 12. ANIMALS & ANIMAL GROUPS (3 chicken flocks, 1 duck flock, 20 animals)
  // ==========================================
  console.log('12. Seeding Animal Groups & 20 tagged Animals with mother pedigree...');
  // Find or create area IDs
  const barn01 = await prisma.area.findUniqueOrThrow({ where: { code: 'DEMO-AR-BARN-01' } });
  const barn02 = await prisma.area.findUniqueOrThrow({ where: { code: 'DEMO-AR-BARN-02' } });
  const barn03 = await prisma.area.findUniqueOrThrow({ where: { code: 'DEMO-AR-BARN-03' } });
  const barn04 = await prisma.area.findUniqueOrThrow({ where: { code: 'DEMO-AR-BARN-04' } });

  // Create or link cycles for these groups
  const cycleGa01 = await prisma.cycle.upsert({
    where: { code: 'DEMO-CY-GA-01' },
    update: {},
    create: {
      code: 'DEMO-CY-GA-01',
      name: 'Lứa gà ri sinh sản F1 vụ 2026',
      kind: CycleKind.LIVESTOCK,
      areaId: barn01.id,
      species: 'Gà',
      variety: 'Gà ri Lạc Thủy',
      startDate: new Date('2026-01-10'),
      status: CycleStatus.ACTIVE,
      initialQuantity: new Prisma.Decimal(150),
      createdById: admin?.id,
    },
  });
  const cycleGa02 = await prisma.cycle.upsert({
    where: { code: 'DEMO-CY-GA-02' },
    update: {},
    create: {
      code: 'DEMO-CY-GA-02',
      name: 'Lứa gà ri thịt thả đồi vụ xuân hè 2026',
      kind: CycleKind.LIVESTOCK,
      areaId: barn02.id,
      species: 'Gà',
      variety: 'Gà ri thả đồi',
      startDate: new Date('2026-02-15'),
      status: CycleStatus.ACTIVE,
      initialQuantity: new Prisma.Decimal(300),
      createdById: admin?.id,
    },
  });
  const cycleGa03 = await prisma.cycle.upsert({
    where: { code: 'DEMO-CY-GA-03' },
    update: {},
    create: {
      code: 'DEMO-CY-GA-03',
      name: 'Lứa gà giống hậu bị hữu cơ 2026',
      kind: CycleKind.LIVESTOCK,
      areaId: barn03.id,
      species: 'Gà',
      variety: 'Gà ri đồi Lâm Đồng',
      startDate: new Date('2026-03-01'),
      status: CycleStatus.ACTIVE,
      initialQuantity: new Prisma.Decimal(100),
      createdById: admin?.id,
    },
  });
  const cycleVit01 = await prisma.cycle.upsert({
    where: { code: 'DEMO-CY-VIT-01' },
    update: {},
    create: {
      code: 'DEMO-CY-VIT-01',
      name: 'Lứa vịt cỏ chạy đồng sinh thái 2026',
      kind: CycleKind.LIVESTOCK,
      areaId: barn04.id,
      species: 'Vịt',
      variety: 'Vịt cỏ Cánh Trắng',
      startDate: new Date('2026-02-01'),
      status: CycleStatus.ACTIVE,
      initialQuantity: new Prisma.Decimal(200),
      createdById: admin?.id,
    },
  });

  // 3 chicken flocks + 1 duck flock
  const animalGroupsData = [
    {
      code: 'DEMO-AG-01',
      cycleId: cycleGa01.id,
      species: 'Gà',
      breed: 'Gà ri Lạc Thủy',
      headCount: 150,
      areaId: barn01.id,
      notes: 'Đàn gà mái đẻ hạt giống F1',
    },
    {
      code: 'DEMO-AG-02',
      cycleId: cycleGa02.id,
      species: 'Gà',
      breed: 'Gà ri thả đồi',
      headCount: 300,
      areaId: barn02.id,
      notes: 'Đàn gà thịt chuẩn bị vỗ béo',
    },
    {
      code: 'DEMO-AG-03',
      cycleId: cycleGa03.id,
      species: 'Gà',
      breed: 'Gà ri đồi Lâm Đồng',
      headCount: 100,
      areaId: barn03.id,
      notes: 'Đàn gà hậu bị tuyển chọn',
    },
    {
      code: 'DEMO-AG-04',
      cycleId: cycleVit01.id,
      species: 'Vịt',
      breed: 'Vịt cỏ Cánh Trắng',
      headCount: 200,
      areaId: barn04.id,
      notes: 'Đàn vịt bắt sâu ruộng nước',
    },
  ];

  const groupMap = new Map<string, string>();
  for (const ag of animalGroupsData) {
    const group = await prisma.animalGroup.upsert({
      where: { code: ag.code },
      update: {
        headCount: ag.headCount,
        breed: ag.breed,
        notes: ag.notes,
      },
      create: {
        code: ag.code,
        cycleId: ag.cycleId,
        species: ag.species,
        breed: ag.breed,
        headCount: ag.headCount,
        areaId: ag.areaId,
        notes: ag.notes,
        createdById: admin?.id,
      },
    });
    groupMap.set(ag.code, group.id);
  }

  // 20 individual animals with tags and mother pedigree
  // First 4 are mothers
  const mothersData = [
    {
      tag: 'DEMO-ANI-0001',
      groupCode: 'DEMO-AG-01',
      species: 'Gà',
      breed: 'Gà ri Lạc Thủy',
      sex: AnimalSex.FEMALE,
      notes: 'Gà mái mẹ đầu đàn 01',
    },
    {
      tag: 'DEMO-ANI-0002',
      groupCode: 'DEMO-AG-01',
      species: 'Gà',
      breed: 'Gà ri Lạc Thủy',
      sex: AnimalSex.FEMALE,
      notes: 'Gà mái mẹ đầu đàn 02',
    },
    {
      tag: 'DEMO-ANI-0003',
      groupCode: 'DEMO-AG-03',
      species: 'Gà',
      breed: 'Gà ri đồi Lâm Đồng',
      sex: AnimalSex.FEMALE,
      notes: 'Gà mái giống tuyển chọn 03',
    },
    {
      tag: 'DEMO-ANI-0004',
      groupCode: 'DEMO-AG-04',
      species: 'Vịt',
      breed: 'Vịt cỏ Cánh Trắng',
      sex: AnimalSex.FEMALE,
      notes: 'Vịt mái mẹ đàn 04',
    },
  ];

  const motherIdMap = new Map<string, string>();
  for (const m of mothersData) {
    const animal = await prisma.animal.upsert({
      where: { tag: m.tag },
      update: {
        groupId: groupMap.get(m.groupCode),
        species: m.species,
        breed: m.breed,
        sex: m.sex,
        status: AnimalStatus.ALIVE,
        notes: m.notes,
      },
      create: {
        tag: m.tag,
        groupId: groupMap.get(m.groupCode),
        species: m.species,
        breed: m.breed,
        sex: m.sex,
        birthDate: new Date('2025-06-15'),
        status: AnimalStatus.ALIVE,
        notes: m.notes,
        createdById: admin?.id,
      },
    });
    motherIdMap.set(m.tag, animal.id);
  }

  // Remaining 16 animals linking to these 4 mothers
  for (let i = 5; i <= 20; i++) {
    const tag = `DEMO-ANI-${String(i).padStart(4, '0')}`;
    const motherTag = `DEMO-ANI-${String(((i - 1) % 4) + 1).padStart(4, '0')}`;
    const motherId = motherIdMap.get(motherTag);
    const isDuck = i >= 17;
    const groupCode = isDuck ? 'DEMO-AG-04' : i <= 10 ? 'DEMO-AG-01' : 'DEMO-AG-02';
    const species = isDuck ? 'Vịt' : 'Gà';
    const breed = isDuck ? 'Vịt cỏ Cánh Trắng' : 'Gà ri Lạc Thủy';
    const sex = i % 2 === 0 ? AnimalSex.FEMALE : AnimalSex.MALE;

    await prisma.animal.upsert({
      where: { tag },
      update: {
        groupId: groupMap.get(groupCode),
        species,
        breed,
        sex,
        motherId,
        status: AnimalStatus.ALIVE,
      },
      create: {
        tag,
        groupId: groupMap.get(groupCode),
        species,
        breed,
        sex,
        birthDate: new Date('2026-01-20'),
        motherId,
        status: AnimalStatus.ALIVE,
        notes: `Con của gà/vịt mẹ ${motherTag}`,
        createdById: admin?.id,
      },
    });
  }

  // ==========================================
  // 13. EQUIPMENT (~15 items) & MAINTENANCE
  // ==========================================
  console.log('13. Seeding Equipments (~15 items) + Schedules + Logs...');
  const pumpArea = await prisma.area.findUniqueOrThrow({ where: { code: 'DEMO-AR-PUMP-STATION' } });
  const ghAArea = await prisma.area.findUniqueOrThrow({ where: { code: 'DEMO-AR-GH-A' } });
  const ghBArea = await prisma.area.findUniqueOrThrow({ where: { code: 'DEMO-AR-GH-B' } });
  const pond01 = await prisma.area.findUniqueOrThrow({ where: { code: 'DEMO-AR-POND-01' } });
  const pond02 = await prisma.area.findUniqueOrThrow({ where: { code: 'DEMO-AR-POND-02' } });
  const whCentral = await prisma.area.findUniqueOrThrow({ where: { code: 'DEMO-AR-WH-CENTRAL' } });
  const field01 = await prisma.area.findUniqueOrThrow({ where: { code: 'DEMO-AR-FIELD-01' } });
  const field03 = await prisma.area.findUniqueOrThrow({ where: { code: 'DEMO-AR-FIELD-03' } });
  const tourHarvest = await prisma.area.findUniqueOrThrow({
    where: { code: 'DEMO-AR-TOUR-HARVEST' },
  });

  const equipmentsData = [
    {
      code: 'DEMO-EQ-0001',
      name: 'Hệ thống tưới nhỏ giọt tự động Israel Nhà kính A',
      type: 'Hệ thống tưới',
      areaId: ghAArea.id,
      value: 45000000,
      intervalDays: 30,
    },
    {
      code: 'DEMO-EQ-0002',
      name: 'Hệ thống phun sương làm mát tự động Nhà kính B',
      type: 'Hệ thống tưới',
      areaId: ghBArea.id,
      value: 38000000,
      intervalDays: 30,
    },
    {
      code: 'DEMO-EQ-0003',
      name: 'Máy sục khí nano bánh guồng ao cá 1',
      type: 'Máy sục khí',
      areaId: pond01.id,
      value: 18000000,
      intervalDays: 15,
    },
    {
      code: 'DEMO-EQ-0004',
      name: 'Máy sục khí nano bánh guồng ao cá 2',
      type: 'Máy sục khí',
      areaId: pond02.id,
      value: 18000000,
      intervalDays: 15,
    },
    {
      code: 'DEMO-EQ-0005',
      name: 'Máy phát điện diesel công nghiệp 25kVA dự phòng',
      type: 'Nguồn điện',
      areaId: pumpArea.id,
      value: 65000000,
      intervalDays: 60,
    },
    {
      code: 'DEMO-EQ-0006',
      name: 'Trạm bơm nước ly tâm 7.5kW cấp nước trang trại',
      type: 'Máy bơm',
      areaId: pumpArea.id,
      value: 22000000,
      intervalDays: 30,
    },
    {
      code: 'DEMO-EQ-0007',
      name: 'Máy cắt cỏ tự hành động cơ Honda 5.5HP',
      type: 'Máy nông nghiệp',
      areaId: field01.id,
      value: 12000000,
      intervalDays: 45,
    },
    {
      code: 'DEMO-EQ-0008',
      name: 'Máy xới đất mini làm đất trồng rau',
      type: 'Máy nông nghiệp',
      areaId: field03.id,
      value: 16000000,
      intervalDays: 45,
    },
    {
      code: 'DEMO-EQ-0009',
      name: 'Máy ấp trứng công nghiệp tự động 3000 trứng',
      type: 'Thiết bị chăn nuôi',
      areaId: barn02.id,
      value: 28000000,
      intervalDays: 60,
    },
    {
      code: 'DEMO-EQ-0010',
      name: 'Hệ thống máng ăn máng uống tự động chuồng gà 1',
      type: 'Thiết bị chăn nuôi',
      areaId: barn01.id,
      value: 15000000,
      intervalDays: 30,
    },
    {
      code: 'DEMO-EQ-0011',
      name: 'Máy đóng gói hút chân không buồng đôi DZ-500',
      type: 'Máy đóng gói',
      areaId: whCentral.id,
      value: 25000000,
      intervalDays: 60,
    },
    {
      code: 'DEMO-EQ-0012',
      name: 'Hệ thống kho lạnh bảo quản nông sản 50m3',
      type: 'Kho lạnh',
      areaId: whCentral.id,
      value: 85000000,
      intervalDays: 30,
    },
    {
      code: 'DEMO-EQ-0013',
      name: 'Xe điện 8 chỗ phục vụ du khách tham quan trang trại',
      type: 'Phương tiện',
      areaId: tourHarvest.id,
      value: 95000000,
      intervalDays: 30,
    },
    {
      code: 'DEMO-EQ-0014',
      name: 'Máy đo quang phổ kiểm tra dư lượng nitrat nông sản',
      type: 'Thiết bị đo',
      areaId: whCentral.id,
      value: 32000000,
      intervalDays: 90,
    },
    {
      code: 'DEMO-EQ-0015',
      name: 'Tủ biến tần điều khiển bơm năng lượng mặt trời',
      type: 'Hệ thống điện',
      areaId: pumpArea.id,
      value: 19000000,
      intervalDays: 90,
    },
  ];

  for (const eq of equipmentsData) {
    const equipment = await prisma.equipment.upsert({
      where: { code: eq.code },
      update: {
        name: eq.name,
        type: eq.type,
        areaId: eq.areaId,
        value: new Prisma.Decimal(eq.value),
        status: EquipmentStatus.ACTIVE,
        isActive: true,
      },
      create: {
        code: eq.code,
        name: eq.name,
        type: eq.type,
        areaId: eq.areaId,
        value: new Prisma.Decimal(eq.value),
        status: EquipmentStatus.ACTIVE,
        purchaseDate: new Date('2025-05-20'),
        isActive: true,
        createdById: admin?.id,
      },
    });

    // Schedule
    const nextDueDate = new Date();
    nextDueDate.setDate(now.getDate() + 20);

    const schedule = await prisma.maintenanceSchedule.upsert({
      where: { id: `DEMO-SCHED-${eq.code}` },
      update: {
        name: `Bảo trì định kỳ ${eq.name}`,
        intervalDays: eq.intervalDays,
        nextDueDate,
        isActive: true,
      },
      create: {
        id: `DEMO-SCHED-${eq.code}`,
        equipmentId: equipment.id,
        name: `Bảo trì định kỳ ${eq.name}`,
        intervalDays: eq.intervalDays,
        nextDueDate,
        isActive: true,
        createdById: admin?.id,
      },
    });

    // Maintenance log (past maintenance)
    const logDate = new Date();
    logDate.setDate(now.getDate() - 15);

    const existingLog = await prisma.maintenanceLog.findFirst({
      where: { equipmentId: equipment.id, scheduleId: schedule.id },
    });
    if (!existingLog) {
      await prisma.maintenanceLog.create({
        data: {
          equipmentId: equipment.id,
          scheduleId: schedule.id,
          date: logDate,
          type: MaintenanceType.ROUTINE,
          cost: new Prisma.Decimal(350000),
          notes: 'Kiểm tra dầu bôi trơn, siết ốc và vệ sinh định kỳ hoạt động êm ái.',
          performedById: admin?.id,
          createdById: admin?.id,
        },
      });
    }
  }

  // ==========================================
  // 14. SENSORS (~12 sensors) & ALERT RULES
  // ==========================================
  console.log('14. Seeding Sensors (~12 units) & AlertRules across main areas...');
  const sensorsData = [
    {
      code: 'DEMO-SN-0001',
      name: 'Cảm biến nhiệt độ Nhà kính A',
      type: SensorType.TEMP,
      unit: '°C',
      areaId: ghAArea.id,
      op: AlertOp.GT,
      threshold: 36.0,
    },
    {
      code: 'DEMO-SN-0002',
      name: 'Cảm biến độ ẩm không khí Nhà kính A',
      type: SensorType.HUMIDITY,
      unit: '%',
      areaId: ghAArea.id,
      op: AlertOp.GT,
      threshold: 90.0,
    },
    {
      code: 'DEMO-SN-0003',
      name: 'Cảm biến độ ẩm đất dưa lưới Nhà kính A',
      type: SensorType.SOIL_MOISTURE,
      unit: '%',
      areaId: ghAArea.id,
      op: AlertOp.LT,
      threshold: 35.0,
    },
    {
      code: 'DEMO-SN-0004',
      name: 'Cảm biến cường độ ánh sáng Nhà kính B',
      type: SensorType.LIGHT,
      unit: 'lux',
      areaId: ghBArea.id,
      op: AlertOp.LT,
      threshold: 5000.0,
    },
    {
      code: 'DEMO-SN-0005',
      name: 'Cảm biến độ ẩm đất cà chua Nhà kính B',
      type: SensorType.SOIL_MOISTURE,
      unit: '%',
      areaId: ghBArea.id,
      op: AlertOp.LT,
      threshold: 40.0,
    },
    {
      code: 'DEMO-SN-0006',
      name: 'Cảm biến nhiệt độ Chuồng gà 1',
      type: SensorType.TEMP,
      unit: '°C',
      areaId: barn01.id,
      op: AlertOp.GT,
      threshold: 35.0,
    },
    {
      code: 'DEMO-SN-0007',
      name: 'Cảm biến độ ẩm không khí Chuồng gà 1',
      type: SensorType.HUMIDITY,
      unit: '%',
      areaId: barn01.id,
      op: AlertOp.GT,
      threshold: 85.0,
    },
    {
      code: 'DEMO-SN-0008',
      name: 'Cảm biến oxy hòa tan (DO) Ao cá rô phi 1',
      type: SensorType.DO,
      unit: 'mg/L',
      areaId: pond01.id,
      op: AlertOp.LT,
      threshold: 4.0,
    },
    {
      code: 'DEMO-SN-0009',
      name: 'Cảm biến độ pH nước Ao cá rô phi 1',
      type: SensorType.PH,
      unit: 'pH',
      areaId: pond01.id,
      op: AlertOp.LT,
      threshold: 6.5,
    },
    {
      code: 'DEMO-SN-0010',
      name: 'Cảm biến oxy hòa tan (DO) Ao cá diêu hồng 2',
      type: SensorType.DO,
      unit: 'mg/L',
      areaId: pond02.id,
      op: AlertOp.LT,
      threshold: 4.0,
    },
    {
      code: 'DEMO-SN-0011',
      name: 'Cảm biến nhiệt độ nước Ao cá diêu hồng 2',
      type: SensorType.TEMP,
      unit: '°C',
      areaId: pond02.id,
      op: AlertOp.GT,
      threshold: 33.0,
    },
    {
      code: 'DEMO-SN-0012',
      name: 'Cảm biến độ ẩm đất Lô rau hữu cơ ngoài trời 1',
      type: SensorType.SOIL_MOISTURE,
      unit: '%',
      areaId: field01.id,
      op: AlertOp.LT,
      threshold: 30.0,
    },
  ];

  for (const s of sensorsData) {
    const rawKey = `dev-demo-sensor-key-${s.code.toLowerCase()}`;
    const { apiKeyHash, apiKeyPrefix } = hashApiKey(rawKey);

    const sensor = await prisma.sensor.upsert({
      where: { code: s.code },
      update: {
        name: s.name,
        type: s.type,
        unit: s.unit,
        areaId: s.areaId,
        isActive: true,
      },
      create: {
        code: s.code,
        name: s.name,
        type: s.type,
        unit: s.unit,
        areaId: s.areaId,
        apiKeyHash,
        apiKeyPrefix,
        isActive: true,
        createdById: admin?.id,
      },
    });

    // AlertRule
    const existingRule = await prisma.alertRule.findFirst({
      where: { sensorId: sensor.id },
    });
    if (!existingRule) {
      await prisma.alertRule.create({
        data: {
          sensorId: sensor.id,
          op: s.op,
          threshold: new Prisma.Decimal(s.threshold),
          cooldownMinutes: 30,
          isActive: true,
          createdById: admin?.id,
        },
      });
    } else {
      await prisma.alertRule.update({
        where: { id: existingRule.id },
        data: {
          op: s.op,
          threshold: new Prisma.Decimal(s.threshold),
        },
      });
    }
  }

  // ==========================================
  // 15. SUMMARY TABLE OUTPUT
  // ==========================================
  console.log('\n======================================================');
  console.log('       KẾT QUẢ GIEO MẦM NỘI DUNG DEMO (XFARM)         ');
  console.log('======================================================');

  const [
    mediaCount,
    areaCount,
    itemCount,
    productCount,
    postCount,
    pageCount,
    siteSettingCount,
    tourCount,
    tourSlotCount,
    customerCount,
    employeeCount,
    supplierCount,
    animalGroupCount,
    animalCount,
    equipmentCount,
    scheduleCount,
    sensorCount,
    alertRuleCount,
  ] = await Promise.all([
    prisma.media.count(),
    prisma.area.count(),
    prisma.item.count(),
    prisma.product.count(),
    prisma.post.count(),
    prisma.page.count(),
    prisma.siteSetting.count(),
    prisma.tour.count(),
    prisma.tourSlot.count(),
    prisma.customer.count(),
    prisma.employee.count(),
    prisma.supplier.count(),
    prisma.animalGroup.count(),
    prisma.animal.count(),
    prisma.equipment.count(),
    prisma.maintenanceSchedule.count(),
    prisma.sensor.count(),
    prisma.alertRule.count(),
  ]);

  const summary = [
    { 'Bảng (Table)': 'Media (Hình ảnh)', 'Tổng số bản ghi': mediaCount },
    { 'Bảng (Table)': 'Area (Khu/lô)', 'Tổng số bản ghi': areaCount },
    { 'Bảng (Table)': 'Item (Vật tư & Nông sản)', 'Tổng số bản ghi': itemCount },
    { 'Bảng (Table)': 'Product (Sản phẩm Webshop)', 'Tổng số bản ghi': productCount },
    { 'Bảng (Table)': 'Post (Bài viết Blog)', 'Tổng số bản ghi': postCount },
    { 'Bảng (Table)': 'Page (Trang tĩnh CMS)', 'Tổng số bản ghi': pageCount },
    { 'Bảng (Table)': 'SiteSetting (Cấu hình web)', 'Tổng số bản ghi': siteSettingCount },
    { 'Bảng (Table)': 'Tour (Tour du lịch)', 'Tổng số bản ghi': tourCount },
    { 'Bảng (Table)': 'TourSlot (Suất đặt tour)', 'Tổng số bản ghi': tourSlotCount },
    { 'Bảng (Table)': 'Customer (Khách hàng CRM)', 'Tổng số bản ghi': customerCount },
    { 'Bảng (Table)': 'Employee (Nhân viên HR)', 'Tổng số bản ghi': employeeCount },
    { 'Bảng (Table)': 'Supplier (Nhà cung cấp)', 'Tổng số bản ghi': supplierCount },
    { 'Bảng (Table)': 'AnimalGroup (Đàn vật nuôi)', 'Tổng số bản ghi': animalGroupCount },
    { 'Bảng (Table)': 'Animal (Cá thể có phả hệ)', 'Tổng số bản ghi': animalCount },
    { 'Bảng (Table)': 'Equipment (Thiết bị IoT/Cơ điện)', 'Tổng số bản ghi': equipmentCount },
    { 'Bảng (Table)': 'MaintenanceSchedule (Lịch bảo trì)', 'Tổng số bản ghi': scheduleCount },
    { 'Bảng (Table)': 'Sensor (Cảm biến)', 'Tổng số bản ghi': sensorCount },
    { 'Bảng (Table)': 'AlertRule (Quy tắc cảnh báo)', 'Tổng số bản ghi': alertRuleCount },
  ];

  console.table(summary);
  console.log('Seed nội dung demo hoàn tất thành công!');
}

main()
  .catch((e) => {
    console.error('Lỗi khi seed content:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
