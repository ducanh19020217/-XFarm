import { Injectable } from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { QueryReceivablesDto } from './finance.dto';

@Injectable()
export class FinanceService {
  async getReceivables(query: QueryReceivablesDto) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const where: Prisma.SalesOrderWhereInput = {
      status: { not: 'CANCELLED' },
    };

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
        { customer: { phone: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const orders = await prisma.salesOrder.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        customer: true,
        payments: true,
      },
    });

    const customerDebtMap = new Map<
      string,
      {
        customer: { id: string; code: string; name: string; phone: string };
        totalOrders: Prisma.Decimal;
        totalPaid: Prisma.Decimal;
        debt: Prisma.Decimal;
        orderCount: number;
      }
    >();

    const byOrder: Array<{
      orderId: string;
      orderCode: string;
      customerId: string;
      customerName: string;
      customerPhone: string;
      status: string;
      paymentStatus: string;
      total: number;
      paid: number;
      remaining: number;
      createdAt: Date;
      confirmedAt: Date | null;
      isOverdue: boolean;
      daysOverdue: number;
    }> = [];

    let totalReceivable = new Prisma.Decimal(0);
    let totalOverdue = new Prisma.Decimal(0);

    for (const order of orders) {
      const orderPaid = order.payments.reduce(
        (sum, p) => sum.plus(p.amount),
        new Prisma.Decimal(0),
      );
      const remaining = order.total.minus(orderPaid);

      const cust = order.customer;
      const existingCust = customerDebtMap.get(cust.id) ?? {
        customer: { id: cust.id, code: cust.code, name: cust.name, phone: cust.phone },
        totalOrders: new Prisma.Decimal(0),
        totalPaid: new Prisma.Decimal(0),
        debt: new Prisma.Decimal(0),
        orderCount: 0,
      };
      existingCust.totalOrders = existingCust.totalOrders.plus(order.total);
      existingCust.totalPaid = existingCust.totalPaid.plus(orderPaid);
      existingCust.debt = existingCust.debt.plus(remaining);
      existingCust.orderCount += 1;
      customerDebtMap.set(cust.id, existingCust);

      // Overdue check: đơn COMPLETED|SHIPPING chưa PAID quá 7 ngày
      const isEligibleStatus = ['COMPLETED', 'SHIPPING'].includes(order.status);
      const baseDate = order.confirmedAt ?? order.createdAt;
      const isOlderThan7Days = baseDate < sevenDaysAgo;
      const isOverdue =
        isEligibleStatus &&
        order.paymentStatus !== 'PAID' &&
        remaining.greaterThan(0) &&
        isOlderThan7Days;

      const daysPassed = Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysOverdue = isOverdue ? Math.max(0, daysPassed - 7) : 0;

      if (remaining.greaterThan(0)) {
        totalReceivable = totalReceivable.plus(remaining);
        if (isOverdue) {
          totalOverdue = totalOverdue.plus(remaining);
        }
      }

      byOrder.push({
        orderId: order.id,
        orderCode: order.code,
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total.toNumber(),
        paid: orderPaid.toNumber(),
        remaining: remaining.toNumber(),
        createdAt: order.createdAt,
        confirmedAt: order.confirmedAt,
        isOverdue,
        daysOverdue,
      });
    }

    const byCustomer = Array.from(customerDebtMap.values()).map((entry) => ({
      customerId: entry.customer.id,
      customerCode: entry.customer.code,
      customerName: entry.customer.name,
      customerPhone: entry.customer.phone,
      totalOrders: entry.totalOrders.toNumber(),
      totalPaid: entry.totalPaid.toNumber(),
      debt: entry.debt.toNumber(),
      orderCount: entry.orderCount,
    }));

    return {
      byCustomer,
      byOrder,
      summary: {
        totalReceivable: totalReceivable.toNumber(),
        totalOverdue: totalOverdue.toNumber(),
        customerCount: byCustomer.filter((c) => c.debt > 0).length,
        orderCount: byOrder.filter((o) => o.remaining > 0).length,
      },
    };
  }
}
