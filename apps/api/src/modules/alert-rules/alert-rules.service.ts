import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { CreateAlertRuleDto, QueryAlertRuleDto, UpdateAlertRuleDto } from './alert-rules.dto';

@Injectable()
export class AlertRulesService {
  async findAll(query: QueryAlertRuleDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.AlertRuleWhereInput = {
      ...(query.sensorId ? { sensorId: query.sensorId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.alertRule.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { sensor: { select: { id: true, code: true, name: true, unit: true } } },
      }),
      prisma.alertRule.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async findById(id: string) {
    const rule = await prisma.alertRule.findUnique({
      where: { id },
      include: {
        sensor: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            unit: true,
            areaId: true,
            isActive: true,
          },
        },
      },
    });
    if (!rule) throw new NotFoundException('Không tìm thấy ngưỡng cảnh báo');
    return { data: rule };
  }

  private async ensureSensor(sensorId: string) {
    const sensor = await prisma.sensor.findUnique({
      where: { id: sensorId },
      select: { id: true },
    });
    if (!sensor) throw new UnprocessableEntityException('Cảm biến không tồn tại');
  }

  async create(dto: CreateAlertRuleDto, userId?: string) {
    await this.ensureSensor(dto.sensorId);
    const rule = await prisma.alertRule.create({
      data: { ...dto, createdById: userId ?? null },
      include: {
        sensor: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            unit: true,
            areaId: true,
            isActive: true,
          },
        },
      },
    });
    return { data: rule };
  }

  async update(id: string, dto: UpdateAlertRuleDto) {
    const existing = await prisma.alertRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy ngưỡng cảnh báo');
    if (dto.sensorId) await this.ensureSensor(dto.sensorId);
    const rule = await prisma.alertRule.update({
      where: { id },
      data: dto,
      include: {
        sensor: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            unit: true,
            areaId: true,
            isActive: true,
          },
        },
      },
    });
    return { data: rule };
  }

  async remove(id: string) {
    const existing = await prisma.alertRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy ngưỡng cảnh báo');
    const rule = await prisma.alertRule.update({
      where: { id },
      data: { isActive: false },
      include: {
        sensor: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            unit: true,
            areaId: true,
            isActive: true,
          },
        },
      },
    });
    return { data: rule, message: 'Đã tắt ngưỡng cảnh báo' };
  }
}
