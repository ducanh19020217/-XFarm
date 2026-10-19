import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { prisma, Prisma } from '@xfarm/db';
import { Role, SalesOrderStatus } from '@xfarm/shared';
import { SequenceService } from '../../common/sequence/sequence.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  ConfirmSalesOrderDto,
  CreateSalesOrderDto,
  QuerySalesOrderDto,
  TransitionSalesOrderDto,
  UpdateSalesOrderDto,
} from './sales-orders.dto';

const orderInclude = {
  customer: true,
  warehouse: true,
  lines: { include: { item: true, product: true, stockLot: true } },
  payments: true,
} as const;

@Injectable()
export class SalesOrdersService {
  constructor(
    private readonly sequence: SequenceService,
    private readonly inventory: InventoryService,
  ) {}

  async findAll(query: QuerySalesOrderDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where: Prisma.SalesOrderWhereInput = {
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.fromDate || query.toDate
        ? {
            createdAt: {
              ...(query.fromDate ? { gte: query.fromDate } : {}),
              ...(query.toDate ? { lte: query.toDate } : {}),
            },
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { customer: true, _count: { select: { lines: true, payments: true } } },
      }),
      prisma.salesOrder.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async findById(id: string) {
    const order = await prisma.salesOrder.findUnique({ where: { id }, include: orderInclude });
    if (!order) throw new NotFoundException('Không tìm thấy đơn bán');
    const moves = await prisma.stockMove.findMany({
      where: {
        refType: 'SalesOrderLine',
        refId: { in: order.lines.map((line) => line.id) },
        type: 'OUT',
      },
      include: { stockLot: true },
      orderBy: { createdAt: 'asc' },
    });
    return { ...order, stockMoves: moves };
  }

  async create(dto: CreateSalesOrderDto, userId: string, role: Role) {
    const customer = await prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer || !customer.isActive)
      throw new UnprocessableEntityException('Khách hàng không tồn tại hoặc đã ngừng hoạt động');
    const products = new Map<string, { itemId: string; price: Prisma.Decimal }>();
    for (const line of dto.lines) {
      const item = await prisma.item.findUnique({ where: { id: line.itemId } });
      if (!item || !item.isSellable)
        throw new UnprocessableEntityException(
          'Vật tư/hàng hóa không hợp lệ hoặc chưa được phép bán',
        );
      if (line.productId) {
        const product = await prisma.product.findUnique({ where: { id: line.productId } });
        if (!product || product.itemId !== line.itemId)
          throw new UnprocessableEntityException('Sản phẩm và hàng hóa trong dòng không khớp');
        products.set(line.productId, { itemId: product.itemId, price: product.price });
      } else if (line.unitPrice === undefined || line.unitPrice === null) {
        throw new UnprocessableEntityException('Dòng không có sản phẩm phải nhập đơn giá');
      }
    }
    return prisma.$transaction(async (tx) => {
      const lines = dto.lines.map((line) => {
        const product = line.productId ? products.get(line.productId) : undefined;
        const canOverride = role === Role.SALES || role === Role.MANAGER || role === Role.OWNER;
        const unitPrice =
          line.unitPrice !== undefined && line.unitPrice !== null && canOverride
            ? line.unitPrice
            : product?.price;
        if (unitPrice === undefined)
          throw new UnprocessableEntityException('Không xác định được đơn giá');
        return {
          ...line,
          quantity: new Prisma.Decimal(line.quantity),
          unitPrice: new Prisma.Decimal(unitPrice),
        };
      });
      const subtotal = lines.reduce(
        (sum, line) => sum.plus(line.quantity.times(line.unitPrice)),
        new Prisma.Decimal(0),
      );
      const discount = new Prisma.Decimal(dto.discount ?? 0);
      const shippingFee = new Prisma.Decimal(dto.shippingFee ?? 0);
      if (discount.greaterThan(subtotal.plus(shippingFee)))
        throw new UnprocessableEntityException('Chiết khấu không được lớn hơn giá trị đơn hàng');
      const order = await tx.salesOrder.create({
        data: {
          code: await this.sequence.nextInTransaction(tx, 'SO'),
          customerId: dto.customerId,
          channel: 'ADMIN',
          paymentMethod: dto.paymentMethod,
          shippingAddress: dto.shippingAddress,
          discount,
          shippingFee,
          subtotal,
          total: subtotal.minus(discount).plus(shippingFee),
          notes: dto.notes,
          createdById: userId,
          lines: {
            create: lines.map((line) => ({
              productId: line.productId,
              itemId: line.itemId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
            })),
          },
        },
        include: orderInclude,
      });
      return order;
    });
  }

  async update(id: string, dto: UpdateSalesOrderDto, userId: string, role: Role) {
    const existing = await prisma.salesOrder.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!existing) throw new NotFoundException('Không tìm thấy đơn bán');
    if (existing.status !== 'PENDING')
      throw new UnprocessableEntityException('Chỉ được sửa đơn đang chờ xử lý');
    if (dto.status && dto.status !== 'PENDING') {
      const valid: Record<string, string[]> = { PENDING: ['CONFIRMED', 'CANCELLED'] };
      if (!valid.PENDING.includes(dto.status))
        throw new UnprocessableEntityException('Chuyển trạng thái đơn hàng không hợp lệ');
      if (dto.status === 'CANCELLED') return this.cancel(id);
    }
    if (dto.customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: dto.customerId } });
      if (!customer?.isActive)
        throw new UnprocessableEntityException('Khách hàng không tồn tại hoặc đã ngừng hoạt động');
    }
    return prisma.$transaction(async (tx) => {
      let lines = existing.lines;
      if (dto.lines) {
        await tx.salesOrderLine.deleteMany({ where: { orderId: id } });
        lines = [];
        for (const input of dto.lines) {
          const product = input.productId
            ? await tx.product.findUnique({ where: { id: input.productId } })
            : null;
          if (product && product.itemId !== input.itemId)
            throw new UnprocessableEntityException('Sản phẩm và hàng hóa trong dòng không khớp');
          const unitPrice =
            input.unitPrice !== undefined &&
            input.unitPrice !== null &&
            (role === Role.SALES || role === Role.MANAGER || role === Role.OWNER)
              ? input.unitPrice
              : product?.price;
          if (unitPrice === undefined)
            throw new UnprocessableEntityException('Không xác định được đơn giá');
          lines.push(
            await tx.salesOrderLine.create({
              data: {
                orderId: id,
                productId: input.productId,
                itemId: input.itemId,
                quantity: new Prisma.Decimal(input.quantity),
                unitPrice: new Prisma.Decimal(unitPrice),
              },
            }),
          );
        }
      }
      const discount =
        dto.discount === undefined || dto.discount === null
          ? existing.discount
          : new Prisma.Decimal(dto.discount);
      const shippingFee =
        dto.shippingFee === undefined || dto.shippingFee === null
          ? existing.shippingFee
          : new Prisma.Decimal(dto.shippingFee);
      const subtotal = lines.reduce(
        (sum, line) => sum.plus(line.quantity.times(line.unitPrice)),
        new Prisma.Decimal(0),
      );
      return tx.salesOrder.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          paymentMethod: dto.paymentMethod,
          shippingAddress: dto.shippingAddress,
          notes: dto.notes,
          discount,
          shippingFee,
          subtotal,
          total: subtotal.minus(discount).plus(shippingFee),
          createdById: userId,
        },
        include: orderInclude,
      });
    });
  }

  async transition(id: string, dto: TransitionSalesOrderDto) {
    const order = await prisma.salesOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn bán');
    const valid: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PACKING', 'CANCELLED'],
      PACKING: ['SHIPPING', 'CANCELLED'],
      SHIPPING: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
    };
    if (!valid[order.status]?.includes(dto.status))
      throw new UnprocessableEntityException('Chuyển trạng thái đơn hàng không hợp lệ');
    return prisma.salesOrder.update({
      where: { id },
      data: { status: dto.status as SalesOrderStatus },
      include: orderInclude,
    });
  }

  async confirm(id: string, dto: ConfirmSalesOrderDto) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({ where: { id }, include: { lines: true } });
      if (!order) throw new NotFoundException('Không tìm thấy đơn bán');
      if (order.status !== 'PENDING')
        throw new UnprocessableEntityException('Chỉ được xác nhận đơn đang chờ xử lý');
      const warehouse = await tx.warehouse.findUnique({ where: { id: dto.warehouseId } });
      if (!warehouse) throw new UnprocessableEntityException('Không tìm thấy kho xuất');
      for (const line of order.lines) {
        const result = await this.inventory.issueFifo(tx, {
          itemId: line.itemId,
          warehouseId: dto.warehouseId,
          quantity: line.quantity,
          refType: 'SalesOrderLine',
          refId: line.id,
        });
        await tx.salesOrderLine.update({
          where: { id: line.id },
          data: { stockLotId: result.lots[0]?.stockLotId },
        });
      }
      return tx.salesOrder.update({
        where: { id },
        data: { warehouseId: dto.warehouseId, status: 'CONFIRMED', confirmedAt: new Date() },
        include: orderInclude,
      });
    });
  }

  async cancel(id: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id },
        include: { lines: true, payments: true },
      });
      if (!order) throw new NotFoundException('Không tìm thấy đơn bán');
      if (order.status === 'CANCELLED')
        throw new UnprocessableEntityException('Đơn bán đã được hủy');
      if (!['PENDING', 'CONFIRMED', 'PACKING'].includes(order.status))
        throw new UnprocessableEntityException('Không thể hủy đơn ở trạng thái hiện tại');
      const moves = await tx.stockMove.findMany({
        where: {
          refType: 'SalesOrderLine',
          refId: { in: order.lines.map((line) => line.id) },
          type: 'OUT',
        },
      });
      for (const move of moves) {
        await tx.stockMove.create({
          data: {
            type: 'IN',
            itemId: move.itemId,
            stockLotId: move.stockLotId,
            toWarehouseId: move.fromWarehouseId,
            quantity: move.quantity,
            unitCost: move.unitCost,
            refType: 'SalesOrderCancel',
            refId: id,
          },
        });
      }
      const result = await tx.salesOrder.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
        include: orderInclude,
      });
      return {
        ...result,
        warning: order.payments.length
          ? 'Đơn đã có thanh toán; vui lòng hoàn tiền thủ công ở phân hệ tài chính'
          : undefined,
      };
    });
  }

  async print(id: string, type: 'invoice' | 'delivery') {
    const order = await this.findById(id);
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: ['farm.name', 'farm.slogan', 'contact.phone', 'contact.email', 'contact.address'],
        },
      },
    });
    return {
      type,
      site: Object.fromEntries(settings.map((setting) => [setting.key, setting.value])),
      order,
    };
  }
}
