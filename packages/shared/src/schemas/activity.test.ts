import { describe, it, expect } from 'vitest';
import { parseActivityData } from './activity';
import { ActivityType } from '../types';

describe('parseActivityData', () => {
  it('parses valid WATER_TEST data', () => {
    const data = {
      pH: 7.2,
      DO: 5.5,
      temp: 28,
      salinity: 0,
      NH3: 0.02,
    };
    const result = parseActivityData(ActivityType.WATER_TEST, data);
    expect(result).toMatchObject(data);
  });

  it('fails on invalid WATER_TEST data (missing required DO, temp)', () => {
    expect(() => parseActivityData(ActivityType.WATER_TEST, { pH: 7.2 })).toThrow();
  });

  it('fails on invalid WATER_TEST pH out of range', () => {
    expect(() =>
      parseActivityData(ActivityType.WATER_TEST, {
        pH: 15,
        DO: 5.0,
        temp: 25,
      }),
    ).toThrow();
  });

  it('parses valid WEIGHING data', () => {
    const data = { avgWeightKg: 1.5, sampleSize: 20 };
    const result = parseActivityData(ActivityType.WEIGHING, data);
    expect(result).toMatchObject(data);
  });

  it('fails on invalid WEIGHING data (negative sampleSize or avgWeightKg)', () => {
    expect(() =>
      parseActivityData(ActivityType.WEIGHING, {
        avgWeightKg: -1,
        sampleSize: 10,
      }),
    ).toThrow();
    expect(() =>
      parseActivityData(ActivityType.WEIGHING, {
        avgWeightKg: 1.5,
        sampleSize: 0,
      }),
    ).toThrow();
  });

  it('parses valid FEEDING data', () => {
    const data = { feedKg: 25.5 };
    const result = parseActivityData(ActivityType.FEEDING, data);
    expect(result).toMatchObject(data);
  });

  it('fails on invalid FEEDING data (feedKg <= 0)', () => {
    expect(() => parseActivityData(ActivityType.FEEDING, { feedKg: -5 })).toThrow();
  });

  it('parses valid MORTALITY data', () => {
    const data = { count: 3, cause: 'Nhiệt độ thay đổi đột ngột' };
    const result = parseActivityData(ActivityType.MORTALITY, data);
    expect(result).toMatchObject(data);

    const withoutCause = parseActivityData(ActivityType.MORTALITY, {
      count: 1,
    });
    expect(withoutCause.count).toBe(1);
  });

  it('fails on invalid MORTALITY count (< 1)', () => {
    expect(() => parseActivityData(ActivityType.MORTALITY, { count: 0 })).toThrow();
  });

  it('parses valid STOCKING data', () => {
    const data = { count: 1000, avgWeightG: 50 };
    const result = parseActivityData(ActivityType.STOCKING, data);
    expect(result).toMatchObject(data);
  });

  it('parses valid IRRIGATION data', () => {
    const data = { durationMin: 45, volumeL: 1200 };
    const result = parseActivityData(ActivityType.IRRIGATION, data);
    expect(result).toMatchObject(data);
  });

  it('parses SPRAYING and FERTILIZING data', () => {
    const spraying = parseActivityData(ActivityType.SPRAYING, {
      product: 'Thuốc sinh học',
      dosage: '20ml / 16L',
    });
    expect(spraying.product).toBe('Thuốc sinh học');

    const fertilizing = parseActivityData(ActivityType.FERTILIZING, {
      product: 'NPK 20-20-15',
    });
    expect(fertilizing.product).toBe('NPK 20-20-15');
  });

  it('parses generic activity types with empty or arbitrary data', () => {
    const sowing = parseActivityData(ActivityType.SOWING, { seedLot: 'L01' });
    expect(sowing).toMatchObject({ seedLot: 'L01' });

    const harvest = parseActivityData(ActivityType.HARVEST, {
      itemId: 'item-1',
      quantity: 10,
      unit: 'kg',
      warehouseId: 'warehouse-1',
    });
    expect(harvest).toMatchObject({ itemId: 'item-1', quantity: 10 });
  });

  it('handles JSON string inputs properly', () => {
    const jsonStr = JSON.stringify({ feedKg: 30 });
    const result = parseActivityData(ActivityType.FEEDING, jsonStr);
    expect(result).toMatchObject({ feedKg: 30 });
  });
});
