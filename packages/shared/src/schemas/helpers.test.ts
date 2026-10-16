import { describe, expect, it } from 'vitest';
import { normalizeEmptyValues, optionalNumber } from './helpers';

describe('schema helpers', () => {
  it('preserves Date instances while normalizing plain objects', () => {
    const date = new Date('2026-01-02T03:04:05.000Z');
    const result = normalizeEmptyValues({ date, nested: { empty: '' } }) as {
      date: Date;
      nested: { empty: undefined };
    };

    expect(result.date).toBe(date);
    expect(result.nested.empty).toBeUndefined();
  });

  it('treats NaN as an omitted optional number', () => {
    expect(optionalNumber().parse(Number.NaN)).toBeUndefined();
    expect(optionalNumber().parse('')).toBeUndefined();
  });
});
