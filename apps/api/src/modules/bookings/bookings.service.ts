import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { prisma, Prisma, BookingStatus, PaymentStatus, TransactionType } from '@xfarm/db';
import type { CreateBookingInput, CreatePaymentInput, QueryBookingInput } from '@xfarm/shared';
import { SequenceService } from '../../common/sequence/sequence.service';
import { BookingEmailService } from './email.service';

@Injectable()
export class BookingsService {
  constructor(
    private readonly sequence: SequenceService,
    private readonly email: BookingEmailService,
  ) {}

  private view(booking: BookingView, bankTransfer?: unknown) {
    return {
      code: booking.code,
      total: booking.total,
      startAt: booking.slot.startAt,
      tourName: booking.slot.tour.name,
      tourSlug: booking.slot.tour.slug,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      customerName: booking.customerName,
      phone: booking.phone,
      email: booking.email,
      adults: booking.adults,
      children: booking.children,
      createdAt: booking.createdAt,
      ...(bankTransfer ? { bankTransfer } : {}),
    };
  }

  async create(input: CreateBookingInput) {
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        Array<{ id: string }>
      >`SELECT id FROM tour_slots WHERE id = ${input.slotId} FOR UPDATE`;
      if (!locked.length) throw new NotFoundException('Không tìm thấy khung giờ');
      const slot = await tx.tourSlot.findUnique({
        where: { id: input.slotId },
        include: { tour: true },
      });
      if (!slot || !slot.isActive || slot.startAt <= new Date())
        throw new UnprocessableEntityException('Khung giờ không còn hoạt động');
      const guests = input.adults + (input.children || 0);
      const available = slot.capacity - slot.bookedCount;
      if (guests > available)
        throw new UnprocessableEntityException(`Khung giờ chỉ còn ${Math.max(0, available)} chỗ`);
      const total = new Prisma.Decimal(input.adults)
        .mul(slot.tour.priceAdult)
        .plus(new Prisma.Decimal(input.children || 0).mul(slot.tour.priceChild));
      const code = await this.sequence.nextInTransaction(tx, 'BK');
      const customer = await tx.customer.upsert({
        where: { phone: input.phone },
        update: { name: input.customerName, email: input.email || null },
        create: {
          code: await this.sequence.nextInTransaction(tx, 'KH'),
          name: input.customerName,
          phone: input.phone,
          email: input.email || null,
        },
      });
      await tx.tourSlot.update({
        where: { id: slot.id },
        data: { bookedCount: { increment: guests } },
      });
      return tx.booking.create({
        data: {
          code,
          slotId: slot.id,
          customerName: input.customerName,
          phone: input.phone,
          email: input.email || null,
          adults: input.adults,
          children: input.children || 0,
          total,
          notes: input.notes || null,
          paymentMethod: input.paymentMethod || null,
          customerId: customer.id,
        },
        include: { slot: { include: { tour: true } } },
      });
    });
    const setting = await prisma.siteSetting.findUnique({ where: { key: 'bank.vietqr' } });
    const bank = setting?.value as Record<string, string> | undefined;
    const bankId = bank?.bankId || bank?.bank || 'VCB';
    const accountNo = bank?.accountNo || bank?.accountNumber || '0123456789';
    const accountName = bank?.accountName || 'XFARM';
    const bankTransfer = {
      bankId,
      accountNo,
      accountName,
      amount: result.total.toString(),
      addInfo: result.code,
    };
    void this.email.send(
      result.email,
      `Xác nhận đặt chỗ ${result.code}`,
      this.template(result, false),
    );
    return this.view(result, bankTransfer);
  }

  private template(booking: BookingView, confirmed: boolean) {
    return `<p>Xin chào ${booking.customerName},</p><p>${confirmed ? 'Đặt chỗ của bạn đã được xác nhận.' : 'XFarm đã nhận đặt chỗ của bạn.'}</p><p>Mã: <b>${booking.code}</b><br/>Tour: ${booking.slot.tour.name}<br/>Giờ: ${new Date(booking.slot.startAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}<br/>Số khách: ${booking.adults} người lớn, ${booking.children} trẻ em<br/>Tổng tiền: ${booking.total.toString()} VND</p>`;
  }

  async lookup(code: string, phone: string) {
    const booking = await prisma.booking.findFirst({
      where: { code, phone },
      include: { slot: { include: { tour: true } } },
    });
    if (!booking) throw new NotFoundException('Không tìm thấy đặt chỗ');
    const setting = await prisma.siteSetting.findUnique({ where: { key: 'bank.vietqr' } });
    const bank = setting?.value as Record<string, string> | undefined;
    const bankId = bank?.bankId || bank?.bank || 'VCB';
    const accountNo = bank?.accountNo || bank?.accountNumber || '0123456789';
    const accountName = bank?.accountName || 'XFARM';
    const bankTransfer = {
      bankId,
      accountNo,
      accountName,
      amount: booking.total.toString(),
      addInfo: booking.code,
    };
    return this.view(booking, bankTransfer);
  }

  async findByCode(code: string) {
    const booking = await prisma.booking.findUnique({
      where: { code },
      include: { slot: { include: { tour: true } } },
    });
    if (!booking) throw new NotFoundException('Không tìm thấy đặt chỗ');
    const setting = await prisma.siteSetting.findUnique({ where: { key: 'bank.vietqr' } });
    const bank = setting?.value as Record<string, string> | undefined;
    const bankId = bank?.bankId || bank?.bank || 'VCB';
    const accountNo = bank?.accountNo || bank?.accountNumber || '0123456789';
    const accountName = bank?.accountName || 'XFARM';
    const bankTransfer = {
      bankId,
      accountNo,
      accountName,
      amount: booking.total.toString(),
      addInfo: booking.code,
    };
    return this.view(booking, bankTransfer);
  }

  async findAll(query: QueryBookingInput) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where: Prisma.BookingWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.slotId) where.slotId = query.slotId;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.search)
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { customerName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ];
    if (query.from || query.to)
      where.slot = {
        startAt: {
          ...(query.from ? { gte: query.from } : {}),
          ...(query.to ? { lte: query.to } : {}),
        },
      };
    const [data, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { slot: { include: { tour: true } }, payments: true },
      }),
      prisma.booking.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async changeStatus(id: string, status: BookingStatus) {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        include: { slot: { include: { tour: true } } },
      });
      if (!booking) throw new NotFoundException('Không tìm thấy đặt chỗ');
      if (status === BookingStatus.CANCELLED && booking.status !== BookingStatus.CANCELLED) {
        await tx.$queryRaw`SELECT id FROM tour_slots WHERE id = ${booking.slotId} FOR UPDATE`;
        await tx.tourSlot.update({
          where: { id: booking.slotId },
          data: {
            bookedCount: Math.max(0, booking.slot.bookedCount - booking.adults - booking.children),
          },
        });
      }
      return tx.booking.update({
        where: { id },
        data: {
          status,
          ...(status === BookingStatus.CONFIRMED ? { confirmedAt: new Date() } : {}),
          ...(status === BookingStatus.CANCELLED ? { cancelledAt: new Date() } : {}),
        },
        include: { slot: { include: { tour: true } } },
      });
    });
    if (status === BookingStatus.CONFIRMED)
      void this.email.send(
        result.email,
        `Đặt chỗ đã xác nhận ${result.code}`,
        this.template(result, true),
      );
    return result;
  }

  async pay(id: string, input: CreatePaymentInput, userId?: string) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) throw new NotFoundException('Không tìm thấy đặt chỗ');
      const paid = await tx.payment.aggregate({ where: { bookingId: id }, _sum: { amount: true } });
      const current = new Prisma.Decimal(paid._sum.amount || 0);
      const amount = new Prisma.Decimal(input.amount);
      if (current.plus(amount).greaterThan(booking.total))
        throw new UnprocessableEntityException('Số tiền thu vượt quá tổng tiền đặt chỗ');
      const category = await tx.financeCategory.findUnique({ where: { systemKey: 'TOUR' } });
      if (!category)
        throw new UnprocessableEntityException('Chưa cấu hình danh mục tài chính TOUR');
      const paymentCode = await this.sequence.nextInTransaction(tx, 'TT');
      const transactionCode = await this.sequence.nextInTransaction(tx, 'TN');
      const transaction = await tx.transaction.create({
        data: {
          code: transactionCode,
          type: TransactionType.INCOME,
          categoryId: category.id,
          amount,
          date: new Date(),
          refType: 'Booking',
          refId: id,
          method: input.method,
          createdById: userId,
        },
      });
      await tx.payment.create({
        data: {
          code: paymentCode,
          bookingId: id,
          amount,
          method: input.method,
          transactionId: transaction.id,
          createdById: userId,
        },
      });
      const total = current.plus(amount);
      return tx.booking.update({
        where: { id },
        data: {
          paymentStatus: total.equals(booking.total) ? PaymentStatus.PAID : PaymentStatus.PARTIAL,
        },
      });
    });
  }
}

type BookingView = Prisma.BookingGetPayload<{
  include: { slot: { include: { tour: true } } };
}>;
