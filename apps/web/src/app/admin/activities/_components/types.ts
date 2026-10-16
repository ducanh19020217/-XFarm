import type { ActivityType, AreaType, CycleStatus } from '@xfarm/shared';

export interface ActivityArea {
  id: string;
  code: string;
  name: string;
  type?: AreaType;
  isActive?: boolean;
}

export interface ActivityCycle {
  id: string;
  code: string;
  name: string;
  areaId: string;
  status: CycleStatus;
  area?: { id?: string; code?: string; name?: string } | null;
}

export interface ActivityMedia {
  id: string;
  url: string;
  key?: string;
  mime?: string;
  size?: number;
  alt?: string | null;
}

export interface ActivityMaterial {
  id: string;
  quantity: string | number;
  unitCost: string | number;
  item: { id: string; name: string; unit: string };
  stockLot?: { id: string; lotCode: string } | null;
}

export interface ActivityRecord {
  id: string;
  type: ActivityType;
  performedAt: string;
  data?: Record<string, unknown> | null;
  notes?: string | null;
  area: ActivityArea;
  cycle?: ActivityCycle | null;
  performedBy?: { id: string; fullName: string; email: string } | null;
  media?: ActivityMedia[];
  materials?: ActivityMaterial[];
}

export interface ActivityListResponse {
  data: ActivityRecord[];
  total: number;
  page: number;
  pageSize: number;
}
