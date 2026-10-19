import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  Inject,
} from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { SequenceService } from '../../common/sequence/sequence.service';
import { CreatePaymentDto, QueryPaymentDto } from './finance.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(SequenceService)
    private readonly sequenceService: SequenceService,
  ) {}

  async findAll(query: QueryPaymentDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.PaymentWhereInput = {};
    if (query.orderId) {
      where.orderId = query.orderId;
    }

    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        include: {
          order: {
            select: {
              id: true,
              code: true,
              total: true,
              paymentStatus: true,
              status: true,
              customer: { select: { id: true, name: true, phone: true } },
            },
          },
          createdBy: { select: { id: true, fullName: true, role: true } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
        createdBy: { select: { id: true, fullName: true, role: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException('Không tìm thấy thanh toán');
    }

    return payment;
  }

  async addSalesOrderPayment(orderId: string, dto: CreatePaymentDto, userId?: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      if (order.status === 'CANCELLED') {
        throw new UnprocessableEntityException('Không thể thu tiền cho đơn hàng đã hủy');
      }

      const existingPayments = await tx.payment.findMany({
        where: { orderId: order.id },
      });

      const currentPaid = existingPayments.reduce(
        (sum, p) => sum.plus(p.amount),
        new Prisma.Decimal(0),
      );

      const amount = new Prisma.Decimal(dto.amount);
      if (amount.lte(0)) {
        throw new UnprocessableEntityException('Số tiền thanh toán phải lớn hơn 0');
      }

      const newTotalPaid = currentPaid.plus(amount);
      if (newTotalPaid.greaterThan(order.total)) {
        throw new UnprocessableEntityException('Số tiền thu vượt quá tổng giá trị đơn hàng');
      }

      let salesCat = await tx.financeCategory.findFirst({
        where: { systemKey: 'SALES' },
      });
      if (!salesCat) {
        salesCat = await tx.financeCategory.create({
          data: {
            name: 'Bán hàng',
            type: 'INCOME',
            systemKey: 'SALES',
            isActive: true,
          },
        });
      }

      const paymentCode = await this.sequenceService.nextInTransaction(tx, 'PM');
      const txCode = await this.sequenceService.nextInTransaction(tx, 'TX');
      const paidDate = dto.paidAt ? new Date(dto.paidAt) : new Date();

      const payment = await tx.payment.create({
        data: {
          code: paymentCode,
          orderId: order.id,
          amount,
          method: dto.method,
          paidAt: paidDate,
          notes: dto.notes,
          createdById: userId,
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          code: txCode,
          type: 'INCOME',
          categoryId: salesCat.id,
          amount,
          date: paidDate,
          refType: 'Payment',
          refId: payment.id,
          method: dto.method,
          notes: dto.notes ?? `Thu tiền đơn hàng ${order.code}`,
          createdById: userId,
        },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: { transactionId: transaction.id },
      });

      const nextPaymentStatus = newTotalPaid.equals(order.total) ? 'PAID' : 'PARTIAL';
      await tx.salesOrder.update({
        where: { id: order.id },
        data: { paymentStatus: nextPaymentStatus },
      });

      return {
        ...payment,
        transactionId: transaction.id,
        transaction,
      };
    });
  }
}
