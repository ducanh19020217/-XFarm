'use client';

import { ActivityType } from '@xfarm/shared';
import { activityIcons, activitySummary, activityTypeLabels } from './constants';
import type { ActivityRecord } from './types';

export function ActivityTimeline({ activities }: { activities: ActivityRecord[] }) {
  if (!activities.length)
    return <p className="text-sm text-slate-500">Chưa có nhật ký hoạt động.</p>;
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <article key={activity.id} className="flex gap-3 border-b pb-4 last:border-0 last:pb-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-lg">
            {activityIcons[activity.type as ActivityType]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="font-medium">{activityTypeLabels[activity.type]}</h3>
              <time className="text-xs text-slate-500">
                {new Intl.DateTimeFormat('vi-VN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(activity.performedAt))}
              </time>
            </div>
            <p className="text-sm text-slate-600">
              {activitySummary(activity.type, activity.data)} ·{' '}
              {activity.performedBy?.fullName ?? 'Chưa rõ người ghi'}
            </p>
            {activity.notes && <p className="mt-1 text-sm text-slate-500">{activity.notes}</p>}
            {activity.materials?.length ? (
              <div className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <span className="font-medium">Vật tư đã xuất:</span>{' '}
                {activity.materials
                  .map(
                    (material) =>
                      `${material.item.name} ${material.quantity} ${material.item.unit} (${new Intl.NumberFormat('vi-VN').format(Number(material.unitCost))} đ/${material.item.unit})`,
                  )
                  .join('; ')}
              </div>
            ) : null}
            {activity.media?.length ? (
              <div className="mt-2 flex gap-2">
                {activity.media.slice(0, 4).map((media) => (
                  <img
                    key={media.id}
                    src={media.url}
                    alt={media.alt ?? 'Ảnh nhật ký'}
                    className="h-14 w-14 rounded object-cover"
                  />
                ))}
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
