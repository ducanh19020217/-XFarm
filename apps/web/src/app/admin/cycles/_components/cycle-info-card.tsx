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
    <section className="rounded-lg border bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <Icon className="h-6 w-6 text-emerald-700" aria-hidden="true" />
        <div>
          <h2 className="font-semibold">Thông tin mùa vụ</h2>
          <p className="text-sm text-slate-500">{kindLabels[cycle.kind]}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
        <div>
          <dt className="text-slate-500">Trạng thái</dt>
          <dd className="mt-1">
            <StatusBadge status={cycle.status} />
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Khu/lô</dt>
          <dd className="mt-1 font-medium">{cycle.area?.name || '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Giống/loài</dt>
          <dd className="mt-1 font-medium">
            {cycle.species}
            {cycle.variety ? ` (${cycle.variety})` : ''}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Ngày bắt đầu</dt>
          <dd className="mt-1 font-medium">
            {new Date(cycle.startDate).toLocaleDateString('vi-VN')}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Ngày dự kiến kết thúc</dt>
          <dd className="mt-1 font-medium">
            {cycle.expectedEndDate
              ? new Date(cycle.expectedEndDate).toLocaleDateString('vi-VN')
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Ngày kết thúc</dt>
          <dd className="mt-1 font-medium">
            {cycle.endDate ? new Date(cycle.endDate).toLocaleDateString('vi-VN') : '—'}
          </dd>
        </div>
        {cycle.kind === CycleKind.CROP ? (
          <div>
            <dt className="text-slate-500">Sản lượng dự kiến</dt>
            <dd className="mt-1 font-medium">
              {cycle.expectedYield
                ? `${Number(cycle.expectedYield).toLocaleString('vi-VN')} ${cycle.yieldUnit || ''}`
                : '—'}
            </dd>
          </div>
        ) : (
          <div>
            <dt className="text-slate-500">Số lượng ban đầu</dt>
            <dd className="mt-1 font-medium">
              {cycle.initialQuantity
                ? `${Number(cycle.initialQuantity).toLocaleString('vi-VN')} ${cycle.yieldUnit || ''}`
                : '—'}
            </dd>
          </div>
        )}
      </dl>
      {cycle.notes && (
        <div className="mt-5 border-t pt-4 text-sm">
          <p className="text-slate-500">Ghi chú</p>
          <p className="mt-1 whitespace-pre-wrap">{cycle.notes}</p>
        </div>
      )}
    </section>
  );
}
