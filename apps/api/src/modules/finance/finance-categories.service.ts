import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { TransactionType } from '@xfarm/shared';
import {
  CreateFinanceCategoryDto,
  UpdateFinanceCategoryDto,
  QueryFinanceCategoryDto,
} from './finance.dto';

@Injectable()
export class FinanceCategoriesService {
  async findAll(query: QueryFinanceCategoryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.FinanceCategoryWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.parentId !== undefined) {
      where.parentId = query.parentId;
    }

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      prisma.financeCategory.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        include: {
          parent: { select: { id: true, name: true, type: true } },
          children: { select: { id: true, name: true, type: true } },
        },
      }),
      prisma.financeCategory.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async getTree(type?: TransactionType) {
    const where: Prisma.FinanceCategoryWhereInput = {};
    if (type) {
      where.type = type;
    }

    const allCategories = await prisma.financeCategory.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    type CategoryItem = (typeof allCategories)[0];
    type CategoryNode = CategoryItem & { children: CategoryNode[] };

    const categoryMap = new Map<string, CategoryNode>();
    for (const cat of allCategories) {
      categoryMap.set(cat.id, { ...cat, children: [] });
    }

    const roots: CategoryNode[] = [];
    for (const cat of allCategories) {
      const node = categoryMap.get(cat.id)!;
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async findById(id: string) {
    const category = await prisma.financeCategory.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục thu chi');
    }

    return category;
  }

  async create(dto: CreateFinanceCategoryDto) {
    if (dto.parentId) {
      const parent = await prisma.financeCategory.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Không tìm thấy danh mục cha');
      }
    }

    return prisma.financeCategory.create({
      data: {
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId,
        isActive: dto.isActive ?? true,
        systemKey: dto.systemKey,
      },
      include: {
        parent: true,
      },
    });
  }

  async update(id: string, dto: UpdateFinanceCategoryDto) {
    const category = await prisma.financeCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục thu chi');
    }

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new UnprocessableEntityException('Danh mục cha không thể là chính nó');
      }

      const parent = await prisma.financeCategory.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Không tìm thấy danh mục cha');
      }

      // Check for cycles: climb up from dto.parentId
      let currentParentId: string | null = parent.parentId;
      while (currentParentId) {
        if (currentParentId === id) {
          throw new UnprocessableEntityException('Không thể chọn danh mục con làm danh mục cha');
        }
        const ancestor = await prisma.financeCategory.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        });
        currentParentId = ancestor?.parentId ?? null;
      }
    }

    return prisma.financeCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.systemKey !== undefined ? { systemKey: dto.systemKey } : {}),
      },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async remove(id: string) {
    const category = await prisma.financeCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục thu chi');
    }

    if (category.systemKey) {
      throw new UnprocessableEntityException('Không thể xóa danh mục hệ thống');
    }

    const txCount = await prisma.transaction.count({
      where: { categoryId: id },
    });
    if (txCount > 0) {
      throw new UnprocessableEntityException('Không thể xóa danh mục đã phát sinh giao dịch');
    }

    const childCount = await prisma.financeCategory.count({
      where: { parentId: id },
    });
    if (childCount > 0) {
      throw new UnprocessableEntityException('Không thể xóa danh mục đang có danh mục con');
    }

    await prisma.financeCategory.delete({
      where: { id },
    });

    return { message: 'Xóa danh mục thành công' };
  }
}
