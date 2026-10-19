import { describe, expect, it } from 'vitest';
import {
  checkInSchema,
  checkOutSchema,
  createAttendanceSchema,
  updateAttendanceSchema,
  queryAttendanceSchema,
} from './attendance';

describe('attendance schemas', () => {
  it('parses checkInSchema with optional clientId, at, and cycleId', () => {
    const input = {
      clientId: 'pwa-checkin-uuid',
      at: '2026-10-16T07:00:00Z',
      cycleId: 'cycle-kale-1',
      notes: '',
    };
    const parsed = checkInSchema.parse(input);
    expect(parsed.clientId).toBe('pwa-checkin-uuid');
    expect(parsed.at).toBeInstanceOf(Date);
    expect(parsed.cycleId).toBe('cycle-kale-1');
    expect(parsed.notes).toBeUndefined();
  });

  it('parses checkOutSchema with optional pieceQty and notes', () => {
    const input = {
      clientId: 'pwa-checkout-uuid',
      at: '2026-10-16T17:00:00Z',
      cycleId: 'cycle-kale-1',
      pieceQty: '120.5',
      notes: 'Hoàn thành 120.5 đơn vị sản phẩm',
    };
    const parsed = checkOutSchema.parse(input);
    expect(parsed.clientId).toBe('pwa-checkout-uuid');
    expect(parsed.at).toBeInstanceOf(Date);
    expect(parsed.cycleId).toBe('cycle-kale-1');
    expect(parsed.pieceQty).toBe(120.5);
    expect(parsed.notes).toBe('Hoàn thành 120.5 đơn vị sản phẩm');
  });

  it('parses createAttendanceSchema with full details and normalizes empty strings', () => {
    const input = {
      employeeId: 'emp-1',
      date: '2026-10-16',
      checkIn: '2026-10-16T08:00:00Z',
      checkOut: '2026-10-16T17:00:00Z',
      hours: '8.5',
      cycleId: '',
      pieceQty: '',
      notes: 'Đi làm đúng giờ',
    };
    const parsed = createAttendanceSchema.parse(input);
    expect(parsed.employeeId).toBe('emp-1');
    expect(parsed.date).toBeInstanceOf(Date);
    expect(parsed.hours).toBe(8.5);
    expect(parsed.cycleId).toBeUndefined();
    expect(parsed.pieceQty).toBeUndefined();
    expect(parsed.notes).toBe('Đi làm đúng giờ');
  });

  it('rejects invalid hours or empty employeeId', () => {
    expect(() =>
      createAttendanceSchema.parse({
        employeeId: '',
        date: '2026-10-16',
      }),
    ).toThrow('Nhân viên không được để trống');

    expect(() =>
      createAttendanceSchema.parse({
        employeeId: 'emp-1',
        date: '2026-10-16',
        hours: -2,
      }),
    ).toThrow('Số giờ không được âm');

    expect(() =>
      createAttendanceSchema.parse({
        employeeId: 'emp-1',
        date: '2026-10-16',
        hours: 25,
      }),
    ).toThrow('Số giờ tối đa là 24');
  });

  it('supports partial updates via updateAttendanceSchema', () => {
    const updated = updateAttendanceSchema.parse({
      hours: 7.5,
      notes: 'Về sớm 30 phút có phép',
    });
    expect(updated.hours).toBe(7.5);
    expect(updated.notes).toBe('Về sớm 30 phút có phép');
  });

  it('parses createAttendanceSchema with null fields from web client', () => {
    const input = {
      employeeId: 'emp-1',
      date: '2026-10-16',
      hours: 8,
      checkIn: null,
      checkOut: null,
      cycleId: null,
      pieceQty: null,
      notes: null,
      clientId: null,
    };
    const parsed = createAttendanceSchema.parse(input);
    expect(parsed.employeeId).toBe('emp-1');
    expect(parsed.hours).toBe(8);
    expect(parsed.checkIn).toBeNull();
    expect(parsed.checkOut).toBeNull();
    expect(parsed.cycleId).toBeNull();
    expect(parsed.pieceQty).toBeNull();
    expect(parsed.notes).toBeNull();
    expect(parsed.clientId).toBeNull();
  });

  it('supports updating attendance with null values to clear fields', () => {
    const payload = {
      cycleId: null,
      pieceQty: null,
      notes: null,
      checkIn: null,
      checkOut: null,
      hours: 0,
    };
    const updated = updateAttendanceSchema.parse(payload);
    expect(updated.cycleId).toBeNull();
    expect(updated.pieceQty).toBeNull();
    expect(updated.notes).toBeNull();
    expect(updated.checkIn).toBeNull();
    expect(updated.checkOut).toBeNull();
    expect(updated.hours).toBe(0);
  });

  it('parses checkIn and checkOut schemas with null and empty values', () => {
    const checkIn = checkInSchema.parse({
      cycleId: null,
      notes: null,
      clientId: null,
      employeeId: null,
    });
    expect(checkIn.cycleId).toBeNull();
    expect(checkIn.notes).toBeNull();

    const checkOut = checkOutSchema.parse({
      cycleId: null,
      pieceQty: null,
      notes: null,
    });
    expect(checkOut.cycleId).toBeNull();
    expect(checkOut.pieceQty).toBeNull();
    expect(checkOut.notes).toBeNull();
  });

  it('parses queryAttendanceSchema with filters', () => {
    const query = queryAttendanceSchema.parse({
      employeeId: 'emp-1',
      cycleId: 'cycle-1',
      from: '2026-10-01',
      to: '2026-10-31',
    });
    expect(query.employeeId).toBe('emp-1');
    expect(query.cycleId).toBe('cycle-1');
    expect(query.from).toBeInstanceOf(Date);
    expect(query.to).toBeInstanceOf(Date);
  });
});
