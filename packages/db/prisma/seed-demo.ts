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
const DEMO = 'DEMO-';
const AS_OF = new Date('2026-10-20T12:00:00.000Z');
const months = Array.from(
  { length: 12 },
  (_, index) => new Date(Date.UTC(AS_OF.getUTCFullYear(), AS_OF.getUTCMonth() - 11 + index, 1)),
);
const decimal = (value: number | string) => new Prisma.Decimal(value);
const id = (kind: string, key: string) => `${DEMO}${kind}-${key}`;
const dateAt = (month: Date, day: number, hour = 8) =>
  new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day, hour));
const monthKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const chunked = async <T>(rows: T[], write: (chunk: T[]) => Promise<unknown>, size = 5000) => {
  for (let offset = 0; offset < rows.length; offset += size)
    await write(rows.slice(offset, offset + size));
};

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
    const harvests = await tx.harvestLot.findMany({
      where: { code: { startsWith: DEMO } },
      select: { id: true },
    });
    const items = await tx.item.findMany({
      where: { sku: { startsWith: DEMO } },
      select: { id: true },
    });
    const cycleIds = cycles.map((row) => row.id);
    const employeeIds = employees.map((row) => row.id);
    const sensorIds = sensors.map((row) => row.id);
    const tourIds = tours.map((row) => row.id);
    const bookingIds = bookings.map((row) => row.id);
    const orderIds = orders.map((row) => row.id);
    const harvestIds = harvests.map((row) => row.id);
    const itemIds = items.map((row) => row.id);
    await tx.sensorReading.deleteMany({ where: { sensorId: { in: sensorIds } } });
    await tx.alert.deleteMany({ where: { rule: { sensorId: { in: sensorIds } } } });
    await tx.alertRule.deleteMany({ where: { sensorId: { in: sensorIds } } });
    await tx.sensor.deleteMany({ where: { id: { in: sensorIds } } });
    await tx.payment.deleteMany({
      where: { OR: [{ orderId: { in: orderIds } }, { bookingId: { in: bookingIds } }] },
    });
    await tx.transaction.deleteMany({ where: { code: { startsWith: DEMO } } });
    await tx.salesOrderLine.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.salesOrder.deleteMany({ where: { id: { in: orderIds } } });
    await tx.booking.deleteMany({ where: { id: { in: bookingIds } } });
    await tx.tourSlot.deleteMany({ where: { tourId: { in: tourIds } } });
    await tx.tour.deleteMany({ where: { id: { in: tourIds } } });
    await tx.payroll.deleteMany({ where: { employeeId: { in: employeeIds } } });
    await tx.attendance.deleteMany({ where: { employeeId: { in: employeeIds } } });
    await tx.task.deleteMany({ where: { title: { startsWith: DEMO } } });
    await tx.employee.deleteMany({ where: { id: { in: employeeIds } } });
    await tx.activityMaterial.deleteMany({ where: { activity: { cycleId: { in: cycleIds } } } });
    await tx.stockMove.deleteMany({
      where: {
        OR: [
          { refType: DEMO },
          { refId: { startsWith: DEMO } },
          { itemId: { in: itemIds } },
          { stockLot: { harvestLotId: { in: harvestIds } } },
        ],
      },
    });
    await tx.stockLot.deleteMany({
      where: { OR: [{ lotCode: { startsWith: DEMO } }, { harvestLotId: { in: harvestIds } }] },
    });
    await tx.harvestLot.deleteMany({ where: { id: { in: harvestIds } } });
    await tx.activity.deleteMany({ where: { cycleId: { in: cycleIds } } });
    await tx.animalGroup.deleteMany({ where: { code: { startsWith: DEMO } } });
    await tx.cycle.deleteMany({ where: { id: { in: cycleIds } } });
    await tx.customer.deleteMany({ where: { code: { startsWith: DEMO } } });
    await tx.item.deleteMany({ where: { id: { in: itemIds } } });
  });
}

async function main() {
  // Xóa riêng tập DEMO trước mỗi lần chạy để idempotent; --reset-demo vẫn được chấp nhận như cờ tường minh.
  await resetDemo();
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
  const area =
    (await prisma.area.findFirst({ orderBy: { createdAt: 'asc' } })) ??
    (await prisma.area.create({
      data: { code: `${DEMO}AREA`, name: 'Khu demo', type: AreaType.FIELD, createdById: admin.id },
    }));

  const result = await prisma.$transaction(
    async (tx) => {
      const materialId = id('ITEM', 'MATERIAL');
      const produceId = id('ITEM', 'PRODUCE');
      await tx.item.createMany({
        data: [
          {
            id: materialId,
            sku: `${DEMO}FERTILIZER`,
            name: 'Phân hữu cơ demo',
            category: ItemCategory.FERTILIZER,
            unit: 'kg',
            isActive: true,
          },
          {
            id: produceId,
            sku: `${DEMO}PRODUCE`,
            name: 'Rau xanh demo',
            category: ItemCategory.PRODUCE,
            unit: 'kg',
            isSellable: true,
            isActive: true,
          },
        ],
      });
      const customerRows = Array.from({ length: 24 }, (_, index) => ({
        id: id('CUSTOMER', String(index + 1).padStart(3, '0')),
        code: `${DEMO}CUSTOMER-${index + 1}`,
        name: `Khách hàng demo ${index + 1}`,
        phone: `099${String(index + 1).padStart(7, '0')}`,
        type: index % 3 === 0 ? CustomerType.WHOLESALE : CustomerType.RETAIL,
        createdById: admin.id,
      }));
      await tx.customer.createMany({ data: customerRows });
      const customer = customerRows[0];

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
            code: `${DEMO}CY-${key}`,
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
            lotCode: `${DEMO}MAT-${key}`,
            unitCost: decimal(18000),
          });
          produceLots.push({
            id: produceLotId,
            itemId: produceId,
            harvestLotId: id('HARVEST', key),
            warehouseId: finishedWarehouse.id,
            lotCode: `${DEMO}PROD-${key}`,
            unitCost: decimal(26000),
          });
          initialMoves.push({
            type: StockMoveType.IN,
            itemId: materialId,
            stockLotId: materialLotId,
            toWarehouseId: materialWarehouse.id,
            quantity: decimal(30),
            unitCost: decimal(18000),
            refType: DEMO,
            refId: `${DEMO}RECEIVE-${key}`,
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
              unit: isHarvest ? 'kg' : 'kg',
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
            code: `${DEMO}HL-${key}`,
            traceCode: `D${String(cycleIndex + 1).padStart(9, '0')}`,
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
            code: `${DEMO}SO-${String(orderIndex).padStart(5, '0')}`,
            customerId: customer.id,
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
              code: `${DEMO}PM-${String(orderIndex).padStart(5, '0')}`,
              orderId,
              amount,
              method: PaymentMethod.BANK_TRANSFER,
              paidAt: orderDate,
              transactionId,
              createdById: admin.id,
            });
            incomes.push({
              id: transactionId,
              code: `${DEMO}INC-${String(orderIndex).padStart(5, '0')}`,
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

      const employees = Array.from({ length: 15 }, (_, index) => ({
        id: id('EMP', String(index + 1).padStart(2, '0')),
        code: `${DEMO}EMP-${index + 1}`,
        fullName: `Nhân viên demo ${index + 1}`,
        phone: `0988${String(index + 1).padStart(6, '0')}`,
        position: index < 3 ? 'Tổ trưởng nông trại' : 'Nhân viên nông trại',
        payType: PayType.DAILY,
        baseRate: decimal(320000 + (index % 5) * 25000),
      }));
      await tx.employee.createMany({ data: employees });
      const attendances: Prisma.AttendanceCreateManyInput[] = [];
      const payrolls: Prisma.PayrollCreateManyInput[] = [];
      const payrollExpenses: Prisma.TransactionCreateManyInput[] = [];
      for (let monthIndex = 0; monthIndex < months.length; monthIndex += 1) {
        const month = months[monthIndex];
        const start = dateAt(month, 1);
        const end = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0));
        for (const [employeeIndex, employee] of employees.entries()) {
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
            code: `${DEMO}PAYROLL-${monthKey(month)}-${employeeIndex + 1}`,
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
          code: `${DEMO}UTILITY-${monthKey(month)}`,
          type: TransactionType.EXPENSE,
          categoryId: expenseCategory.id,
          amount: decimal(2500000 + (monthIndex % 5) * 370000),
          date: dateAt(month, 20),
          cycleId: cycleRefs[monthIndex * 6].cycleId,
          refType: DEMO,
          refId: `${DEMO}UTILITY-${monthKey(month)}`,
          method: PaymentMethod.BANK_TRANSFER,
          notes: 'Điện nước, thức ăn và phân bón demo',
          createdById: admin.id,
        });
      }
      await chunked(attendances, (rows) => tx.attendance.createMany({ data: rows }));
      await tx.payroll.createMany({ data: payrolls });
      await tx.transaction.createMany({ data: payrollExpenses });

      const tour = await tx.tour.create({
        data: {
          id: id('TOUR', '12M'),
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
              code: `${DEMO}BK-${String(bookingIndex).padStart(4, '0')}`,
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
              code: `${DEMO}BPM-${String(bookingIndex).padStart(4, '0')}`,
              bookingId,
              amount: total,
              method: PaymentMethod.BANK_TRANSFER,
              paidAt: startAt,
              transactionId: txId,
              createdById: admin.id,
            });
            bookingIncome.push({
              id: txId,
              code: `${DEMO}TOUR-${String(bookingIndex).padStart(4, '0')}`,
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

      const sensors: Prisma.SensorCreateManyInput[] = [];
      const readings: Prisma.SensorReadingCreateManyInput[] = [];
      const sensorTypes = [
        SensorType.TEMP,
        SensorType.HUMIDITY,
        SensorType.SOIL_MOISTURE,
        SensorType.PH,
        SensorType.DO,
        SensorType.LIGHT,
      ];
      for (let sensorIndex = 0; sensorIndex < 12; sensorIndex += 1) {
        const sensorId = id('SENSOR', String(sensorIndex + 1).padStart(2, '0'));
        const type = sensorTypes[sensorIndex % sensorTypes.length];
        sensors.push({
          id: sensorId,
          code: `${DEMO}SENSOR-${sensorIndex + 1}`,
          name: `Cảm biến demo ${sensorIndex + 1}`,
          type,
          unit: type === SensorType.TEMP ? '°C' : type === SensorType.PH ? 'pH' : '%',
          areaId: area.id,
          apiKeyHash: hash(`${DEMO}API-KEY-${sensorIndex + 1}`),
          apiKeyPrefix: `${DEMO}API`,
          createdById: admin.id,
          lastSeenAt: AS_OF,
        });
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
      await tx.sensor.createMany({ data: sensors });
      await chunked(readings, (rows) => tx.sensorReading.createMany({ data: rows }));
      return {
        cycles: cycleRows.length,
        activities: activities.length,
        salesOrders: orders.length,
        salesOrderLines: lines.length,
        bookings: bookings.length,
        employees: employees.length,
        attendances: attendances.length,
        payrolls: payrolls.length,
        sensorReadings: readings.length,
      };
    },
    { timeout: 240000 },
  );
  console.log(`Seeded demo 12 months: ${JSON.stringify(result)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
