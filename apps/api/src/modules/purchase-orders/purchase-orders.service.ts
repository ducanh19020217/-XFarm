import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  Inject,
} from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { PurchaseOrderStatus } from '@xfarm/shared';
import { SequenceService } from '../../common/sequence/sequence.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
  QueryPurchaseOrderDto,
  PayPurchaseOrderDto,
} from './purchase-orders.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @Inject(SequenceService)
    private readonly sequenceService: SequenceService,
    @Inject(InventoryService)
    private readonly inventoryService: InventoryService,
  ) {}

  async findAll(query: QueryPurchaseOrderDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PurchaseOrderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.supplierId) {
      where.supplierId = query.supplierId;
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    let orderBy: Prisma.PurchaseOrderOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      const allowed = ['code', 'orderDate', 'total', 'status', 'createdAt', 'updatedAt'];
      if (field && allowed.includes(field)) {
        orderBy = { [field]: direction === 'asc' ? 'asc' : 'desc' };
      }
    }

    const [data, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          supplier: true,
          lines: {
            include: {
              item: true,
            },
          },
        },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    const poIds = data.map((d) => d.id);
    const transactions =
      poIds.length > 0
        ? await prisma.transaction.findMany({
            where: {
              refType: 'PurchaseOrder',
              refId: { in: poIds },
              type: 'EXPENSE',
            },
            select: { refId: true, amount: true },
          })
        : [];

    const paidByPo = new Map<string, Prisma.Decimal>();
    for (const t of transactions) {
      if (t.refId) {
        const cur = paidByPo.get(t.refId) ?? new Prisma.Decimal(0);
        paidByPo.set(t.refId, cur.plus(t.amount));
      }
    }

    const dataWithPaid = data.map((item) => ({
      ...item,
      paidAmount: (paidByPo.get(item.id) ?? new Prisma.Decimal(0)).toNumber(),
    }));

    return {
      data: dataWithPaid,
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdBy: {
          select: { id: true, fullName: true, role: true },
        },
        lines: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!po) {
      throw new NotFoundException('Không tìm thấy đơn mua hàng');
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        refType: 'PurchaseOrder',
        refId: po.id,
        type: 'EXPENSE',
      },
      select: { amount: true },
    });
    const paidAmount = transactions.reduce((sum, t) => sum.plus(t.amount), new Prisma.Decimal(0));

    return {
      ...po,
      paidAmount: paidAmount.toNumber(),
    };
  }

  async create(dto: CreatePurchaseOrderDto, userId?: string) {
    return prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({
        where: { id: dto.supplierId },
      });
      if (!supplier) {
        throw new NotFoundException('Không tìm thấy nhà cung cấp');
      }

      const itemIds = [...new Set(dto.lines.map((l) => l.itemId))];
      const items = await tx.item.findMany({
        where: { id: { in: itemIds } },
      });
      if (items.length !== itemIds.length) {
        throw new NotFoundException('Một hoặc nhiều mặt hàng không tồn tại');
      }

      let code = await this.sequenceService.nextInTransaction(tx, 'PO');
      while (await tx.purchaseOrder.findUnique({ where: { code } })) {
        code = await this.sequenceService.nextInTransaction(tx, 'PO');
      }

      let total = new Prisma.Decimal(0);
      for (const line of dto.lines) {
        const qty = new Prisma.Decimal(line.quantity);
        const price = new Prisma.Decimal(line.unitPrice);
        total = total.plus(qty.times(price));
      }

      const po = await tx.purchaseOrder.create({
        data: {
          code,
          supplierId: dto.supplierId,
          status: PurchaseOrderStatus.DRAFT,
          orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
          total,
          createdById: userId ?? null,
          lines: {
            create: dto.lines.map((line) => ({
              itemId: line.itemId,
              quantity: new Prisma.Decimal(line.quantity),
              unitPrice: new Prisma.Decimal(line.unitPrice),
              receivedQty: new Prisma.Decimal(0),
            })),
          },
        },
        include: {
          supplier: true,
          lines: {
            include: {
              item: true,
            },
          },
        },
      });

      return po;
    });
  }

  async update(id: string, dto: UpdatePurchaseOrderDto) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { lines: true },
      });

      if (!existing) {
        throw new NotFoundException('Không tìm thấy đơn mua hàng');
      }

      if (existing.status !== PurchaseOrderStatus.DRAFT) {
        throw new UnprocessableEntityException(
          'Chỉ có thể chỉnh sửa đơn mua hàng ở trạng thái Nháp',
        );
      }

      if (dto.supplierId && dto.supplierId !== existing.supplierId) {
        const supplier = await tx.supplier.findUnique({
          where: { id: dto.supplierId },
        });
        if (!supplier) {
          throw new NotFoundException('Không tìm thấy nhà cung cấp');
        }
      }

      let total = existing.total;

      if (dto.lines) {
        const itemIds = [...new Set(dto.lines.map((l) => l.itemId))];
        const items = await tx.item.findMany({
          where: { id: { in: itemIds } },
        });
        if (items.length !== itemIds.length) {
          throw new NotFoundException('Một hoặc nhiều mặt hàng không tồn tại');
        }

        total = new Prisma.Decimal(0);
        for (const line of dto.lines) {
          const qty = new Prisma.Decimal(line.quantity);
          const price = new Prisma.Decimal(line.unitPrice);
          total = total.plus(qty.times(price));
        }

        await tx.purchaseOrderLine.deleteMany({
          where: { poId: id },
        });

        await tx.purchaseOrderLine.createMany({
          data: dto.lines.map((line) => ({
            poId: id,
            itemId: line.itemId,
            quantity: new Prisma.Decimal(line.quantity),
            unitPrice: new Prisma.Decimal(line.unitPrice),
            receivedQty: new Prisma.Decimal(0),
          })),
        });
      }

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: {
          ...(dto.supplierId ? { supplierId: dto.supplierId } : {}),
          ...(dto.orderDate !== undefined
            ? { orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date() }
            : {}),
          total,
        },
        include: {
          supplier: true,
          lines: {
            include: {
              item: true,
            },
          },
        },
      });

      return updated;
    });
  }

  async remove(id: string) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!po) {
      throw new NotFoundException('Không tìm thấy đơn mua hàng');
    }

    if (po.status !== PurchaseOrderStatus.DRAFT && po.status !== PurchaseOrderStatus.CANCELLED) {
      throw new UnprocessableEntityException(
        'Chỉ có thể xóa đơn mua hàng ở trạng thái Nháp hoặc Đã hủy',
      );
    }

    const hasReceived = po.lines.some((line) =>
      new Prisma.Decimal(line.receivedQty).greaterThan(0),
    );
    if (hasReceived) {
      throw new UnprocessableEntityException('Không thể xóa đơn mua hàng đã nhận hàng');
    }

    await prisma.purchaseOrder.delete({
      where: { id },
    });

    return { message: 'Đã xóa đơn mua hàng thành công' };
  }

  async order(id: string) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!po) {
      throw new NotFoundException('Không tìm thấy đơn mua hàng');
    }

    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new UnprocessableEntityException('Chỉ có thể đặt hàng đơn mua ở trạng thái Nháp');
    }

    if (po.lines.length === 0) {
      throw new UnprocessableEntityException('Đơn mua hàng phải có ít nhất một dòng sản phẩm');
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.ORDERED },
      include: {
        supplier: true,
        lines: {
          include: {
            item: true,
          },
        },
      },
    });

    return updated;
  }

  async cancel(id: string) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!po) {
      throw new NotFoundException('Không tìm thấy đơn mua hàng');
    }

    if (po.status !== PurchaseOrderStatus.DRAFT && po.status !== PurchaseOrderStatus.ORDERED) {
      throw new UnprocessableEntityException(
        'Chỉ có thể hủy đơn mua hàng ở trạng thái Nháp hoặc Đã đặt',
      );
    }

    const hasReceived = po.lines.some((line) =>
      new Prisma.Decimal(line.receivedQty).greaterThan(0),
    );
    if (hasReceived) {
      throw new UnprocessableEntityException('Không thể hủy đơn mua hàng đã nhận hàng');
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.CANCELLED },
      include: {
        supplier: true,
        lines: {
          include: {
            item: true,
          },
        },
      },
    });

    return updated;
  }

  async receive(id: string, dto: ReceivePurchaseOrderDto) {
    return prisma.$transaction(async (tx) => {
      // 1. Lock PO and lines with SELECT ... FOR UPDATE
      const locked = await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM "purchase_orders" WHERE id = ${id} FOR UPDATE`,
      );
      if (!locked.length) {
        throw new NotFoundException('Không tìm thấy đơn mua hàng');
      }

      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM "purchase_order_lines" WHERE "poId" = ${id} FOR UPDATE`,
      );

      // 2. Fetch fresh PO
      const po = await tx.purchaseOrder.findUnique({
        where: { id },
        include: {
          supplier: true,
          lines: {
            include: { item: true },
          },
        },
      });

      if (!po) {
        throw new NotFoundException('Không tìm thấy đơn mua hàng');
      }

      // 3. Status checks
      if (po.status === PurchaseOrderStatus.DRAFT) {
        throw new UnprocessableEntityException('Chỉ có thể nhận hàng khi đơn mua đã được đặt hàng');
      }
      if (po.status === PurchaseOrderStatus.CANCELLED) {
        throw new UnprocessableEntityException('Không thể nhận hàng cho đơn mua đã bị hủy');
      }
      if (po.status === PurchaseOrderStatus.RECEIVED) {
        throw new UnprocessableEntityException('Đơn mua hàng đã được nhận đủ');
      }
      if (po.status !== PurchaseOrderStatus.ORDERED && po.status !== PurchaseOrderStatus.PARTIAL) {
        throw new UnprocessableEntityException('Trạng thái đơn mua hàng không hợp lệ để nhận hàng');
      }

      // 4. Warehouse check
      const warehouse = await tx.warehouse.findUnique({
        where: { id: dto.warehouseId },
      });
      if (!warehouse) {
        throw new NotFoundException('Không tìm thấy kho nhận hàng');
      }

      // 5. Aggregate receipt quantities per lineId to validate against remaining quantity
      const requestedPerLine = new Map<string, Prisma.Decimal>();
      for (const inputLine of dto.lines) {
        const receiveQty = new Prisma.Decimal(inputLine.quantity);
        if (receiveQty.lessThanOrEqualTo(0)) {
          throw new UnprocessableEntityException('Số lượng nhận phải lớn hơn 0');
        }
        const current = requestedPerLine.get(inputLine.lineId) || new Prisma.Decimal(0);
        requestedPerLine.set(inputLine.lineId, current.plus(receiveQty));
      }

      for (const [lineId, totalRequested] of requestedPerLine.entries()) {
        const poLine = po.lines.find((l) => l.id === lineId);
        if (!poLine) {
          throw new UnprocessableEntityException(`Dòng đơn hàng ${lineId} không thuộc đơn mua này`);
        }
        const orderedQty = new Prisma.Decimal(poLine.quantity);
        const receivedQty = new Prisma.Decimal(poLine.receivedQty);
        const remainingQty = orderedQty.minus(receivedQty);
        if (totalRequested.greaterThan(remainingQty)) {
          throw new UnprocessableEntityException(
            `Số lượng nhận (${totalRequested.toString()}) vượt quá số lượng còn lại (${remainingQty.toString()}) của mặt hàng ${poLine.item.name}`,
          );
        }
      }

      // 6. Receive each line via InventoryService.receive
      for (const inputLine of dto.lines) {
        const poLine = po.lines.find((l) => l.id === inputLine.lineId)!;
        const receiveQty = new Prisma.Decimal(inputLine.quantity);

        const unitCost =
          inputLine.unitCost !== undefined && inputLine.unitCost !== null
            ? new Prisma.Decimal(inputLine.unitCost)
            : new Prisma.Decimal(poLine.unitPrice);

        await this.inventoryService.receive(tx, {
          itemId: poLine.itemId,
          warehouseId: dto.warehouseId,
          quantity: receiveQty,
          unitCost,
          lotCode: inputLine.lotCode?.trim() || undefined,
          expiryDate: inputLine.expiryDate ? new Date(inputLine.expiryDate) : undefined,
          refType: 'PO',
          refId: po.id,
        });

        await tx.purchaseOrderLine.update({
          where: { id: poLine.id },
          data: {
            receivedQty: { increment: receiveQty },
          },
        });
      }

      // 7. Check all lines to determine next status:
      // còn thiếu thì PARTIAL, đủ hết thì RECEIVED
      const updatedLines = await tx.purchaseOrderLine.findMany({
        where: { poId: po.id },
      });

      const allFullyReceived = updatedLines.every((line) =>
        new Prisma.Decimal(line.receivedQty).greaterThanOrEqualTo(
          new Prisma.Decimal(line.quantity),
        ),
      );

      const nextStatus = allFullyReceived
        ? PurchaseOrderStatus.RECEIVED
        : PurchaseOrderStatus.PARTIAL;

      const updatedPo = await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: nextStatus },
        include: {
          supplier: true,
          lines: {
            include: {
              item: true,
            },
          },
        },
      });

      return updatedPo;
    });
  }

  async pay(id: string, dto: PayPurchaseOrderDto, userId?: string) {
    return prisma.$transaction(async (tx) => {
      // Khóa PO để 2 lượt trả đồng thời không cùng vượt tổng tiền
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "purchase_orders" WHERE id = ${id} FOR UPDATE`);
      const po = await tx.purchaseOrder.findUnique({
        where: { id },
        include: {
          supplier: true,
          lines: {
            include: { item: true },
          },
        },
      });

      if (!po) {
        throw new NotFoundException('Không tìm thấy đơn mua hàng');
      }

      if (po.status === PurchaseOrderStatus.CANCELLED) {
        throw new UnprocessableEntityException('Không thể thanh toán cho đơn mua hàng đã hủy');
      }

      const existingTxs = await tx.transaction.findMany({
        where: {
          refType: 'PurchaseOrder',
          refId: po.id,
          type: 'EXPENSE',
        },
        select: { amount: true },
      });

      const currentPaid = existingTxs.reduce((sum, t) => sum.plus(t.amount), new Prisma.Decimal(0));

      let payAmount: Prisma.Decimal;
      if (dto.amount !== undefined && dto.amount !== null) {
        payAmount = new Prisma.Decimal(dto.amount);
        if (payAmount.lte(0)) {
          throw new UnprocessableEntityException('Số tiền thanh toán phải lớn hơn 0');
        }
      } else {
        payAmount = po.total.minus(currentPaid);
        if (payAmount.lte(0)) {
          throw new UnprocessableEntityException('Đơn mua hàng đã được thanh toán đủ');
        }
      }

      const newPaid = currentPaid.plus(payAmount);
      if (newPaid.greaterThan(po.total)) {
        throw new UnprocessableEntityException('Số tiền thanh toán vượt quá tổng giá trị đơn mua');
      }

      let purchaseCat = await tx.financeCategory.findFirst({
        where: { systemKey: 'PURCHASE' },
      });
      if (!purchaseCat) {
        purchaseCat = await tx.financeCategory.create({
          data: {
            name: 'Mua vật tư',
            type: 'EXPENSE',
            systemKey: 'PURCHASE',
            isActive: true,
          },
        });
      }

      const txCode = await this.sequenceService.nextInTransaction(tx, 'TX');
      const transaction = await tx.transaction.create({
        data: {
          code: txCode,
          type: 'EXPENSE',
          categoryId: purchaseCat.id,
          amount: payAmount,
          date: dto.paidAt ? new Date(dto.paidAt) : new Date(),
          refType: 'PurchaseOrder',
          refId: po.id,
          method: dto.method ?? 'BANK_TRANSFER',
          notes: dto.notes ?? `Thanh toán đơn mua hàng ${po.code}`,
          createdById: userId,
        },
      });

      return {
        ...po,
        paidAmount: newPaid.toNumber(),
        transaction,
      };
    });
  }
}
