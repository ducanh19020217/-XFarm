'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { ActivityType } from '@xfarm/shared';
import { DataTable, FormDialog, PageHeader, Toast, useToast, Button } from '@xfarm/ui';
import { apiFetch, ApiError, isAbortError } from '@/lib/api';
import { useAdminUser } from '../admin-user-context';
import { ActivityForm } from './_components/activity-form';
import { canCreateActivity } from './_components/constants';
import { getActivityColumns } from './_components/activity-columns';
import { ActivityFilters } from './_components/activity-filters';
import { ActivityDetailDialog } from './_components/activity-detail-dialog';
import type {
  ActivityArea,
  ActivityCycle,
  ActivityListResponse,
  ActivityRecord,
} from './_components/types';

export default function ActivitiesPage() {
  const { message, variant, showToast, closeToast } = useToast();
  const user = useAdminUser();
  const [activities, setActivities] = React.useState<ActivityRecord[]>([]);
  const [areas, setAreas] = React.useState<ActivityArea[]>([]);
  const [cycles, setCycles] = React.useState<ActivityCycle[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [type, setType] = React.useState('');
  const [areaId, setAreaId] = React.useState('');
  const [cycleId, setCycleId] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [selectedActivity, setSelectedActivity] = React.useState<ActivityRecord | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const pageSize = 10;

  const handleViewDetail = React.useCallback((activity: ActivityRecord) => {
    setSelectedActivity(activity);
    setDetailOpen(true);
  }, []);

  const columns = React.useMemo(() => getActivityColumns(handleViewDetail), [handleViewDetail]);
  const loadOptions = React.useCallback(
    async (signal?: AbortSignal) => {
      try {
        const [areaResult, cycleResult] = await Promise.all([
          apiFetch<{ data: ActivityArea[] } | ActivityArea[]>(
            '/areas?page=1&pageSize=100&isActive=true',
            { signal },
          ),
          apiFetch<{ data: ActivityCycle[] }>('/cycles?page=1&pageSize=100', { signal }),
        ]);
        setAreas(Array.isArray(areaResult) ? areaResult : areaResult.data);
        setCycles(cycleResult.data);
      } catch (error) {
        if (!isAbortError(error)) showToast('Không thể tải danh sách khu/lô và mùa vụ');
      }
    },
    [showToast],
  );
  const loadActivities = React.useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (type) params.set('type', type);
      if (areaId) params.set('areaId', areaId);
      if (cycleId) params.set('cycleId', cycleId);
      if (from) params.set('from', from);
      if (to) params.set('to', `${to}T23:59:59`);
      try {
        const result = await apiFetch<ActivityListResponse>(`/activities?${params}`, { signal });
        setActivities(result.data);
        setTotal(result.total);
      } catch (error) {
        if (!isAbortError(error)) {
          showToast(error instanceof ApiError ? error.message : 'Không thể tải nhật ký');
        }
      } finally {
        setLoading(false);
      }
    },
    [areaId, cycleId, from, page, showToast, to, type],
  );
  React.useEffect(() => {
    const controller = new AbortController();
    void loadOptions(controller.signal);
    return () => controller.abort();
  }, [loadOptions]);
  React.useEffect(() => {
    const controller = new AbortController();
    void loadActivities(controller.signal);
    return () => controller.abort();
  }, [loadActivities]);
  const updateFilter = (field: 'type' | 'areaId' | 'cycleId' | 'from' | 'to', value: string) => {
    ({ type: setType, areaId: setAreaId, cycleId: setCycleId, from: setFrom, to: setTo })[field](
      value,
    );
    setPage(1);
  };
  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} variant={variant} />
      <PageHeader
        title="Nhật ký sản xuất"
        description="Ghi chép hoạt động canh tác, chăn nuôi và thủy sản"
      >
        {canCreateActivity(user?.role) && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Ghi nhật ký
          </Button>
        )}
      </PageHeader>
      <ActivityFilters
        areas={areas}
        cycles={cycles}
        type={type}
        areaId={areaId}
        cycleId={cycleId}
        from={from}
        to={to}
        onChange={updateFilter}
      />
      <DataTable
        columns={columns}
        data={activities}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={loading}
      />
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Ghi nhật ký sản xuất"
        description="Chọn loại nhật ký để hiển thị đúng các chỉ số cần ghi"
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <ActivityForm
          areas={areas}
          cycles={cycles}
          onSaved={async (created) => {
            setFormOpen(false);
            await loadActivities();
            if (
              created?.type === ActivityType.HARVEST ||
              created?.harvestLot ||
              created?.harvestLotId
            ) {
              const lotId = created?.harvestLot?.id ?? created?.harvestLotId;
              showToast(
                <span>
                  Đã ghi nhật ký thu hoạch thành công.{' '}
                  <Link
                    href={lotId ? `/admin/harvest-lots/${lotId}` : '/admin/harvest-lots'}
                    className="font-bold underline underline-offset-2 ml-1"
                  >
                    {lotId ? 'Xem lô thu hoạch vừa tạo' : 'Xem danh sách lô thu hoạch'}
                  </Link>
                </span>,
                'success',
              );
            } else {
              showToast('Lưu nhật ký thành công', 'success');
            }
          }}
          onCancel={() => setFormOpen(false)}
        />
      </FormDialog>
      <ActivityDetailDialog
        activity={selectedActivity}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
