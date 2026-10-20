import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { timingSafeEqual } from 'node:crypto';
import { hashSensorKey } from '../sensors/sensors.service';
import { IotReadingsDto, QueryTimeseriesDto } from './iot.dto';

type RateEntry = { startedAt: number; count: number };
const rateLimit = new Map<string, RateEntry>();

function sameHash(left: string, right: string) {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

@Injectable()
export class IotService {
  private async authenticate(key: string | undefined) {
    if (!key) throw new UnauthorizedException('X-Sensor-Key không hợp lệ');
    const candidates = await prisma.sensor.findMany({
      where: { apiKeyPrefix: key.slice(0, 12) },
      select: { id: true, apiKeyHash: true, isActive: true },
    });
    const sensor = candidates.find((candidate) =>
      sameHash(candidate.apiKeyHash, hashSensorKey(key)),
    );
    if (!sensor) throw new UnauthorizedException('X-Sensor-Key không hợp lệ');
    if (!sensor.isActive) throw new ForbiddenException('Cảm biến đã bị khóa');
    return sensor;
  }

  private checkRateLimit(sensorId: string) {
    const now = Date.now();
    const current = rateLimit.get(sensorId);
    if (!current || now - current.startedAt >= 60_000) {
      rateLimit.set(sensorId, { startedAt: now, count: 1 });
      return;
    }
    if (current.count >= 60)
      throw new HttpException(
        'Cảm biến gửi quá nhiều yêu cầu, vui lòng thử lại sau',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    current.count += 1;
  }

  async ingest(key: string | undefined, dto: IotReadingsDto) {
    const sensor = await this.authenticate(key);
    this.checkRateLimit(sensor.id);
    const now = new Date();
    const maxRecordedAt = new Date(now.getTime() + 5 * 60_000);
    const readings = dto.readings.map((reading) => ({
      value: new Prisma.Decimal(reading.value),
      recordedAt: reading.recordedAt ? new Date(reading.recordedAt) : now,
    }));
    if (readings.some((reading) => reading.recordedAt > maxRecordedAt))
      throw new UnprocessableEntityException('Không được gửi reading quá 5 phút trong tương lai');

    const result = await prisma.$transaction(async (tx) => {
      await tx.sensorReading.createMany({
        data: readings.map((reading) => ({ ...reading, sensorId: sensor.id })),
      });
      await tx.sensor.update({ where: { id: sensor.id }, data: { lastSeenAt: now } });
      const rules = await tx.alertRule.findMany({
        where: { sensorId: sensor.id, isActive: true },
        include: { sensor: { include: { area: { select: { name: true } } } } },
      });
      let alertsCreated = 0;
      for (const rule of rules) {
        const exceeded = readings.some((reading) =>
          rule.op === 'GT'
            ? reading.value.greaterThan(rule.threshold)
            : reading.value.lessThan(rule.threshold),
        );
        if (!exceeded) continue;
        const recent = await tx.alert.findFirst({
          where: {
            ruleId: rule.id,
            createdAt: { gte: new Date(now.getTime() - rule.cooldownMinutes * 60_000) },
          },
          select: { id: true },
        });
        if (recent) continue;
        const sample = readings.find((reading) =>
          rule.op === 'GT'
            ? reading.value.greaterThan(rule.threshold)
            : reading.value.lessThan(rule.threshold),
        )!;
        await tx.alert.create({
          data: {
            ruleId: rule.id,
            type: 'SENSOR_THRESHOLD',
            message: `${rule.sensor.area.name}: ${rule.sensor.name} = ${sample.value.toString()} ${rule.sensor.unit} ${rule.op === 'GT' ? 'cao hơn' : 'thấp hơn'} ngưỡng ${rule.threshold.toString()}`,
            refType: 'Sensor',
            refId: sensor.id,
            dedupeKey: `SENSOR_THRESHOLD:${rule.id}:${now.getTime()}`,
          },
        });
        alertsCreated += 1;
      }
      return { count: readings.length, alertsCreated };
    });
    return { data: { sensorId: sensor.id, ...result } };
  }

  async series(query: QueryTimeseriesDto) {
    const interval = { '5m': '5 minutes', '1h': '1 hour', '1d': '1 day' }[query.bucket];
    const sensorCondition = query.sensorId
      ? Prisma.sql`sr."sensorId" = ${query.sensorId}`
      : Prisma.sql`s."areaId" = ${query.areaId}`;
    const rows = await prisma.$queryRaw<
      Array<{
        sensorId: string;
        sensorName: string;
        areaId: string;
        bucket: Date;
        avg: Prisma.Decimal;
        min: Prisma.Decimal;
        max: Prisma.Decimal;
      }>
    >(
      Prisma.sql`SELECT sr."sensorId", s.name AS "sensorName", s."areaId", date_bin(${interval}::interval, sr."recordedAt", TIMESTAMP '1970-01-01') AS bucket, AVG(sr.value) AS avg, MIN(sr.value) AS min, MAX(sr.value) AS max FROM "sensor_readings" sr JOIN "sensors" s ON s.id = sr."sensorId" WHERE ${sensorCondition} AND sr."recordedAt" >= ${query.from} AND sr."recordedAt" <= ${query.to} GROUP BY sr."sensorId", s.name, s."areaId", bucket ORDER BY bucket ASC, sr."sensorId" ASC`,
    );
    const counts = new Map<string, number>();
    const data = rows
      .filter((row) => {
        const count = counts.get(row.sensorId) ?? 0;
        if (count >= 2000) return false;
        counts.set(row.sensorId, count + 1);
        return true;
      })
      .map((row) => ({
        sensorId: row.sensorId,
        sensorName: row.sensorName,
        areaId: row.areaId,
        bucket: row.bucket,
        avg: Number(row.avg),
        min: Number(row.min),
        max: Number(row.max),
      }));
    return { data };
  }

  async latest(areaId?: string) {
    const whereCondition = areaId
      ? Prisma.sql`WHERE s."areaId" = ${areaId} AND s."isActive" = true`
      : Prisma.sql`WHERE s."isActive" = true`;
    const rows = await prisma.$queryRaw<
      Array<{
        sensorId: string;
        sensorName: string;
        unit: string;
        areaId: string;
        value: Prisma.Decimal;
        recordedAt: Date;
      }>
    >(
      Prisma.sql`SELECT DISTINCT ON (sr."sensorId") sr."sensorId", s.name AS "sensorName", s.unit, s."areaId", sr.value, sr."recordedAt" FROM "sensor_readings" sr JOIN "sensors" s ON s.id = sr."sensorId" ${whereCondition} ORDER BY sr."sensorId", sr."recordedAt" DESC, sr.id DESC`,
    );
    return { data: rows.map((row) => ({ ...row, value: Number(row.value) })) };
  }
}
