'use client';

import { CycleKind, CycleStatus } from '@xfarm/shared';
import { Label } from '@xfarm/ui';
import { kindLabels, statusLabels } from './constants';
import type { AreaItem } from './types';

interface CycleFiltersProps {
  areas: AreaItem[];
  kind: string;
  status: string;
  areaId: string;
  onKindChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onAreaChange: (value: string) => void;
}

export function CycleFilters({
  areas,
  kind,
  status,
  areaId,
  onKindChange,
  onStatusChange,
  onAreaChange,
}: CycleFiltersProps) {
  const selectClass =
    'h-10 rounded-md border border-line bg-surface px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent';
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm">
      <div className="space-y-1">
        <Label htmlFor="filter-kind">Loại</Label>
        <select
          id="filter-kind"
          value={kind}
          onChange={(event) => onKindChange(event.target.value)}
          className={selectClass}
        >
          <option value="">Tất cả loại</option>
          {Object.values(CycleKind).map((value) => (
            <option key={value} value={value}>
              {kindLabels[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-status">Trạng thái</Label>
        <select
          id="filter-status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          className={selectClass}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.values(CycleStatus).map((value) => (
            <option key={value} value={value}>
              {statusLabels[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-area">Khu/lô</Label>
        <select
          id="filter-area"
          value={areaId}
          onChange={(event) => onAreaChange(event.target.value)}
          className={selectClass}
        >
          <option value="">Tất cả khu/lô</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.code} - {area.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
