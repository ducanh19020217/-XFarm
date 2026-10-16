import { describe, expect, it } from 'vitest';
import { ActivityType } from '@xfarm/shared';
import {
  formatDate,
  formatTimeline,
  getActivityIcon,
  getActivityLabel,
  formatActivitySummary,
  normalizePhotos,
  PublicTimelineItem,
} from './trace-utils';

describe('Trace Timeline Utilities', () => {
  describe('formatDate', () => {
    it('formats ISO date string into DD/MM/YYYY format', () => {
      expect(formatDate('2026-03-20T08:00:00Z')).toBe('20/03/2026');
      expect(formatDate(new Date('2026-11-05T14:30:00Z'))).toBe('05/11/2026');
    });

    it('returns empty string when date is null or invalid', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
      expect(formatDate('invalid-date')).toBe('');
    });

    it('formats date with time when requested', () => {
      const d = new Date(2026, 2, 20, 8, 30);
      expect(formatDate(d, true)).toBe('20/03/2026 08:30');
    });
  });

  describe('getActivityLabel & getActivityIcon', () => {
    it('returns Vietnamese labels for known activity types', () => {
      expect(getActivityLabel(ActivityType.SOWING)).toBe('Gieo hạt');
      expect(getActivityLabel(ActivityType.IRRIGATION)).toBe('Tưới nước');
      expect(getActivityLabel(ActivityType.FERTILIZING)).toBe('Bón phân');
      expect(getActivityLabel(ActivityType.HARVEST)).toBe('Thu hoạch');
    });

    it('returns appropriate icon or emoji for activity types', () => {
      expect(getActivityIcon(ActivityType.SOWING)).toBe('🌱');
      expect(getActivityIcon(ActivityType.HARVEST)).toBe('🧺');
      expect(getActivityIcon(ActivityType.IRRIGATION)).toBe('🚿');
    });

    it('handles unknown or custom activity types gracefully', () => {
      expect(getActivityLabel('UNKNOWN_TYPE')).toBe('UNKNOWN_TYPE');
      expect(getActivityIcon('UNKNOWN_TYPE')).toBe('🌱');
    });
  });

  describe('formatActivitySummary', () => {
    it('uses rawSummary when provided', () => {
      expect(formatActivitySummary(ActivityType.IRRIGATION, null, 'Tưới nhỏ giọt 30 phút')).toBe(
        'Tưới nhỏ giọt 30 phút',
      );
    });

    it('filters out sensitive financial details like price or VND', () => {
      const summary = formatActivitySummary(
        ActivityType.FERTILIZING,
        null,
        'Bón phân NPK 500.000 đ',
      );
      expect(summary).not.toContain('500.000 đ');
      expect(summary).toBe('Bón phân NPK');
    });

    it('formats data fields when rawSummary is absent', () => {
      const data = {
        pH: 6.8,
        DO: 5.5,
        temp: 26,
      };
      const summary = formatActivitySummary(ActivityType.WATER_TEST, data);
      expect(summary).toBe('pH: 6.8 · DO (mg/L): 5.5 · Nhiệt độ (°C): 26');
    });

    it('only whitelists allowed safe fields and excludes sensitive properties', () => {
      const data = {
        dosage: '10g/m2',
        unitCost: 150000,
        notes: 'Ghi chú nội bộ bí mật',
        performedBy: 'Nguyễn Văn A',
        createdById: 'user-123',
      };
      const summary = formatActivitySummary(ActivityType.FERTILIZING, data);
      expect(summary).toContain('Liều lượng: 10g/m2');
      expect(summary).not.toContain('150000');
      expect(summary).not.toContain('Ghi chú');
      expect(summary).not.toContain('Nguyễn Văn A');
      expect(summary).not.toContain('user-123');
    });
  });

  describe('formatTimeline', () => {
    it('handles empty timeline array gracefully', () => {
      expect(formatTimeline([])).toEqual([]);
      // @ts-expect-error test undefined input
      expect(formatTimeline(undefined)).toEqual([]);
    });

    it('sorts timeline chronologically by performedAt', () => {
      const items: PublicTimelineItem[] = [
        {
          id: '2',
          type: ActivityType.HARVEST,
          performedAt: '2026-03-20T08:00:00Z',
        },
        {
          id: '1',
          type: ActivityType.SOWING,
          performedAt: '2026-01-10T08:00:00Z',
        },
      ];

      const result = formatTimeline(items);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[0].type).toBe(ActivityType.SOWING);
      expect(result[0].typeLabel).toBe('Gieo hạt');
      expect(result[0].formattedDate).toBe('10/01/2026');

      expect(result[1].id).toBe('2');
      expect(result[1].type).toBe(ActivityType.HARVEST);
      expect(result[1].typeLabel).toBe('Thu hoạch');
      expect(result[1].formattedDate).toBe('20/03/2026');
    });

    it('preserves mediaUrls when available', () => {
      const items: PublicTimelineItem[] = [
        {
          id: '1',
          type: ActivityType.PLANTING,
          performedAt: '2026-01-15T08:00:00Z',
          mediaUrls: ['https://example.com/plant.jpg'],
        },
      ];

      const result = formatTimeline(items);
      expect(result[0].mediaUrls).toEqual(['https://example.com/plant.jpg']);
    });

    it('ensures NO employee or financial information is leaked in output', () => {
      const items: any[] = [
        {
          id: 'act-1',
          type: ActivityType.FERTILIZING,
          performedAt: '2026-02-01T08:00:00Z',
          data: {
            product: 'Phân vi sinh hữu cơ',
            dosage: '5kg/sào',
            unitCost: 50000,
            performedBy: 'Trần Văn Nhân Viên',
          },
          performedBy: 'Trần Văn Nhân Viên',
          notes: 'Nhân viên A làm việc',
        },
      ];

      const result = formatTimeline(items);
      const serialized = JSON.stringify(result);

      expect(serialized).not.toContain('Trần Văn Nhân Viên');
      expect(serialized).not.toContain('Nhân viên A');
      expect(serialized).not.toContain('50000');
      expect(serialized).not.toContain('unitCost');
      expect(serialized).toContain('Phân vi sinh hữu cơ');
      expect(serialized).toContain('5kg/sào');
    });
  });

  describe('normalizePhotos', () => {
    it('normalizes string URLs and object formats into standard photo objects', () => {
      const raw = [
        'https://example.com/1.jpg',
        { url: 'https://example.com/2.jpg', caption: 'Lô thu hoạch' },
        '',
      ];
      const normalized = normalizePhotos(raw);
      expect(normalized).toEqual([
        { url: 'https://example.com/1.jpg' },
        { url: 'https://example.com/2.jpg', caption: 'Lô thu hoạch' },
      ]);
    });
  });
});
