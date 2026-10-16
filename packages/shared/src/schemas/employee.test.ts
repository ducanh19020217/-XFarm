import { describe, expect, it } from 'vitest';
import { PayType, PAY_TYPE_LABELS } from '../types';
import { createEmployeeSchema, updateEmployeeSchema, queryEmployeeSchema } from './employee';

describe('employee schemas', () => {
  it('parses valid employee input and normalizes empty string fields', () => {
    const valid = {
      code: '',
      fullName: 'Nguyễn Văn A',
      phone: '',
      position: 'Công nhân trồng trọt',
      payType: PayType.DAILY,
      baseRate: 300000,
    };
    const parsed = createEmployeeSchema.parse(valid);
    expect(parsed.code).toBeUndefined();
    expect(parsed.phone).toBeUndefined();
    expect(parsed.fullName).toBe('Nguyễn Văn A');
    expect(parsed.position).toBe('Công nhân trồng trọt');
    expect(parsed.payType).toBe(PayType.DAILY);
    expect(parsed.baseRate).toBe(300000);
    expect(parsed.isActive).toBe(true);
  });

  it('rejects missing or empty required fields', () => {
    expect(() =>
      createEmployeeSchema.parse({
        fullName: '',
        position: 'Công nhân',
        payType: PayType.DAILY,
        baseRate: 100,
      }),
    ).toThrow('Họ tên không được để trống');

    expect(() =>
      createEmployeeSchema.parse({
        fullName: 'Trần Văn B',
        position: '',
        payType: PayType.DAILY,
        baseRate: 100,
      }),
    ).toThrow('Vị trí công việc không được để trống');

    expect(() =>
      createEmployeeSchema.parse({
        fullName: 'Trần Văn B',
        position: 'Bảo vệ',
        payType: 'INVALID_TYPE',
        baseRate: 100,
      }),
    ).toThrow();

    expect(() =>
      createEmployeeSchema.parse({
        fullName: 'Trần Văn B',
        position: 'Bảo vệ',
        payType: PayType.DAILY,
        baseRate: -50000,
      }),
    ).toThrow('Mức lương cơ bản không được âm');
  });

  it('supports partial updates via updateEmployeeSchema', () => {
    const updated = updateEmployeeSchema.parse({
      baseRate: 350000,
      isActive: false,
    });
    expect(updated.baseRate).toBe(350000);
    expect(updated.isActive).toBe(false);
    expect(updated.fullName).toBeUndefined();
  });

  it('parses queryEmployeeSchema with string boolean conversions', () => {
    const query = queryEmployeeSchema.parse({
      page: '2',
      pageSize: '10',
      payType: PayType.MONTHLY,
      isActive: 'true',
      search: 'Nguyễn',
    });
    expect(query.page).toBe(2);
    expect(query.pageSize).toBe(10);
    expect(query.payType).toBe(PayType.MONTHLY);
    expect(query.isActive).toBe(true);
    expect(query.search).toBe('Nguyễn');
  });

  it('defines labels for all PayType values', () => {
    for (const type of Object.values(PayType)) {
      expect(PAY_TYPE_LABELS[type]).toBeDefined();
      expect(typeof PAY_TYPE_LABELS[type]).toBe('string');
    }
  });
});
