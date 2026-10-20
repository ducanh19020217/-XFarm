'use client';

import * as React from 'react';
import { FormDialog } from '@xfarm/ui';
import { activitySummary, activityTypeLabels } from './constants';
import { useAdminUser } from '../../admin-user-context';
import type { ActivityRecord } from './types';

export interface ActivityDetailDialogProps {
  activity: ActivityRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canViewCost?: boolean;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatCost(cost: number | string) {
  const num = Number(cost);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(num);
}

export function ActivityDetailDialog({
  activity,
  open,
  onOpenChange,
  canViewCost: propCanViewCost,
}: ActivityDetailDialogProps) {
  const user = useAdminUser();
  const canViewCost =
    propCanViewCost ?? Boolean(user && ['OWNER', 'MANAGER', 'ACCOUNTANT'].includes(user.role));

  if (!activity) return null;

  const materials = activity.materials ?? [];
  const summaryText = activitySummary(activity.type, activity.data);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Chi tiết nhật ký sản xuất"
      description={`${activityTypeLabels[activity.type]} · ${formatDate(activity.performedAt)}`}
      className="max-w-2xl"
    >
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-surface-2 p-3">
          <div>
            <span className="text-xs text-muted">Khu/lô</span>
            <p className="font-medium text-fg">
              {activity.area.code} - {activity.area.name}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted">Mùa vụ</span>
            <p className="font-medium text-fg">
              {activity.cycle
                ? `${activity.cycle.code} - ${activity.cycle.name}`
                : 'Không gắn mùa vụ'}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted">Người thực hiện</span>
            <p className="font-medium text-fg">
              {activity.performedBy?.fullName ?? 'Chưa rõ'}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted">Thời điểm</span>
            <p className="font-medium text-fg">{formatDate(activity.performedAt)}</p>
          </div>
        </div>

        {summaryText ? (
          <div className="rounded-md border border-line p-3">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Chỉ số ghi chép
            </span>
            <p className="mt-1 text-fg">{summaryText}</p>
          </div>
        ) : null}

        {activity.notes ? (
          <div className="rounded-md border border-line p-3">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Ghi chú
            </span>
            <p className="mt-1 text-fg">{activity.notes}</p>
          </div>
        ) : null}

        <div className="rounded-md border border-line p-3">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            Vật tư sử dụng
          </span>
          {materials.length === 0 ? (
            <p className="mt-1 text-muted">Không sử dụng vật tư.</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-xs text-fg">
                <thead>
                  <tr className="border-b border-line bg-surface-2">
                    <th className="py-2 px-2 font-medium">Vật tư</th>
                    <th className="py-2 px-2 font-medium text-right">Số lượng</th>
                    <th className="py-2 px-2 font-medium">Đơn vị</th>
                    {canViewCost && <th className="py-2 px-2 font-medium text-right">Giá vốn</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {materials.map((mat, idx) => {
                    const name = mat.itemName || mat.item?.name || 'Vật tư';
                    const unit = mat.unit || mat.item?.unit || '';
                    return (
                      <tr key={mat.id || `${mat.itemId}-${idx}`}>
                        <td className="py-2 px-2 font-medium">{name}</td>
                        <td className="py-2 px-2 text-right">{mat.quantity}</td>
                        <td className="py-2 px-2">{unit}</td>
                        {canViewCost && (
                          <td className="py-2 px-2 text-right font-mono text-muted">
                            {mat.unitCost != null ? formatCost(mat.unitCost) : '—'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {activity.media?.length ? (
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Ảnh đính kèm
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {activity.media.map((media) => (
                <img
                  key={media.id}
                  src={media.url}
                  alt={media.alt ?? 'Ảnh nhật ký'}
                  className="h-20 w-20 rounded-md object-cover border border-line"
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </FormDialog>
  );
}
