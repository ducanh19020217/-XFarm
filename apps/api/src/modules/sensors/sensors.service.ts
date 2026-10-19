import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { prisma, Prisma } from '@xfarm/db';
import { SequenceService } from '../../common/sequence/sequence.service';
import { CreateSensorDto, QuerySensorDto, UpdateSensorDto } from './sensors.dto';

const sensorPublicSelect = {
  id: true,
  code: true,
  name: true,
  type: true,
  unit: true,
  areaId: true,
  lastSeenAt: true,
  isActive: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  area: { select: { id: true, code: true, name: true } },
  readings: {
    take: 1,
    orderBy: { recordedAt: 'desc' },
    select: { value: true, recordedAt: true },
  },
  alertRules: {
    select: { id: true, op: true, threshold: true, isActive: true, cooldownMinutes: true },
  },
} satisfies Prisma.SensorSelect;

export function hashSensorKey(key: string) {
  return createHash('sha256').update(key).digest('hex');
}

function issueSensorKey() {
  const key = randomBytes(32).toString('base64url');
  return { key, prefix: key.slice(0, 12), hash: hashSensorKey(key) };
}

@Injectable()
export class SensorsService {
  constructor(private readonly sequenceService: SequenceService) {}

  async findAll(query: QuerySensorDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.SensorWhereInput = {};
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.areaId) where.areaId = query.areaId;
    if (query.type) where.type = query.type;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    let orderBy: Prisma.SensorOrderByWithRelationInput[] = [{ createdAt: 'desc' }, { id: 'desc' }];
    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      if (field && ['code', 'name', 'type', 'lastSeenAt', 'createdAt'].includes(field)) {
        orderBy = [
          {
            [field]: direction === 'asc' ? 'asc' : 'desc',
          } as Prisma.SensorOrderByWithRelationInput,
          { createdAt: 'desc' },
          { id: 'desc' },
        ];
      }
    }

    const [data, total] = await Promise.all([
      prisma.sensor.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        select: sensorPublicSelect,
      }),
      prisma.sensor.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async findById(id: string) {
    const sensor = await prisma.sensor.findUnique({ where: { id }, select: sensorPublicSelect });
    if (!sensor) throw new NotFoundException('Không tìm thấy cảm biến');
    return { data: sensor };
  }

  async create(dto: CreateSensorDto, userId?: string) {
    const area = await prisma.area.findUnique({ where: { id: dto.areaId }, select: { id: true } });
    if (!area) throw new UnprocessableEntityException('Khu/lô không tồn tại');
    const code = dto.code?.trim() || (await this.sequenceService.nextSimple('SN'));
    const existing = await prisma.sensor.findUnique({ where: { code } });
    if (existing) throw new ConflictException('Mã cảm biến đã tồn tại');
    const issued = issueSensorKey();
    const sensor = await prisma.sensor.create({
      data: {
        code,
        name: dto.name,
        type: dto.type,
        unit: dto.unit,
        areaId: dto.areaId,
        apiKeyHash: issued.hash,
        apiKeyPrefix: issued.prefix,
        isActive: dto.isActive ?? true,
        createdById: userId ?? null,
      },
      select: sensorPublicSelect,
    });
    return { data: sensor, apiKey: issued.key };
  }

  async update(id: string, dto: UpdateSensorDto) {
    const existing = await prisma.sensor.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy cảm biến');
    if (dto.code && dto.code !== existing.code) {
      const duplicate = await prisma.sensor.findUnique({ where: { code: dto.code } });
      if (duplicate) throw new ConflictException('Mã cảm biến đã tồn tại');
    }
    if (dto.areaId) {
      const area = await prisma.area.findUnique({
        where: { id: dto.areaId },
        select: { id: true },
      });
      if (!area) throw new UnprocessableEntityException('Khu/lô không tồn tại');
    }
    const sensor = await prisma.sensor.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
        ...(dto.areaId !== undefined ? { areaId: dto.areaId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: sensorPublicSelect,
    });
    return { data: sensor };
  }

  async rotateKey(id: string) {
    const existing = await prisma.sensor.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Không tìm thấy cảm biến');
    const issued = issueSensorKey();
    const sensor = await prisma.sensor.update({
      where: { id },
      data: { apiKeyHash: issued.hash, apiKeyPrefix: issued.prefix },
      select: sensorPublicSelect,
    });
    return { data: sensor, apiKey: issued.key };
  }
}
