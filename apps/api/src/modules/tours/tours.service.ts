import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { generateBatchSlotDates } from '@xfarm/shared';
import type {
  CreateTourInput,
  UpdateTourInput,
  CreateTourSlotInput,
  UpdateTourSlotInput,
  QueryTourInput,
  QueryTourSlotInput,
  BatchCreateTourSlotsInput,
} from '@xfarm/shared';

@Injectable()
export class ToursService {
  async findAll(query: QueryTourInput, publishedOnly = false) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where: Prisma.TourWhereInput = { ...(publishedOnly ? { isPublished: true } : {}) };
    if (query.search)
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    if (query.isPublished !== undefined && !publishedOnly) where.isPublished = query.isPublished;
    const [data, total] = await Promise.all([
      prisma.tour.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.tour.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async findOne(idOrSlug: string, publishedOnly = false) {
    const tour = await prisma.tour.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        ...(publishedOnly ? { isPublished: true } : {}),
      },
      include: {
        slots: {
          where: { isActive: true, startAt: { gte: new Date() } },
          orderBy: { startAt: 'asc' },
        },
      },
    });
    if (!tour) throw new NotFoundException('Không tìm thấy tour');
    return tour;
  }

  async create(dto: CreateTourInput, userId?: string) {
    return prisma.tour.create({
      data: {
        ...dto,
        slug: dto.slug || dto.name.toLowerCase().replace(/\s+/g, '-'),
        priceAdult: new Prisma.Decimal(dto.priceAdult),
        priceChild: new Prisma.Decimal(dto.priceChild),
        createdById: userId,
      },
    });
  }

  async update(id: string, dto: UpdateTourInput) {
    await this.findOne(id);
    const data: Prisma.TourUpdateInput = { ...dto };
    if (dto.priceAdult !== undefined) data.priceAdult = new Prisma.Decimal(dto.priceAdult);
    if (dto.priceChild !== undefined) data.priceChild = new Prisma.Decimal(dto.priceChild);
    return prisma.tour.update({ where: { id }, data });
  }

  async createSlot(dto: CreateTourSlotInput, userId?: string) {
    const tour = await prisma.tour.findUnique({ where: { id: dto.tourId } });
    if (!tour) throw new NotFoundException('Không tìm thấy tour');
    if (dto.startAt <= new Date()) throw new BadRequestException('Thời gian slot phải ở tương lai');
    return prisma.tourSlot.create({
      data: { ...dto, createdById: userId, capacity: dto.capacity || tour.capacity },
    });
  }

  async createSlots(dto: BatchCreateTourSlotsInput, userId?: string) {
    const tour = await prisma.tour.findUnique({ where: { id: dto.tourId } });
    if (!tour) throw new NotFoundException('Không tìm thấy tour');
    const dates = generateBatchSlotDates(dto.from, dto.to, dto.weekdays, dto.times).filter(
      (date) => date > new Date(),
    );
    const result = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const startAt of dates)
        created.push(
          await tx.tourSlot.upsert({
            where: { tourId_startAt: { tourId: dto.tourId, startAt } },
            update: {},
            create: {
              tourId: dto.tourId,
              startAt,
              capacity: dto.capacity || tour.capacity,
              createdById: userId,
            },
          }),
        );
      return created;
    });
    return { data: result, count: result.length };
  }

  async findSlots(query: QueryTourSlotInput, publicOnly = false) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 50;
    const where: Prisma.TourSlotWhereInput = {
      ...(query.tourId ? { tourId: query.tourId } : {}),
      ...(publicOnly
        ? { isActive: true, startAt: { gte: new Date() }, tour: { isPublished: true } }
        : {}),
    };
    if (query.from || query.to)
      where.startAt = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    const [data, total] = await Promise.all([
      prisma.tourSlot.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startAt: 'asc' },
        include: { tour: true },
      }),
      prisma.tourSlot.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async updateSlot(id: string, dto: UpdateTourSlotInput) {
    const slot = await prisma.tourSlot.findUnique({ where: { id } });
    if (!slot) throw new NotFoundException('Không tìm thấy slot');
    if (dto.capacity !== undefined && dto.capacity < slot.bookedCount)
      throw new BadRequestException('Sức chứa không được nhỏ hơn số đã đặt');
    return prisma.tourSlot.update({ where: { id }, data: dto });
  }
}
