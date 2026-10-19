import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { CyclesService } from '../cycles/cycles.service';

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function money(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2).toFixed(2);
}

function quantity(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2).toFixed(2);
}

function vietnamMonth(date: Date) {
  return new Date(date.getTime() + VN_OFFSET_MS).getUTCMonth() + 1;
}

function vietnamYearStart(year: number) {
  return new Date(Date.UTC(year, 0, 1) - VN_OFFSET_MS);
}

function vietnamYearEnd(year: number) {
  return new Date(Date.UTC(year + 1, 0, 1) - VN_OFFSET_MS);
}

@Injectable()
export class ReportsService {
  constructor(private readonly cyclesService: CyclesService) {}

  async getCashflow(year: number) {
    const transactions = await prisma.transaction.findMany({
      where: { date: { gte: vietnamYearStart(year), lt: vietnamYearEnd(year) } },
      select: { type: true, amount: true, date: true },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    });
    const months = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      income: new Prisma.Decimal(0),
      expense: new Prisma.Decimal(0),
    }));
    for (const transaction of transactions) {
      const month = months[vietnamMonth(transaction.date) - 1];
      if (transaction.type === 'INCOME') month.income = month.income.plus(transaction.amount);
      else month.expense = month.expense.plus(transaction.amount);
    }
    const data = months.map((month) => ({
      month: month.month,
      income: money(month.income),
      expense: money(month.expense),
      net: money(month.income.minus(month.expense)),
    }));
    return { data, year };
  }

  async getCycles(status?: string) {
    const cycles = await prisma.cycle.findMany({
      where: status ? { status: status as never } : undefined,
      select: { id: true },
      orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
    });
    const data = await Promise.all(cycles.map((cycle) => this.getCycleCost(cycle.id)));
    return { data, total: data.length };
  }

  async getCycleCost(id: string) {
    const cycle = await prisma.cycle.findUnique({
      where: { id },
      include: {
        area: { select: { id: true, code: true, name: true } },
        activities: {
          include: {
            materials: { include: { item: { select: { id: true, name: true, unit: true } } } },
          },
          orderBy: [{ performedAt: 'asc' }, { id: 'asc' }],
        },
        transactions: {
          where: { type: 'EXPENSE' },
          include: { category: { select: { id: true, name: true } } },
          orderBy: [{ date: 'asc' }, { id: 'asc' }],
        },
        harvestLots: {
          include: { item: { select: { id: true, name: true, unit: true } }, stockLot: true },
          orderBy: [{ harvestedAt: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!cycle) throw new NotFoundException('Không tìm thấy mùa vụ');

    const materialDetails = cycle.activities.flatMap((activity) =>
      activity.materials.map((material) => ({
        type: 'MATERIAL' as const,
        activityId: activity.id,
        date: activity.performedAt,
        itemId: material.item.id,
        description: material.item.name,
        quantity: quantity(material.quantity),
        unit: material.item.unit,
        unitCost: money(material.unitCost),
        amount: money(material.quantity.times(material.unitCost)),
      })),
    );
    const transactionDetails = cycle.transactions.map((transaction) => ({
      type: 'TRANSACTION' as const,
      transactionId: transaction.id,
      date: transaction.date,
      description: transaction.category.name,
      amount: money(transaction.amount),
    }));
    const materialCost = materialDetails.reduce(
      (sum, detail) => sum.plus(new Prisma.Decimal(detail.amount)),
      new Prisma.Decimal(0),
    );
    const expenseCost = cycle.transactions.reduce(
      (sum, transaction) => sum.plus(transaction.amount),
      new Prisma.Decimal(0),
    );
    const labor = await this.cyclesService.getLaborCost(id);
    const laborCost = new Prisma.Decimal(labor.totalLaborCost);
    const laborDetails = labor.details.flatMap((employee) =>
      employee.details.map((detail) => ({
        type: 'LABOR' as const,
        date: new Date(detail.date),
        description: `${employee.employeeName} (${employee.employeeCode})`,
        quantity: detail.hours.toFixed(2),
        unit: 'giờ',
        amount: detail.amount.toFixed(2),
      })),
    );
    const output = cycle.harvestLots.reduce(
      (sum, lot) => sum.plus(lot.quantity),
      new Prisma.Decimal(0),
    );
    const harvestLotIds = cycle.harvestLots.map((lot) => lot.id);
    const moves = harvestLotIds.length
      ? await prisma.stockMove.findMany({
          where: {
            type: 'OUT',
            refType: 'SalesOrderLine',
            stockLot: { harvestLotId: { in: harvestLotIds } },
          },
          include: {
            stockLot: { include: { harvestLot: true } },
            item: { select: { id: true, name: true, unit: true } },
          },
          orderBy: [{ movedAt: 'asc' }, { id: 'asc' }],
        })
      : [];
    const lineIds = moves.map((move) => move.refId).filter((value): value is string => !!value);
    const lines = lineIds.length
      ? await prisma.salesOrderLine.findMany({
          where: { id: { in: lineIds }, order: { status: { not: 'CANCELLED' } } },
          include: { order: { select: { id: true, code: true } } },
        })
      : [];
    const lineMap = new Map(lines.map((line) => [line.id, line]));
    const revenueDetails = moves.flatMap((move) => {
      const line = move.refId ? lineMap.get(move.refId) : undefined;
      if (!line) return [];
      return [
        {
          type: 'SALE' as const,
          salesOrderId: line.order.id,
          salesOrderCode: line.order.code,
          stockLotId: move.stockLotId,
          harvestLotId: move.stockLot?.harvestLotId,
          quantity: quantity(move.quantity),
          unit: move.item.unit,
          unitPrice: money(line.unitPrice),
          amount: money(move.quantity.times(line.unitPrice)),
        },
      ];
    });
    const revenue = revenueDetails.reduce(
      (sum, detail) => sum.plus(new Prisma.Decimal(detail.amount)),
      new Prisma.Decimal(0),
    );
    const cost = materialCost.plus(expenseCost).plus(laborCost);
    return {
      id: cycle.id,
      code: cycle.code,
      name: cycle.name,
      status: cycle.status,
      area: cycle.area,
      production: cycle.harvestLots.map((lot) => ({
        harvestLotId: lot.id,
        code: lot.code,
        itemId: lot.itemId,
        itemName: lot.item.name,
        quantity: quantity(lot.quantity),
        unit: lot.unit,
        harvestedAt: lot.harvestedAt,
      })),
      outputQuantity: quantity(output),
      materialCost: money(materialCost),
      expenseCost: money(expenseCost),
      laborCost: money(laborCost),
      totalCost: money(cost),
      revenue: money(revenue),
      profit: money(revenue.minus(cost)),
      costPerUnit: output.isZero() ? '0.00' : money(cost.div(output)),
      costDetails: [...materialDetails, ...transactionDetails, ...laborDetails],
      revenueDetails,
    };
  }

  async getProducts(from?: Date, to?: Date) {
    const where: Prisma.SalesOrderWhereInput = {
      status: { not: 'CANCELLED' },
      ...(from || to
        ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    };
    const lines = await prisma.salesOrderLine.findMany({
      where: { order: where },
      include: {
        product: { select: { id: true, slug: true, name: true, unit: true } },
        item: { select: { id: true, name: true, unit: true } },
        order: { select: { status: true } },
      },
    });
    type ProductGroup = {
      product: (typeof lines)[number]['product'];
      item: (typeof lines)[number]['item'];
      quantity: Prisma.Decimal;
      revenue: Prisma.Decimal;
    };
    const grouped = new Map<string, ProductGroup>();
    for (const line of lines) {
      const key = line.product?.id ?? `item:${line.item.id}`;
      const existing = grouped.get(key) ?? {
        product: line.product,
        item: line.item,
        quantity: new Prisma.Decimal(0),
        revenue: new Prisma.Decimal(0),
      };
      existing.quantity = existing.quantity.plus(line.quantity);
      existing.revenue = existing.revenue.plus(line.quantity.times(line.unitPrice));
      grouped.set(key, existing);
    }
    const data = [...grouped.values()]
      .sort((a, b) => b.revenue.comparedTo(a.revenue))
      .slice(0, 10)
      .map((entry) => ({
        productId: entry.product?.id ?? null,
        productName: entry.product?.name ?? entry.item.name,
        slug: entry.product?.slug ?? null,
        itemId: entry.item.id,
        unit: entry.product?.unit ?? entry.item.unit,
        quantity: quantity(entry.quantity),
        revenue: money(entry.revenue),
      }));
    return { data, total: data.length, limit: 10 };
  }
}
