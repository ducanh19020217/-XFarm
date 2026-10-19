export interface HarvestLotRecord {
  id: string;
  code: string;
  traceCode: string;
  cycleId: string;
  cycle?: {
    id: string;
    code: string;
    name: string;
  } | null;
  activityId: string;
  activity?: {
    id: string;
    performedAt: string;
    area?: {
      id: string;
      code: string;
      name: string;
    } | null;
  } | null;
  itemId: string;
  item?: {
    id: string;
    code?: string;
    sku?: string;
    name: string;
    unit: string;
    category?: string;
  } | null;
  quantity: number | string;
  remainingQuantity?: number | string | null;
  unit: string;
  harvestedAt: string;
  warehouseId: string;
  warehouse?: {
    id: string;
    code: string;
    name: string;
  } | null;
  stockLot?: {
    id: string;
    code: string;
    quantity: number | string;
    remainingQuantity?: number | string;
  } | null;
  qualityGrade?: string | null;
  certification?: string | null;
  isPublic: boolean;
  createdById?: string | null;
  createdBy?: {
    id: string;
    fullName: string;
    email?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface HarvestLotListResponse {
  data: HarvestLotRecord[];
  total: number;
  page: number;
  pageSize: number;
}
