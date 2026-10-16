import { ActivityType } from '@xfarm/shared';

export interface PublicProduct {
  name: string;
  slug: string;
  unit?: string;
}

export interface PublicLot {
  code: string;
  traceCode: string;
  quantity: number | string;
  unit: string;
  harvestedAt: string | Date;
  qualityGrade?: string | null;
  certification?: string | null;
}

export interface PublicArea {
  name: string;
  type: string;
}

export interface PublicCycle {
  name: string;
  species: string;
  variety?: string | null;
  startDate: string | Date;
}

export interface PublicTimelineItem {
  id?: string;
  type: ActivityType | string;
  performedAt: string | Date;
  summary?: string;
  data?: Record<string, unknown> | null;
  mediaUrls?: string[];
  // Safety guard: we explicitly ignore sensitive fields if passed by mistake
  notes?: never;
  performedBy?: never;
  materials?: never;
  unitCost?: never;
  createdById?: never;
}

export interface FormattedTimelineItem {
  id: string;
  type: string;
  typeLabel: string;
  icon: string;
  performedAt: string;
  formattedDate: string;
  summary: string;
  mediaUrls: string[];
}

export interface PublicTraceData {
  product?: PublicProduct | null;
  lot: PublicLot;
  area?: PublicArea | null;
  cycle?: PublicCycle | null;
  timeline: PublicTimelineItem[];
  photos: Array<string | { url: string; caption?: string }>;
}

export interface PublicSiteSettings {
  farmName?: string;
  slogan?: string;
  phone?: string;
  email?: string;
  address?: string;
  [key: string]: unknown;
}

export const DEFAULT_SITE_SETTINGS: PublicSiteSettings = {
  farmName: 'XFarm – Nông trại sinh thái',
  slogan: 'Tươi lành từ đất, an tâm đến bàn ăn',
  phone: '0901 234 567',
  email: 'hello@xfarm.local',
  address: 'Khu nông nghiệp sinh thái XFarm, Hà Nội',
};

export const ACTIVITY_LABELS: Record<string, string> = {
  [ActivityType.SOWING]: 'Gieo hạt',
  [ActivityType.PLANTING]: 'Trồng cây',
  [ActivityType.FERTILIZING]: 'Bón phân',
  [ActivityType.SPRAYING]: 'Phun thuốc bảo vệ',
  [ActivityType.IRRIGATION]: 'Tưới nước',
  [ActivityType.PRUNING]: 'Cắt tỉa cành',
  [ActivityType.WEEDING]: 'Làm cỏ',
  [ActivityType.FEEDING]: 'Cho ăn',
  [ActivityType.VACCINATION]: 'Tiêm phòng',
  [ActivityType.TREATMENT]: 'Điều trị thú y',
  [ActivityType.WATER_TEST]: 'Kiểm tra chất lượng nước',
  [ActivityType.STOCKING]: 'Thả giống',
  [ActivityType.MORTALITY]: 'Kiểm tra sinh trưởng',
  [ActivityType.WEIGHING]: 'Cân đo trọng lượng',
  [ActivityType.HARVEST]: 'Thu hoạch',
  [ActivityType.CLEANING]: 'Vệ sinh chuồng trại',
  [ActivityType.OTHER]: 'Hoạt động canh tác',
};

export const ACTIVITY_ICONS: Record<string, string> = {
  [ActivityType.SOWING]: '🌱',
  [ActivityType.PLANTING]: '🌿',
  [ActivityType.FERTILIZING]: '🧪',
  [ActivityType.SPRAYING]: '💧',
  [ActivityType.IRRIGATION]: '🚿',
  [ActivityType.PRUNING]: '✂️',
  [ActivityType.WEEDING]: '🪴',
  [ActivityType.FEEDING]: '🌾',
  [ActivityType.VACCINATION]: '💉',
  [ActivityType.TREATMENT]: '🩺',
  [ActivityType.WATER_TEST]: '🧫',
  [ActivityType.STOCKING]: '🐟',
  [ActivityType.MORTALITY]: '📋',
  [ActivityType.WEIGHING]: '⚖️',
  [ActivityType.HARVEST]: '🧺',
  [ActivityType.CLEANING]: '🧹',
  [ActivityType.OTHER]: '📝',
};

export const DATA_FIELD_LABELS: Record<string, string> = {
  pH: 'pH',
  DO: 'DO (mg/L)',
  temp: 'Nhiệt độ (°C)',
  salinity: 'Độ mặn',
  NH3: 'Khí NH3',
  avgWeightKg: 'Cân TB (kg)',
  avgWeightG: 'Cân TB (g)',
  sampleSize: 'Số mẫu',
  feedKg: 'Thức ăn (kg)',
  count: 'Số lượng',
  durationMin: 'Thời gian (phút)',
  volumeL: 'Lượng nước (L)',
  product: 'Chế phẩm',
  dosage: 'Liều lượng',
  seedLot: 'Lô giống',
  method: 'Phương pháp',
  quantity: 'Số lượng',
  unit: 'Đơn vị',
};

// Whitelist of allowed data fields to ensure privacy
const ALLOWED_DATA_FIELDS = new Set([
  'pH',
  'DO',
  'temp',
  'salinity',
  'NH3',
  'avgWeightKg',
  'avgWeightG',
  'sampleSize',
  'feedKg',
  'count',
  'durationMin',
  'volumeL',
  'product',
  'dosage',
  'seedLot',
  'method',
  'quantity',
  'unit',
  'qualityGrade',
  'certification',
]);

export function formatDate(inputDate?: string | Date | null, includeTime = false): string {
  if (!inputDate) return '';
  const d = new Date(inputDate);
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (!includeTime) {
    return `${day}/${month}/${year}`;
  }

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function getActivityLabel(type: string): string {
  return ACTIVITY_LABELS[type] || type || 'Hoạt động canh tác';
}

export function getActivityIcon(type: string): string {
  return ACTIVITY_ICONS[type] || '🌱';
}

export function formatActivitySummary(
  type: string,
  data?: Record<string, unknown> | null,
  rawSummary?: string,
): string {
  if (rawSummary && rawSummary.trim()) {
    // Basic hygiene check on raw summary to ensure no cost/personal leaks
    const sanitized = rawSummary
      .replace(/(\d+[\d,.]*\s*(đ|vnd|đồng|vnđ))/gi, '')
      .trim();
    if (sanitized) return sanitized;
  }

  if (!data || typeof data !== 'object') {
    return '';
  }

  const safeEntries = Object.entries(data)
    .filter(([key, val]) => {
      if (!ALLOWED_DATA_FIELDS.has(key)) return false;
      return val !== '' && val !== null && val !== undefined;
    })
    .slice(0, 4);

  if (safeEntries.length === 0) {
    return '';
  }

  return safeEntries
    .map(([key, val]) => {
      const label = DATA_FIELD_LABELS[key] || key;
      return `${label}: ${String(val)}`;
    })
    .join(' · ');
}

export function formatTimeline(timeline: PublicTimelineItem[] = []): FormattedTimelineItem[] {
  if (!Array.isArray(timeline)) return [];

  // Sort ascending by performedAt date
  const sorted = [...timeline].sort((a, b) => {
    const timeA = new Date(a.performedAt).getTime();
    const timeB = new Date(b.performedAt).getTime();
    return timeA - timeB;
  });

  return sorted.map((item, index) => {
    const rawType = String(item.type || ActivityType.OTHER);
    const performedAtStr = item.performedAt
      ? new Date(item.performedAt).toISOString()
      : new Date().toISOString();

    const mediaList: string[] = [];
    if (Array.isArray(item.mediaUrls)) {
      for (const m of item.mediaUrls) {
        if (typeof m === 'string' && m.trim()) {
          mediaList.push(m);
        }
      }
    }

    return {
      id: item.id || `timeline-${index}-${rawType}`,
      type: rawType,
      typeLabel: getActivityLabel(rawType),
      icon: getActivityIcon(rawType),
      performedAt: performedAtStr,
      formattedDate: formatDate(item.performedAt),
      summary: formatActivitySummary(rawType, item.data, item.summary),
      mediaUrls: mediaList,
    };
  });
}

export function normalizePhotos(
  photos: Array<string | { url: string; caption?: string }> = [],
): Array<{ url: string; caption?: string }> {
  if (!Array.isArray(photos)) return [];
  return photos
    .map((p) => {
      if (typeof p === 'string' && p.trim()) {
        return { url: p };
      }
      if (p && typeof p === 'object' && typeof p.url === 'string' && p.url.trim()) {
        return { url: p.url, caption: p.caption };
      }
      return null;
    })
    .filter((p): p is { url: string; caption?: string } => p !== null);
}
