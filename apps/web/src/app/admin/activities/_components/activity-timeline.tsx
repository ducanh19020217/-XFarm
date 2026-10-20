'use client';

import * as React from 'react';
import { ActivityType } from '@xfarm/shared';
import { activityIcons, activitySummary, activityTypeLabels } from './constants';
import { useAdminUser } from '../../admin-user-context';
import type { ActivityRecord } from './types';

function formatCost(cost?: number | string | null) {
  if (cost == null) return '';
  const num = Number(cost);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(num);
}

export interface ActivityTimelineProps {
  activities: ActivityRecord[];
  canViewCost?: boolean;
}

export function ActivityTimeline({
  activities,
  canViewCost: propCanViewCost,
}: ActivityTimelineProps) {
  const user = useAdminUser();
  const canViewCost =
    propCanViewCost ?? Boolean(user && ['OWNER', 'MANAGER', 'ACCOUNTANT'].includes(user.role));

  if (!activities.length) return <p className="text-sm text-muted">Chưa có nhật ký hoạt động.</p>;

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <article
          key={activity.id}
          className="flex gap-3 border-b border-line pb-4 last:border-0 last:pb-0"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-bg text-lg text-accent">
            {activityIcons[activity.type as ActivityType]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="font-medium text-fg">{activityTypeLabels[activity.type]}</h3>
              <time className="text-xs text-muted">
                {new Intl.DateTimeFormat('vi-VN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(activity.performedAt))}
              </time>
            </div>
            <p className="text-sm text-muted">
              {activitySummary(activity.type, activity.data)} ·{' '}
              {activity.performedBy?.fullName ?? 'Chưa rõ người ghi'}
            </p>
            {activity.notes && <p className="mt-1 text-sm text-muted">{activity.notes}</p>}

            {activity.materials && activity.materials.length > 0 && (
              <div className="mt-2 rounded-md border border-line bg-surface-2 p-2.5 text-xs text-fg">
                <span className="font-medium text-fg">Vật tư đã dùng:</span>
                <ul className="mt-1 space-y-0.5">
                  {activity.materials.map((mat, idx) => {
                    const name = mat.itemName || mat.item?.name || 'Vật tư';
                    const unit = mat.unit || mat.item?.unit || '';
                    const showCost = canViewCost && mat.unitCost != null;
                    return (
                      <li key={mat.id || `${mat.itemId}-${idx}`} className="flex flex-wrap gap-1">
                        <span>
                          • {name}: <strong className="font-medium">{mat.quantity}</strong> {unit}
                        </span>
                        {showCost && (
                          <span className="text-muted">(Giá vốn: {formatCost(mat.unitCost)})</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {activity.media?.length ? (
              <div className="mt-2 flex gap-2">
                {activity.media.slice(0, 4).map((media) => (
                  <img
                    key={media.id}
                    src={media.url}
                    alt={media.alt ?? 'Ảnh nhật ký'}
                    className="h-14 w-14 rounded border border-line object-cover"
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
