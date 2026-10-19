import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { SequenceService } from '../../common/sequence/sequence.service';
import { CreateCustomerDto, QueryCustomerDto, UpdateCustomerDto } from './customers.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly sequence: SequenceService) {}

  async findAll(query: QueryCustomerDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where = {
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' as const } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { phone: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };
    const orderBy = query.sort?.split(':')[0];
    const allowed = ['code', 'name', 'phone', 'createdAt', 'updatedAt'];
    const sort = orderBy && allowed.includes(orderBy) ? orderBy : 'createdAt';
    const direction = query.sort?.split(':')[1] === 'asc' ? 'asc' : 'desc';
    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sort]: direction },
        include: { _count: { select: { salesOrders: true } } },
      }),
      prisma.customer.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async findById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        salesOrders: { where: { status: { not: 'CANCELLED' } }, include: { payments: true } },
      },
    });
    if (!customer) throw new NotFoundException('Không tìm thấy khách hàng');
    const total = customer.salesOrders.reduce(
      (sum, order) => sum.plus(order.total),
      new Prisma.Decimal(0),
    );
    const paid = customer.salesOrders.reduce(
      (sum, order) =>
        sum.plus(
          order.payments.reduce(
            (paymentSum, payment) => paymentSum.plus(payment.amount),
            new Prisma.Decimal(0),
          ),
        ),
      new Prisma.Decimal(0),
    );
    const result = Object.fromEntries(
      Object.entries(customer).filter(([key]) => key !== 'salesOrders'),
    );
    return { ...result, totalPurchase: total, debt: total.minus(paid) };
  }

  async create(dto: CreateCustomerDto, userId: string) {
    try {
      const code = await this.sequence.nextCode('CU');
      return await prisma.customer.create({ data: { ...dto, code, createdById: userId } });
    } catch (error) {
      if (error instanceof Error && error.message.includes('customers_phone_key')) {
        throw new ConflictException('Số điện thoại khách hàng đã tồn tại');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy khách hàng');
    try {
      return await prisma.customer.update({ where: { id }, data: dto });
    } catch (error) {
      if (error instanceof Error && error.message.includes('customers_phone_key')) {
        throw new ConflictException('Số điện thoại khách hàng đã tồn tại');
      }
      throw error;
    }
  }
}
