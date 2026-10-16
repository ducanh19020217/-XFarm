import type { ColumnDef } from '@tanstack/react-table';
import type { ActivityType } from '@xfarm/shared';
import { activitySummary, activityTypeLabels } from './constants';
import type { ActivityRecord } from './types';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export const activityColumns: ColumnDef<ActivityRecord>[] = [
  {
    accessorKey: 'performedAt',
    header: 'Thời điểm',
    cell: ({ row }) => formatDate(row.original.performedAt),
  },
  {
    accessorKey: 'type',
    header: 'Loại',
    cell: ({ row }) => (
      <span className="font-medium">{activityTypeLabels[row.original.type as ActivityType]}</span>
    ),
  },
  {
    id: 'area',
    header: 'Khu/lô',
    cell: ({ row }) => `${row.original.area.code} - ${row.original.area.name}`,
  },
  { id: 'cycle', header: 'Mùa vụ', cell: ({ row }) => row.original.cycle?.name ?? '—' },
  {
    id: 'summary',
    header: 'Tóm tắt',
    cell: ({ row }) => (
      <span className="text-slate-600">
        {activitySummary(row.original.type, row.original.data)}
      </span>
    ),
  },
  {
    id: 'media',
    header: 'Ảnh',
    cell: ({ row }) => (row.original.media?.length ? `${row.original.media.length} ảnh` : '—'),
  },
];
