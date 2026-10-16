import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
  Inject,
} from '@nestjs/common';
import { prisma, CycleStatus, Prisma } from '@xfarm/db';
import { SequenceService } from '../../common/sequence/sequence.service';
import { CreateAreaDto, UpdateAreaDto, QueryAreasDto } from './areas.dto';

@Injectable()
export class AreasService {
  constructor(@Inject(SequenceService) private readonly sequenceService: SequenceService) {}

  async findAll(query: QueryAreasDto) {
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

    if (query.type) {
      where.type = query.type;
    }

    if (query.parentId !== undefined) {
      if (query.parentId === null || query.parentId === '' || query.parentId === 'null') {
        where.parentId = null;
      } else {
        where.parentId = query.parentId;
      }
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    let orderBy: Record<string, 'asc' | 'desc'>[] = [{ createdAt: 'desc' }, { id: 'desc' }];
    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      if (field) {
        const primary = direction === 'asc' ? 'asc' : 'desc';
        orderBy = [{ [field]: primary }, { createdAt: 'desc' }, { id: 'desc' }];
      }
    }

    const [data, total] = await Promise.all([
      prisma.area.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          parent: {
            select: { id: true, code: true, name: true },
          },
          _count: {
            select: { children: true },
          },
        },
      }),
      prisma.area.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findTree() {
    const areas = await prisma.area.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
    });

    type AreaTreeNode = (typeof areas)[number] & {
      children: AreaTreeNode[];
    };

    const areaMap = new Map<string, AreaTreeNode>();
    const roots: AreaTreeNode[] = [];

    for (const area of areas) {
      areaMap.set(area.id, { ...area, children: [] });
    }

    for (const area of areas) {
      const node = areaMap.get(area.id)!;
      if (area.parentId && areaMap.has(area.parentId)) {
        areaMap.get(area.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return { data: roots };
  }

  async findById(id: string) {
    const area = await prisma.area.findUnique({
      where: { id },
      include: {
        parent: true,
        children: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] },
      },
    });

    if (!area) {
      throw new NotFoundException('Không tìm thấy khu/lô');
    }

    const activeCyclesCount = await prisma.cycle.count({
      where: {
        areaId: id,
        status: CycleStatus.ACTIVE,
      },
    });

    return {
      data: {
        ...area,
        activeCyclesCount,
        _count: {
          activeCycles: activeCyclesCount,
          children: area.children.length,
        },
      },
    };
  }

  async create(dto: CreateAreaDto, userId?: string) {
    if (dto.parentId) {
      const parent = await prisma.area.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new UnprocessableEntityException('Khu vực cha không tồn tại');
      }
    }

    let code = dto.code?.trim();
    if (!code) {
      code = await this.sequenceService.nextSimple('AR', 4);
    } else {
      const existing = await prisma.area.findUnique({
        where: { code },
      });
      if (existing) {
        throw new ConflictException('Mã khu/lô đã tồn tại');
      }
    }

    const area = await prisma.area.create({
      data: {
        code,
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId || null,
        areaM2: dto.areaM2 !== undefined && dto.areaM2 !== null ? dto.areaM2 : null,
        geojson:
          dto.geojson === null
            ? Prisma.JsonNull
            : dto.geojson !== undefined
              ? (dto.geojson as unknown as Prisma.InputJsonValue)
              : undefined,
        description: dto.description || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdById: userId || null,
      },
    });

    return area;
  }

  async update(id: string, dto: UpdateAreaDto) {
    const existing = await prisma.area.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy khu/lô');
    }

    if (dto.code && dto.code !== existing.code) {
      const duplicate = await prisma.area.findUnique({
        where: { code: dto.code },
      });
      if (duplicate) {
        throw new ConflictException('Mã khu/lô đã tồn tại');
      }
    }

    // Không cho khóa khu đang có cycle ACTIVE hoặc HARVESTING (trả 422)
    if (dto.isActive === false) {
      const activeCycle = await prisma.cycle.findFirst({
        where: {
          areaId: id,
          status: {
            in: [CycleStatus.ACTIVE, CycleStatus.HARVESTING],
          },
        },
      });

      if (activeCycle) {
        throw new UnprocessableEntityException(
          'Không thể khóa khu vực đang có mùa vụ đang hoạt động hoặc đang thu hoạch',
        );
      }
    }

    // parentId không được tạo vòng (kể cả gián tiếp), sai thì 422
    if (dto.parentId !== undefined && dto.parentId !== null && dto.parentId !== '') {
      const targetParentId = dto.parentId;

      if (targetParentId === id) {
        throw new UnprocessableEntityException('Không thể chọn chính khu vực này làm khu vực cha');
      }

      let curr: string | null = targetParentId;
      const visited = new Set<string>();

      while (curr) {
        if (curr === id) {
          throw new UnprocessableEntityException(
            'Không thể chọn khu vực con làm khu vực cha (tạo vòng lặp)',
          );
        }
        if (visited.has(curr)) {
          throw new UnprocessableEntityException('Phát hiện vòng lặp phân cấp');
        }
        visited.add(curr);

        const p: { id: string; parentId: string | null } | null = await prisma.area.findUnique({
          where: { id: curr },
          select: { id: true, parentId: true },
        });

        if (!p) {
          throw new UnprocessableEntityException('Khu vực cha không tồn tại');
        }

        curr = p.parentId;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.parentId !== undefined) {
      updateData.parentId = dto.parentId === '' || dto.parentId === null ? null : dto.parentId;
    }
    if (dto.areaM2 !== undefined) {
      updateData.areaM2 = dto.areaM2;
    }
    if (dto.geojson !== undefined) {
      updateData.geojson =
        dto.geojson === null ? Prisma.JsonNull : (dto.geojson as unknown as Prisma.InputJsonValue);
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    const updated = await prisma.area.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }
}
