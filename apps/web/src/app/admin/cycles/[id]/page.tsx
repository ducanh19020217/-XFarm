'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ActivityType, CycleStatus } from '@xfarm/shared';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { Button, ConfirmDialog, FormDialog, PageHeader, Toast, useToast } from '@xfarm/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { useAdminUser } from '../../admin-user-context';
import { CycleInfoCard } from '../_components/cycle-info-card';
import { statusLabels } from '../_components/constants';
import { TransitionButtons } from '../_components/transition-buttons';
import type { CycleDetail } from '../_components/types';
import { ActivityForm } from '../../activities/_components/activity-form';
import { ActivityTimeline } from '../../activities/_components/activity-timeline';
import type { ActivityArea, ActivityRecord } from '../../activities/_components/types';
import { canCreateActivity, canRecordActivity } from '../../activities/_components/constants';

export default function CycleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAdminUser();
  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const { message, variant, showToast, closeToast } = useToast();
  const [cycle, setCycle] = React.useState<CycleDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<CycleStatus | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [timeline, setTimeline] = React.useState<ActivityRecord[]>([]);
  const [areas, setAreas] = React.useState<ActivityArea[]>([]);
  const [activityOpen, setActivityOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [cycleResult, timelineResult, areasResult] = await Promise.all([
        apiFetch<{ data: CycleDetail }>(`/cycles/${params.id}`),
        apiFetch<{ data: ActivityRecord[] }>(`/cycles/${params.id}/timeline`),
        apiFetch<{ data: ActivityArea[] } | ActivityArea[]>(
          '/areas?page=1&pageSize=100&isActive=true',
        ),
      ]);
      setCycle(cycleResult.data);
      setTimeline(timelineResult.data);
      setAreas(Array.isArray(areasResult) ? areasResult : areasResult.data);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tải thông tin mùa vụ');
    } finally {
      setLoading(false);
    }
  }, [params.id, showToast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const transition = async () => {
    if (!cycle || !selected) return;
    setSubmitting(true);
    try {
      await apiFetch(`/cycles/${cycle.id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ to: selected }),
      });
      setSelected(null);
      await load();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể chuyển trạng thái mùa vụ');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Đang tải...
      </div>
    );
  if (!cycle)
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
        <Toast message={message || 'Không tìm thấy mùa vụ'} onClose={closeToast} />
      </div>
    );

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} variant={variant} />
      <Button variant="outline" onClick={() => router.push('/admin/cycles')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Danh sách mùa vụ
      </Button>
      <PageHeader title={cycle.name} description={`${cycle.code} · ${cycle.kind}`}>
        {canRecordActivity(cycle.status) && canCreateActivity(user?.role) && (
          <Button onClick={() => setActivityOpen(true)}>
            <Plus className="h-4 w-4" />
            Ghi nhật ký
          </Button>
        )}
        <TransitionButtons status={cycle.status} canManage={canManage} onSelect={setSelected} />
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2">
        <CycleInfoCard cycle={cycle} />
        <section
          id="cycle-timeline-slot"
          className="min-h-52 rounded-lg border bg-white p-5 shadow-sm"
        >
          <h2 className="mb-2 font-semibold">Nhật ký</h2>
          <ActivityTimeline activities={timeline} />
        </section>
      </div>
      <ConfirmDialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        title="Xác nhận chuyển trạng thái"
        description={
          selected ? `Bạn có chắc muốn chuyển mùa vụ sang “${statusLabels[selected]}” không?` : ''
        }
        confirmText="Xác nhận"
        isDanger={selected === CycleStatus.CANCELLED}
        isLoading={submitting}
        onConfirm={transition}
      />
      <FormDialog
        open={activityOpen}
        onOpenChange={setActivityOpen}
        title="Ghi nhật ký mùa vụ"
        description="Thông tin mùa vụ đã được điền sẵn"
        className="max-w-3xl"
      >
        <ActivityForm
          areas={areas}
          cycles={[cycle]}
          initialCycleId={cycle.id}
          onSaved={async (created) => {
            setActivityOpen(false);
            await load();
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
          onCancel={() => setActivityOpen(false)}
        />
      </FormDialog>
    </div>
  );
}
