'use client';

import { CycleKind } from '@xfarm/shared';
import { Fish, Leaf, PawPrint } from 'lucide-react';
import { StatusBadge } from '@xfarm/ui';
import { kindLabels } from './constants';
import type { CycleDetail } from './types';

export function CycleInfoCard({ cycle }: { cycle: CycleDetail }) {
  const Icon =
    cycle.kind === CycleKind.CROP ? Leaf : cycle.kind === CycleKind.LIVESTOCK ? PawPrint : Fish;
  return (
    <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <Icon className="h-6 w-6 text-accent" aria-hidden="true" />
        <div>
          <h2 className="font-semibold text-fg">Thông tin mùa vụ</h2>
          <p className="text-sm text-muted">{kindLabels[cycle.kind]}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
        <div>
          <dt className="text-muted">Trạng thái</dt>
          <dd className="mt-1">
            <StatusBadge status={cycle.status} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">Khu/lô</dt>
          <dd className="mt-1 font-medium text-fg">{cycle.area?.name || '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">Giống/loài</dt>
          <dd className="mt-1 font-medium text-fg">
            {cycle.species}
            {cycle.variety ? ` (${cycle.variety})` : ''}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Ngày bắt đầu</dt>
          <dd className="mt-1 font-medium text-fg">
            {new Date(cycle.startDate).toLocaleDateString('vi-VN')}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Ngày dự kiến kết thúc</dt>
          <dd className="mt-1 font-medium text-fg">
            {cycle.expectedEndDate
              ? new Date(cycle.expectedEndDate).toLocaleDateString('vi-VN')
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Ngày kết thúc</dt>
          <dd className="mt-1 font-medium text-fg">
            {cycle.endDate ? new Date(cycle.endDate).toLocaleDateString('vi-VN') : '—'}
          </dd>
        </div>
        {cycle.kind === CycleKind.CROP ? (
          <div>
            <dt className="text-muted">Sản lượng dự kiến</dt>
            <dd className="mt-1 font-medium text-fg">
              {cycle.expectedYield
                ? `${Number(cycle.expectedYield).toLocaleString('vi-VN')} ${cycle.yieldUnit || ''}`
                : '—'}
            </dd>
          </div>
        ) : (
          <div>
            <dt className="text-muted">Số lượng ban đầu</dt>
            <dd className="mt-1 font-medium text-fg">
              {cycle.initialQuantity
                ? `${Number(cycle.initialQuantity).toLocaleString('vi-VN')} ${cycle.yieldUnit || ''}`
                : '—'}
            </dd>
          </div>
        )}
      </dl>
      {cycle.notes && (
        <div className="mt-5 border-t border-line pt-4 text-sm">
          <p className="text-muted">Ghi chú</p>
          <p className="mt-1 whitespace-pre-wrap text-fg">{cycle.notes}</p>
        </div>
      )}
    </section>
  );
}
