'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { DataTable, PageHeader, Toast, useToast, Button } from '@xfarm/ui';
import { apiFetch, isAbortError } from '@/lib/api';
import { useAdminUser } from '../admin-user-context';
import { getHarvestLotColumns } from './_components/harvest-lot-columns';
import {
  HarvestLotFilters,
  type FilterCycleOption,
  type FilterItemOption,
} from './_components/harvest-lot-filters';
import type { HarvestLotRecord, HarvestLotListResponse } from './types';

export default function HarvestLotsPage() {
  const { message, variant, showToast, closeToast } = useToast();
  const user = useAdminUser();
  const [lots, setLots] = React.useState<HarvestLotRecord[]>([]);
  const [cycles, setCycles] = React.useState<FilterCycleOption[]>([]);
  const [items, setItems] = React.useState<FilterItemOption[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  const [loading, setLoading] = React.useState(true);

  // Filters
  const [search, setSearch] = React.useState('');
  const [cycleId, setCycleId] = React.useState('');
  const [itemId, setItemId] = React.useState('');
  const [isPublic, setIsPublic] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');

  const columns = React.useMemo(() => getHarvestLotColumns(), []);

  const loadOptions = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const [cycleRes, itemRes] = await Promise.all([
        apiFetch<{ data: FilterCycleOption[] }>('/cycles?page=1&pageSize=100', { signal }),
        apiFetch<{ data: FilterItemOption[] }>('/items?page=1&pageSize=100&isActive=true', {
          signal,
        }),
      ]);
      setCycles(Array.isArray(cycleRes) ? cycleRes : cycleRes.data || []);
      setItems(Array.isArray(itemRes) ? itemRes : itemRes.data || []);
    } catch (error) {
      if (!isAbortError(error)) {
        // Non-blocking fallback
      }
    }
  }, []);

  const loadLots = React.useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (search.trim()) params.set('search', search.trim());
        if (cycleId) params.set('cycleId', cycleId);
        if (itemId) params.set('itemId', itemId);
        if (isPublic) params.set('isPublic', isPublic);
        if (from) params.set('from', from);
        if (to) params.set('to', to);

        const res = await apiFetch<
          HarvestLotListResponse | { data: HarvestLotRecord[]; total: number }
        >(`/harvest-lots?${params.toString()}`, { signal });
        const data = Array.isArray(res) ? res : res?.data || [];
        setLots(data);
        setTotal(res?.total ?? data.length);
      } catch (error) {
        if (!isAbortError(error)) {
          showToast('Không thể tải danh sách lô thu hoạch', 'error');
        }
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, search, cycleId, itemId, isPublic, from, to, showToast],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void loadOptions(controller.signal);
    return () => controller.abort();
  }, [loadOptions]);

  React.useEffect(() => {
    const controller = new AbortController();
    void loadLots(controller.signal);
    return () => controller.abort();
  }, [loadLots]);

  const updateFilter = (
    field: 'search' | 'cycleId' | 'itemId' | 'isPublic' | 'from' | 'to',
    value: string,
  ) => {
    const setters = {
      search: setSearch,
      cycleId: setCycleId,
      itemId: setItemId,
      isPublic: setIsPublic,
      from: setFrom,
      to: setTo,
    };
    setters[field](value);
    setPage(1);
  };

  const canCreate = user?.role === 'OWNER' || user?.role === 'MANAGER' || user?.role === 'WORKER';

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} variant={variant} />

      <PageHeader
        title="Lô thu hoạch & Truy xuất"
        description="Quản lý các lô nông sản thu hoạch, mã truy xuất nguồn gốc QR và in tem nhãn"
      >
        {canCreate && (
          <Link href="/admin/activities">
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              Ghi nhận thu hoạch
            </Button>
          </Link>
        )}
      </PageHeader>

      <HarvestLotFilters
        search={search}
        cycleId={cycleId}
        itemId={itemId}
        isPublic={isPublic}
        from={from}
        to={to}
        cycles={cycles}
        items={items}
        onChange={updateFilter}
      />

      <DataTable
        columns={columns}
        data={lots}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={loading}
      />
    </div>
  );
}
