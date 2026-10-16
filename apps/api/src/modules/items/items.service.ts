import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { SequenceService } from '../../common/sequence/sequence.service';
import { CreateItemDto, UpdateItemDto, QueryItemDto } from './items.dto';

interface ItemRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  minStock: string | number | null;
  isSellable: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  onHand: string | number;
}

@Injectable()
export class ItemsService {
  constructor(@Inject(SequenceService) private readonly sequenceService: SequenceService) {}

  async findAll(query: QueryItemDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const conditions: Prisma.Sql[] = [];

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      conditions.push(Prisma.sql`(i.sku ILIKE ${searchPattern} OR i.name ILIKE ${searchPattern})`);
    }

    if (query.category) {
      conditions.push(Prisma.sql`i.category = ${query.category}::"ItemCategory"`);
    }

    if (query.isSellable !== undefined) {
      conditions.push(Prisma.sql`i."isSellable" = ${query.isSellable}`);
    }

    if (query.isActive !== undefined) {
      conditions.push(Prisma.sql`i."isActive" = ${query.isActive}`);
    }

    if (query.belowMinStock === true) {
      conditions.push(
        Prisma.sql`i."minStock" IS NOT NULL AND COALESCE(sb."onHand", 0) < i."minStock"`,
      );
    }

    const whereClause =
      conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;

    let orderSql = Prisma.sql`ORDER BY i."createdAt" DESC`;
    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      const isAsc = direction?.toLowerCase() === 'asc';
      if (field === 'onHand') {
        orderSql = isAsc
          ? Prisma.sql`ORDER BY COALESCE(sb."onHand", 0) ASC`
          : Prisma.sql`ORDER BY COALESCE(sb."onHand", 0) DESC`;
      } else if (field === 'sku') {
        orderSql = isAsc ? Prisma.sql`ORDER BY i.sku ASC` : Prisma.sql`ORDER BY i.sku DESC`;
      } else if (field === 'name') {
        orderSql = isAsc ? Prisma.sql`ORDER BY i.name ASC` : Prisma.sql`ORDER BY i.name DESC`;
      } else if (field === 'category') {
        orderSql = isAsc
          ? Prisma.sql`ORDER BY i.category ASC`
          : Prisma.sql`ORDER BY i.category DESC`;
      } else if (field === 'unit') {
        orderSql = isAsc ? Prisma.sql`ORDER BY i.unit ASC` : Prisma.sql`ORDER BY i.unit DESC`;
      } else if (field === 'minStock') {
        orderSql = isAsc
          ? Prisma.sql`ORDER BY i."minStock" ASC`
          : Prisma.sql`ORDER BY i."minStock" DESC`;
      } else if (field === 'isSellable') {
        orderSql = isAsc
          ? Prisma.sql`ORDER BY i."isSellable" ASC`
          : Prisma.sql`ORDER BY i."isSellable" DESC`;
      } else if (field === 'isActive') {
        orderSql = isAsc
          ? Prisma.sql`ORDER BY i."isActive" ASC`
          : Prisma.sql`ORDER BY i."isActive" DESC`;
      } else if (field === 'createdAt') {
        orderSql = isAsc
          ? Prisma.sql`ORDER BY i."createdAt" ASC`
          : Prisma.sql`ORDER BY i."createdAt" DESC`;
      } else if (field === 'updatedAt') {
        orderSql = isAsc
          ? Prisma.sql`ORDER BY i."updatedAt" ASC`
          : Prisma.sql`ORDER BY i."updatedAt" DESC`;
      }
    }

    const countQuery = Prisma.sql`
      SELECT COUNT(*)::int AS total
      FROM items i
      LEFT JOIN (
        SELECT "itemId", SUM(quantity) AS "onHand"
        FROM stock_balances
        GROUP BY "itemId"
      ) sb ON sb."itemId" = i.id
      ${whereClause}
    `;

    const dataQuery = Prisma.sql`
      SELECT 
        i.id,
        i.sku,
        i.name,
        i.category,
        i.unit,
        i."minStock",
        i."isSellable",
        i."isActive",
        i."createdAt",
        i."updatedAt",
        COALESCE(sb."onHand", 0)::numeric AS "onHand"
      FROM items i
      LEFT JOIN (
        SELECT "itemId", SUM(quantity) AS "onHand"
        FROM stock_balances
        GROUP BY "itemId"
      ) sb ON sb."itemId" = i.id
      ${whereClause}
      ${orderSql}
      LIMIT ${pageSize} OFFSET ${skip}
    `;

    const [countResult, rows] = await Promise.all([
      prisma.$queryRaw<{ total: number }[]>(countQuery),
      prisma.$queryRaw<ItemRow[]>(dataQuery),
    ]);

    const total = countResult[0]?.total ?? 0;
    const data = rows.map((r) => ({
      ...r,
      minStock: r.minStock !== null ? Number(r.minStock) : null,
      onHand: Number(r.onHand),
    }));

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string) {
    const query = Prisma.sql`
      SELECT 
        i.id,
        i.sku,
        i.name,
        i.category,
        i.unit,
        i."minStock",
        i."isSellable",
        i."isActive",
        i."createdAt",
        i."updatedAt",
        COALESCE(sb."onHand", 0)::numeric AS "onHand"
      FROM items i
      LEFT JOIN (
        SELECT "itemId", SUM(quantity) AS "onHand"
        FROM stock_balances
        GROUP BY "itemId"
      ) sb ON sb."itemId" = i.id
      WHERE i.id = ${id}
    `;

    const rows = await prisma.$queryRaw<ItemRow[]>(query);
    if (rows.length === 0) {
      throw new NotFoundException('Không tìm thấy vật tư');
    }

    const r = rows[0];
    return {
      ...r,
      minStock: r.minStock !== null ? Number(r.minStock) : null,
      onHand: Number(r.onHand),
    };
  }

  async create(dto: CreateItemDto) {
    let sku = dto.sku?.trim();
    if (!sku) {
      let candidate = await this.sequenceService.nextCode('IT');
      while (await prisma.item.findUnique({ where: { sku: candidate } })) {
        candidate = await this.sequenceService.nextCode('IT');
      }
      sku = candidate;
    } else {
      const existing = await prisma.item.findUnique({
        where: { sku },
      });
      if (existing) {
        throw new ConflictException('Mã vật tư đã tồn tại');
      }
    }

    const item = await prisma.item.create({
      data: {
        sku,
        name: dto.name,
        category: dto.category,
        unit: dto.unit,
        minStock: dto.minStock !== undefined && dto.minStock !== null ? dto.minStock : null,
        isSellable: dto.isSellable ?? false,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      ...item,
      minStock: item.minStock !== null ? Number(item.minStock) : null,
      onHand: 0,
    };
  }

  async update(id: string, dto: UpdateItemDto) {
    const existing = await prisma.item.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy vật tư');
    }

    if (dto.sku && dto.sku !== existing.sku) {
      const duplicate = await prisma.item.findUnique({
        where: { sku: dto.sku },
      });
      if (duplicate) {
        throw new ConflictException('Mã vật tư đã tồn tại');
      }
    }

    await prisma.item.update({
      where: { id },
      data: {
        ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
        ...(dto.minStock !== undefined
          ? { minStock: dto.minStock !== null ? dto.minStock : null }
          : {}),
        ...(dto.isSellable !== undefined ? { isSellable: dto.isSellable } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return this.findById(id);
  }

  async remove(id: string) {
    const existing = await prisma.item.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy vật tư');
    }

    const item = await prisma.item.update({
      where: { id },
      data: { isActive: false },
    });

    return {
      data: {
        ...item,
        minStock: item.minStock !== null ? Number(item.minStock) : null,
      },
      message: 'Đã khóa vật tư thành công',
    };
  }
}
