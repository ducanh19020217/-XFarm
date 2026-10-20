import * as React from 'react';
import { Search } from 'lucide-react';
import { Input, Label } from '@xfarm/ui';

export interface FilterCycleOption {
  id: string;
  code: string;
  name: string;
}

export interface FilterItemOption {
  id: string;
  name: string;
  code?: string;
  sku?: string;
}

export interface HarvestLotFiltersProps {
  search: string;
  cycleId: string;
  itemId: string;
  isPublic: string;
  from: string;
  to: string;
  cycles: FilterCycleOption[];
  items: FilterItemOption[];
  onChange: (
    field: 'search' | 'cycleId' | 'itemId' | 'isPublic' | 'from' | 'to',
    value: string,
  ) => void;
}

export function HarvestLotFilters({
  search,
  cycleId,
  itemId,
  isPublic,
  from,
  to,
  cycles,
  items,
  onChange,
}: HarvestLotFiltersProps) {
  const selectClass =
    'flex h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <div className="grid gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm md:grid-cols-3 lg:grid-cols-6">
      <div className="space-y-1 lg:col-span-2">
        <Label htmlFor="search-filter">Tìm kiếm</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
          <Input
            id="search-filter"
            aria-label="Tìm kiếm mã lô hoặc mã truy xuất"
            placeholder="Mã lô, mã truy xuất..."
            value={search}
            onChange={(e) => onChange('search', e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="cycle-filter">Mùa vụ</Label>
        <select
          id="cycle-filter"
          aria-label="Lọc theo mùa vụ"
          value={cycleId}
          onChange={(e) => onChange('cycleId', e.target.value)}
          className={selectClass}
        >
          <option value="">Tất cả mùa vụ</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} - {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="item-filter">Sản phẩm</Label>
        <select
          id="item-filter"
          aria-label="Lọc theo sản phẩm"
          value={itemId}
          onChange={(e) => onChange('itemId', e.target.value)}
          className={selectClass}
        >
          <option value="">Tất cả sản phẩm</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="public-filter">Trạng thái công khai</Label>
        <select
          id="public-filter"
          aria-label="Lọc theo trạng thái công khai"
          value={isPublic}
          onChange={(e) => onChange('isPublic', e.target.value)}
          className={selectClass}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="true">Công khai</option>
          <option value="false">Nội bộ</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:col-span-1">
        <div className="space-y-1">
          <Label htmlFor="from-filter">Từ ngày</Label>
          <Input
            id="from-filter"
            aria-label="Từ ngày"
            type="date"
            value={from}
            onChange={(e) => onChange('from', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="to-filter">Đến ngày</Label>
          <Input
            id="to-filter"
            aria-label="Đến ngày"
            type="date"
            value={to}
            onChange={(e) => onChange('to', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
