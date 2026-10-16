import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { prisma } from '@xfarm/db';
import { CreateUserDto, UpdateUserDto, QueryUsersDto } from './users.dto';

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  isActive: true,
  employeeId: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  async findAll(query: QueryUsersDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    let orderBy: Record<string, 'asc' | 'desc'> = { createdAt: 'desc' };
    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      if (field) {
        orderBy = { [field]: direction === 'asc' ? 'asc' : 'desc' };
      }
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: userSelect,
        skip,
        take: pageSize,
        orderBy,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: dto.role,
        isActive: true,
      },
      select: userSelect,
    });

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (dto.email && dto.email !== existing.email) {
      const duplicate = await prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (duplicate) {
        throw new ConflictException('Email này đã được sử dụng bởi người dùng khác');
      }
    }

    const updateData: Record<string, unknown> = {
      ...(dto.email ? { email: dto.email } : {}),
      ...(dto.fullName ? { fullName: dto.fullName } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.role ? { role: dto.role } : {}),
    };

    if (dto.password) {
      updateData.passwordHash = await argon2.hash(dto.password);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: userSelect,
    });

    return updated;
  }

  async updateStatus(id: string, isActive: boolean) {
    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: userSelect,
    });

    // If deactivated, revoke all active refresh tokens
    if (!isActive) {
      await prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return updated;
  }
}
