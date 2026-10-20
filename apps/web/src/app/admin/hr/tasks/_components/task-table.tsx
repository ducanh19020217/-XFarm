'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable, Button, StatusBadge, Badge } from '@xfarm/ui';
import { Edit2, CheckCircle2, Clock, MapPin, Sprout } from 'lucide-react';
import { TaskStatus } from '@xfarm/shared';
import { formatDateTime } from '../../common/format';
import type { TaskItem } from '../../common/types';

interface TaskTableProps {
  tasks: TaskItem[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  searchValue: string;
  onSearchChange: (s: string) => void;
  isLoading: boolean;
  canManage: boolean;
  onEdit: (task: TaskItem) => void;
  onStatusChange: (task: TaskItem, newStatus: TaskStatus) => void;
}

export function TaskTable({
  tasks,
  total,
  page,
  pageSize,
  onPageChange,
  searchValue,
  onSearchChange,
  isLoading,
  canManage,
  onEdit,
  onStatusChange,
}: TaskTableProps) {
  const columns: ColumnDef<TaskItem>[] = React.useMemo(
    () => [
      {
        accessorKey: 'title',
        header: 'Công việc',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-fg">{row.original.title}</div>
            {row.original.description && (
              <div className="text-xs text-muted line-clamp-1">{row.original.description}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'assignee',
        header: 'Người thực hiện',
        cell: ({ row }) => {
          const emp = row.original.assignee;
          if (!emp) return <span className="text-muted">-</span>;
          return (
            <div>
              <span className="font-medium text-fg">{emp.fullName}</span>
              <span className="ml-1 text-xs text-muted">({emp.code})</span>
            </div>
          );
        },
      },
      {
        id: 'scope',
        header: 'Khu / Vụ',
        cell: ({ row }) => {
          const area = row.original.area;
          const cycle = row.original.cycle;
          return (
            <div className="flex flex-col gap-1 text-xs">
              {area && (
                <div className="flex items-center gap-1 text-fg-2">
                  <MapPin className="h-3 w-3 text-muted" />
                  <span>{area.name}</span>
                </div>
              )}
              {cycle && (
                <div className="flex items-center gap-1 text-accent">
                  <Sprout className="h-3 w-3" />
                  <span>{cycle.name}</span>
                </div>
              )}
              {!area && !cycle && <span className="text-muted">-</span>}
            </div>
          );
        },
      },
      {
        accessorKey: 'dueDate',
        header: 'Hạn hoàn thành',
        cell: ({ row }) => {
          const due = new Date(row.original.dueDate);
          const isOverdue =
            row.original.status !== TaskStatus.DONE &&
            row.original.status !== TaskStatus.CANCELLED &&
            due.getTime() < Date.now();

          return (
            <div className="flex items-center gap-1.5">
              <Clock className={`h-3.5 w-3.5 ${isOverdue ? 'text-crit' : 'text-muted'}`} />
              <span className={`text-xs ${isOverdue ? 'font-semibold text-crit' : 'text-muted'}`}>
                {formatDateTime(row.original.dueDate)}
              </span>
              {isOverdue && (
                <Badge
                  variant="destructive"
                  className="text-[10px] px-1 py-0 bg-crit-bg text-crit border-crit/20"
                >
                  Quá hạn
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: 'Thao tác',
              cell: ({ row }: { row: { original: TaskItem } }) => {
                const t = row.original;
                return (
                  <div className="flex items-center gap-1">
                    {t.status === TaskStatus.TODO && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onStatusChange(t, TaskStatus.IN_PROGRESS)}
                        className="h-7 text-xs border-info/30 text-info hover:bg-info-bg"
                      >
                        Bắt đầu
                      </Button>
                    )}
                    {t.status === TaskStatus.IN_PROGRESS && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onStatusChange(t, TaskStatus.DONE)}
                        className="h-7 text-xs border-ok/30 text-ok hover:bg-ok-bg"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Xong
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(t)}
                      className="h-7 w-7 p-0 text-muted hover:text-fg hover:bg-hover"
                      title="Sửa"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              },
            },
          ]
        : []),
    ],
    [canManage, onEdit, onStatusChange],
  );

  return (
    <DataTable
      columns={columns}
      data={tasks}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder="Tìm theo tiêu đề hoặc người thực hiện..."
      isLoading={isLoading}
    />
  );
}
