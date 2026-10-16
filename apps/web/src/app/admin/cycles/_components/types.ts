import type { AreaType, CycleKind, CycleStatus, Paginated } from '@xfarm/shared';

export interface AreaItem {
  id: string;
  code: string;
  name: string;
  type?: AreaType;
  isActive?: boolean;
}

export interface CycleItem {
  id: string;
  code: string;
  name: string;
  kind: CycleKind;
  areaId: string;
  area?: { id?: string; code?: string; name?: string } | null;
  species: string;
  variety?: string | null;
  startDate: string;
  status: CycleStatus;
  expectedYield?: number | string | null;
  yieldUnit?: string | null;
  initialQuantity?: number | string | null;
}

export interface CycleDetail extends CycleItem {
  expectedEndDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  activityCount?: number;
  latestActivityAt?: string | null;
}

export type CycleListResponse = Paginated<CycleItem>;

export type CycleFormValues = {
  name: string;
  kind: CycleKind;
  areaId: string;
  species: string;
  variety?: string | null;
  startDate: string;
  expectedYield?: number | null;
  yieldUnit?: string | null;
  initialQuantity?: number | null;
  notes?: string | null;
};
