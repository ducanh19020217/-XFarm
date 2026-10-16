import { AreaType } from '@xfarm/shared';

export const AREA_TYPE_LABELS: Record<AreaType, string> = {
  [AreaType.ZONE]: 'Khu vực',
  [AreaType.FIELD]: 'Lô/Ruộng',
  [AreaType.GREENHOUSE]: 'Nhà màng',
  [AreaType.BARN]: 'Chuồng trại',
  [AreaType.POND]: 'Ao nuôi',
  [AreaType.VISITOR_ZONE]: 'Khu tham quan',
  [AreaType.WAREHOUSE_ZONE]: 'Khu kho bãi',
};

export const AREA_TYPE_COLORS: Record<
  AreaType,
  {
    fill: string;
    stroke: string;
    badgeVariant: 'default' | 'secondary' | 'warning' | 'info' | 'destructive';
  }
> = {
  [AreaType.ZONE]: {
    fill: '#3b82f6',
    stroke: '#1d4ed8',
    badgeVariant: 'info',
  },
  [AreaType.FIELD]: {
    fill: '#22c55e',
    stroke: '#15803d',
    badgeVariant: 'default',
  },
  [AreaType.GREENHOUSE]: {
    fill: '#14b8a6',
    stroke: '#0f766e',
    badgeVariant: 'default',
  },
  [AreaType.BARN]: {
    fill: '#f59e0b',
    stroke: '#b45309',
    badgeVariant: 'warning',
  },
  [AreaType.POND]: {
    fill: '#06b6d4',
    stroke: '#0e7490',
    badgeVariant: 'info',
  },
  [AreaType.VISITOR_ZONE]: {
    fill: '#a855f7',
    stroke: '#7e22ce',
    badgeVariant: 'secondary',
  },
  [AreaType.WAREHOUSE_ZONE]: {
    fill: '#64748b',
    stroke: '#334155',
    badgeVariant: 'secondary',
  },
};

export interface AreaItem {
  id: string;
  code: string;
  name: string;
  type: AreaType;
  parentId: string | null;
  areaM2: number | null;
  geojson: unknown;
  description: string | null;
  isActive: boolean;
  activeCyclesCount?: number;
  _count?: { cycles: number };
  parent?: {
    id: string;
    code: string;
    name: string;
  } | null;
  children?: AreaItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AreaTreeItem extends AreaItem {
  children?: AreaTreeItem[];
}
