import { describe, it, expect } from 'vitest';
import { traceResponseSchema } from './trace';
import { ActivityType, AreaType } from '../types';

describe('traceResponseSchema', () => {
  it('validates a complete public trace response', () => {
    const sample = {
      product: {
        name: 'Rau cải ngọt',
        slug: 'rau-cai-ngot',
        unit: 'kg',
      },
      lot: {
        code: 'HL-2026-0001',
        traceCode: 'DEMO000001',
        quantity: 1200,
        unit: 'kg',
        harvestedAt: new Date('2026-03-20T08:00:00Z'),
        qualityGrade: 'A',
        certification: 'VietGAP',
      },
      area: {
        name: 'Lô rau 1',
        type: AreaType.FIELD,
      },
      cycle: {
        name: 'Vụ rau cải ngọt xuân 2026',
        species: 'Rau cải ngọt',
        variety: 'Cải ngọt F1',
        startDate: new Date('2026-02-01T08:00:00Z'),
      },
      timeline: [
        {
          type: ActivityType.IRRIGATION,
          performedAt: new Date('2026-02-05T07:00:00Z'),
          data: { durationMin: 45, volumeL: 1500 },
          mediaUrl: 'http://localhost:9010/xfarm-media/photo1.jpg',
        },
      ],
      photos: [
        {
          id: 'media-1',
          url: 'http://localhost:9010/xfarm-media/photo1.jpg',
          alt: 'Ảnh tưới nước',
        },
      ],
    };

    const parsed = traceResponseSchema.parse(sample);
    expect(parsed.product?.slug).toBe('rau-cai-ngot');
    expect(parsed.lot.traceCode).toBe('DEMO000001');
    expect(parsed.timeline).toHaveLength(1);
    expect(parsed.photos).toHaveLength(1);
  });

  it('validates response when product is null', () => {
    const sample = {
      product: null,
      lot: {
        code: 'HL-2026-0002',
        traceCode: 'DEMO000002',
        quantity: '500',
        unit: 'bó',
        harvestedAt: '2026-03-22T08:00:00Z',
        qualityGrade: null,
        certification: null,
      },
      area: {
        name: 'Nhà màng 1',
        type: AreaType.GREENHOUSE,
      },
      cycle: {
        name: 'Vụ dưa lưới',
        species: 'Dưa lưới',
        variety: null,
        startDate: '2026-01-10T08:00:00Z',
      },
      timeline: [],
      photos: [],
    };

    const parsed = traceResponseSchema.parse(sample);
    expect(parsed.product).toBeNull();
    expect(parsed.lot.qualityGrade).toBeNull();
    expect(parsed.timeline).toHaveLength(0);
  });
});
