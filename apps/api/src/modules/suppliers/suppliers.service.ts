import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
  Inject,
} from '@nestjs/common';
import { prisma } from '@xfarm/db';
import { SequenceService } from '../../common/sequence/sequence.service';
import { CreateSupplierDto, UpdateSupplierDto, QuerySupplierDto } from './suppliers.dto';

@Injectable()
export class SuppliersService {
  constructor(@Inject(SequenceService) private readonly sequenceService: SequenceService) {}

  async findAll(query: QuerySupplierDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { taxCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    let orderBy: Record<string, 'asc' | 'desc'> = { createdAt: 'desc' };
    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      const allowed = ['code', 'name', 'phone', 'taxCode', 'createdAt', 'updatedAt'];
      if (field && allowed.includes(field)) {
        orderBy = { [field]: direction === 'asc' ? 'asc' : 'desc' };
      }
    }

    const [data, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          _count: {
            select: { purchaseOrders: true },
          },
        },
      }),
      prisma.supplier.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
        _count: {
          select: { purchaseOrders: true },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Không tìm thấy nhà cung cấp');
    }

    return supplier;
  }

  async create(dto: CreateSupplierDto, userId?: string) {
    let code = dto.code?.trim();
    if (!code) {
      let candidate = await this.sequenceService.nextCode('SUP');
      while (await prisma.supplier.findUnique({ where: { code: candidate } })) {
        candidate = await this.sequenceService.nextCode('SUP');
      }
      code = candidate;
    } else {
      const existing = await prisma.supplier.findUnique({
        where: { code },
      });
      if (existing) {
        throw new ConflictException('Mã nhà cung cấp đã tồn tại');
      }
    }

    const supplier = await prisma.supplier.create({
      data: {
        code,
        name: dto.name,
        phone: dto.phone || null,
        address: dto.address || null,
        taxCode: dto.taxCode || null,
        createdById: userId || null,
      },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
    });

    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    const existing = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy nhà cung cấp');
    }

    if (dto.code && dto.code !== existing.code) {
      const duplicate = await prisma.supplier.findUnique({
        where: { code: dto.code },
      });
      if (duplicate) {
        throw new ConflictException('Mã nhà cung cấp đã tồn tại');
      }
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
        ...(dto.address !== undefined ? { address: dto.address || null } : {}),
        ...(dto.taxCode !== undefined ? { taxCode: dto.taxCode || null } : {}),
      },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
    });

    return updated;
  }

  async remove(id: string) {
    const existing = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy nhà cung cấp');
    }

    if (existing._count.purchaseOrders > 0) {
      throw new UnprocessableEntityException('Không thể xóa nhà cung cấp đã phát sinh giao dịch');
    }

    await prisma.supplier.delete({
      where: { id },
    });

    return { message: 'Đã xóa nhà cung cấp thành công' };
  }
}
