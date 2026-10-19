import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { CustomerType, PaymentMethod } from '@xfarm/shared';
import type { WebshopCheckoutInput } from '@xfarm/shared';
import { SequenceService } from '../../common/sequence/sequence.service';

@Injectable()
export class WebshopService {
  constructor(private readonly sequenceService: SequenceService) {}

  async createOrder(input: WebshopCheckoutInput) {
    let bankConfig: { bank: string; accountNumber: string; accountName: string } | undefined;
    if (input.paymentMethod === PaymentMethod.BANK_TRANSFER) {
      const setting = await prisma.siteSetting.findUnique({ where: { key: 'bank.vietqr' } });
      const bank = setting?.value as {
        bank?: string;
        accountNumber?: string;
        accountName?: string;
      } | null;
      if (!bank?.bank || !bank.accountNumber || !bank.accountName) {
        throw new UnprocessableEntityException('Chưa cấu hình tài khoản nhận chuyển khoản');
      }
      bankConfig = {
        bank: bank.bank,
        accountNumber: bank.accountNumber,
        accountName: bank.accountName,
      };
    }

    const requestedByProduct = new Map<string, Prisma.Decimal>();
    for (const line of input.items) {
      const quantity = new Prisma.Decimal(line.quantity);
      requestedByProduct.set(
        line.productId,
        (requestedByProduct.get(line.productId) ?? new Prisma.Decimal(0)).plus(quantity),
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: [...requestedByProduct.keys()] }, isPublished: true },
        select: { id: true, itemId: true, price: true },
      });
      if (products.length !== requestedByProduct.size) {
        throw new UnprocessableEntityException('Sản phẩm không tồn tại hoặc chưa được công khai');
      }

      const productById = new Map(products.map((product) => [product.id, product]));
      const itemIds = [...new Set(products.map((product) => product.itemId))];
      const stockRows = await tx.$queryRaw<
        Array<{ itemId: string; warehouseId: string | null; onHand: Prisma.Decimal }>
      >(Prisma.sql`
        SELECT "itemId", "warehouseId", SUM(quantity) AS "onHand"
        FROM "stock_balances"
        WHERE "itemId" IN (${Prisma.join(itemIds)})
        GROUP BY "itemId", "warehouseId"
        HAVING SUM(quantity) > 0
        ORDER BY "warehouseId" ASC
      `);
      const availableByItem = new Map<string, Prisma.Decimal>();
      const warehouseByItem = new Map<string, string>();
      for (const row of stockRows) {
        availableByItem.set(
          row.itemId,
          (availableByItem.get(row.itemId) ?? new Prisma.Decimal(0)).plus(row.onHand),
        );
        if (row.warehouseId && !warehouseByItem.has(row.itemId)) {
          warehouseByItem.set(row.itemId, row.warehouseId);
        }
      }
      for (const product of products) {
        const requested = requestedByProduct.get(product.id)!;
        const available = availableByItem.get(product.itemId) ?? new Prisma.Decimal(0);
        if (available.lessThan(requested)) {
          throw new UnprocessableEntityException('Sản phẩm không đủ tồn kho');
        }
      }

      const customer = await tx.customer.findUnique({ where: { phone: input.phone } });
      const savedCustomer =
        customer ??
        (await tx.customer.create({
          data: {
            code: await this.sequenceService.nextCode('CU', { tx }),
            name: input.fullName,
            phone: input.phone,
            address: input.address,
            type: CustomerType.RETAIL,
          },
        }));
      // Khách vãng lai không được sửa hồ sơ khách cũ theo SĐT; địa chỉ giao lưu trên đơn.

      let subtotal = new Prisma.Decimal(0);
      const lines = [...requestedByProduct.entries()].map(([productId, quantity]) => {
        const product = productById.get(productId)!;
        subtotal = subtotal.plus(quantity.times(product.price));
        return {
          productId,
          itemId: product.itemId,
          quantity,
          unitPrice: product.price,
        };
      });
      const code = await this.sequenceService.nextInTransaction(tx, 'SO');
      const order = await tx.salesOrder.create({
        data: {
          code,
          customerId: savedCustomer.id,
          channel: 'WEBSHOP',
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          paymentMethod: input.paymentMethod,
          shippingAddress: input.address,
          notes: input.notes ?? null,
          subtotal,
          discount: new Prisma.Decimal(0),
          shippingFee: new Prisma.Decimal(0),
          total: subtotal,
          warehouseId: [...warehouseByItem.values()][0] ?? null,
          lines: { create: lines },
        },
      });
      return { code: order.code, total: subtotal, paymentMethod: input.paymentMethod };
    });

    const response: {
      code: string;
      total: number;
      paymentMethod: PaymentMethod;
      bankTransfer?: {
        bank: string;
        accountNumber: string;
        accountName: string;
        amount: number;
        content: string;
        qrUrl: string;
      };
    } = {
      ...result,
      total: Number(result.total),
    };
    if (bankConfig) {
      const query = new URLSearchParams({
        amount: String(response.total),
        addInfo: response.code,
        accountName: bankConfig.accountName,
      });
      response.bankTransfer = {
        bank: bankConfig.bank,
        accountNumber: bankConfig.accountNumber,
        accountName: bankConfig.accountName,
        amount: response.total,
        content: response.code,
        qrUrl: `https://img.vietqr.io/image/${bankConfig.bank}-${bankConfig.accountNumber}-compact2.png?${query.toString()}`,
      };
    }
    return response;
  }

  async lookupOrder(code: string, phone: string) {
    const order = await prisma.salesOrder.findFirst({
      where: { code, customer: { phone } },
      select: {
        code: true,
        status: true,
        paymentStatus: true,
        total: true,
        createdAt: true,
        lines: {
          select: {
            quantity: true,
            unitPrice: true,
            product: { select: { name: true } },
            item: { select: { name: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return {
      code: order.code,
      status: order.status,
      paymentStatus: order.paymentStatus,
      lines: order.lines.map((line) => ({
        productName: line.product?.name ?? line.item.name,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
      })),
      total: Number(order.total),
      createdAt: order.createdAt,
    };
  }
}
