import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { prisma } from '@xfarm/db';
import type { Prisma } from '@xfarm/db';
import { AnimalEventType, AnimalSex, AnimalStatus, CycleKind, Role } from '@xfarm/shared';
import { SequenceService } from '../../common/sequence/sequence.service';
import {
  CreateAnimalDto,
  CreateAnimalEventDto,
  CreateAnimalGroupDto,
  QueryAnimalDto,
  QueryAnimalEventDto,
  QueryAnimalGroupDto,
  UpdateAnimalDto,
  UpdateAnimalGroupDto,
} from './animals.dto';

@Injectable()
export class AnimalsService {
  constructor(private readonly sequenceService: SequenceService) {}

  // ==========================================
  // AnimalGroup
  // ==========================================

  async findGroups(query: QueryAnimalGroupDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AnimalGroupWhereInput = {};
    if (query.cycleId) where.cycleId = query.cycleId;
    if (query.areaId) where.areaId = query.areaId;
    if (query.species) {
      where.species = { contains: query.species, mode: 'insensitive' };
    }
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { species: { contains: query.search, mode: 'insensitive' } },
        { breed: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy = this.parseSort(query.sort, { createdAt: 'desc' });

    const [data, total] = await Promise.all([
      prisma.animalGroup.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          cycle: true,
          area: true,
          _count: { select: { animals: true } },
        },
      }),
      prisma.animalGroup.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findGroupById(id: string) {
    const group = await prisma.animalGroup.findUnique({
      where: { id },
      include: {
        cycle: true,
        area: true,
        animals: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Không tìm thấy đàn vật nuôi');
    }

    const animalCounts = {
      ALIVE: 0,
      SOLD: 0,
      DEAD: 0,
    };

    for (const a of group.animals) {
      if (a.status in animalCounts) {
        animalCounts[a.status as keyof typeof animalCounts]++;
      }
    }

    return {
      ...group,
      animalCounts,
      counts: animalCounts,
      statusCounts: animalCounts,
    };
  }

  async createGroup(dto: CreateAnimalGroupDto, createdById?: string) {
    return prisma.$transaction(async (tx) => {
      const cycle = await tx.cycle.findUnique({ where: { id: dto.cycleId } });
      if (!cycle) {
        throw new UnprocessableEntityException('Mùa vụ không tồn tại');
      }
      if (cycle.kind !== CycleKind.LIVESTOCK && cycle.kind !== CycleKind.AQUA) {
        throw new UnprocessableEntityException(
          'Mùa vụ phải thuộc loại chăn nuôi (LIVESTOCK) hoặc thủy sản (AQUA)',
        );
      }

      const area = await tx.area.findUnique({ where: { id: dto.areaId } });
      if (!area) {
        throw new UnprocessableEntityException('Khu/chuồng không tồn tại');
      }

      let code = dto.code;
      if (code) {
        const existing = await tx.animalGroup.findUnique({ where: { code } });
        if (existing) {
          throw new ConflictException('Mã đàn đã tồn tại');
        }
      } else {
        code = await this.sequenceService.nextCode('AG', { tx });
      }

      return tx.animalGroup.create({
        data: {
          code,
          cycleId: dto.cycleId,
          species: dto.species,
          breed: dto.breed ?? null,
          headCount: dto.headCount ?? 0,
          areaId: dto.areaId,
          notes: dto.notes ?? null,
          createdById,
        },
        include: {
          cycle: true,
          area: true,
        },
      });
    });
  }

  async updateGroup(id: string, dto: UpdateAnimalGroupDto) {
    const existing = await prisma.animalGroup.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy đàn vật nuôi');
    }

    if (dto.cycleId && dto.cycleId !== existing.cycleId) {
      const cycle = await prisma.cycle.findUnique({ where: { id: dto.cycleId } });
      if (!cycle) {
        throw new UnprocessableEntityException('Mùa vụ không tồn tại');
      }
      if (cycle.kind !== CycleKind.LIVESTOCK && cycle.kind !== CycleKind.AQUA) {
        throw new UnprocessableEntityException(
          'Mùa vụ phải thuộc loại chăn nuôi (LIVESTOCK) hoặc thủy sản (AQUA)',
        );
      }
    }

    if (dto.areaId && dto.areaId !== existing.areaId) {
      const area = await prisma.area.findUnique({ where: { id: dto.areaId } });
      if (!area) {
        throw new UnprocessableEntityException('Khu/chuồng không tồn tại');
      }
    }

    if (dto.code && dto.code !== existing.code) {
      const duplicate = await prisma.animalGroup.findUnique({ where: { code: dto.code } });
      if (duplicate) {
        throw new ConflictException('Mã đàn đã tồn tại');
      }
    }

    return prisma.animalGroup.update({
      where: { id },
      data: dto,
      include: {
        cycle: true,
        area: true,
      },
    });
  }

  // ==========================================
  // Animal
  // ==========================================

  async findAnimals(query: QueryAnimalDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AnimalWhereInput = {};
    if (query.groupId) where.groupId = query.groupId;
    if (query.status) where.status = query.status;
    if (query.species) {
      where.species = { contains: query.species, mode: 'insensitive' };
    }
    if (query.search) {
      where.OR = [
        { tag: { contains: query.search, mode: 'insensitive' } },
        { species: { contains: query.search, mode: 'insensitive' } },
        { breed: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy = this.parseSort(query.sort, { createdAt: 'desc' });

    const [data, total] = await Promise.all([
      prisma.animal.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          group: true,
          mother: true,
        },
      }),
      prisma.animal.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findAnimalById(id: string) {
    const animal = await prisma.animal.findUnique({
      where: { id },
      include: {
        group: true,
        mother: true,
        offspring: {
          orderBy: { createdAt: 'desc' },
        },
        events: {
          orderBy: { date: 'desc' },
          include: {
            createdBy: {
              select: { id: true, fullName: true, role: true },
            },
          },
        },
      },
    });

    if (!animal) {
      throw new NotFoundException('Không tìm thấy vật nuôi');
    }

    return animal;
  }

  async createAnimal(dto: CreateAnimalDto, createdById?: string) {
    const existing = await prisma.animal.findUnique({ where: { tag: dto.tag } });
    if (existing) {
      throw new ConflictException('Mã tai/thẻ đã tồn tại');
    }

    if (dto.motherId) {
      const mother = await prisma.animal.findUnique({ where: { id: dto.motherId } });
      if (!mother) {
        throw new UnprocessableEntityException('Mẹ không tồn tại');
      }
      if (mother.sex !== AnimalSex.FEMALE) {
        throw new UnprocessableEntityException('Mẹ phải là con cái');
      }
    }

    if (dto.groupId) {
      const group = await prisma.animalGroup.findUnique({ where: { id: dto.groupId } });
      if (!group) {
        throw new UnprocessableEntityException('Đàn không tồn tại');
      }
    }

    return prisma.animal.create({
      data: {
        tag: dto.tag,
        groupId: dto.groupId ?? null,
        species: dto.species,
        breed: dto.breed ?? null,
        sex: dto.sex ?? AnimalSex.UNKNOWN,
        birthDate: dto.birthDate ?? null,
        status: dto.status ?? AnimalStatus.ALIVE,
        motherId: dto.motherId ?? null,
        notes: dto.notes ?? null,
        createdById,
      },
      include: {
        group: true,
        mother: true,
      },
    });
  }

  async updateAnimal(id: string, dto: UpdateAnimalDto) {
    const existing = await prisma.animal.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy vật nuôi');
    }

    if (dto.tag && dto.tag !== existing.tag) {
      const duplicate = await prisma.animal.findUnique({ where: { tag: dto.tag } });
      if (duplicate) {
        throw new ConflictException('Mã tai/thẻ đã tồn tại');
      }
    }

    if (dto.motherId && dto.motherId !== existing.motherId) {
      const mother = await prisma.animal.findUnique({ where: { id: dto.motherId } });
      if (!mother) {
        throw new UnprocessableEntityException('Mẹ không tồn tại');
      }
      if (mother.sex !== AnimalSex.FEMALE) {
        throw new UnprocessableEntityException('Mẹ phải là con cái');
      }
    }

    if (dto.groupId && dto.groupId !== existing.groupId) {
      const group = await prisma.animalGroup.findUnique({ where: { id: dto.groupId } });
      if (!group) {
        throw new UnprocessableEntityException('Đàn không tồn tại');
      }
    }

    return prisma.animal.update({
      where: { id },
      data: dto,
      include: {
        group: true,
        mother: true,
      },
    });
  }

  // ==========================================
  // AnimalEvent
  // ==========================================

  async createAnimalEvent(
    animalId: string,
    dto: CreateAnimalEventDto,
    user: { id: string; role: Role },
  ) {
    if (user.role === Role.WORKER) {
      const allowedWorkerEventTypes: AnimalEventType[] = [
        AnimalEventType.VACCINATION,
        AnimalEventType.TREATMENT,
        AnimalEventType.WEIGHING,
      ];
      if (!allowedWorkerEventTypes.includes(dto.type)) {
        throw new ForbiddenException('WORKER chỉ được ghi event VACCINATION, TREATMENT, WEIGHING');
      }
    } else if (user.role !== Role.OWNER && user.role !== Role.MANAGER) {
      throw new ForbiddenException('Bạn không có quyền ghi nhận sự kiện vật nuôi');
    }

    const animal = await prisma.animal.findUnique({ where: { id: animalId } });
    if (!animal) {
      throw new NotFoundException('Không tìm thấy vật nuôi');
    }

    if (animal.status === AnimalStatus.DEAD || animal.status === AnimalStatus.SOLD) {
      throw new UnprocessableEntityException(
        'Vật nuôi đã chết hoặc đã bán, không thể ghi thêm sự kiện',
      );
    }

    return prisma.$transaction(async (tx) => {
      const event = await tx.animalEvent.create({
        data: {
          animalId: animal.id,
          type: dto.type,
          date: dto.date ?? new Date(),
          data: dto.data ?? undefined,
          notes: dto.notes ?? null,
          createdById: user.id,
        },
      });

      if (dto.type === AnimalEventType.DEATH) {
        await tx.animal.update({
          where: { id: animal.id },
          data: { status: AnimalStatus.DEAD },
        });
      } else if (dto.type === AnimalEventType.SALE) {
        await tx.animal.update({
          where: { id: animal.id },
          data: { status: AnimalStatus.SOLD },
        });
      } else if (dto.type === AnimalEventType.BIRTH) {
        const offspringList = dto.offspring ?? (dto.data as { offspring?: unknown[] })?.offspring;

        if (Array.isArray(offspringList) && offspringList.length > 0) {
          for (const item of offspringList) {
            const offspring = item as {
              tag: string;
              groupId?: string | null;
              species?: string;
              breed?: string | null;
              sex?: AnimalSex;
              birthDate?: Date | null;
              status?: AnimalStatus;
              notes?: string | null;
            };

            const existing = await tx.animal.findUnique({
              where: { tag: offspring.tag },
            });
            if (existing) {
              throw new ConflictException(`Mã tai/thẻ ${offspring.tag} đã tồn tại`);
            }

            await tx.animal.create({
              data: {
                tag: offspring.tag,
                groupId: offspring.groupId !== undefined ? offspring.groupId : animal.groupId,
                species: offspring.species || animal.species,
                breed: offspring.breed !== undefined ? offspring.breed : animal.breed,
                sex: offspring.sex ?? AnimalSex.UNKNOWN,
                birthDate: offspring.birthDate ?? event.date,
                status: offspring.status ?? AnimalStatus.ALIVE,
                motherId: animal.id,
                notes: offspring.notes ?? null,
                createdById: user.id,
              },
            });
          }
        }
      }

      return event;
    });
  }

  async findAnimalEvents(animalId: string, query: QueryAnimalEventDto) {
    const animal = await prisma.animal.findUnique({ where: { id: animalId } });
    if (!animal) {
      throw new NotFoundException('Không tìm thấy vật nuôi');
    }

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AnimalEventWhereInput = { animalId };
    if (query.type) where.type = query.type;

    const [data, total] = await Promise.all([
      prisma.animalEvent.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { date: 'desc' },
        include: {
          createdBy: {
            select: { id: true, fullName: true, role: true },
          },
        },
      }),
      prisma.animalEvent.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  private parseSort(
    sort?: string,
    defaultSort: Record<string, 'asc' | 'desc'> = { createdAt: 'desc' },
  ) {
    if (!sort) return defaultSort;
    const [field, direction] = sort.split(':');
    if (!field) return defaultSort;
    return {
      [field]: direction === 'asc' ? 'asc' : 'desc',
    } as Record<string, 'asc' | 'desc'>;
  }
}
