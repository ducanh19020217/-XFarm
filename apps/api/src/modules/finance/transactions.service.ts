import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  Inject,
} from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { SequenceService } from '../../common/sequence/sequence.service';
import { CreateTransactionDto, UpdateTransactionDto, QueryTransactionDto } from './finance.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(SequenceService)
    private readonly sequenceService: SequenceService,
  ) {}

  async findAll(query: QueryTransactionDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.TransactionWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.cycleId) {
      where.cycleId = query.cycleId;
    }

    if (query.method) {
      where.method = query.method;
    }

    if (query.from || query.to) {
      where.date = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    if (query.search) {
      // Cho phép tìm giao dịch tự động theo mã đơn bán (qua Payment) hoặc mã PO
      const [payments, purchaseOrders] = await Promise.all([
        prisma.payment.findMany({
          where: { order: { code: { contains: query.search, mode: 'insensitive' } } },
          select: { id: true },
          take: 200,
        }),
        prisma.purchaseOrder.findMany({
          where: { code: { contains: query.search, mode: 'insensitive' } },
          select: { id: true },
          take: 200,
        }),
      ]);
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
        { refType: 'Payment', refId: { in: payments.map((p) => p.id) } },
        { refType: 'PurchaseOrder', refId: { in: purchaseOrders.map((po) => po.id) } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        include: {
          category: { select: { id: true, name: true, type: true, systemKey: true } },
          cycle: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, fullName: true, role: true } },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    const paymentIds = data
      .filter((t) => t.refType === 'Payment' && t.refId)
      .map((t) => t.refId as string);
    const poIds = data
      .filter((t) => (t.refType === 'PurchaseOrder' || t.refType === 'PO') && t.refId)
      .map((t) => t.refId as string);

    const [payments, pos] = await Promise.all([
      paymentIds.length > 0
        ? prisma.payment.findMany({
            where: { id: { in: paymentIds } },
            include: { order: { select: { id: true, code: true } } },
          })
        : [],
      poIds.length > 0
        ? prisma.purchaseOrder.findMany({
            where: { id: { in: poIds } },
            select: { id: true, code: true },
          })
        : [],
    ]);

    const paymentMap = new Map(payments.map((p) => [p.id, p]));
    const poMap = new Map(pos.map((p) => [p.id, p]));

    const enriched = data.map((t) => {
      let orderId: string | undefined;
      let orderCode: string | undefined;
      let poId: string | undefined;
      let poCode: string | undefined;

      if (t.refType === 'Payment' && t.refId) {
        const pm = paymentMap.get(t.refId);
        orderId = pm?.orderId ?? undefined;
        orderCode = pm?.order?.code ?? undefined;
      } else if (t.refType === 'SalesOrder' && t.refId) {
        orderId = t.refId;
      } else if ((t.refType === 'PurchaseOrder' || t.refType === 'PO') && t.refId) {
        const po = poMap.get(t.refId);
        poId = po?.id ?? t.refId;
        poCode = po?.code ?? undefined;
      }

      return {
        ...t,
        orderId,
        orderCode,
        poId,
        poCode,
      };
    });

    return {
      data: enriched,
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string) {
    const tx = await prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
        cycle: true,
        createdBy: { select: { id: true, fullName: true, role: true } },
      },
    });

    if (!tx) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }

    return tx;
  }

  async create(dto: CreateTransactionDto, userId?: string) {
    return prisma.$transaction(async (tx) => {
      const category = await tx.financeCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Không tìm thấy danh mục thu chi');
      }

      if (category.type !== dto.type) {
        throw new UnprocessableEntityException('Loại giao dịch không khớp với loại danh mục');
      }

      if (dto.cycleId) {
        const cycle = await tx.cycle.findUnique({
          where: { id: dto.cycleId },
        });
        if (!cycle) {
          throw new NotFoundException('Không tìm thấy mùa vụ');
        }
      }

      const code = await this.sequenceService.nextInTransaction(tx, 'TX');
      const amount = new Prisma.Decimal(dto.amount);

      return tx.transaction.create({
        data: {
          code,
          type: dto.type,
          categoryId: dto.categoryId,
          amount,
          date: new Date(dto.date),
          cycleId: dto.cycleId,
          refType: dto.refType,
          refId: dto.refId,
          method: dto.method,
          notes: dto.notes,
          mediaIds: dto.mediaIds ?? [],
          createdById: userId,
        },
        include: {
          category: true,
          cycle: true,
          createdBy: { select: { id: true, fullName: true, role: true } },
        },
      });
    });
  }

  async update(id: string, dto: UpdateTransactionDto) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException('Không tìm thấy giao dịch');
      }

      if (existing.refType) {
        throw new UnprocessableEntityException('Không thể chỉnh sửa giao dịch tự động');
      }

      const targetType = dto.type ?? existing.type;
      const targetCategoryId = dto.categoryId ?? existing.categoryId;

      if (dto.categoryId || dto.type) {
        const category = await tx.financeCategory.findUnique({
          where: { id: targetCategoryId },
        });
        if (!category) {
          throw new NotFoundException('Không tìm thấy danh mục thu chi');
        }
        if (category.type !== targetType) {
          throw new UnprocessableEntityException('Loại giao dịch không khớp với loại danh mục');
        }
      }

      if (dto.cycleId) {
        const cycle = await tx.cycle.findUnique({
          where: { id: dto.cycleId },
        });
        if (!cycle) {
          throw new NotFoundException('Không tìm thấy mùa vụ');
        }
      }

      return tx.transaction.update({
        where: { id },
        data: {
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
          ...(dto.amount !== undefined ? { amount: new Prisma.Decimal(dto.amount) } : {}),
          ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
          ...(dto.cycleId !== undefined ? { cycleId: dto.cycleId } : {}),
          ...(dto.method !== undefined ? { method: dto.method } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          ...(dto.mediaIds !== undefined ? { mediaIds: dto.mediaIds } : {}),
        },
        include: {
          category: true,
          cycle: true,
          createdBy: { select: { id: true, fullName: true, role: true } },
        },
      });
    });
  }

  async remove(id: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException('Không tìm thấy giao dịch');
      }

      if (existing.refType) {
        throw new UnprocessableEntityException('Không thể xóa giao dịch tự động');
      }

      await tx.transaction.delete({
        where: { id },
      });

      return { message: 'Xóa giao dịch thành công' };
    });
  }
}
