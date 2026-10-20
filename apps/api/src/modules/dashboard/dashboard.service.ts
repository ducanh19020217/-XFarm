import { Injectable } from '@nestjs/common';
import { Prisma, prisma } from '@xfarm/db';
import { Role } from '@xfarm/shared';
import Redis from 'ioredis';

const CACHE_SECONDS = 60;
const PRIVATE_ROLES = [Role.OWNER, Role.MANAGER, Role.ACCOUNTANT];

type RedisClient = Redis;

@Injectable()
export class DashboardService {
  private readonly redis: RedisClient | null;

  constructor() {
    try {
      this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6389', {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });
      this.redis.on('error', () => undefined);
    } catch {
      this.redis = null;
    }
  }

  private async cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    if (!this.redis) return load();
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      const value = await this.redis.get(key);
      if (value) return JSON.parse(value) as T;
    } catch {
      // Dashboard remains available when Redis is unavailable.
    }

    const result = await load();
    try {
      await this.redis.set(key, JSON.stringify(result), 'EX', CACHE_SECONDS);
    } catch {
      // Ignore cache write failures.
    }
    return result;
  }

  async summary(role: Role) {
    const key = `dashboard:summary:${role}`;
    return this.cached(key, async () => {
      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const salesOnly = role === Role.SALES;
      const canSeeOperations = PRIVATE_ROLES.includes(role);

      const row = (
        await prisma.$queryRaw<
          Array<{
            activeCycles: bigint;
            lowStockItems: bigint;
            expiringLots: bigint;
            revenue: Prisma.Decimal | null;
            upcomingBookings: bigint;
            overdueTasks: bigint;
            unreadAlerts: bigint;
          }>
        >(Prisma.sql`
          SELECT
            ${canSeeOperations ? Prisma.sql`(SELECT COUNT(*) FROM "cycles" WHERE "status" IN ('ACTIVE', 'HARVESTING'))` : Prisma.sql`0`} AS "activeCycles",
            ${canSeeOperations ? Prisma.sql`(SELECT COUNT(*) FROM (SELECT b."itemId" FROM "stock_balances" b JOIN "items" i ON i.id = b."itemId" WHERE i."isActive" = true AND i."minStock" IS NOT NULL GROUP BY b."itemId", i."minStock" HAVING COALESCE(SUM(b.quantity), 0) < i."minStock") low_stock)` : Prisma.sql`0`} AS "lowStockItems",
            ${canSeeOperations ? Prisma.sql`(SELECT COUNT(*) FROM (SELECT l.id FROM "stock_lots" l JOIN "stock_balances" b ON b."stockLotId" = l.id WHERE l."expiryDate" IS NOT NULL AND l."expiryDate" >= ${today} AND l."expiryDate" <= ${nextWeek} GROUP BY l.id HAVING COALESCE(SUM(b.quantity), 0) > 0) expiring_lots)` : Prisma.sql`0`} AS "expiringLots",
            (SELECT COALESCE(SUM(amount), 0) FROM "transactions" WHERE type = 'INCOME' AND date >= ${monthStart} AND date < ${nextMonthStart}${salesOnly ? Prisma.sql` AND "refType" IN ('Payment', 'SalesOrder')` : Prisma.empty}) AS revenue,
            (SELECT COUNT(*) FROM "bookings" b JOIN "tour_slots" s ON s.id = b."slotId" WHERE b.status <> 'CANCELLED' AND s."startAt" >= ${now} AND s."startAt" < ${nextWeek}) AS "upcomingBookings",
            ${canSeeOperations ? Prisma.sql`(SELECT COUNT(*) FROM "tasks" WHERE "dueDate" < ${now} AND status NOT IN ('DONE', 'CANCELLED'))` : Prisma.sql`0`} AS "overdueTasks",
            (SELECT COUNT(*) FROM "alerts" WHERE "readAt" IS NULL) AS "unreadAlerts"
        `)
      )[0];

      return {
        activeCycles: Number(row?.activeCycles ?? 0),
        lowStockItems: Number(row?.lowStockItems ?? 0),
        expiringLots: Number(row?.expiringLots ?? 0),
        revenueThisMonth: row?.revenue?.toString() ?? '0.00',
        upcomingBookings: Number(row?.upcomingBookings ?? 0),
        overdueTasks: Number(row?.overdueTasks ?? 0),
        unreadAlerts: Number(row?.unreadAlerts ?? 0),
      };
    });
  }

  async charts(monthsInput: string | undefined, role: Role) {
    const months = Math.min(24, Math.max(1, Number(monthsInput) || 12));
    const key = `dashboard:charts:${role}:${months}`;
    return this.cached(key, async () => {
      const end = new Date();
      const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - months + 1, 1));
      const canSeeOperations = PRIVATE_ROLES.includes(role);
      const [transactions, production] = await Promise.all([
        prisma.$queryRaw<Array<{ month: Date; type: string; amount: Prisma.Decimal }>>(Prisma.sql`
          SELECT date_trunc('month', date) AS month, type, SUM(amount) AS amount
          FROM "transactions"
          WHERE date >= ${start} AND date <= ${end}
            AND type IN ('INCOME', 'EXPENSE')
            ${role === Role.SALES ? Prisma.sql`AND ("refType" IN ('Payment', 'SalesOrder'))` : Prisma.empty}
          GROUP BY date_trunc('month', date), type
          ORDER BY month ASC`),
        canSeeOperations
          ? prisma.$queryRaw<
              Array<{
                cycleId: string;
                cycleCode: string;
                cycleName: string;
                quantity: Prisma.Decimal;
                unit: string;
              }>
            >(Prisma.sql`
              SELECT h."cycleId", c.code AS "cycleCode", c.name AS "cycleName",
                SUM(h.quantity) AS quantity, MIN(h.unit) AS unit
              FROM "harvest_lots" h
              JOIN "cycles" c ON c.id = h."cycleId"
              WHERE h."harvestedAt" >= ${start} AND h."harvestedAt" <= ${end}
              GROUP BY h."cycleId", c.code, c.name
              ORDER BY c.name ASC`)
          : Promise.resolve([]),
      ]);

      const byMonth = new Map<string, { revenue: string; expense: string }>();
      for (let i = 0; i < months; i++) {
        const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
        const month = date.toISOString().slice(0, 7);
        byMonth.set(month, { revenue: '0.00', expense: '0.00' });
      }
      for (const row of transactions) {
        const month = new Date(row.month).toISOString().slice(0, 7);
        const current = byMonth.get(month);
        if (current) current[row.type === 'INCOME' ? 'revenue' : 'expense'] = row.amount.toString();
      }

      return {
        months: [...byMonth.entries()].map(([month, values]) => ({ month, ...values })),
        production: production.map((row) => ({
          cycleId: row.cycleId,
          cycleCode: row.cycleCode,
          cycleName: row.cycleName,
          quantity: row.quantity.toString(),
          unit: row.unit,
        })),
      };
    });
  }
}
