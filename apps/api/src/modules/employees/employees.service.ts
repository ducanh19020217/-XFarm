import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { SequenceService } from '../../common/sequence/sequence.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  QueryEmployeeDto,
  LinkEmployeeUserDto,
} from './employees.dto';

const employeeInclude = {
  users: {
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  },
  _count: {
    select: {
      tasks: true,
      attendances: true,
    },
  },
};

@Injectable()
export class EmployeesService {
  constructor(@Inject(SequenceService) private readonly sequenceService: SequenceService) {}

  async findAll(query: QueryEmployeeDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.EmployeeWhereInput = {};

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { position: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.payType) {
      where.payType = query.payType;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    let orderBy: Prisma.EmployeeOrderByWithRelationInput[] = [
      { createdAt: 'desc' },
      { id: 'desc' },
    ];

    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      const allowed = [
        'code',
        'fullName',
        'phone',
        'position',
        'payType',
        'baseRate',
        'isActive',
        'createdAt',
        'updatedAt',
      ];
      if (field && allowed.includes(field)) {
        orderBy = [
          { [field]: direction === 'asc' ? 'asc' : 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ];
      }
    }

    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: employeeInclude,
      }),
      prisma.employee.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string) {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: employeeInclude,
    });

    if (!employee) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    return employee;
  }

  async create(dto: CreateEmployeeDto) {
    let code = dto.code?.trim();
    if (!code) {
      let candidate = await this.sequenceService.nextCode('NV');
      while (await prisma.employee.findUnique({ where: { code: candidate } })) {
        candidate = await this.sequenceService.nextCode('NV');
      }
      code = candidate;
    } else {
      const existing = await prisma.employee.findUnique({
        where: { code },
      });
      if (existing) {
        throw new ConflictException('Mã nhân viên đã tồn tại');
      }
    }

    const employee = await prisma.employee.create({
      data: {
        code,
        fullName: dto.fullName,
        phone: dto.phone || null,
        position: dto.position,
        payType: dto.payType,
        baseRate: new Prisma.Decimal(dto.baseRate),
        isActive: dto.isActive ?? true,
      },
      include: employeeInclude,
    });

    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const existing = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    if (dto.code && dto.code !== existing.code) {
      const duplicate = await prisma.employee.findUnique({
        where: { code: dto.code },
      });
      if (duplicate) {
        throw new ConflictException('Mã nhân viên đã tồn tại');
      }
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
        ...(dto.payType !== undefined ? { payType: dto.payType } : {}),
        ...(dto.baseRate !== undefined ? { baseRate: new Prisma.Decimal(dto.baseRate) } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: employeeInclude,
    });

    return updated;
  }

  async softDelete(id: string) {
    const existing = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: { isActive: false },
      include: employeeInclude,
    });

    return updated;
  }

  async linkUser(id: string, dto: LinkEmployeeUserDto) {
    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    const targetUserId = dto.userId?.trim();

    if (targetUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        throw new NotFoundException('Không tìm thấy người dùng');
      }

      await prisma.$transaction(async (tx) => {
        // Unlink any user currently associated with this employee
        await tx.user.updateMany({
          where: { employeeId: id },
          data: { employeeId: null },
        });

        // Link the specified user
        await tx.user.update({
          where: { id: targetUserId },
          data: { employeeId: id },
        });
      });
    } else {
      // Unlink all users associated with this employee
      await prisma.user.updateMany({
        where: { employeeId: id },
        data: { employeeId: null },
      });
    }

    return prisma.employee.findUniqueOrThrow({
      where: { id },
      include: employeeInclude,
    });
  }
}
