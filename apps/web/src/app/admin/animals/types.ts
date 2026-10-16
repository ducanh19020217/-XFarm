import { AnimalSex, AnimalStatus, AnimalEventType, Role, type Paginated } from '@xfarm/shared';

export { AnimalSex, AnimalStatus, AnimalEventType, Role };
export type { Paginated };

export interface CycleSummary {
  id: string;
  code: string;
  name: string;
  kind: string;
}

export interface AreaSummary {
  id: string;
  code: string;
  name: string;
}

export interface AnimalGroupItem {
  id: string;
  code: string;
  cycleId: string;
  species: string;
  breed: string | null;
  headCount: number;
  areaId: string;
  notes: string | null;
  cycle?: CycleSummary | null;
  area?: AreaSummary | null;
  _count?: {
    animals: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AnimalItem {
  id: string;
  tag: string;
  groupId: string | null;
  species: string;
  breed: string | null;
  sex: AnimalSex;
  birthDate: string | null;
  status: AnimalStatus;
  motherId: string | null;
  notes: string | null;
  group?: AnimalGroupItem | null;
  mother?: AnimalItem | null;
  offspring?: AnimalItem[];
  events?: AnimalEventItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AnimalEventItem {
  id: string;
  animalId: string;
  type: AnimalEventType;
  date: string;
  data: Record<string, unknown> | null;
  notes: string | null;
  createdAt: string;
}

export const ANIMAL_SEX_LABELS: Record<AnimalSex, string> = {
  [AnimalSex.MALE]: 'Đực',
  [AnimalSex.FEMALE]: 'Cái',
  [AnimalSex.UNKNOWN]: 'Chưa rõ',
};

export const ANIMAL_STATUS_LABELS: Record<AnimalStatus, string> = {
  [AnimalStatus.ALIVE]: 'Còn sống',
  [AnimalStatus.SOLD]: 'Đã bán',
  [AnimalStatus.DEAD]: 'Đã chết',
};

export const ANIMAL_EVENT_TYPE_LABELS: Record<AnimalEventType, string> = {
  [AnimalEventType.VACCINATION]: 'Tiêm phòng',
  [AnimalEventType.TREATMENT]: 'Điều trị / Dùng thuốc',
  [AnimalEventType.WEIGHING]: 'Cân trọng lượng',
  [AnimalEventType.BREEDING]: 'Phối giống',
  [AnimalEventType.BIRTH]: 'Sinh sản',
  [AnimalEventType.SALE]: 'Xuất bán',
  [AnimalEventType.DEATH]: 'Khai tử',
};

// Phân quyền sự kiện theo vai trò
// WORKER chỉ được phép ghi: VACCINATION, TREATMENT, WEIGHING
export const WORKER_EVENT_TYPES: AnimalEventType[] = [
  AnimalEventType.VACCINATION,
  AnimalEventType.TREATMENT,
  AnimalEventType.WEIGHING,
];

export const MANAGER_EVENT_TYPES: AnimalEventType[] = [
  AnimalEventType.VACCINATION,
  AnimalEventType.TREATMENT,
  AnimalEventType.WEIGHING,
  AnimalEventType.BREEDING,
  AnimalEventType.BIRTH,
  AnimalEventType.SALE,
  AnimalEventType.DEATH,
];

export function getAllowedEventTypes(role?: string | null): AnimalEventType[] {
  if (role === Role.WORKER) {
    return WORKER_EVENT_TYPES;
  }
  if (role === Role.OWNER || role === Role.MANAGER) {
    return MANAGER_EVENT_TYPES;
  }
  // Các vai trò khác (ACCOUNTANT, SALES, ...) chỉ đọc theo hợp đồng API
  return [];
}

export function canManageAnimals(role?: string | null): boolean {
  return role === Role.OWNER || role === Role.MANAGER;
}

export function canRecordAnyEvent(role?: string | null): boolean {
  return role === Role.OWNER || role === Role.MANAGER || role === Role.WORKER;
}
