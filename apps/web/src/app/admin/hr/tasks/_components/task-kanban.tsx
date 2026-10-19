'use client';

import * as React from 'react';
import { Button } from '@xfarm/ui';
import { Clock, MapPin, Sprout, Play, CheckCircle, Edit2, ArrowLeft, User } from 'lucide-react';
import { TaskStatus } from '@xfarm/shared';
import { formatDateTime } from '../../common/format';
import type { TaskItem } from '../../common/types';

interface TaskKanbanProps {
  tasks: TaskItem[];
  isLoading: boolean;
  canManage: boolean;
  onEdit: (task: TaskItem) => void;
  onStatusChange: (task: TaskItem, newStatus: TaskStatus) => void;
}

interface ColumnConfig {
  status: TaskStatus;
  title: string;
  bgColor: string;
  borderColor: string;
  headerColor: string;
  badgeVariant: 'secondary' | 'default' | 'outline';
}

const KANBAN_COLUMNS: ColumnConfig[] = [
  {
    status: TaskStatus.TODO,
    title: 'Chưa thực hiện',
    bgColor: 'bg-slate-50/80 dark:bg-slate-900/50',
    borderColor: 'border-slate-200 dark:border-slate-800',
    headerColor: 'text-slate-700 dark:text-slate-300',
    badgeVariant: 'secondary',
  },
  {
    status: TaskStatus.IN_PROGRESS,
    title: 'Đang thực hiện',
    bgColor: 'bg-blue-50/50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-900',
    headerColor: 'text-blue-700 dark:text-blue-400',
    badgeVariant: 'default',
  },
  {
    status: TaskStatus.DONE,
    title: 'Hoàn thành',
    bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    borderColor: 'border-emerald-200 dark:border-emerald-900',
    headerColor: 'text-emerald-700 dark:text-emerald-400',
    badgeVariant: 'outline',
  },
];

export function TaskKanban({
  tasks,
  isLoading,
  canManage,
  onEdit,
  onStatusChange,
}: TaskKanbanProps) {
  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((t) => t.status === status);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {KANBAN_COLUMNS.map((col) => (
          <div
            key={col.status}
            className={`flex flex-col rounded-xl border p-4 ${col.borderColor} ${col.bgColor} min-h-[400px] animate-pulse`}
          >
            <div className="h-6 w-32 rounded bg-slate-200 dark:bg-slate-700 mb-4" />
            <div className="space-y-3">
              <div className="h-28 rounded-lg bg-white dark:bg-slate-800" />
              <div className="h-28 rounded-lg bg-white dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {KANBAN_COLUMNS.map((col) => {
        const columnTasks = getTasksByStatus(col.status);

        return (
          <div
            key={col.status}
            className={`flex flex-col rounded-xl border p-4 ${col.borderColor} ${col.bgColor} min-h-[500px] shadow-sm`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold text-sm ${col.headerColor}`}>{col.title}</h3>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {columnTasks.length}
                </span>
              </div>
            </div>

            {/* Cards List */}
            <div className="flex-1 space-y-3 pt-3 overflow-y-auto">
              {columnTasks.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400 dark:border-slate-700">
                  Không có công việc nào
                </div>
              ) : (
                columnTasks.map((task) => {
                  const due = new Date(task.dueDate);
                  const isOverdue =
                    task.status !== TaskStatus.DONE &&
                    task.status !== TaskStatus.CANCELLED &&
                    due.getTime() < Date.now();

                  return (
                    <div
                      key={task.id}
                      className="group relative flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:border-slate-300 hover:shadow dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
                    >
                      {/* Top: Title & Edit */}
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                            {task.title}
                          </h4>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => onEdit(task)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded"
                              title="Sửa công việc"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 dark:text-slate-400">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Middle: Badges for Area / Cycle */}
                      <div className="my-2.5 flex flex-wrap items-center gap-1.5">
                        {task.area && (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <MapPin className="h-3 w-3" />
                            {task.area.name}
                          </span>
                        )}
                        {task.cycle && (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                            <Sprout className="h-3 w-3" />
                            {task.cycle.name}
                          </span>
                        )}
                      </div>

                      {/* Assignee & Due Date */}
                      <div className="space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-600 dark:border-slate-800/80 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {task.assignee?.fullName || 'Chưa giao'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-1 pt-0.5">
                          <div className="flex items-center gap-1">
                            <Clock
                              className={`h-3 w-3 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}
                            />
                            <span
                              className={`text-[11px] ${isOverdue ? 'font-semibold text-red-600' : 'text-slate-500'}`}
                            >
                              {formatDateTime(task.dueDate)}
                            </span>
                          </div>
                          {isOverdue && (
                            <span className="rounded bg-red-100 px-1 py-0.2 text-[10px] font-medium text-red-700 dark:bg-red-950/80 dark:text-red-400">
                              Quá hạn
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom action buttons */}
                      {canManage && (
                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                          {task.status === TaskStatus.TODO && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onStatusChange(task, TaskStatus.IN_PROGRESS)}
                              className="w-full text-xs h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Play className="mr-1 h-3 w-3" />
                              Bắt đầu thực hiện
                            </Button>
                          )}

                          {task.status === TaskStatus.IN_PROGRESS && (
                            <div className="flex w-full items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onStatusChange(task, TaskStatus.TODO)}
                                className="h-7 px-2 text-xs text-slate-500"
                                title="Chuyển về Chưa thực hiện"
                              >
                                <ArrowLeft className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onStatusChange(task, TaskStatus.DONE)}
                                className="flex-1 text-xs h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Hoàn thành
                              </Button>
                            </div>
                          )}

                          {task.status === TaskStatus.DONE && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onStatusChange(task, TaskStatus.IN_PROGRESS)}
                              className="w-full text-xs h-7 text-slate-500 hover:text-slate-700"
                            >
                              <ArrowLeft className="mr-1 h-3 w-3" />
                              Làm lại
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
