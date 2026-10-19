import { describe, expect, it, afterEach } from 'vitest';
import { buildTraceUrl } from './trace-url';
import { generatePrintLabels } from './print-label';

describe('buildTraceUrl', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('builds trace URL with custom baseUrl', () => {
    expect(buildTraceUrl('ABC1234567', 'https://example.com')).toBe(
      'https://example.com/trace/ABC1234567',
    );
    expect(buildTraceUrl('ABC1234567', 'https://example.com/')).toBe(
      'https://example.com/trace/ABC1234567',
    );
  });

  it('uses NEXT_PUBLIC_SITE_URL if available', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://xfarm.vn';
    expect(buildTraceUrl('TR999')).toBe('https://xfarm.vn/trace/TR999');
  });

  it('falls back to WEB_URL if NEXT_PUBLIC_SITE_URL is not set', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.WEB_URL = 'http://localhost:3550';
    expect(buildTraceUrl('TR888')).toBe('http://localhost:3550/trace/TR888');
  });
});

describe('generatePrintLabels', () => {
  const mockLot = {
    code: 'HL-2026-0001',
    traceCode: 'TRACE12345',
    harvestedAt: '2026-10-16T08:30:00.000Z',
    item: { name: 'Dưa lưới Huỳnh Long' },
  };

  it('generates 24 labels for A4 layout by default', () => {
    const labels = generatePrintLabels(mockLot, 'Nông trại sinh thái XFarm', 'a4');
    expect(labels).toHaveLength(24);
    expect(labels[0].productName).toBe('Dưa lưới Huỳnh Long');
    expect(labels[0].lotCode).toBe('HL-2026-0001');
    expect(labels[0].traceCode).toBe('TRACE12345');
    expect(labels[0].harvestedAt).toBe('2026-10-16');
    expect(labels[0].farmName).toBe('Nông trại sinh thái XFarm');
  });

  it('respects custom copies count for A4 layout', () => {
    const labels = generatePrintLabels(mockLot, 'XFarm', 'a4', 10);
    expect(labels).toHaveLength(10);
  });

  it('generates 1 label for label layout by default', () => {
    const labels = generatePrintLabels(mockLot, 'XFarm', 'label');
    expect(labels).toHaveLength(1);
    expect(labels[0].lotCode).toBe('HL-2026-0001');
  });

  it('generates requested copies for label layout', () => {
    const labels = generatePrintLabels(mockLot, 'XFarm', 'label', 5);
    expect(labels).toHaveLength(5);
  });
});
