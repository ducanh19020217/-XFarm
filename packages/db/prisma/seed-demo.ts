import {
  ActivityType,
  BookingStatus,
  CycleKind,
  CycleStatus,
  CustomerType,
  ItemCategory,
  PaymentMethod,
  PaymentStatus,
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
const DEMO = 'DEMO-';
const AS_OF = new Date('2026-10-20T12:00:00.000Z');
const months = Array.from({ length: 12 }, (_, index) => {
  const date = new Date(Date.UTC(AS_OF.getUTCFullYear(), AS_OF.getUTCMonth() - 11 + index, 1));
  return date;
});

const decimal = (value: number | string) => new Prisma.Decimal(value);
const dateAt = (month: Date, day: number, hour = 8) =>
  new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day, hour));
const monthKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

async function resetDemo() {
  await prisma.$transaction(async (tx) => {
    const cycles = await tx.cycle.findMany({
      where: { code: { startsWith: DEMO } },
      select: { id: true },
    });
    const employees = await tx.employee.findMany({
      where: { code: { startsWith: DEMO } },
      select: { id: true },
    });
    const sensors = await tx.sensor.findMany({
      where: { code: { startsWith: DEMO } },
      select: { id: true },
    });
    const tours = await tx.tour.findMany({
      where: { slug: { startsWith: DEMO.toLowerCase() } },
      select: { id: true },
    });
    const bookings = await tx.booking.findMany({
      where: { code: { startsWith: DEMO } },
      select: { id: true },
    });
    const orders = await tx.salesOrder.findMany({
      where: { code: { startsWith: DEMO } },
      select: { id: true },
    });
    const demoHarvests = await tx.harvestLot.findMany({
      where: { code: { startsWith: DEMO } },
      select: { id: true },
    });
    const demoItems = await tx.item.findMany({
      where: { sku: { startsWith: DEMO } },
      select: { id: true },
    });

    await tx.sensorReading.deleteMany({ where: { sensorId: { in: sensors.map((s) => s.id) } } });
    await tx.alertRule.deleteMany({ where: { sensorId: { in: sensors.map((s) => s.id) } } });
    await tx.alert.deleteMany({ where: { rule: { sensorId: { in: sensors.map((s) => s.id) } } } });
    await tx.sensor.deleteMany({ where: { id: { in: sensors.map((s) => s.id) } } });

    await tx.payment.deleteMany({
      where: {
        OR: [
          { orderId: { in: orders.map((o) => o.id) } },
          { bookingId: { in: bookings.map((b) => b.id) } },
        ],
      },
    });
    await tx.transaction.deleteMany({ where: { code: { startsWith: DEMO } } });
    await tx.salesOrderLine.deleteMany({ where: { orderId: { in: orders.map((o) => o.id) } } });
    await tx.salesOrder.deleteMany({ where: { id: { in: orders.map((o) => o.id) } } });
    await tx.booking.deleteMany({ where: { id: { in: bookings.map((b) => b.id) } } });
    await tx.tourSlot.deleteMany({ where: { tourId: { in: tours.map((t) => t.id) } } });
    await tx.tour.deleteMany({ where: { id: { in: tours.map((t) => t.id) } } });

    await tx.payroll.deleteMany({ where: { employeeId: { in: employees.map((e) => e.id) } } });
    await tx.attendance.deleteMany({ where: { employeeId: { in: employees.map((e) => e.id) } } });
    await tx.task.deleteMany({ where: { title: { startsWith: DEMO } } });
    await tx.employee.deleteMany({ where: { id: { in: employees.map((e) => e.id) } } });

    await tx.activityMaterial.deleteMany({
      where: { activity: { cycleId: { in: cycles.map((c) => c.id) } } },
    });
    await tx.stockMove.deleteMany({
      where: {
        OR: [
          { refType: DEMO },
          { refId: { startsWith: DEMO } },
          { itemId: { in: demoItems.map((item) => item.id) } },
          { stockLot: { harvestLotId: { in: demoHarvests.map((h) => h.id) } } },
        ],
      },
    });
    await tx.stockLot.deleteMany({
      where: {
        OR: [
          { lotCode: { startsWith: DEMO } },
          { harvestLotId: { in: demoHarvests.map((h) => h.id) } },
        ],
      },
    });
    await tx.harvestLot.deleteMany({ where: { id: { in: demoHarvests.map((h) => h.id) } } });
    await tx.activity.deleteMany({ where: { cycleId: { in: cycles.map((c) => c.id) } } });
    await tx.animalGroup.deleteMany({ where: { code: { startsWith: DEMO } } });
    await tx.cycle.deleteMany({ where: { id: { in: cycles.map((c) => c.id) } } });
    await tx.customer.deleteMany({ where: { code: { startsWith: DEMO } } });
    await tx.item.deleteMany({ where: { id: { in: demoItems.map((item) => item.id) } } });
  });
}

async function main() {
  // Luôn dọn tập demo trước khi tạo lại để chạy lặp lại không nhân đôi.
  // --reset-demo được giữ như một cờ tường minh cho người vận hành.
  await resetDemo();

  const [admin, worker, materialWarehouse, finishedWarehouse, salesCategory, expenseCategory] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { email: 'admin@xfarm.local' } }),
      prisma.user.findUniqueOrThrow({ where: { email: 'worker@xfarm.local' } }),
      prisma.warehouse.findUniqueOrThrow({ where: { code: 'WH-MATERIAL' } }),
      prisma.warehouse.findUniqueOrThrow({ where: { code: 'WH-FINISHED' } }),
      prisma.financeCategory.findUniqueOrThrow({ where: { systemKey: 'SALES' } }),
      prisma.financeCategory.findUniqueOrThrow({ where: { systemKey: 'PAYROLL' } }),
    ]);

  const result = await prisma.$transaction(async (tx) => {
    const material = await tx.item.create({
      data: {
        sku: `${DEMO}FERTILIZER`,
        name: 'Phân hữu cơ demo',
        category: ItemCategory.FERTILIZER,
        unit: 'kg',
        isSellable: false,
        isActive: true,
      },
    });
    const produce = await tx.item.create({
      data: {
        sku: `${DEMO}PRODUCE`,
        name: 'Rau xanh demo',
        category: ItemCategory.PRODUCE,
        unit: 'kg',
        isSellable: true,
        isActive: true,
      },
    });
    const customer = await tx.customer.create({
      data: {
        code: `${DEMO}CUSTOMER`,
        name: 'Khách hàng demo 12 tháng',
        phone: '0990000012',
        type: CustomerType.WHOLESALE,
        createdById: admin.id,
      },
    });
    const area = await tx.area.findUniqueOrThrow({ where: { code: 'AR-0002' } });
    const cycles: Array<{
      id: string;
      month: Date;
      harvestLotId: string;
      stockLotId: string;
      quantity: Prisma.Decimal;
    }> = [];

    for (let monthIndex = 0; monthIndex < months.length; monthIndex += 1) {
      const month = months[monthIndex];
      for (let cycleIndex = 0; cycleIndex < 3; cycleIndex += 1) {
        const key = `${monthKey(month)}-${cycleIndex + 1}`;
        const startDate = dateAt(month, 2 + cycleIndex, 7);
        const harvestDate = dateAt(month, 22 + cycleIndex, 9);
        const cycle = await tx.cycle.create({
          data: {
            code: `${DEMO}CY-${key}`,
            name: `Vụ rau demo ${key}`,
            kind: CycleKind.CROP,
            areaId: area.id,
            species: 'Rau xanh',
            variety: 'Cải xanh demo',
            startDate,
            expectedEndDate: harvestDate,
            endDate: harvestDate,
            status: CycleStatus.CLOSED,
            expectedYield: decimal(70),
            yieldUnit: 'kg',
            notes: 'Dữ liệu demo 12 tháng',
            createdById: admin.id,
          },
        });
        const receivedQty = decimal(12);
        const materialLot = await tx.stockLot.create({
          data: {
            itemId: material.id,
            warehouseId: materialWarehouse.id,
            lotCode: `${DEMO}MAT-${key}`,
            unitCost: decimal(18000),
          },
        });
        await tx.stockMove.create({
          data: {
            type: StockMoveType.IN,
            itemId: material.id,
            stockLotId: materialLot.id,
            toWarehouseId: materialWarehouse.id,
            quantity: receivedQty,
            unitCost: decimal(18000),
            refType: DEMO,
            refId: `${DEMO}RECEIVE-${key}`,
            movedAt: startDate,
          },
        });
        const activity = await tx.activity.create({
          data: {
            cycleId: cycle.id,
            areaId: area.id,
            type: ActivityType.FERTILIZING,
            performedAt: dateAt(month, 8 + cycleIndex, 8),
            performedById: worker.id,
            createdById: admin.id,
            quantity: decimal(3),
            unit: 'kg',
            data: { demo: true, month: key },
            notes: 'Bón phân định kỳ cho dữ liệu demo',
          },
        });
        await tx.activityMaterial.create({
          data: {
            activityId: activity.id,
            itemId: material.id,
            stockLotId: materialLot.id,
            quantity: decimal(3),
            unitCost: decimal(18000),
            createdById: admin.id,
          },
        });
        await tx.stockMove.create({
          data: {
            type: StockMoveType.OUT,
            itemId: material.id,
            stockLotId: materialLot.id,
            fromWarehouseId: materialWarehouse.id,
            quantity: decimal(3),
            unitCost: decimal(18000),
            refType: 'Activity',
            refId: activity.id,
            movedAt: activity.performedAt,
          },
        });
        const harvestActivity = await tx.activity.create({
          data: {
            cycleId: cycle.id,
            areaId: area.id,
            type: ActivityType.HARVEST,
            performedAt: harvestDate,
            performedById: worker.id,
            createdById: admin.id,
            quantity: decimal(70),
            unit: 'kg',
            data: { demo: true, qualityGrade: 'A' },
            notes: 'Thu hoạch demo',
          },
        });
        const harvest = await tx.harvestLot.create({
          data: {
            code: `${DEMO}HL-${key}`,
            traceCode: `D${String(monthIndex * 3 + cycleIndex + 1).padStart(9, '0')}`,
            cycleId: cycle.id,
            activityId: harvestActivity.id,
            itemId: produce.id,
            quantity: decimal(70),
            unit: 'kg',
            harvestedAt: harvestDate,
            warehouseId: finishedWarehouse.id,
            qualityGrade: 'A',
            isPublic: true,
            createdById: admin.id,
          },
        });
        const produceLot = await tx.stockLot.create({
          data: {
            itemId: produce.id,
            harvestLotId: harvest.id,
            warehouseId: finishedWarehouse.id,
            lotCode: `${DEMO}PROD-${key}`,
            unitCost: decimal(26000),
          },
        });
        await tx.stockMove.create({
          data: {
            type: StockMoveType.IN,
            itemId: produce.id,
            stockLotId: produceLot.id,
            toWarehouseId: finishedWarehouse.id,
            quantity: decimal(70),
            unitCost: decimal(26000),
            refType: 'HarvestLot',
            refId: harvest.id,
            movedAt: harvestDate,
          },
        });
        const expense = decimal(120000 + cycleIndex * 15000);
        await tx.transaction.create({
          data: {
            code: `${DEMO}EXP-${key}`,
            type: TransactionType.EXPENSE,
            categoryId: expenseCategory.id,
            amount: expense,
            date: harvestDate,
            cycleId: cycle.id,
            refType: DEMO,
            refId: cycle.id,
            method: PaymentMethod.BANK_TRANSFER,
            notes: 'Chi phí chăm sóc mùa vụ demo',
            createdById: admin.id,
          },
        });
        cycles.push({
          id: cycle.id,
          month,
          harvestLotId: harvest.id,
          stockLotId: produceLot.id,
          quantity: decimal(70),
        });
      }
    }

    for (let index = 0; index < cycles.length; index += 1) {
      const cycle = cycles[index];
      const key = `${monthKey(cycle.month)}-${(index % 3) + 1}`;
      const orderDate = dateAt(cycle.month, 25, 10);
      const quantity = decimal(10);
      const unitPrice = decimal(42000);
      const total = quantity.times(unitPrice);
      const order = await tx.salesOrder.create({
        data: {
          code: `${DEMO}SO-${key}`,
          customerId: customer.id,
          channel: index % 2 === 0 ? SalesChannel.ADMIN : SalesChannel.WEBSHOP,
          status: SalesOrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          shippingAddress: 'Địa chỉ demo',
          subtotal: total,
          discount: decimal(0),
          shippingFee: decimal(0),
          total,
          confirmedAt: orderDate,
          warehouseId: finishedWarehouse.id,
          createdById: admin.id,
          createdAt: orderDate,
          lines: {
            create: { itemId: produce.id, stockLotId: cycle.stockLotId, quantity, unitPrice },
          },
        },
      });
      await tx.stockMove.create({
        data: {
          type: StockMoveType.OUT,
          itemId: produce.id,
          stockLotId: cycle.stockLotId,
          fromWarehouseId: finishedWarehouse.id,
          quantity,
          unitCost: decimal(26000),
          refType: 'SalesOrder',
          refId: order.id,
          movedAt: orderDate,
        },
      });
      const payment = await tx.payment.create({
        data: {
          code: `${DEMO}PM-${key}`,
          orderId: order.id,
          amount: total,
          method: PaymentMethod.BANK_TRANSFER,
          paidAt: orderDate,
          createdById: admin.id,
        },
      });
      const income = await tx.transaction.create({
        data: {
          code: `${DEMO}INC-${key}`,
          type: TransactionType.INCOME,
          categoryId: salesCategory.id,
          amount: total,
          date: orderDate,
          refType: 'Payment',
          refId: payment.id,
          method: PaymentMethod.BANK_TRANSFER,
          notes: `Thu tiền ${order.code}`,
          createdById: admin.id,
        },
      });
      await tx.payment.update({ where: { id: payment.id }, data: { transactionId: income.id } });
    }

    const employees = await Promise.all(
      ['Nguyễn Demo', 'Trần Demo', 'Lê Demo'].map((fullName, index) =>
        tx.employee.create({
          data: {
            code: `${DEMO}EMP-${index + 1}`,
            fullName,
            phone: `09880000${index + 1}1`,
            position: 'Nhân viên nông trại',
            payType: 'DAILY',
            baseRate: decimal(350000 + index * 25000),
          },
        }),
      ),
    );
    for (let monthIndex = 0; monthIndex < months.length; monthIndex += 1) {
      const month = months[monthIndex];
      for (const [employeeIndex, employee] of employees.entries()) {
        const cycle = cycles[monthIndex * 3 + (employeeIndex % 3)];
        const periodStart = dateAt(month, 1);
        const periodEnd = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0));
        const days = 3 + employeeIndex;
        for (let day = 0; day < days; day += 1) {
          const date = dateAt(month, 3 + day, 7);
          await tx.attendance.create({
            data: {
              employeeId: employee.id,
              date,
              checkIn: date,
              checkOut: new Date(date.getTime() + 8 * 60 * 60 * 1000),
              hours: decimal(8),
              cycleId: cycle.id,
              clientId: `${DEMO}ATT-${monthIndex}-${employeeIndex}-${day}`,
            },
          });
        }
        await tx.payroll.create({
          data: {
            employeeId: employee.id,
            periodStart,
            periodEnd,
            amount: employee.baseRate.times(days),
            details: { demo: true, days, dailyRate: employee.baseRate.toString() },
            status: PayrollStatus.PAID,
            approvedById: admin.id,
            approvedAt: periodEnd,
            paidAt: periodEnd,
          },
        });
        await tx.transaction.create({
          data: {
            code: `${DEMO}PAYROLL-${monthKey(month)}-${employeeIndex + 1}`,
            type: TransactionType.EXPENSE,
            categoryId: expenseCategory.id,
            amount: employee.baseRate.times(days),
            date: periodEnd,
            cycleId: cycle.id,
            refType: 'Payroll',
            refId: `${DEMO}EMP-${employeeIndex + 1}`,
            method: PaymentMethod.BANK_TRANSFER,
            notes: 'Chi lương demo',
            createdById: admin.id,
          },
        });
      }
    }

    const tour = await tx.tour.create({
      data: {
        slug: 'demo-tour-12m',
        name: 'Tham quan nông trại demo',
        description: 'Tour mẫu phục vụ dashboard 12 tháng',
        durationMinutes: 120,
        priceAdult: decimal(180000),
        priceChild: decimal(90000),
        capacity: 30,
        isPublished: true,
        createdById: admin.id,
      },
    });
    for (let monthIndex = 0; monthIndex < months.length; monthIndex += 1) {
      const month = months[monthIndex];
      const startAt = dateAt(month, 15, 8);
      const slot = await tx.tourSlot.create({
        data: { tourId: tour.id, startAt, capacity: 30, bookedCount: 3, createdById: admin.id },
      });
      const total = decimal(450000);
      const booking = await tx.booking.create({
        data: {
          code: `${DEMO}BK-${monthKey(month)}`,
          slotId: slot.id,
          customerName: `Khách tour demo ${monthKey(month)}`,
          phone: `097700${String(monthIndex).padStart(2, '0')}12`,
          adults: 2,
          children: 1,
          total,
          status: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          confirmedAt: startAt,
          createdById: admin.id,
        },
      });
      const payment = await tx.payment.create({
        data: {
          code: `${DEMO}BPM-${monthKey(month)}`,
          bookingId: booking.id,
          amount: total,
          method: PaymentMethod.BANK_TRANSFER,
          paidAt: startAt,
          createdById: admin.id,
        },
      });
      const income = await tx.transaction.create({
        data: {
          code: `${DEMO}TOUR-${monthKey(month)}`,
          type: TransactionType.INCOME,
          categoryId: salesCategory.id,
          amount: total,
          date: startAt,
          refType: 'Booking',
          refId: booking.id,
          method: PaymentMethod.BANK_TRANSFER,
          notes: `Thu tour ${booking.code}`,
          createdById: admin.id,
        },
      });
      await tx.payment.update({ where: { id: payment.id }, data: { transactionId: income.id } });
    }

    for (let sensorIndex = 0; sensorIndex < 2; sensorIndex += 1) {
      const sensor = await tx.sensor.create({
        data: {
          code: `${DEMO}SENSOR-${sensorIndex + 1}`,
          name: `Cảm biến demo ${sensorIndex + 1}`,
          type: sensorIndex === 0 ? SensorType.TEMP : SensorType.HUMIDITY,
          unit: sensorIndex === 0 ? '°C' : '%',
          areaId: area.id,
          apiKeyHash: hash(`${DEMO}API-KEY-${sensorIndex + 1}`),
          apiKeyPrefix: `${DEMO}API`,
          createdById: admin.id,
          lastSeenAt: AS_OF,
        },
      });
      for (let offset = 0; offset < 30 * 12; offset += 1) {
        const recordedAt = new Date(AS_OF.getTime() - (30 * 24 * 60 - offset * 120) * 60 * 1000);
        const base = sensorIndex === 0 ? 27 : 68;
        await tx.sensorReading.create({
          data: {
            sensorId: sensor.id,
            value: decimal(base + ((offset * 17) % 10) / 10),
            recordedAt,
          },
        });
      }
    }

    return {
      cycles: cycles.length,
      activities: cycles.length * 2,
      salesOrders: cycles.length,
      bookings: months.length,
      attendances: months.length * (3 + 4 + 5),
      payrolls: months.length * 3,
      sensorReadings: 2 * 30 * 12,
    };
  });
  console.log(`Seeded demo 12 months: ${JSON.stringify(result)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
