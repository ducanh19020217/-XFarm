import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { InventoryService } from '../inventory/inventory.service';
import { QueryHarvestLotDto, UpdateHarvestLotDto } from './harvest-lots.dto';

const harvestLotInclude = {
  cycle: { include: { area: true } },
  item: true,
  warehouse: true,
  stockLot: true,
  activity: { select: { id: true, performedAt: true, type: true } },
} satisfies Prisma.HarvestLotInclude;

@Injectable()
export class HarvestLotsService {
  constructor(private readonly inventory: InventoryService) {}

  async findAll(query: QueryHarvestLotDto) {
    const where: Prisma.HarvestLotWhereInput = {};
    if (query.cycleId) where.cycleId = query.cycleId;
    if (query.itemId) where.itemId = query.itemId;
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.isPublic !== undefined) where.isPublic = query.isPublic;
    if (query.from || query.to) {
      where.harvestedAt = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { traceCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.harvestLot.findMany({
        where,
        include: harvestLotInclude,
        orderBy: [{ harvestedAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.harvestLot.count({ where }),
    ]);
    return {
      data: await this.withBalance(data),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findOne(id: string) {
    const lot = await prisma.harvestLot.findUnique({ where: { id }, include: harvestLotInclude });
    if (!lot) throw new NotFoundException('Không tìm thấy lô thu hoạch');
    return this.withBalance([lot]).then((data) => data[0]);
  }

  async update(id: string, dto: UpdateHarvestLotDto) {
    const lot = await prisma.harvestLot.findUnique({ where: { id } });
    if (!lot) throw new NotFoundException('Không tìm thấy lô thu hoạch');
    const updated = await prisma.harvestLot.update({
      where: { id },
      data: dto,
      include: harvestLotInclude,
    });
    return this.withBalance([updated]).then((data) => data[0]);
  }

  private async withBalance<
    T extends {
      itemId: string;
      stockLot: { id: string; warehouseId: string | null } | null;
    },
  >(lots: T[]) {
    return Promise.all(
      lots.map(async (lot) => ({
        ...lot,
        remainingQuantity: lot.stockLot?.warehouseId
          ? await this.inventory.getBalance({
              stockLotId: lot.stockLot.id,
              itemId: lot.itemId,
              warehouseId: lot.stockLot.warehouseId,
            })
          : new Prisma.Decimal(0),
      })),
    );
  }
}
