import { describe, expect, it } from 'vitest';
import { PayrollStatus, PAYROLL_STATUS_LABELS } from '../types';
import {
  generatePayrollSchema,
  createPayrollSchema,
  updatePayrollSchema,
  queryPayrollSchema,
} from './payroll';

describe('payroll schemas', () => {
  it('parses valid generatePayrollSchema with periodEnd >= periodStart', () => {
    const input = {
      periodStart: '2026-10-01',
      periodEnd: '2026-10-15',
      employeeIds: ['emp-1', 'emp-2'],
    };
    const parsed = generatePayrollSchema.parse(input);
    expect(parsed.periodStart).toBeInstanceOf(Date);
    expect(parsed.periodEnd).toBeInstanceOf(Date);
    expect(parsed.employeeIds).toEqual(['emp-1', 'emp-2']);
  });

  it('rejects generatePayrollSchema if periodEnd < periodStart', () => {
    expect(() =>
      generatePayrollSchema.parse({
        periodStart: '2026-10-15',
        periodEnd: '2026-10-01',
      }),
    ).toThrow('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
  });

  it('parses createPayrollSchema and defaults status to DRAFT', () => {
    const input = {
      employeeId: 'emp-1',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
      amount: 8000000,
      details: {
        baseRate: 8000000,
        workingDays: 22,
        allowance: 500000,
      },
    };
    const parsed = createPayrollSchema.parse(input);
    expect(parsed.employeeId).toBe('emp-1');
    expect(parsed.amount).toBe(8000000);
    expect(parsed.status).toBe(PayrollStatus.DRAFT);
    expect(parsed.details).toHaveProperty('workingDays', 22);
  });

  it('rejects negative amount in createPayrollSchema', () => {
    expect(() =>
      createPayrollSchema.parse({
        employeeId: 'emp-1',
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        amount: -50000,
      }),
    ).toThrow('Số tiền lương không được âm');
  });

  it('parses updatePayrollSchema and queryPayrollSchema', () => {
    const updated = updatePayrollSchema.parse({
      status: PayrollStatus.APPROVED,
    });
    expect(updated.status).toBe(PayrollStatus.APPROVED);

    const query = queryPayrollSchema.parse({
      employeeId: 'emp-1',
      status: PayrollStatus.PAID,
      period: '2026-10',
    });
    expect(query.employeeId).toBe('emp-1');
    expect(query.status).toBe(PayrollStatus.PAID);
    expect(query.period).toBe('2026-10');
  });

  it('parses createPayrollSchema with array details', () => {
    const input = {
      employeeId: 'emp-1',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
      amount: 900000,
      details: [
        { date: '2026-10-01', hours: 8, amount: 300000 },
        { date: '2026-10-02', hours: 8, amount: 300000 },
        { date: '2026-10-03', hours: 8, amount: 300000 },
      ],
    };
    const parsed = createPayrollSchema.parse(input);
    expect(Array.isArray(parsed.details)).toBe(true);
    expect(parsed.details).toHaveLength(3);
  });

  it('defines labels for all PayrollStatus values', () => {
    for (const status of Object.values(PayrollStatus)) {
      expect(PAYROLL_STATUS_LABELS[status]).toBeDefined();
      expect(typeof PAYROLL_STATUS_LABELS[status]).toBe('string');
    }
  });
});
