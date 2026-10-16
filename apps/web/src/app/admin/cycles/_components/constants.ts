import { CycleKind, CycleStatus } from '@xfarm/shared';

export const kindLabels: Record<CycleKind, string> = {
  CROP: 'Trồng trọt',
  LIVESTOCK: 'Chăn nuôi',
  AQUA: 'Thủy sản',
};

export const statusLabels: Record<CycleStatus, string> = {
  PLANNED: 'Kế hoạch',
  ACTIVE: 'Đang hoạt động',
  HARVESTING: 'Đang thu hoạch',
  CLOSED: 'Đã đóng',
  CANCELLED: 'Đã hủy',
};

export const transitionLabels: Record<CycleStatus, string> = {
  PLANNED: 'Đưa vào kế hoạch',
  ACTIVE: 'Bắt đầu hoạt động',
  HARVESTING: 'Bắt đầu thu hoạch',
  CLOSED: 'Đóng mùa vụ',
  CANCELLED: 'Hủy mùa vụ',
};
