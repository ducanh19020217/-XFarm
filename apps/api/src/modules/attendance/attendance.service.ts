import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ForbiddenException,
} from '@nestjs/common';
import { prisma } from '@xfarm/db';
import { Prisma } from '@xfarm/db';
import { Role } from '@xfarm/shared';
import {
  CheckInDto,
  CheckOutDto,
  CreateAttendanceDto,
  UpdateAttendanceDto,
  QueryAttendanceDto,
} from './attendance.dto';

const attendanceInclude = {
  employee: {
    select: {
      id: true,
      code: true,
      fullName: true,
      position: true,
      payType: true,
    },
  },
  cycle: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
};

interface CurrentUser {
  id: string;
  role: Role;
  employeeId?: string | null;
}

function getAttendanceDate(d: Date): Date {
  const iso = d.toISOString().split('T')[0];
  return new Date(`${iso}T00:00:00.000Z`);
}

@Injectable()
export class AttendanceService {
  async checkIn(dto: CheckInDto, user: CurrentUser) {
    let employeeId: string | undefined | null;

    if (user.role === Role.WORKER) {
      employeeId = user.employeeId;
      if (!employeeId) {
        throw new UnprocessableEntityException('Tài khoản chưa được liên kết với nhân viên nào');
      }
    } else {
      employeeId = dto.employeeId || user.employeeId;
      if (!employeeId) {
        throw new UnprocessableEntityException('Vui lòng chỉ định nhân viên chấm công');
      }
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee || !employee.isActive) {
      throw new UnprocessableEntityException('Nhân viên không tồn tại hoặc đã bị vô hiệu hóa');
    }

    if (dto.clientId) {
      const existingByClient = await prisma.attendance.findUnique({
        where: { clientId: dto.clientId },
        include: attendanceInclude,
      });
      if (existingByClient) {
        return existingByClient;
      }
    }

    const checkInTime = dto.at ? new Date(dto.at) : new Date();
    const attendanceDate = getAttendanceDate(checkInTime);

    const existingToday = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: attendanceDate,
      },
      include: attendanceInclude,
    });

    if (existingToday) {
      if (dto.clientId && existingToday.clientId === dto.clientId) {
        return existingToday;
      }
      throw new UnprocessableEntityException('Nhân viên đã chấm công vào trong ngày');
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        date: attendanceDate,
        checkIn: checkInTime,
        cycleId: dto.cycleId || null,
        notes: dto.notes || null,
        clientId: dto.clientId || null,
        hours: new Prisma.Decimal('0.00'),
      },
      include: attendanceInclude,
    });

    return attendance;
  }

  async checkOut(dto: CheckOutDto, user: CurrentUser) {
    let employeeId: string | undefined | null;

    if (user.role === Role.WORKER) {
      employeeId = user.employeeId;
      if (!employeeId) {
        throw new UnprocessableEntityException('Tài khoản chưa được liên kết với nhân viên nào');
      }
    } else {
      employeeId = dto.employeeId || user.employeeId;
      if (!employeeId) {
        throw new UnprocessableEntityException('Vui lòng chỉ định nhân viên chấm công');
      }
    }

    if (dto.clientId) {
      const existingByClient = await prisma.attendance.findUnique({
        where: { clientId: dto.clientId },
        include: attendanceInclude,
      });
      if (existingByClient && existingByClient.checkOut) {
        return existingByClient;
      }
    }

    const openAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        checkIn: { not: null },
        checkOut: null,
      },
      orderBy: [{ checkIn: 'desc' }, { date: 'desc' }],
      include: attendanceInclude,
    });

    if (!openAttendance || !openAttendance.checkIn) {
      throw new UnprocessableEntityException('Chưa chấm công vào hoặc đã chấm công ra');
    }

    const checkOutTime = dto.at ? new Date(dto.at) : new Date();
    if (checkOutTime.getTime() < openAttendance.checkIn.getTime()) {
      throw new UnprocessableEntityException('Thời gian ra phải sau thời gian vào');
    }

    // Rules: hours from checkIn and checkOut, rounded to 0.25h, subtract 1h break if duration > 6h
    const rawDurationHours =
      (checkOutTime.getTime() - openAttendance.checkIn.getTime()) / (1000 * 60 * 60);
    const netHours = rawDurationHours > 6 ? rawDurationHours - 1 : rawDurationHours;
    const roundedHours = Math.max(0, Math.round(netHours * 4) / 4);

    const updated = await prisma.attendance.update({
      where: { id: openAttendance.id },
      data: {
        checkOut: checkOutTime,
        hours: new Prisma.Decimal(roundedHours.toFixed(2)),
        pieceQty:
          dto.pieceQty !== undefined && dto.pieceQty !== null
            ? new Prisma.Decimal(dto.pieceQty)
            : dto.pieceQty === null
              ? null
              : undefined,
        cycleId: dto.cycleId !== undefined ? dto.cycleId || null : undefined,
        notes: dto.notes
          ? openAttendance.notes
            ? `${openAttendance.notes}; ${dto.notes}`
            : dto.notes
          : undefined,
        clientId: dto.clientId || openAttendance.clientId || null,
      },
      include: attendanceInclude,
    });

    return updated;
  }

  async findAll(query: QueryAttendanceDto, user: CurrentUser) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AttendanceWhereInput = {};

    if (user.role === Role.WORKER) {
      if (!user.employeeId) {
        return { data: [], total: 0, page, pageSize };
      }
      where.employeeId = user.employeeId;
    } else if (query.employeeId) {
      where.employeeId = query.employeeId;
    }

    if (query.cycleId) {
      where.cycleId = query.cycleId;
    }

    if (query.date) {
      where.date = getAttendanceDate(new Date(query.date));
    }

    if (query.from || query.to) {
      where.date = {
        ...(query.from ? { gte: getAttendanceDate(new Date(query.from)) } : {}),
        ...(query.to ? { lte: getAttendanceDate(new Date(query.to)) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ date: 'desc' }, { checkIn: 'desc' }, { id: 'desc' }],
        include: attendanceInclude,
      }),
      prisma.attendance.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string, user: CurrentUser) {
    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: attendanceInclude,
    });

    if (!attendance) {
      throw new NotFoundException('Không tìm thấy bản ghi chấm công');
    }

    if (user.role === Role.WORKER && attendance.employeeId !== user.employeeId) {
      throw new ForbiddenException('Bạn không có quyền truy cập bản ghi chấm công này');
    }

    return attendance;
  }

  async create(dto: CreateAttendanceDto) {
    const attendanceDate = getAttendanceDate(new Date(dto.date));
    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId: dto.employeeId,
        date: attendanceDate,
        cycleId: dto.cycleId || null,
      },
    });

    if (existing) {
      throw new UnprocessableEntityException(
        'Đã có bản ghi chấm công của nhân viên trong ngày này',
      );
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId: dto.employeeId,
        date: attendanceDate,
        checkIn: dto.checkIn ?? null,
        checkOut: dto.checkOut ?? null,
        hours:
          dto.hours !== undefined
            ? new Prisma.Decimal(Number(dto.hours).toFixed(2))
            : new Prisma.Decimal('0.00'),
        cycleId: dto.cycleId || null,
        pieceQty:
          dto.pieceQty !== undefined && dto.pieceQty !== null
            ? new Prisma.Decimal(dto.pieceQty)
            : null,
        notes: dto.notes || null,
        clientId: dto.clientId || null,
      },
      include: attendanceInclude,
    });

    return attendance;
  }

  async update(id: string, dto: UpdateAttendanceDto) {
    const existing = await prisma.attendance.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy bản ghi chấm công');
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        ...(dto.hours !== undefined
          ? { hours: new Prisma.Decimal(Number(dto.hours).toFixed(2)) }
          : {}),
        ...(dto.pieceQty !== undefined
          ? { pieceQty: dto.pieceQty !== null ? new Prisma.Decimal(dto.pieceQty) : null }
          : {}),
        ...(dto.cycleId !== undefined ? { cycleId: dto.cycleId || null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
        ...(dto.checkIn !== undefined ? { checkIn: dto.checkIn } : {}),
        ...(dto.checkOut !== undefined ? { checkOut: dto.checkOut } : {}),
        ...(dto.date !== undefined ? { date: getAttendanceDate(new Date(dto.date)) } : {}),
      },
      include: attendanceInclude,
    });

    return updated;
  }

  async remove(id: string) {
    const existing = await prisma.attendance.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy bản ghi chấm công');
    }

    await prisma.attendance.delete({
      where: { id },
    });

    return { message: 'Đã xóa bản ghi chấm công thành công' };
  }
}
