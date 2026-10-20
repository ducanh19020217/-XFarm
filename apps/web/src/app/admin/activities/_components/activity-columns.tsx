import type { ColumnDef } from '@tanstack/react-table';
import type { ActivityType } from '@xfarm/shared';
import { Button } from '@xfarm/ui';
import { activitySummary, activityTypeLabels } from './constants';
import type { ActivityRecord } from './types';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function getActivityColumns(
  onViewDetail?: (record: ActivityRecord) => void,
): ColumnDef<ActivityRecord>[] {
  const columns: ColumnDef<ActivityRecord>[] = [
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
        <span className="text-muted">
          {activitySummary(row.original.type, row.original.data)}
        </span>
      ),
    },
    {
      id: 'materials',
      header: 'Vật tư',
      cell: ({ row }) => {
        const mats = row.original.materials ?? [];
        if (!mats.length) return '—';
        return (
          <span className="text-xs text-muted">
            {mats
              .map(
                (m) =>
                  `${m.itemName || m.item?.name || 'Vật tư'} (${m.quantity} ${
                    m.unit || m.item?.unit || ''
                  })`,
              )
              .join(', ')}
          </span>
        );
      },
    },
    {
      id: 'media',
      header: 'Ảnh',
      cell: ({ row }) => (row.original.media?.length ? `${row.original.media.length} ảnh` : '—'),
    },
  ];

  if (onViewDetail) {
    columns.push({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onViewDetail(row.original)}
        >
          Chi tiết
        </Button>
      ),
    });
  }

  return columns;
}

export const activityColumns: ColumnDef<ActivityRecord>[] = getActivityColumns();
