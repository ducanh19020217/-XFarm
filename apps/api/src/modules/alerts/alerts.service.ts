import { Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { Queue, Worker } from 'bullmq';
import { MarkAlertReadDto, QueryAlertDto } from './alerts.dto';

export function getVNDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatVNDate(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Tính toán boundary thời gian theo lịch Việt Nam (Asia/Ho_Chi_Minh, UTC+7)
 * độc lập với timezone local của process (ví dụ server chạy UTC).
 *
 * - todayStart: 00:00:00.000 đầu ngày hôm nay theo lịch VN
 * - thirtyDaysLater: 23:59:59.999 cuối ngày thứ 30 tính từ hôm nay theo lịch VN
 */
export function getVNInventoryCheckBoundaries(referenceDate: Date = new Date()): {
  todayStart: Date;
  thirtyDaysLater: Date;
} {
  const dateKey = getVNDateKey(referenceDate);
  const [year, month, day] = dateKey.split('-').map(Number);

  // Đầu ngày hôm nay theo giờ VN: YYYY-MM-DDT00:00:00.000+07:00
  const todayStart = new Date(`${dateKey}T00:00:00.000+07:00`);

  // Cuối ngày thứ 30 tới theo giờ VN: 23:59:59.999+07:00
  // Dùng Date.UTC để cộng ngày chuẩn xác qua các ranh giới tháng và năm
  const targetDate = new Date(Date.UTC(year, month - 1, day + 30));
  const y30 = targetDate.getUTCFullYear();
  const m30 = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const d30 = String(targetDate.getUTCDate()).padStart(2, '0');
  const thirtyDaysLater = new Date(`${y30}-${m30}-${d30}T23:59:59.999+07:00`);

  return { todayStart, thirtyDaysLater };
}

@Injectable()
export class AlertsService implements OnModuleInit, OnModuleDestroy {
  private queue: Queue | null = null;
  private worker: Worker | null = null;

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    try {
      const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6389');
      const connection = {
        host: redisUrl.hostname,
        port: Number(redisUrl.port) || 6379,
        password: redisUrl.password || undefined,
        username: redisUrl.username || undefined,
        maxRetriesPerRequest: null,
      };

      this.queue = new Queue('inventory-alerts', { connection });

      // Daily job at 06:00 Vietnam time (Asia/Ho_Chi_Minh)
      await this.queue.upsertJobScheduler('inventory-daily-check', {
        pattern: '0 6 * * *',
        tz: 'Asia/Ho_Chi_Minh',
      });

      this.worker = new Worker(
        'inventory-alerts',
        async (job) => {
          if (job.name === 'inventory-daily-check' || job.name === 'inventory-check') {
            await this.runInventoryCheck();
          }
        },
        { connection },
      );

      this.worker.on('error', (err) => {
        console.error('BullMQ Worker error:', err.message);
      });
    } catch (error) {
      console.error('Failed to initialize BullMQ in AlertsService:', error);
    }
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
  }

  async runInventoryCheck(referenceDate: Date = new Date()) {
    const dateKey = getVNDateKey(referenceDate);

    // 1. Check LOW_STOCK for active items with minStock configured
    const items = await prisma.item.findMany({
      where: {
        isActive: true,
        minStock: { not: null },
      },
    });

    const itemIds = items.map((item) => item.id);
    const itemMoves = await prisma.stockMove.findMany({
      where: { itemId: { in: itemIds } },
      select: {
        itemId: true,
        type: true,
        direction: true,
        quantity: true,
        toWarehouseId: true,
        fromWarehouseId: true,
      },
    });

    const itemStockMap = new Map<string, Prisma.Decimal>();
    for (const id of itemIds) {
      itemStockMap.set(id, new Prisma.Decimal(0));
    }

    for (const move of itemMoves) {
      const current = itemStockMap.get(move.itemId) ?? new Prisma.Decimal(0);
      let updated = current;
      if (move.type === 'IN') {
        updated = current.add(move.quantity);
      } else if (move.type === 'OUT') {
        updated = current.sub(move.quantity);
      } else if (move.type === 'ADJUST') {
        if (move.direction === 'IN') {
          updated = current.add(move.quantity);
        } else if (move.direction === 'OUT') {
          updated = current.sub(move.quantity);
        } else if (move.toWarehouseId) {
          updated = current.add(move.quantity);
        } else if (move.fromWarehouseId) {
          updated = current.sub(move.quantity);
        }
      }
      itemStockMap.set(move.itemId, updated);
    }

    let lowStockCount = 0;
    for (const item of items) {
      if (!item.minStock) continue;
      const totalStock = itemStockMap.get(item.id) ?? new Prisma.Decimal(0);
      if (totalStock.lessThan(item.minStock)) {
        const dedupeKey = `LOW_STOCK:${item.id}:${dateKey}`;
        const message = `Mặt hàng "${item.name}" (${item.sku}) có tổng tồn (${totalStock.toString()} ${item.unit}) dưới mức tối thiểu (${item.minStock.toString()} ${item.unit})`;

        await prisma.alert.upsert({
          where: { dedupeKey },
          create: {
            type: 'LOW_STOCK',
            message,
            refType: 'ITEM',
            refId: item.id,
            dedupeKey,
          },
          update: {},
        });
        lowStockCount++;
      }
    }

    // 2. Check LOT_EXPIRING and LOT_EXPIRED for lots with expiryDate and stock > 0
    const lots = await prisma.stockLot.findMany({
      where: {
        expiryDate: { not: null },
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            isActive: true,
          },
        },
      },
    });

    const lotIds = lots.map((lot) => lot.id);
    const lotMoves = await prisma.stockMove.findMany({
      where: { stockLotId: { in: lotIds } },
      select: {
        stockLotId: true,
        type: true,
        direction: true,
        quantity: true,
        toWarehouseId: true,
        fromWarehouseId: true,
      },
    });

    const lotStockMap = new Map<string, Prisma.Decimal>();
    for (const id of lotIds) {
      lotStockMap.set(id, new Prisma.Decimal(0));
    }

    for (const move of lotMoves) {
      if (!move.stockLotId) continue;
      const current = lotStockMap.get(move.stockLotId) ?? new Prisma.Decimal(0);
      let updated = current;
      if (move.type === 'IN') {
        updated = current.add(move.quantity);
      } else if (move.type === 'OUT') {
        updated = current.sub(move.quantity);
      } else if (move.type === 'ADJUST') {
        if (move.direction === 'IN') {
          updated = current.add(move.quantity);
        } else if (move.direction === 'OUT') {
          updated = current.sub(move.quantity);
        } else if (move.toWarehouseId) {
          updated = current.add(move.quantity);
        } else if (move.fromWarehouseId) {
          updated = current.sub(move.quantity);
        }
      }
      lotStockMap.set(move.stockLotId, updated);
    }

    const { todayStart, thirtyDaysLater } = getVNInventoryCheckBoundaries(referenceDate);

    let expiringCount = 0;
    let expiredCount = 0;

    for (const lot of lots) {
      if (!lot.expiryDate) continue;
      const lotStock = lotStockMap.get(lot.id) ?? new Prisma.Decimal(0);
      if (lotStock.lte(0)) continue;

      if (lot.expiryDate < todayStart) {
        // Expired
        const dedupeKey = `LOT_EXPIRED:${lot.id}:${dateKey}`;
        const message = `Lô "${lot.lotCode}" của mặt hàng "${lot.item.name}" đã hết hạn vào ngày ${formatVNDate(lot.expiryDate)} (còn tồn ${lotStock.toString()} ${lot.item.unit})`;

        await prisma.alert.upsert({
          where: { dedupeKey },
          create: {
            type: 'LOT_EXPIRED',
            message,
            refType: 'STOCK_LOT',
            refId: lot.id,
            dedupeKey,
          },
          update: {},
        });
        expiredCount++;
      } else if (lot.expiryDate <= thirtyDaysLater) {
        // Expiring in next 30 days
        const dedupeKey = `LOT_EXPIRING:${lot.id}:${dateKey}`;
        const message = `Lô "${lot.lotCode}" của mặt hàng "${lot.item.name}" sẽ hết hạn vào ngày ${formatVNDate(lot.expiryDate)} (còn tồn ${lotStock.toString()} ${lot.item.unit})`;

        await prisma.alert.upsert({
          where: { dedupeKey },
          create: {
            type: 'LOT_EXPIRING',
            message,
            refType: 'STOCK_LOT',
            refId: lot.id,
            dedupeKey,
          },
          update: {},
        });
        expiringCount++;
      }
    }

    return {
      lowStockCount,
      expiringCount,
      expiredCount,
      totalAlertsCreated: lowStockCount + expiringCount + expiredCount,
    };
  }

  async findAll(query: QueryAlertDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AlertWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.unread !== undefined) {
      if (query.unread) {
        where.readAt = null;
      } else {
        where.readAt = { not: null };
      }
    }

    if (query.search) {
      where.OR = [
        { message: { contains: query.search, mode: 'insensitive' } },
        { type: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.AlertOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      if (field) {
        orderBy = { [field]: direction === 'asc' ? 'asc' : 'desc' };
      }
    }

    const [data, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
      }),
      prisma.alert.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string) {
    const alert = await prisma.alert.findUnique({
      where: { id },
    });
    if (!alert) {
      throw new NotFoundException('Không tìm thấy cảnh báo');
    }
    return alert;
  }

  async markRead(id: string, dto?: MarkAlertReadDto) {
    const existing = await prisma.alert.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy cảnh báo');
    }

    const readAt = dto?.readAt !== undefined ? dto.readAt : new Date();
    return prisma.alert.update({
      where: { id },
      data: { readAt },
    });
  }

  async markAllRead() {
    const result = await prisma.alert.updateMany({
      where: { readAt: null },
      data: { readAt: new Date() },
    });
    return { count: result.count };
  }

  async getUnreadCount() {
    return prisma.alert.count({
      where: { readAt: null },
    });
  }
}
