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

export interface ActivityMaterialItem {
  id?: string;
  itemId: string;
  itemName?: string;
  item?: { id: string; name: string; sku?: string; unit?: string; category?: string };
  stockLotId?: string | null;
  quantity: number | string;
  unit?: string;
  unitCost?: number | string;
}

export interface AvailableItem {
  id: string;
  sku?: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  warehouseId?: string;
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
  materials?: ActivityMaterialItem[];
}

export interface ActivityListResponse {
  data: ActivityRecord[];
  total: number;
  page: number;
  pageSize: number;
}
