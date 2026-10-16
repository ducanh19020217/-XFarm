import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
  Inject,
} from '@nestjs/common';
import { prisma } from '@xfarm/db';
import { SequenceService } from '../../common/sequence/sequence.service';
import { CreateWarehouseDto, UpdateWarehouseDto, QueryWarehouseDto } from './warehouses.dto';

@Injectable()
export class WarehousesService {
  constructor(@Inject(SequenceService) private readonly sequenceService: SequenceService) {}

  async findAll(query: QueryWarehouseDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    let orderBy: Record<string, 'asc' | 'desc'> = { createdAt: 'desc' };
    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      const allowed = ['code', 'name', 'createdAt', 'updatedAt'];
      if (field && allowed.includes(field)) {
        orderBy = { [field]: direction === 'asc' ? 'asc' : 'desc' };
      }
    }

    const [data, total] = await Promise.all([
      prisma.warehouse.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          area: {
            select: { id: true, code: true, name: true },
          },
          _count: {
            select: { stockLots: true, movesFrom: true, movesTo: true },
          },
        },
      }),
      prisma.warehouse.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string) {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        area: {
          select: { id: true, code: true, name: true },
        },
        _count: {
          select: { stockLots: true, movesFrom: true, movesTo: true },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException('Không tìm thấy kho');
    }

    return warehouse;
  }

  async create(dto: CreateWarehouseDto) {
    if (dto.areaId) {
      const area = await prisma.area.findUnique({
        where: { id: dto.areaId },
      });
      if (!area) {
        throw new UnprocessableEntityException('Khu vực không tồn tại');
      }
    }

    let code = dto.code?.trim();
    if (!code) {
      let candidate = await this.sequenceService.nextCode('WH');
      while (await prisma.warehouse.findUnique({ where: { code: candidate } })) {
        candidate = await this.sequenceService.nextCode('WH');
      }
      code = candidate;
    } else {
      const existing = await prisma.warehouse.findUnique({
        where: { code },
      });
      if (existing) {
        throw new ConflictException('Mã kho đã tồn tại');
      }
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        code,
        name: dto.name,
        areaId: dto.areaId || null,
      },
      include: {
        area: {
          select: { id: true, code: true, name: true },
        },
        _count: {
          select: { stockLots: true, movesFrom: true, movesTo: true },
        },
      },
    });

    return warehouse;
  }

  async update(id: string, dto: UpdateWarehouseDto) {
    const existing = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy kho');
    }

    if (dto.code && dto.code !== existing.code) {
      const duplicate = await prisma.warehouse.findUnique({
        where: { code: dto.code },
      });
      if (duplicate) {
        throw new ConflictException('Mã kho đã tồn tại');
      }
    }

    if (dto.areaId) {
      const area = await prisma.area.findUnique({
        where: { id: dto.areaId },
      });
      if (!area) {
        throw new UnprocessableEntityException('Khu vực không tồn tại');
      }
    }

    const updated = await prisma.warehouse.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.areaId !== undefined ? { areaId: dto.areaId || null } : {}),
      },
      include: {
        area: {
          select: { id: true, code: true, name: true },
        },
        _count: {
          select: { stockLots: true, movesFrom: true, movesTo: true },
        },
      },
    });

    return updated;
  }

  async remove(id: string) {
    const existing = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: { stockLots: true, movesFrom: true, movesTo: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy kho');
    }

    if (
      existing._count.stockLots > 0 ||
      existing._count.movesFrom > 0 ||
      existing._count.movesTo > 0
    ) {
      throw new UnprocessableEntityException('Không thể xóa kho đã phát sinh giao dịch');
    }

    await prisma.warehouse.delete({
      where: { id },
    });

    return { message: 'Đã xóa kho thành công' };
  }
}
