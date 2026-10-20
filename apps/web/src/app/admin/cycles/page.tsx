'use client';

import * as React from 'react';
import { FormDialog, PageHeader, Toast, useToast } from '@xfarm/ui';
import { CycleStatus } from '@xfarm/shared';
import { CheckCircle2, Clock, Layers, MapPin } from 'lucide-react';
import { apiFetch, ApiError, isAbortError } from '@/lib/api';
import { useAdminUser } from '../admin-user-context';
import { CycleFilters } from './_components/cycle-filters';
import { CycleForm } from './_components/cycle-form';
import { CycleTable } from './_components/cycle-table';
import { CycleCreateButton } from './_components/cycle-create-button';
import type { AreaItem, CycleFormValues, CycleItem, CycleListResponse } from './_components/types';

export type { CycleItem } from './_components/types';

export default function CyclesPage() {
  const user = useAdminUser();
  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const { message, showToast, closeToast } = useToast();
  const [cycles, setCycles] = React.useState<CycleItem[]>([]);
  const [areas, setAreas] = React.useState<AreaItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [kind, setKind] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [areaId, setAreaId] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const pageSize = 10;

  const fetchAreas = React.useCallback(
    async (signal?: AbortSignal) => {
      try {
        const result = await apiFetch<{ data: AreaItem[] } | AreaItem[]>(
          '/areas?page=1&pageSize=100&isActive=true',
          { signal },
        );
        setAreas(Array.isArray(result) ? result : result.data);
      } catch (error) {
        if (!isAbortError(error)) showToast('Không thể tải danh sách khu/lô');
      }
    },
    [showToast],
  );

  const fetchCycles = React.useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set('search', search);
      if (kind) params.set('kind', kind);
      if (status) params.set('status', status);
      if (areaId) params.set('areaId', areaId);
      try {
        const result = await apiFetch<CycleListResponse>(`/cycles?${params}`, { signal });
        setCycles(result.data);
        setTotal(result.total);
      } catch (error) {
        if (!isAbortError(error)) {
          showToast(error instanceof ApiError ? error.message : 'Không thể tải danh sách mùa vụ');
        }
      } finally {
        setLoading(false);
      }
    },
    [areaId, kind, page, search, showToast, status],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchAreas(controller.signal);
    return () => controller.abort();
  }, [fetchAreas]);
  React.useEffect(() => {
    const controller = new AbortController();
    void fetchCycles(controller.signal);
    return () => controller.abort();
  }, [fetchCycles]);

  const submit = async (data: CycleFormValues) => {
    setSubmitting(true);
    try {
      await apiFetch('/cycles', { method: 'POST', body: JSON.stringify(data) });
      setCreateOpen(false);
      await fetchCycles();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tạo mùa vụ');
    } finally {
      setSubmitting(false);
    }
  };

  const resetPage = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const activeCount = cycles.filter((c) => c.status === CycleStatus.IN_PROGRESS).length;
  const completedCount = cycles.filter(
    (c) => c.status === CycleStatus.HARVESTED || c.status === CycleStatus.COMPLETED,
  ).length;

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} />
      <PageHeader
        title="Quản lý Mùa vụ"
        description="Theo dõi vòng đời sản xuất cây trồng, vật nuôi và thủy sản"
      >
        <CycleCreateButton canManage={canManage} onClick={() => setCreateOpen(true)} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Tổng mùa vụ</span>
            <Layers className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-2 text-2xl font-bold text-fg">{total}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Đang thực hiện</span>
            <Clock className="h-4 w-4 text-warn" />
          </div>
          <p className="mt-2 text-2xl font-bold text-fg">{activeCount}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Đã thu hoạch / xong</span>
            <CheckCircle2 className="h-4 w-4 text-ok" />
          </div>
          <p className="mt-2 text-2xl font-bold text-fg">{completedCount}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Khu / Lô liên kết</span>
            <MapPin className="h-4 w-4 text-info" />
          </div>
          <p className="mt-2 text-2xl font-bold text-fg">{areas.length}</p>
        </div>
      </div>

      <CycleFilters
        areas={areas}
        kind={kind}
        status={status}
        areaId={areaId}
        onKindChange={(value) => resetPage(setKind, value)}
        onStatusChange={(value) => resetPage(setStatus, value)}
        onAreaChange={(value) => resetPage(setAreaId, value)}
      />
      <CycleTable
        cycles={cycles}
        areas={areas}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        search={search}
        onSearchChange={(value) => resetPage(setSearch, value)}
        isLoading={loading}
      />
      {canManage && (
        <FormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Thêm mùa vụ"
          description="Nhập thông tin mùa vụ mới"
          className="max-w-2xl"
        >
          <CycleForm areas={areas} onSubmit={submit} isSubmitting={submitting} formError={null} />
        </FormDialog>
      )}
    </div>
  );
}
