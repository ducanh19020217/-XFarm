import { describe, expect, it } from 'vitest';
import {
  adminUpdateBookingStatusSchema,
  batchCreateTourSlotsSchema,
  calculateBatchSlotCount,
  createTourSchema,
  createTourSlotSchema,
  generateBatchSlotDates,
  publicBookingSchema,
  updateTourSchema,
} from '../index';
import { BookingStatus } from '../types';

describe('Phase 5 Tour Schemas', () => {
  describe('createTourSchema & updateTourSchema', () => {
    it('validates a valid tour', () => {
      const validTour = {
        name: 'Trải nghiệm thu hoạch rau',
        description: '<p>Tham quan vườn rau sạch và thu hoạch nông sản tươi sống</p>',
        durationMinutes: 120,
        priceAdult: 150000,
        priceChild: 80000,
        capacity: 20,
      };
      const result = createTourSchema.safeParse(validTour);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isPublished).toBe(false);
        expect(result.data.sortOrder).toBe(0);
        expect(result.data.mediaIds).toEqual([]);
      }
    });

    it('rejects invalid tour inputs', () => {
      expect(
        createTourSchema.safeParse({
          name: '',
          description: '',
          durationMinutes: 0,
          priceAdult: -1000,
          priceChild: -500,
          capacity: 0,
        }).success,
      ).toBe(false);
    });

    it('allows partial updates via updateTourSchema', () => {
      const updateResult = updateTourSchema.safeParse({
        priceAdult: 180000,
        isPublished: true,
      });
      expect(updateResult.success).toBe(true);
    });
  });

  describe('tour-slot schemas & batch creation', () => {
    it('validates a single tour slot', () => {
      const result = createTourSlotSchema.safeParse({
        tourId: 'tour-1',
        startAt: '2026-10-25T08:00:00+07:00',
        capacity: 20,
      });
      expect(result.success).toBe(true);
    });

    it('validates batch creation with weekends and specific times', () => {
      const result = batchCreateTourSlotsSchema.safeParse({
        tourId: 'tour-1',
        from: '2026-11-01',
        to: '2026-11-28', // 4 weeks
        weekdays: [0, 6], // T7, CN
        times: ['08:00', '14:00'],
        capacity: 20,
      });
      expect(result.success).toBe(true);
    });

    it('rejects if from date is after to date', () => {
      const result = batchCreateTourSlotsSchema.safeParse({
        tourId: 'tour-1',
        from: '2026-11-30',
        to: '2026-11-01',
        weekdays: [0, 6],
        times: ['08:00'],
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid time format', () => {
      const result = batchCreateTourSlotsSchema.safeParse({
        tourId: 'tour-1',
        from: '2026-11-01',
        to: '2026-11-28',
        weekdays: [0, 6],
        times: ['25:00'],
      });
      expect(result.success).toBe(false);
    });

    it('rejects batch creation exceeding 500 slots', () => {
      // 365 days * 2 times = 730 slots > 500
      const count = calculateBatchSlotCount(
        new Date('2026-01-01'),
        new Date('2026-12-31'),
        [0, 1, 2, 3, 4, 5, 6],
        ['08:00', '14:00'],
      );
      expect(count).toBeGreaterThan(500);

      const result = batchCreateTourSlotsSchema.safeParse({
        tourId: 'tour-1',
        from: '2026-01-01',
        to: '2026-12-31',
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        times: ['08:00', '14:00'],
      });
      expect(result.success).toBe(false);
    });

    it('calculates and generates slot dates accurately', () => {
      // 2 weeks from Sat 2026-11-07 to Sun 2026-11-15:
      // Weekends: Sat 7, Sun 8, Sat 14, Sun 15 = 4 days * 2 times = 8 slots
      const dates = generateBatchSlotDates(
        new Date('2026-11-07'),
        new Date('2026-11-15'),
        [0, 6],
        ['08:00', '14:00'],
      );
      expect(dates.length).toBe(8);
    });
  });

  describe('booking schemas', () => {
    it('validates public booking input with Vietnamese phone number', () => {
      const validBooking = {
        slotId: 'slot-1',
        customerName: 'Nguyễn Văn An',
        phone: '0912345678',
        email: 'an.nguyen@example.com',
        adults: 2,
        children: 1,
        notes: 'Có trẻ nhỏ cần hỗ trợ xe đẩy',
      };
      const result = publicBookingSchema.safeParse(validBooking);
      expect(result.success).toBe(true);
    });

    it('normalizes empty email to undefined and accepts optional children', () => {
      const bookingWithoutOptional = {
        slotId: 'slot-1',
        customerName: 'Trần Thị Mai',
        phone: '+84987654321',
        email: '',
        adults: 1,
      };
      const result = publicBookingSchema.safeParse(bookingWithoutOptional);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBeUndefined();
        expect(result.data.children).toBe(0);
      }
    });

    it('rejects invalid Vietnamese phone numbers', () => {
      expect(
        publicBookingSchema.safeParse({
          slotId: 'slot-1',
          customerName: 'Lê Văn C',
          phone: '0123456789', // Invalid prefix in Vietnam
          adults: 1,
        }).success,
      ).toBe(false);

      expect(
        publicBookingSchema.safeParse({
          slotId: 'slot-1',
          customerName: 'Lê Văn C',
          phone: '123456',
          adults: 1,
        }).success,
      ).toBe(false);
    });

    it('rejects invalid adults or children count', () => {
      expect(
        publicBookingSchema.safeParse({
          slotId: 'slot-1',
          customerName: 'Lê Văn C',
          phone: '0912345678',
          adults: 0, // must be >= 1
        }).success,
      ).toBe(false);

      expect(
        publicBookingSchema.safeParse({
          slotId: 'slot-1',
          customerName: 'Lê Văn C',
          phone: '0912345678',
          adults: 1,
          children: -1, // must be >= 0
        }).success,
      ).toBe(false);
    });

    it('validates admin status update with BookingStatus enum', () => {
      expect(
        adminUpdateBookingStatusSchema.safeParse({
          status: BookingStatus.CONFIRMED,
          notes: 'Đã nhận chuyển khoản',
        }).success,
      ).toBe(true);

      expect(
        adminUpdateBookingStatusSchema.safeParse({
          status: 'INVALID_STATUS',
        }).success,
      ).toBe(false);
    });
  });
});
