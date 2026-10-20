import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { CyclesService } from '../cycles/cycles.service';

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function money(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2).toFixed(2);
}

function quantity(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toDecimalPlaces(2).toFixed(2);
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

type CycleSummary = {
  materialCost: Prisma.Decimal;
  expenseCost: Prisma.Decimal;
  laborCost: Prisma.Decimal;
  revenue: Prisma.Decimal;
  output: Prisma.Decimal;
};

function decimal(value: Prisma.Decimal | number | string | null | undefined) {
  return new Prisma.Decimal(value ?? 0);
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
    const statusFilter = status ? Prisma.sql`WHERE c."status" = ${status}` : Prisma.empty;
    const cycles = await prisma.$queryRaw<
      Array<{
        id: string;
        code: string;
        name: string;
        status: string;
        areaId: string;
        areaCode: string;
        areaName: string;
        production: Array<{
          harvestLotId: string;
          code: string;
          itemId: string;
          itemName: string;
          quantity: Prisma.Decimal | number | string;
          unit: string;
          harvestedAt: Date;
        }>;
      }>
    >`
      SELECT c.id, c.code, c.name, c.status::text, a.id AS "areaId", a.code AS "areaCode",
        a.name AS "areaName",
        COALESCE(json_agg(json_build_object(
          'harvestLotId', h.id, 'code', h.code, 'itemId', h."itemId",
          'itemName', i.name, 'quantity', h.quantity, 'unit', h.unit,
          'harvestedAt', h."harvestedAt"
        ) ORDER BY h."harvestedAt" ASC, h.id ASC) FILTER (WHERE h.id IS NOT NULL), '[]') AS production
      FROM cycles c
      JOIN areas a ON a.id = c."areaId"
      LEFT JOIN harvest_lots h ON h."cycleId" = c.id
      LEFT JOIN items i ON i.id = h."itemId"
      ${statusFilter}
      GROUP BY c.id, c.code, c.name, c.status, a.id, a.code, a.name
      ORDER BY c."startDate" DESC, c.id DESC
    `;
    const summaries = await this.getCycleSummaries(cycles.map((cycle) => cycle.id));
    const data = cycles.map((cycle) => {
      const summary = summaries.get(cycle.id)!;
      summary.output = cycle.production.reduce(
        (sum, lot) => sum.plus(new Prisma.Decimal(lot.quantity)),
        new Prisma.Decimal(0),
      );
      return this.presentCycleSummary(
        {
          id: cycle.id,
          code: cycle.code,
          name: cycle.name,
          status: cycle.status,
          area: { id: cycle.areaId, code: cycle.areaCode, name: cycle.areaName },
          harvestLots: cycle.production.map((lot) => ({
            id: lot.harvestLotId,
            code: lot.code,
            itemId: lot.itemId,
            quantity: new Prisma.Decimal(lot.quantity),
            unit: lot.unit,
            harvestedAt: new Date(lot.harvestedAt),
            item: { id: lot.itemId, name: lot.itemName, unit: lot.unit },
          })),
        },
        summary,
      );
    });
    return { data, total: data.length };
  }

  private async getCycleSummaries(ids: string[]) {
    const summaries = new Map<string, CycleSummary>();
    for (const id of ids) {
      summaries.set(id, {
        materialCost: new Prisma.Decimal(0),
        expenseCost: new Prisma.Decimal(0),
        laborCost: new Prisma.Decimal(0),
        revenue: new Prisma.Decimal(0),
        output: new Prisma.Decimal(0),
      });
    }
    if (ids.length === 0) return summaries;

    const idList = Prisma.join(ids);
    const [materials, expenses, labor, revenue] = await Promise.all([
      prisma.$queryRaw<Array<{ cycleId: string; total: Prisma.Decimal }>>`
        SELECT a."cycleId", COALESCE(SUM(am."quantity" * am."unitCost"), 0) AS total
        FROM "activity_materials" am
        JOIN "activities" a ON a.id = am."activityId"
        WHERE a."cycleId" IN (${idList})
        GROUP BY a."cycleId"
      `,
      prisma.$queryRaw<Array<{ cycleId: string; total: Prisma.Decimal }>>`
        SELECT "cycleId", COALESCE(SUM(amount), 0) AS total
        FROM "transactions"
        WHERE type = 'EXPENSE' AND "cycleId" IN (${idList})
        GROUP BY "cycleId"
      `,
      prisma.$queryRaw<Array<{ cycleId: string; total: Prisma.Decimal }>>`
        WITH day_hours AS (
          SELECT "employeeId", date, SUM(hours) AS total_hours
          FROM "attendances"
          GROUP BY "employeeId", date
        ), line_costs AS (
          SELECT a."cycleId",
            CASE e."payType"
              WHEN 'PIECE' THEN COALESCE(a."pieceQty", 0) * e."baseRate"
              WHEN 'DAILY' THEN
                CASE WHEN dh.total_hours > 0 THEN
                  (CASE WHEN dh.total_hours >= 4 THEN e."baseRate" ELSE e."baseRate" / 2 END)
                  * a.hours / dh.total_hours
                ELSE 0 END
              WHEN 'MONTHLY' THEN
                CASE WHEN dh.total_hours > 0 THEN
                  (CASE WHEN dh.total_hours >= 4 THEN e."baseRate" / 26 ELSE e."baseRate" / 52 END)
                  * a.hours / dh.total_hours
                ELSE 0 END
              ELSE 0
            END AS line_cost
          FROM "attendances" a
          JOIN "employees" e ON e.id = a."employeeId"
          JOIN day_hours dh ON dh."employeeId" = a."employeeId" AND dh.date = a.date
          WHERE a."cycleId" IN (${idList})
        )
        SELECT "cycleId", COALESCE(SUM(ROUND(line_cost)), 0) AS total
        FROM line_costs
        GROUP BY "cycleId"
      `,
      prisma.$queryRaw<Array<{ cycleId: string; total: Prisma.Decimal }>>`
        SELECT hl."cycleId", COALESCE(SUM(sm.quantity * sol."unitPrice"), 0) AS total
        FROM "stock_moves" sm
        JOIN "stock_lots" sl ON sl.id = sm."stockLotId"
        JOIN "harvest_lots" hl ON hl.id = sl."harvestLotId"
        JOIN "sales_order_lines" sol ON sol.id = sm."refId"
        JOIN "sales_orders" so ON so.id = sol."orderId"
        WHERE sm.type = 'OUT' AND sm."refType" = 'SalesOrderLine'
          AND so.status <> 'CANCELLED' AND hl."cycleId" IN (${idList})
        GROUP BY hl."cycleId"
      `,
    ]);
    for (const row of materials) summaries.get(row.cycleId)!.materialCost = decimal(row.total);
    for (const row of expenses) summaries.get(row.cycleId)!.expenseCost = decimal(row.total);
    for (const row of labor) summaries.get(row.cycleId)!.laborCost = decimal(row.total);
    for (const row of revenue) summaries.get(row.cycleId)!.revenue = decimal(row.total);
    return summaries;
  }

  private presentCycleSummary(
    cycle: {
      id: string;
      code: string;
      name: string;
      status: string;
      area: { id: string; code: string; name: string };
      harvestLots: Array<{
        id: string;
        code: string;
        itemId: string;
        quantity: Prisma.Decimal;
        unit: string;
        harvestedAt: Date;
        item: { id: string; name: string; unit: string };
      }>;
    },
    summary: CycleSummary,
  ) {
    const totalCost = summary.materialCost.plus(summary.expenseCost).plus(summary.laborCost);
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
      outputQuantity: quantity(summary.output),
      materialCost: money(summary.materialCost),
      expenseCost: money(summary.expenseCost),
      laborCost: money(summary.laborCost),
      totalCost: money(totalCost),
      revenue: money(summary.revenue),
      profit: money(summary.revenue.minus(totalCost)),
      costPerUnit: summary.output.isZero() ? '0.00' : money(totalCost.div(summary.output)),
      costDetails: [],
      revenueDetails: [],
    };
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

    const summary = (await this.getCycleSummaries([id])).get(id)!;

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
    const materialCost = summary.materialCost;
    const expenseCost = summary.expenseCost;
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
