'use client';

import type { ActivityArea, ActivityCycle } from './types';
import { activityTypeLabels } from './constants';

interface ActivityFiltersProps {
  areas: ActivityArea[];
  cycles: ActivityCycle[];
  type: string;
  areaId: string;
  cycleId: string;
  from: string;
  to: string;
  onChange: (field: 'type' | 'areaId' | 'cycleId' | 'from' | 'to', value: string) => void;
}

export function ActivityFilters({
  areas,
  cycles,
  type,
  areaId,
  cycleId,
  from,
  to,
  onChange,
}: ActivityFiltersProps) {
  const controlClass =
    'h-9 rounded-md border border-line bg-surface px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent';
  return (
    <div className="grid gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
      <select
        aria-label="Lọc theo loại"
        value={type}
        onChange={(event) => onChange('type', event.target.value)}
        className={controlClass}
      >
        <option value="">Tất cả loại</option>
        {Object.entries(activityTypeLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select
        aria-label="Lọc theo khu"
        value={areaId}
        onChange={(event) => onChange('areaId', event.target.value)}
        className={controlClass}
      >
        <option value="">Tất cả khu/lô</option>
        {areas.map((area) => (
          <option key={area.id} value={area.id}>
            {area.code} - {area.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Lọc theo mùa vụ"
        value={cycleId}
        onChange={(event) => onChange('cycleId', event.target.value)}
        className={controlClass}
      >
        <option value="">Tất cả mùa vụ</option>
        {cycles.map((cycle) => (
          <option key={cycle.id} value={cycle.id}>
            {cycle.name}
          </option>
        ))}
      </select>
      <input
        aria-label="Từ ngày"
        type="date"
        value={from}
        onChange={(event) => onChange('from', event.target.value)}
        className={controlClass}
      />
      <input
        aria-label="Đến ngày"
        type="date"
        value={to}
        onChange={(event) => onChange('to', event.target.value)}
        className={controlClass}
      />
    </div>
  );
}
