import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@xfarm/db';
import { ActivityType, AreaType, TraceResponse } from '@xfarm/shared';

function sanitizeActivityData(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  const forbiddenKeys = [
    /price/i,
    /cost/i,
    /unitCost/i,
    /totalCost/i,
    /fee/i,
    /amount/i,
    /money/i,
    /expense/i,
    /giá/i,
    /gia/i,
    /tiền/i,
    /tien/i,
    /chi_?phí/i,
    /chi_?phi/i,
    /đơn_?giá/i,
    /don_?gia/i,
    /notes?/i,
    /user/i,
    /email/i,
    /worker/i,
    /staff/i,
    /performed_?by/i,
    /created_?by/i,
  ];

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (forbiddenKeys.some((pattern) => pattern.test(key))) {
      continue;
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const sanitized = sanitizeActivityData(value);
      if (sanitized && Object.keys(sanitized).length > 0) {
        result[key] = sanitized;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

@Injectable()
export class PublicTraceService {
  async getTrace(traceCode: string): Promise<TraceResponse> {
    const lot = await prisma.harvestLot.findUnique({
      where: { traceCode },
      include: {
        cycle: {
          include: {
            area: true,
          },
        },
        activity: true,
      },
    });

    if (!lot || !lot.isPublic) {
      throw new NotFoundException('Không tìm thấy thông tin truy xuất nguồn gốc');
    }

    const product = await prisma.product.findFirst({
      where: {
        itemId: lot.itemId,
        isPublished: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        name: true,
        slug: true,
        unit: true,
      },
    });

    const timelineActivities = await prisma.activity.findMany({
      where: {
        cycleId: lot.cycleId,
        performedAt: { lte: lot.harvestedAt },
        id: { not: lot.activityId },
      },
      orderBy: [{ performedAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        type: true,
        performedAt: true,
        data: true,
        mediaIds: true,
      },
    });

    const lotMediaIds = lot.activity?.mediaIds ?? [];
    const timelineMediaIds = timelineActivities.flatMap((activity) => activity.mediaIds);
    const uniqueMediaIds = Array.from(new Set([...timelineMediaIds, ...lotMediaIds]));

    const mediaRecords =
      uniqueMediaIds.length > 0
        ? await prisma.media.findMany({
            where: { id: { in: uniqueMediaIds } },
            select: { id: true, url: true, alt: true },
          })
        : [];

    const mediaMap = new Map(mediaRecords.map((media) => [media.id, media]));

    const timeline = timelineActivities.map((activity) => {
      const firstMediaId = activity.mediaIds[0];
      const firstMedia = firstMediaId ? mediaMap.get(firstMediaId) : null;
      return {
        type: activity.type as unknown as ActivityType,
        performedAt: activity.performedAt,
        data: sanitizeActivityData(activity.data),
        mediaUrl: firstMedia?.url ?? null,
      };
    });

    const photos = uniqueMediaIds
      .map((id) => mediaMap.get(id))
      .filter((media): media is { id: string; url: string; alt: string | null } => Boolean(media))
      .map((media) => ({
        id: media.id,
        url: media.url,
        alt: media.alt ?? null,
      }));

    return {
      product: product
        ? {
            name: product.name,
            slug: product.slug,
            unit: product.unit,
          }
        : null,
      lot: {
        code: lot.code,
        traceCode: lot.traceCode,
        quantity: lot.quantity,
        unit: lot.unit,
        harvestedAt: lot.harvestedAt,
        qualityGrade: lot.qualityGrade,
        certification: lot.certification,
      },
      area: {
        name: lot.cycle.area.name,
        type: lot.cycle.area.type as unknown as AreaType,
      },
      cycle: {
        name: lot.cycle.name,
        species: lot.cycle.species,
        variety: lot.cycle.variety,
        startDate: lot.cycle.startDate,
      },
      timeline,
      photos,
    };
  }
}
