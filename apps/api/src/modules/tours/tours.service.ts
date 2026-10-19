import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { generateBatchSlotDates } from '@xfarm/shared';
import {
  CreateTourDto,
  UpdateTourDto,
  QueryTourDto,
  CreateTourSlotDto,
  UpdateTourSlotDto,
  BatchCreateTourSlotsDto,
  PublicQueryTourDto,
} from './tours.dto';
import { generateUniqueTourSlug, toSlug } from './tours.utils';

function parseBoundaryDate(val: string | Date | undefined, isEndOfDay: boolean): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  const str = String(val).trim();
  if (!str) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const timePart = isEndOfDay ? '23:59:59.999' : '00:00:00.000';
    return new Date(`${str}T${timePart}+07:00`);
  }
  return new Date(str);
}

@Injectable()
export class ToursService {
  // ==========================================
  // TOURS (ADMIN)
  // ==========================================

  async findTours(query: QueryTourDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.TourWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.isPublished !== undefined) {
      where.isPublished = query.isPublished;
    }

    let orderBy: Prisma.TourOrderByWithRelationInput[] = [
      { sortOrder: 'asc' },
      { createdAt: 'desc' },
    ];

    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      const dir = direction?.toLowerCase() === 'asc' ? 'asc' : 'desc';
      if (
        [
          'name',
          'slug',
          'priceAdult',
          'priceChild',
          'capacity',
          'sortOrder',
          'createdAt',
          'updatedAt',
        ].includes(field)
      ) {
        orderBy = [{ [field]: dir }];
      }
    }

    const [data, total] = await Promise.all([
      prisma.tour.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
      }),
      prisma.tour.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findTourById(idOrSlug: string) {
    const tour = await prisma.tour.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
    });

    if (!tour) {
      throw new NotFoundException('Không tìm thấy tour');
    }

    return tour;
  }

  async createTour(dto: CreateTourDto, createdById?: string) {
    let slug: string;

    if (dto.slug && dto.slug.trim()) {
      const candidate = toSlug(dto.slug);
      const existing = await prisma.tour.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (existing) {
        throw new BadRequestException('Slug đã tồn tại');
      }
      slug = candidate;
    } else {
      slug = await generateUniqueTourSlug(dto.name);
    }

    const tour = await prisma.tour.create({
      data: {
        slug,
        name: dto.name.trim(),
        description: dto.description.trim(),
        durationMinutes: dto.durationMinutes,
        priceAdult: new Prisma.Decimal(dto.priceAdult),
        priceChild: new Prisma.Decimal(dto.priceChild),
        capacity: dto.capacity,
        mediaIds: dto.mediaIds ?? [],
        isPublished: dto.isPublished ?? false,
        sortOrder: dto.sortOrder ?? 0,
        createdById,
      },
    });

    return tour;
  }

  async updateTour(id: string, dto: UpdateTourDto) {
    const existing = await this.findTourById(id);

    let slug = existing.slug;
    if (dto.slug && dto.slug.trim()) {
      const candidate = toSlug(dto.slug);
      if (candidate !== existing.slug) {
        const duplicate = await prisma.tour.findUnique({
          where: { slug: candidate },
          select: { id: true },
        });
        if (duplicate && duplicate.id !== existing.id) {
          throw new BadRequestException('Slug đã tồn tại');
        }
        slug = candidate;
      }
    }

    const data: Prisma.TourUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(slug !== existing.slug ? { slug } : {}),
      ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
      ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
      ...(dto.priceAdult !== undefined ? { priceAdult: new Prisma.Decimal(dto.priceAdult) } : {}),
      ...(dto.priceChild !== undefined ? { priceChild: new Prisma.Decimal(dto.priceChild) } : {}),
      ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
      ...(dto.mediaIds !== undefined ? { mediaIds: dto.mediaIds } : {}),
      ...(dto.isPublished !== undefined ? { isPublished: dto.isPublished } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    };

    const updated = await prisma.tour.update({
      where: { id: existing.id },
      data,
    });

    return updated;
  }

  async setTourPublished(id: string, isPublished: boolean) {
    const existing = await this.findTourById(id);
    return prisma.tour.update({
      where: { id: existing.id },
      data: { isPublished },
    });
  }

  async deleteTour(id: string) {
    const existing = await this.findTourById(id);

    const bookingCount = await prisma.booking.count({
      where: { slot: { tourId: existing.id } },
    });

    if (bookingCount > 0) {
      throw new BadRequestException('Không thể xóa tour đã có lượt đặt chỗ');
    }

    await prisma.tour.delete({
      where: { id: existing.id },
    });

    return { success: true };
  }

  // ==========================================
  // TOUR SLOTS (ADMIN)
  // ==========================================

  async findTourSlots(
    tourIdOrSlug: string,
    query: { from?: string | Date; to?: string | Date; page?: number; pageSize?: number },
  ) {
    const tour = await this.findTourById(tourIdOrSlug);

    const where: Prisma.TourSlotWhereInput = {
      tourId: tour.id,
    };

    const fromDate = parseBoundaryDate(query.from, false);
    const toDate = parseBoundaryDate(query.to, true);

    if (fromDate || toDate) {
      where.startAt = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      };
    }

    const rawSlots = await prisma.tourSlot.findMany({
      where,
      orderBy: { startAt: 'asc' },
    });

    const data = rawSlots.map((s) => ({
      ...s,
      remaining: Math.max(0, s.capacity - s.bookedCount),
    }));

    return {
      data,
      total: data.length,
      page: Number(query.page) || 1,
      pageSize: Number(query.pageSize) || data.length || 20,
    };
  }

  async batchCreateSlots(tourIdOrSlug: string, dto: BatchCreateTourSlotsDto, createdById?: string) {
    const tour = await this.findTourById(tourIdOrSlug);
    const capacity = dto.capacity ?? tour.capacity;

    const dates = generateBatchSlotDates(dto.from, dto.to, dto.weekdays, dto.times);

    if (dates.length === 0) {
      return {
        created: 0,
        skipped: 0,
        data: { created: 0, skipped: 0 },
      };
    }

    const slotDataList = dates.map((startAt) => ({
      tourId: tour.id,
      startAt,
      capacity,
      isActive: true,
      createdById,
    }));

    const result = await prisma.tourSlot.createMany({
      data: slotDataList,
      skipDuplicates: true,
    });

    const created = result.count;
    const skipped = slotDataList.length - created;

    return {
      created,
      skipped,
      data: { created, skipped },
    };
  }

  async createSlot(tourIdOrSlug: string, dto: CreateTourSlotDto, createdById?: string) {
    const tour = await this.findTourById(tourIdOrSlug);

    const slot = await prisma.tourSlot.create({
      data: {
        tourId: tour.id,
        startAt: new Date(dto.startAt),
        capacity: dto.capacity,
        isActive: dto.isActive ?? true,
        createdById,
      },
    });

    return {
      ...slot,
      remaining: Math.max(0, slot.capacity - slot.bookedCount),
    };
  }

  async findSlotById(id: string) {
    const slot = await prisma.tourSlot.findUnique({
      where: { id },
    });

    if (!slot) {
      throw new NotFoundException('Không tìm thấy slot');
    }

    return {
      ...slot,
      remaining: Math.max(0, slot.capacity - slot.bookedCount),
    };
  }

  async updateSlot(id: string, dto: UpdateTourSlotDto) {
    const slot = await prisma.tourSlot.findUnique({
      where: { id },
    });

    if (!slot) {
      throw new NotFoundException('Không tìm thấy slot');
    }

    if (dto.capacity !== undefined && dto.capacity < slot.bookedCount) {
      throw new HttpException(
        'Sức chứa không được nhỏ hơn số lượng vé đã đặt',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const data: Prisma.TourSlotUpdateInput = {
      ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };

    const updated = await prisma.tourSlot.update({
      where: { id },
      data,
    });

    return {
      ...updated,
      remaining: Math.max(0, updated.capacity - updated.bookedCount),
    };
  }

  async deleteSlot(id: string) {
    const slot = await prisma.tourSlot.findUnique({
      where: { id },
    });

    if (!slot) {
      throw new NotFoundException('Không tìm thấy slot');
    }

    const bookingCount = await prisma.booking.count({
      where: { slotId: id },
    });

    if (bookingCount > 0 || slot.bookedCount > 0) {
      throw new BadRequestException('Không thể xóa slot đã có lượt đặt chỗ');
    }

    await prisma.tourSlot.delete({
      where: { id },
    });

    return { success: true };
  }

  // ==========================================
  // PUBLIC ENDPOINTS
  // ==========================================

  async findPublicTours(query: PublicQueryTourDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.TourWhereInput = {
      isPublished: true,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.tour.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          durationMinutes: true,
          priceAdult: true,
          priceChild: true,
          capacity: true,
          mediaIds: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.tour.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findPublicTourBySlug(slug: string) {
    const tour = await prisma.tour.findFirst({
      where: {
        slug,
        isPublished: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        durationMinutes: true,
        priceAdult: true,
        priceChild: true,
        capacity: true,
        mediaIds: true,
        isPublished: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!tour) {
      throw new NotFoundException('Không tìm thấy tour');
    }

    const now = new Date();
    const sixtyDaysLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const rawSlots = await prisma.tourSlot.findMany({
      where: {
        tourId: tour.id,
        isActive: true,
        startAt: {
          gt: now,
          lte: sixtyDaysLater,
        },
      },
      orderBy: { startAt: 'asc' },
      select: {
        id: true,
        tourId: true,
        startAt: true,
        capacity: true,
        bookedCount: true,
        isActive: true,
      },
    });

    const slots = rawSlots
      .filter((s) => s.capacity > s.bookedCount)
      .map((s) => ({
        ...s,
        remaining: s.capacity - s.bookedCount,
      }));

    return {
      ...tour,
      slots,
    };
  }
}
