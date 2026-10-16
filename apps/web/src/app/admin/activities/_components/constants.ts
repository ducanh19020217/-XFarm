import { ActivityType } from '@xfarm/shared';
import type { CycleStatus } from '@xfarm/shared';

export const activityTypeLabels: Record<ActivityType, string> = {
  [ActivityType.SOWING]: 'Gieo hạt',
  [ActivityType.PLANTING]: 'Trồng cây',
  [ActivityType.FERTILIZING]: 'Bón phân',
  [ActivityType.SPRAYING]: 'Phun thuốc',
  [ActivityType.IRRIGATION]: 'Tưới nước',
  [ActivityType.PRUNING]: 'Tỉa cành',
  [ActivityType.WEEDING]: 'Làm cỏ',
  [ActivityType.FEEDING]: 'Cho ăn',
  [ActivityType.VACCINATION]: 'Tiêm phòng',
  [ActivityType.TREATMENT]: 'Điều trị',
  [ActivityType.WATER_TEST]: 'Kiểm tra nước',
  [ActivityType.STOCKING]: 'Thả giống',
  [ActivityType.MORTALITY]: 'Hao hụt',
  [ActivityType.WEIGHING]: 'Cân mẫu',
  [ActivityType.HARVEST]: 'Thu hoạch',
  [ActivityType.CLEANING]: 'Vệ sinh',
  [ActivityType.OTHER]: 'Khác',
};

export const activityFieldLabels: Record<string, string> = {
  pH: 'pH',
  DO: 'DO (mg/L)',
  temp: 'Nhiệt độ (°C)',
  salinity: 'Độ mặn',
  NH3: 'NH3',
  avgWeightKg: 'Cân trung bình (kg)',
  sampleSize: 'Số mẫu',
  feedKg: 'Thức ăn (kg)',
  count: 'Số lượng',
  cause: 'Nguyên nhân',
  avgWeightG: 'Cân trung bình (g)',
  durationMin: 'Thời gian (phút)',
  volumeL: 'Lượng nước (lít)',
  product: 'Sản phẩm',
  dosage: 'Liều lượng',
  itemId: 'Sản phẩm',
  warehouseId: 'Kho',
  qualityGrade: 'Phân loại',
  certification: 'Chứng nhận',
  isPublic: 'Công khai truy xuất',
};

export const activityIcons: Record<ActivityType, string> = {
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
  [ActivityType.MORTALITY]: '⚠️',
  [ActivityType.WEIGHING]: '⚖️',
  [ActivityType.HARVEST]: '🧺',
  [ActivityType.CLEANING]: '🧹',
  [ActivityType.OTHER]: '📝',
};

export function canRecordActivity(status: CycleStatus) {
  return status !== 'CLOSED' && status !== 'CANCELLED';
}

export function canCreateActivity(role?: string | null) {
  return role === 'OWNER' || role === 'MANAGER' || role === 'WORKER';
}

export function activitySummary(type: ActivityType, data?: Record<string, unknown> | null) {
  if (!data) return '';
  const fields = Object.entries(data).filter(
    ([, value]) => value !== '' && value !== null && value !== undefined,
  );
  if (!fields.length) return '';
  return fields
    .slice(0, 4)
    .map(
      ([key, value]) =>
        `${key === 'DO' ? 'DO' : (activityFieldLabels[key] ?? key)} ${String(value)}`,
    )
    .join(' · ');
}
