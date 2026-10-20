import {
  ActivityType,
  AreaType,
  BookingStatus,
  CycleKind,
  CycleStatus,
  CustomerType,
  ItemCategory,
  PaymentMethod,
  PaymentStatus,
  PayType,
  PayrollStatus,
  Prisma,
  PrismaClient,
  SalesChannel,
  SalesOrderStatus,
  SensorType,
  StockMoveType,
  TransactionType,
} from '@prisma/client';
import { createHash } from 'node:crypto';

const prisma = new PrismaClient();
export const DEMO12 = 'DEMO12-';
export const DEMO12_SLUG = 'demo12-';
const AS_OF = new Date('2026-10-20T12:00:00.000Z');
const months = Array.from(
  { length: 12 },
  (_, index) => new Date(Date.UTC(AS_OF.getUTCFullYear(), AS_OF.getUTCMonth() - 11 + index, 1)),
);
const decimal = (value: number | string) => new Prisma.Decimal(value);
const id = (kind: string, key: string) => `${DEMO12}${kind}-${key}`;
const dateAt = (month: Date, day: number, hour = 8) =>
  new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day, hour));
const monthKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const chunked = async <T>(rows: T[], write: (chunk: T[]) => Promise<unknown>, size = 5000) => {
  for (let offset = 0; offset < rows.length; offset += size)
    await write(rows.slice(offset, offset + size));
};

export async function resetDemo(prismaClient: PrismaClient = prisma) {
  console.log('--- Đang xóa dữ liệu vận hành demo 12 tháng (--reset-demo) ---');
  await prismaClient.$transaction(
    async (tx) => {
      // 1. Gather all DEMO12- entity IDs
      const cycles = await tx.cycle.findMany({
        where: { code: { startsWith: DEMO12 } },
        select: { id: true },
      });
      const cycleIds = cycles.map((row) => row.id);

      const orders = await tx.salesOrder.findMany({
        where: { code: { startsWith: DEMO12 } },
        select: { id: true },
      });
      const orderIds = orders.map((row) => row.id);

      const tours = await tx.tour.findMany({
        where: { slug: { startsWith: DEMO12_SLUG } },
        select: { id: true },
      });
      const tourIds = tours.map((row) => row.id);

      const bookings = await tx.booking.findMany({
        where: {
          OR: [{ code: { startsWith: DEMO12 } }, { slot: { tourId: { in: tourIds } } }],
        },
        select: { id: true },
      });
      const bookingIds = bookings.map((row) => row.id);

      const harvests = await tx.harvestLot.findMany({
        where: {
          OR: [{ code: { startsWith: DEMO12 } }, { cycleId: { in: cycleIds } }],
        },
        select: { id: true },
      });
      const harvestIds = harvests.map((row) => row.id);

      const demo12Sensors = await tx.sensor.findMany({
        where: { code: { startsWith: DEMO12 } },
        select: { id: true },
      });
      const sensorIds = demo12Sensors.map((row) => row.id);

      const demo12Employees = await tx.employee.findMany({
        where: { code: { startsWith: DEMO12 } },
        select: { id: true },
      });
      const employeeIds = demo12Employees.map((row) => row.id);

      const demo12Customers = await tx.customer.findMany({
        where: { code: { startsWith: DEMO12 } },
        select: { id: true },
      });
      const customerIds = demo12Customers.map((row) => row.id);

      const demo12Items = await tx.item.findMany({
        where: { sku: { startsWith: DEMO12 } },
        select: { id: true },
      });
      const itemIds = demo12Items.map((row) => row.id);

      const demo12Areas = await tx.area.findMany({
        where: { code: { startsWith: DEMO12 } },
        select: { id: true },
      });
      const areaIds = demo12Areas.map((row) => row.id);

      const stockLots = await tx.stockLot.findMany({
        where: {
          OR: [
            { lotCode: { startsWith: DEMO12 } },
            { harvestLotId: { in: harvestIds } },
            { itemId: { in: itemIds } },
          ],
        },
        select: { id: true },
      });
      const stockLotIds = stockLots.map((row) => row.id);

      // Step 1: Sensor readings & alerts on demo12 sensors OR demo sensors (DEMO-SN-)
      await tx.sensorReading.deleteMany({
        where: {
          OR: [{ sensorId: { in: sensorIds } }, { sensor: { code: { startsWith: 'DEMO-SN-' } } }],
        },
      });
      await tx.alert.deleteMany({ where: { rule: { sensorId: { in: sensorIds } } } });
      await tx.alertRule.deleteMany({ where: { sensorId: { in: sensorIds } } });
      await tx.sensor.deleteMany({ where: { id: { in: sensorIds } } });

      // Step 2: Payments
      await tx.payment.deleteMany({
        where: {
          OR: [
            { orderId: { in: orderIds } },
            { bookingId: { in: bookingIds } },
            { code: { startsWith: DEMO12 } },
          ],
        },
      });

      // Step 3: Transactions
      await tx.transaction.deleteMany({
        where: {
          OR: [{ code: { startsWith: DEMO12 } }, { cycleId: { in: cycleIds } }],
        },
      });

      // Step 4: Sales order lines & orders
      await tx.salesOrderLine.deleteMany({
        where: {
          OR: [{ orderId: { in: orderIds } }, { id: { startsWith: id('LINE', '') } }],
        },
      });
      await tx.salesOrder.deleteMany({ where: { id: { in: orderIds } } });

      // Step 5: Bookings, tour slots, tours
      await tx.booking.deleteMany({ where: { id: { in: bookingIds } } });
      await tx.tourSlot.deleteMany({ where: { tourId: { in: tourIds } } });
      await tx.tour.deleteMany({ where: { id: { in: tourIds } } });

      // Step 6: Attendance & Payroll
      await tx.attendance.deleteMany({
        where: {
          OR: [
            { id: { startsWith: id('ATT', '') } },
            { cycleId: { in: cycleIds } },
            { employeeId: { in: employeeIds } },
          ],
        },
      });
      await tx.payroll.deleteMany({
        where: {
          OR: [{ id: { startsWith: id('PAYROLL', '') } }, { employeeId: { in: employeeIds } }],
        },
      });
      await tx.task.deleteMany({ where: { title: { startsWith: DEMO12 } } });

      // Step 7: Activity Materials & Stock Moves
      await tx.activityMaterial.deleteMany({
        where: {
          OR: [
            { activity: { cycleId: { in: cycleIds } } },
            { stockLotId: { in: stockLotIds } },
            { itemId: { in: itemIds } },
          ],
        },
      });
      await tx.stockMove.deleteMany({
        where: {
          OR: [
            { refType: 'DEMO12' },
            { refId: { startsWith: DEMO12 } },
            { stockLotId: { in: stockLotIds } },
            { itemId: { in: itemIds } },
          ],
        },
      });

      // Step 8: Stock lots
      await tx.stockLot.deleteMany({ where: { id: { in: stockLotIds } } });

      // Step 9: Harvest lots
      await tx.harvestLot.deleteMany({ where: { id: { in: harvestIds } } });

      // Step 10: Activities & Animal Groups & Cycles
      await tx.activity.deleteMany({
        where: {
          OR: [{ cycleId: { in: cycleIds } }, { id: { startsWith: id('ACT', '') } }],
        },
      });
      await tx.animalGroup.deleteMany({ where: { code: { startsWith: DEMO12 } } });
      await tx.cycle.deleteMany({ where: { id: { in: cycleIds } } });

      // Step 11: Minimal DEMO12-only categories (NEVER deletes DEMO-!)
      await tx.employee.deleteMany({ where: { id: { in: employeeIds } } });
      await tx.customer.deleteMany({ where: { id: { in: customerIds } } });
      await tx.item.deleteMany({ where: { id: { in: itemIds } } });
      await tx.area.deleteMany({ where: { id: { in: areaIds } } });

      console.log('Đã dọn dẹp xong toàn bộ dữ liệu vận hành DEMO12-.');
    },
    { timeout: 120000 },
  );
}

async function main() {
  const isReset = process.argv.includes('--reset-demo');
  if (isReset) {
    await resetDemo();
    return;
  }

  // Idempotency check:
  const existingCyclesCount = await prisma.cycle.count({
    where: { code: { startsWith: DEMO12 } },
  });
  if (existingCyclesCount > 0) {
    const summary = {
      cycles: existingCyclesCount,
      activities: await prisma.activity.count({
        where: { cycle: { code: { startsWith: DEMO12 } } },
      }),
      salesOrders: await prisma.salesOrder.count({ where: { code: { startsWith: DEMO12 } } }),
      salesOrderLines: await prisma.salesOrderLine.count({
        where: { order: { code: { startsWith: DEMO12 } } },
      }),
      bookings: await prisma.booking.count({ where: { code: { startsWith: DEMO12 } } }),
      employees: await prisma.employee.count({ where: { code: { startsWith: DEMO12 } } }),
      attendances: await prisma.attendance.count({
        where: { cycle: { code: { startsWith: DEMO12 } } },
      }),
      payrolls: await prisma.payroll.count({ where: { id: { startsWith: id('PAYROLL', '') } } }),
      sensorReadings: await prisma.sensorReading.count({
        where: {
          OR: [
            { sensor: { code: { startsWith: DEMO12 } } },
            { sensor: { code: { startsWith: 'DEMO-SN-' } } },
          ],
        },
      }),
    };
    console.log(
      `Dữ liệu demo 12 tháng (${DEMO12}) đã tồn tại. Bỏ qua gieo mầm để đảm bảo tính idempotent.`,
    );
    console.log(`Chi tiết: ${JSON.stringify(summary)}`);
    return summary;
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@xfarm.local' } });
  const worker = (await prisma.user.findFirst({ where: { email: 'worker@xfarm.local' } })) ?? admin;
  const materialWarehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-MATERIAL' },
    update: {},
    create: { code: 'WH-MATERIAL', name: 'Kho vật tư' },
  });
  const finishedWarehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-FINISHED' },
    update: {},
    create: { code: 'WH-FINISHED', name: 'Kho thành phẩm' },
  });
  const salesCategory = await prisma.financeCategory.upsert({
    where: { systemKey: 'SALES' },
    update: {},
    create: { name: 'Bán hàng', type: TransactionType.INCOME, systemKey: 'SALES' },
  });
  const expenseCategory = await prisma.financeCategory.upsert({
    where: { systemKey: 'PAYROLL' },
    update: {},
    create: { name: 'Chi phí demo', type: TransactionType.EXPENSE, systemKey: 'PAYROLL' },
  });

  // Category priority: Ưu tiên danh mục DEMO- của seed-content nếu có
  // 1. Area
  let area = await prisma.area.findFirst({
    where: { code: { startsWith: 'DEMO-AR-' }, type: AreaType.FIELD },
    orderBy: { code: 'asc' },
  });
  if (!area) {
    area = await prisma.area.findFirst({
      where: { code: { startsWith: 'DEMO-AR-' } },
      orderBy: { code: 'asc' },
    });
  }
  if (!area) {
    area = await prisma.area.upsert({
      where: { code: `${DEMO12}AREA` },
      update: {},
      create: {
        code: `${DEMO12}AREA`,
        name: 'Khu canh tác demo 12M',
        type: AreaType.FIELD,
        createdById: admin.id,
      },
    });
  }

  // 2. Material item
  const existingMaterial =
    (await prisma.item.findFirst({
      where: {
        sku: { startsWith: 'DEMO-ITEM-' },
        category: ItemCategory.FERTILIZER,
        isActive: true,
      },
      orderBy: { sku: 'asc' },
    })) ??
    (await prisma.item.findFirst({
      where: { sku: { startsWith: 'DEMO-ITEM-' }, isActive: true },
      orderBy: { sku: 'asc' },
    }));

  // 3. Produce item
  const existingProduce =
    (await prisma.item.findFirst({
      where: { sku: { startsWith: 'DEMO-PROD-ITEM-' }, isSellable: true, isActive: true },
      orderBy: { sku: 'asc' },
    })) ??
    (await prisma.item.findFirst({
      where: { sku: { startsWith: 'DEMO-PROD-ITEM-' }, isActive: true },
      orderBy: { sku: 'asc' },
    }));

  // 4. Customers
  const existingCustomers = await prisma.customer.findMany({
    where: { code: { startsWith: 'DEMO-CU-' } },
    take: 24,
    orderBy: { code: 'asc' },
  });

  // 5. Employees
  const existingEmployees = await prisma.employee.findMany({
    where: { code: { startsWith: 'DEMO-NV-' } },
    take: 15,
    orderBy: { code: 'asc' },
  });

  // 6. Sensors
  const existingSensors = await prisma.sensor.findMany({
    where: { code: { startsWith: 'DEMO-SN-' } },
    take: 12,
    orderBy: { code: 'asc' },
  });

  const sensorTypes = [
    SensorType.TEMP,
    SensorType.HUMIDITY,
    SensorType.SOIL_MOISTURE,
    SensorType.PH,
    SensorType.DO,
    SensorType.LIGHT,
  ];

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Material item
      let materialId: string;
      if (existingMaterial) {
        materialId = existingMaterial.id;
      } else {
        const item = await tx.item.upsert({
          where: { sku: `${DEMO12}FERTILIZER` },
          update: {},
          create: {
            id: id('ITEM', 'MATERIAL'),
            sku: `${DEMO12}FERTILIZER`,
            name: 'Phân hữu cơ demo 12M',
            category: ItemCategory.FERTILIZER,
            unit: 'kg',
            isActive: true,
          },
        });
        materialId = item.id;
      }

      // 2. Produce item
      let produceId: string;
      if (existingProduce) {
        produceId = existingProduce.id;
      } else {
        const item = await tx.item.upsert({
          where: { sku: `${DEMO12}PRODUCE` },
          update: {},
          create: {
            id: id('ITEM', 'PRODUCE'),
            sku: `${DEMO12}PRODUCE`,
            name: 'Rau xanh demo 12M',
            category: ItemCategory.PRODUCE,
            unit: 'kg',
            isSellable: true,
            isActive: true,
          },
        });
        produceId = item.id;
      }

      // 3. Customers
      let customerList: Array<{ id: string }>;
      if (existingCustomers.length > 0) {
        customerList = existingCustomers;
      } else {
        const customerRows = Array.from({ length: 24 }, (_, index) => ({
          id: id('CUSTOMER', String(index + 1).padStart(3, '0')),
          code: `${DEMO12}CUSTOMER-${index + 1}`,
          name: `Khách hàng demo ${index + 1}`,
          phone: `099${String(index + 1).padStart(7, '0')}`,
          type: index % 3 === 0 ? CustomerType.WHOLESALE : CustomerType.RETAIL,
          createdById: admin.id,
        }));
        await tx.customer.createMany({ data: customerRows, skipDuplicates: true });
        customerList = customerRows;
      }

      // 4. Employees
      let employeeList: Array<{ id: string; baseRate: Prisma.Decimal }>;
      if (existingEmployees.length > 0) {
        employeeList = existingEmployees.map((e) => ({
          id: e.id,
          baseRate: e.baseRate ? decimal(e.baseRate) : decimal(320000),
        }));
      } else {
        const empRows = Array.from({ length: 15 }, (_, index) => ({
          id: id('EMP', String(index + 1).padStart(2, '0')),
          code: `${DEMO12}EMP-${index + 1}`,
          fullName: `Nhân viên demo ${index + 1}`,
          phone: `0988${String(index + 1).padStart(6, '0')}`,
          position: index < 3 ? 'Tổ trưởng nông trại' : 'Nhân viên nông trại',
          payType: PayType.DAILY,
          baseRate: decimal(320000 + (index % 5) * 25000),
        }));
        await tx.employee.createMany({ data: empRows, skipDuplicates: true });
        employeeList = empRows.map((e) => ({ id: e.id, baseRate: e.baseRate }));
      }

      // 5. Sensors
      let sensorList: Array<{ id: string }>;
      if (existingSensors.length >= 12) {
        sensorList = existingSensors;
      } else {
        const sensorRows: Prisma.SensorCreateManyInput[] = [];
        for (let sensorIndex = 0; sensorIndex < 12; sensorIndex += 1) {
          const sensorId = id('SENSOR', String(sensorIndex + 1).padStart(2, '0'));
          const type = sensorTypes[sensorIndex % sensorTypes.length];
          sensorRows.push({
            id: sensorId,
            code: `${DEMO12}SENSOR-${sensorIndex + 1}`,
            name: `Cảm biến demo ${sensorIndex + 1}`,
            type,
            unit: type === SensorType.TEMP ? '°C' : type === SensorType.PH ? 'pH' : '%',
            areaId: area.id,
            apiKeyHash: hash(`${DEMO12}API-KEY-${sensorIndex + 1}`),
            apiKeyPrefix: `${DEMO12}API`,
            createdById: admin.id,
            lastSeenAt: AS_OF,
          });
        }
        await tx.sensor.createMany({ data: sensorRows, skipDuplicates: true });
        sensorList = sensorRows;
      }

      // 6. Cycles, Lots, Moves, Activities, Harvests
      const cycleRows: Prisma.CycleCreateManyInput[] = [];
      const materialLots: Prisma.StockLotCreateManyInput[] = [];
      const produceLots: Prisma.StockLotCreateManyInput[] = [];
      const initialMoves: Prisma.StockMoveCreateManyInput[] = [];
      const activities: Prisma.ActivityCreateManyInput[] = [];
      const activityMaterials: Prisma.ActivityMaterialCreateManyInput[] = [];
      const harvests: Prisma.HarvestLotCreateManyInput[] = [];
      const cycleRefs: Array<{ cycleId: string; month: Date; produceLotId: string }> = [];
      let cycleIndex = 0;
      for (const month of months)
        for (let local = 0; local < 6; local += 1) {
          const key = `${monthKey(month)}-${local + 1}`;
          const cycleId = id('CYCLE', key);
          const materialLotId = id('MLOT', key);
          const produceLotId = id('PLOT', key);
          const start = dateAt(month, 1 + local, 7);
          const harvestDate = dateAt(month, 24 + (local % 5), 9);
          const harvestActivityId = id('ACT-HARVEST', key);
          cycleRows.push({
            id: cycleId,
            code: `${DEMO12}CY-${key}`,
            name: `Vụ rau demo ${key}`,
            kind: CycleKind.CROP,
            areaId: area.id,
            species: 'Rau xanh',
            variety: 'Cải xanh demo',
            startDate: start,
            expectedEndDate: harvestDate,
            endDate: harvestDate,
            status: CycleStatus.CLOSED,
            expectedYield: decimal(500),
            yieldUnit: 'kg',
            notes: 'Dữ liệu demo 12 tháng',
            createdById: admin.id,
          });
          materialLots.push({
            id: materialLotId,
            itemId: materialId,
            warehouseId: materialWarehouse.id,
            lotCode: `${DEMO12}MAT-${key}`,
            unitCost: decimal(18000),
          });
          produceLots.push({
            id: produceLotId,
            itemId: produceId,
            harvestLotId: id('HARVEST', key),
            warehouseId: finishedWarehouse.id,
            lotCode: `${DEMO12}PROD-${key}`,
            unitCost: decimal(26000),
          });
          initialMoves.push({
            type: StockMoveType.IN,
            itemId: materialId,
            stockLotId: materialLotId,
            toWarehouseId: materialWarehouse.id,
            quantity: decimal(30),
            unitCost: decimal(18000),
            refType: 'DEMO12',
            refId: `${DEMO12}RECEIVE-${key}`,
            movedAt: start,
          });
          initialMoves.push({
            type: StockMoveType.IN,
            itemId: produceId,
            stockLotId: produceLotId,
            toWarehouseId: finishedWarehouse.id,
            quantity: decimal(500),
            unitCost: decimal(26000),
            refType: 'HarvestLot',
            refId: id('HARVEST', key),
            movedAt: harvestDate,
          });
          for (let activityIndex = 0; activityIndex < 7; activityIndex += 1) {
            const activityId =
              activityIndex === 6 ? harvestActivityId : id('ACT', `${key}-${activityIndex + 1}`);
            const performedAt = dateAt(month, Math.min(22, 4 + activityIndex * 3 + (local % 3)), 8);
            const isHarvest = activityIndex === 6;
            activities.push({
              id: activityId,
              cycleId,
              areaId: area.id,
              type: isHarvest
                ? ActivityType.HARVEST
                : [ActivityType.FERTILIZING, ActivityType.IRRIGATION, ActivityType.WEEDING][
                    activityIndex % 3
                  ],
              performedAt,
              performedById: worker.id,
              createdById: admin.id,
              quantity: decimal(isHarvest ? 500 : 2),
              unit: 'kg',
              data: { demo: true, month: monthKey(month) },
              notes: isHarvest ? 'Thu hoạch demo' : 'Nhật ký chăm sóc demo',
              clientId: id('CLIENT', `${key}-${activityIndex}`),
            });
            if (!isHarvest) {
              activityMaterials.push({
                activityId,
                itemId: materialId,
                stockLotId: materialLotId,
                quantity: decimal(2),
                unitCost: decimal(18000),
                createdById: admin.id,
              });
              initialMoves.push({
                type: StockMoveType.OUT,
                itemId: materialId,
                stockLotId: materialLotId,
                fromWarehouseId: materialWarehouse.id,
                quantity: decimal(2),
                unitCost: decimal(18000),
                refType: 'Activity',
                refId: activityId,
                movedAt: performedAt,
              });
            }
          }
          harvests.push({
            id: id('HARVEST', key),
            code: `${DEMO12}HL-${key}`,
            traceCode: `D12${String(cycleIndex + 1).padStart(8, '0')}`,
            cycleId,
            activityId: harvestActivityId,
            itemId: produceId,
            quantity: decimal(500),
            unit: 'kg',
            harvestedAt: harvestDate,
            warehouseId: finishedWarehouse.id,
            qualityGrade: 'A',
            isPublic: true,
            createdById: admin.id,
          });
          cycleRefs.push({ cycleId, month, produceLotId });
          cycleIndex += 1;
        }
      await tx.cycle.createMany({ data: cycleRows });
      await tx.stockLot.createMany({ data: materialLots });
      await tx.activity.createMany({ data: activities });
      await tx.activityMaterial.createMany({ data: activityMaterials });
      await tx.harvestLot.createMany({ data: harvests });
      await tx.stockLot.createMany({ data: produceLots });
      await chunked(initialMoves, (rows) => tx.stockMove.createMany({ data: rows }));

      // 7. Orders, SalesOrderLines, Payments, Transactions
      const orders: Prisma.SalesOrderCreateManyInput[] = [];
      const lines: Prisma.SalesOrderLineCreateManyInput[] = [];
      const payments: Prisma.PaymentCreateManyInput[] = [];
      const incomes: Prisma.TransactionCreateManyInput[] = [];
      const orderMoves: Prisma.StockMoveCreateManyInput[] = [];
      const stockRemaining = cycleRefs.map(() => 500);
      let orderIndex = 0;
      for (let dayOffset = 0; dayOffset < 365; dayOffset += 1) {
        const orderDate = new Date(AS_OF.getTime() - (364 - dayOffset) * 86400000);
        const count =
          orderDate.getUTCMonth() === 5 || orderDate.getUTCMonth() === 6
            ? 15
            : 10 + (dayOffset % 3 === 0 ? 1 : 0);
        for (let daily = 0; daily < count; daily += 1) {
          const orderId = id('ORDER', String(orderIndex).padStart(5, '0'));
          const cancelled = orderIndex % 20 === 0;
          const recent = dayOffset > 335;
          const partial = recent && orderIndex % 9 === 0 && !cancelled;
          const unpaid = recent && orderIndex % 17 === 0 && !cancelled && !partial;
          const lineCount = 1 + (orderIndex % 3);
          let subtotal = decimal(0);
          const orderLines: Prisma.SalesOrderLineCreateManyInput[] = [];
          for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
            const quantity = decimal(1 + ((orderIndex + lineIndex) % 3));
            const unitPrice = decimal(38000 + ((orderIndex + lineIndex) % 5) * 1500);
            let lotIndex = orderIndex % cycleRefs.length;
            while (lotIndex < cycleRefs.length && stockRemaining[lotIndex] < quantity.toNumber())
              lotIndex += 1;
            if (lotIndex >= cycleRefs.length) break;
            if (!cancelled) stockRemaining[lotIndex] -= quantity.toNumber();
            const lineId = id('LINE', `${orderIndex}-${lineIndex}`);
            orderLines.push({
              id: lineId,
              orderId,
              itemId: produceId,
              stockLotId: cycleRefs[lotIndex].produceLotId,
              quantity,
              unitPrice,
            });
            if (!cancelled) {
              orderMoves.push({
                type: StockMoveType.OUT,
                itemId: produceId,
                stockLotId: cycleRefs[lotIndex].produceLotId,
                fromWarehouseId: finishedWarehouse.id,
                quantity,
                unitCost: decimal(26000),
                refType: 'SalesOrder',
                refId: orderId,
                movedAt: orderDate,
              });
            }
            subtotal = subtotal.plus(quantity.times(unitPrice));
          }
          if (orderLines.length === 0) continue;
          const total = subtotal;
          const status = cancelled ? SalesOrderStatus.CANCELLED : SalesOrderStatus.CONFIRMED;
          const paymentStatus = cancelled
            ? PaymentStatus.UNPAID
            : unpaid
              ? PaymentStatus.UNPAID
              : partial
                ? PaymentStatus.PARTIAL
                : PaymentStatus.PAID;
          orders.push({
            id: orderId,
            code: `${DEMO12}SO-${String(orderIndex).padStart(5, '0')}`,
            customerId: customerList[orderIndex % customerList.length].id,
            channel: orderIndex % 10 < 3 ? SalesChannel.WEBSHOP : SalesChannel.ADMIN,
            status,
            paymentStatus,
            paymentMethod: PaymentMethod.BANK_TRANSFER,
            shippingAddress: 'Địa chỉ demo',
            subtotal,
            discount: decimal(0),
            shippingFee: decimal(0),
            total,
            confirmedAt: cancelled ? null : orderDate,
            cancelledAt: cancelled ? orderDate : null,
            warehouseId: finishedWarehouse.id,
            createdById: admin.id,
            createdAt: orderDate,
          });
          lines.push(...orderLines);
          if (!cancelled && !unpaid) {
            const amount = partial ? total.div(2) : total;
            const paymentId = id('PAYMENT', String(orderIndex).padStart(5, '0'));
            const transactionId = id('TX-INCOME', String(orderIndex).padStart(5, '0'));
            payments.push({
              id: paymentId,
              code: `${DEMO12}PM-${String(orderIndex).padStart(5, '0')}`,
              orderId,
              amount,
              method: PaymentMethod.BANK_TRANSFER,
              paidAt: orderDate,
              transactionId,
              createdById: admin.id,
            });
            incomes.push({
              id: transactionId,
              code: `${DEMO12}INC-${String(orderIndex).padStart(5, '0')}`,
              type: TransactionType.INCOME,
              categoryId: salesCategory.id,
              amount,
              date: orderDate,
              refType: 'Payment',
              refId: paymentId,
              method: PaymentMethod.BANK_TRANSFER,
              notes: `Thu tiền ${orderId}`,
              createdById: admin.id,
            });
          }
          orderIndex += 1;
        }
      }
      await chunked(orders, (rows) => tx.salesOrder.createMany({ data: rows }));
      await chunked(lines, (rows) => tx.salesOrderLine.createMany({ data: rows }));
      await chunked(orderMoves, (rows) => tx.stockMove.createMany({ data: rows }));
      await chunked(payments, (rows) => tx.payment.createMany({ data: rows }));
      await chunked(incomes, (rows) => tx.transaction.createMany({ data: rows }));

      // 8. Attendance, Payroll, PayrollExpenses
      const attendances: Prisma.AttendanceCreateManyInput[] = [];
      const payrolls: Prisma.PayrollCreateManyInput[] = [];
      const payrollExpenses: Prisma.TransactionCreateManyInput[] = [];
      for (let monthIndex = 0; monthIndex < months.length; monthIndex += 1) {
        const month = months[monthIndex];
        const start = dateAt(month, 1);
        const end = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0));
        for (const [employeeIndex, employee] of employeeList.entries()) {
          const days = 18 + ((employeeIndex + monthIndex) % 5);
          const cycleId = cycleRefs[monthIndex * 6 + (employeeIndex % 6)].cycleId;
          for (let day = 0; day < days; day += 1) {
            const checkIn = dateAt(month, 2 + day, 7);
            attendances.push({
              id: id('ATT', `${monthIndex}-${employeeIndex}-${day}`),
              employeeId: employee.id,
              date: checkIn,
              checkIn,
              checkOut: new Date(checkIn.getTime() + 28800000),
              hours: decimal(8),
              cycleId,
              clientId: id('ATT-CLIENT', `${monthIndex}-${employeeIndex}-${day}`),
            });
          }
          const amount = employee.baseRate.times(days);
          payrolls.push({
            id: id('PAYROLL', `${monthIndex}-${employeeIndex}`),
            employeeId: employee.id,
            periodStart: start,
            periodEnd: end,
            amount,
            details: { demo: true, days },
            status: PayrollStatus.PAID,
            approvedById: admin.id,
            approvedAt: end,
            paidAt: end,
          });
          payrollExpenses.push({
            id: id('TX-PAYROLL', `${monthIndex}-${employeeIndex}`),
            code: `${DEMO12}PAYROLL-${monthKey(month)}-${employeeIndex + 1}`,
            type: TransactionType.EXPENSE,
            categoryId: expenseCategory.id,
            amount,
            date: end,
            cycleId,
            refType: 'Payroll',
            refId: id('PAYROLL', `${monthIndex}-${employeeIndex}`),
            method: PaymentMethod.BANK_TRANSFER,
            notes: 'Chi lương demo',
            createdById: admin.id,
          });
        }
        payrollExpenses.push({
          id: id('TX-UTILITY', String(monthIndex)),
          code: `${DEMO12}UTILITY-${monthKey(month)}`,
          type: TransactionType.EXPENSE,
          categoryId: expenseCategory.id,
          amount: decimal(2500000 + (monthIndex % 5) * 370000),
          date: dateAt(month, 20),
          cycleId: cycleRefs[monthIndex * 6].cycleId,
          refType: 'DEMO12',
          refId: `${DEMO12}UTILITY-${monthKey(month)}`,
          method: PaymentMethod.BANK_TRANSFER,
          notes: 'Điện nước, thức ăn và phân bón demo',
          createdById: admin.id,
        });
      }
      await chunked(attendances, (rows) => tx.attendance.createMany({ data: rows }));
      await tx.payroll.createMany({ data: payrolls });
      await tx.transaction.createMany({ data: payrollExpenses });

      // 9. Tour, TourSlots, Bookings
      const tour = await tx.tour.upsert({
        where: { slug: `${DEMO12_SLUG}tour-12m` },
        update: {},
        create: {
          id: id('TOUR', '12M'),
          slug: `${DEMO12_SLUG}tour-12m`,
          name: 'Tham quan nông trại demo 12M',
          description: 'Tour mẫu phục vụ dashboard 12 tháng',
          durationMinutes: 120,
          priceAdult: decimal(180000),
          priceChild: decimal(90000),
          capacity: 30,
          isPublished: true,
          createdById: admin.id,
        },
      });
      const slots: Prisma.TourSlotCreateManyInput[] = [];
      const bookings: Prisma.BookingCreateManyInput[] = [];
      const bookingPayments: Prisma.PaymentCreateManyInput[] = [];
      const bookingIncome: Prisma.TransactionCreateManyInput[] = [];
      let bookingIndex = 0;
      for (let monthIndex = 0; monthIndex < months.length; monthIndex += 1)
        for (let slotIndex = 0; slotIndex < 5; slotIndex += 1) {
          const slotId = id('SLOT', `${monthIndex}-${slotIndex}`);
          const startAt = dateAt(months[monthIndex], 3 + slotIndex * 6, 8);
          const perSlot = 6 + (slotIndex % 3);
          slots.push({ id: slotId, tourId: tour.id, startAt, capacity: 30, bookedCount: perSlot });
          for (let bookingInSlot = 0; bookingInSlot < perSlot; bookingInSlot += 1) {
            const bookingId = id('BOOKING', String(bookingIndex).padStart(4, '0'));
            const total = decimal(450000 + (bookingInSlot % 2) * 180000);
            const paymentId = id('BOOKING-PAY', String(bookingIndex).padStart(4, '0'));
            const txId = id('TX-TOUR', String(bookingIndex).padStart(4, '0'));
            bookings.push({
              id: bookingId,
              code: `${DEMO12}BK-${String(bookingIndex).padStart(4, '0')}`,
              slotId,
              customerName: `Khách tour demo ${bookingIndex + 1}`,
              phone: `0977${String(bookingIndex).padStart(7, '0')}`,
              adults: 2 + (bookingInSlot % 2),
              children: 1,
              total,
              status: BookingStatus.CONFIRMED,
              paymentStatus: PaymentStatus.PAID,
              paymentMethod: PaymentMethod.BANK_TRANSFER,
              confirmedAt: startAt,
              createdById: admin.id,
            });
            bookingPayments.push({
              id: paymentId,
              code: `${DEMO12}BPM-${String(bookingIndex).padStart(4, '0')}`,
              bookingId,
              amount: total,
              method: PaymentMethod.BANK_TRANSFER,
              paidAt: startAt,
              transactionId: txId,
              createdById: admin.id,
            });
            bookingIncome.push({
              id: txId,
              code: `${DEMO12}TOUR-${String(bookingIndex).padStart(4, '0')}`,
              type: TransactionType.INCOME,
              categoryId: salesCategory.id,
              amount: total,
              date: startAt,
              refType: 'Booking',
              refId: bookingId,
              method: PaymentMethod.BANK_TRANSFER,
              notes: `Thu tour ${bookingId}`,
              createdById: admin.id,
            });
            bookingIndex += 1;
          }
        }
      await tx.tourSlot.createMany({ data: slots });
      await chunked(bookings, (rows) => tx.booking.createMany({ data: rows }));
      await chunked(bookingPayments, (rows) => tx.payment.createMany({ data: rows }));
      await chunked(bookingIncome, (rows) => tx.transaction.createMany({ data: rows }));

      // 10. Sensor readings
      const readings: Prisma.SensorReadingCreateManyInput[] = [];
      for (let sensorIndex = 0; sensorIndex < 12; sensorIndex += 1) {
        const sensorId = sensorList[sensorIndex].id;
        for (let slot = 0; slot < 30 * 96; slot += 1)
          readings.push({
            sensorId,
            value: decimal(20 + ((slot + sensorIndex * 7) % 100) / 10),
            recordedAt: new Date(AS_OF.getTime() - (30 * 24 * 60 - slot * 15) * 60000),
          });
        for (let slot = 0; slot < 11 * 30 * 12; slot += 1)
          readings.push({
            sensorId,
            value: decimal(20 + ((slot + sensorIndex * 11) % 100) / 10),
            recordedAt: new Date(
              AS_OF.getTime() - (30 * 24 * 60 + (11 * 30 * 24 * 60 - slot * 120)) * 60000,
            ),
          });
      }
      await chunked(readings, (rows) => tx.sensorReading.createMany({ data: rows }));

      return {
        cycles: cycleRows.length,
        activities: activities.length,
        salesOrders: orders.length,
        salesOrderLines: lines.length,
        bookings: bookings.length,
        employees: employeeList.length,
        attendances: attendances.length,
        payrolls: payrolls.length,
        sensorReadings: readings.length,
      };
    },
    { timeout: 240000 },
  );

  console.log(`Seeded demo 12 months: ${JSON.stringify(result)}`);
  return result;
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('seed-demo.ts') ||
    process.argv[1].endsWith('seed-demo.js') ||
    process.argv[1].includes('seed-demo'));

if (isDirectRun) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
