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
}

const KANBAN_COLUMNS: ColumnConfig[] = [
  {
    status: TaskStatus.TODO,
    title: 'Chưa thực hiện',
    bgColor: 'bg-surface-2/40',
    borderColor: 'border-line',
    headerColor: 'text-fg',
  },
  {
    status: TaskStatus.IN_PROGRESS,
    title: 'Đang thực hiện',
    bgColor: 'bg-info-bg/20',
    borderColor: 'border-line',
    headerColor: 'text-info',
  },
  {
    status: TaskStatus.DONE,
    title: 'Hoàn thành',
    bgColor: 'bg-ok-bg/20',
    borderColor: 'border-line',
    headerColor: 'text-ok',
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
            <div className="h-6 w-32 rounded bg-surface-2 mb-4" />
            <div className="space-y-3">
              <div className="h-28 rounded-lg bg-surface" />
              <div className="h-28 rounded-lg bg-surface" />
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
            className={`flex flex-col rounded-xl border p-4 ${col.borderColor} ${col.bgColor} min-h-[500px] shadow-xs`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold text-sm ${col.headerColor}`}>{col.title}</h3>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface border border-line text-xs font-bold text-fg">
                  {columnTasks.length}
                </span>
              </div>
            </div>

            {/* Cards List */}
            <div className="flex-1 space-y-3 pt-3 overflow-y-auto">
              {columnTasks.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-line p-4 text-center text-xs text-muted">
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
                      className="group relative flex flex-col justify-between rounded-lg border border-line bg-surface p-3.5 shadow-xs transition-all hover:border-line-strong hover:bg-hover/20"
                    >
                      {/* Top: Title & Edit */}
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm text-fg leading-snug">
                            {task.title}
                          </h4>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => onEdit(task)}
                              className="text-muted hover:text-fg hover:bg-hover p-0.5 rounded transition-colors"
                              title="Sửa công việc"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-muted line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Middle: Badges for Area / Cycle */}
                      <div className="my-2.5 flex flex-wrap items-center gap-1.5">
                        {task.area && (
                          <span className="inline-flex items-center gap-1 rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-fg-2">
                            <MapPin className="h-3 w-3 text-muted" />
                            {task.area.name}
                          </span>
                        )}
                        {task.cycle && (
                          <span className="inline-flex items-center gap-1 rounded bg-accent-bg px-1.5 py-0.5 text-[11px] font-medium text-accent">
                            <Sprout className="h-3 w-3" />
                            {task.cycle.name}
                          </span>
                        )}
                      </div>

                      {/* Assignee & Due Date */}
                      <div className="space-y-1 border-t border-line/60 pt-2 text-xs text-fg-2">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted" />
                          <span className="font-medium text-fg">
                            {task.assignee?.fullName || 'Chưa giao'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-1 pt-0.5">
                          <div className="flex items-center gap-1">
                            <Clock
                              className={`h-3 w-3 ${isOverdue ? 'text-crit' : 'text-muted'}`}
                            />
                            <span
                              className={`text-[11px] ${
                                isOverdue ? 'font-semibold text-crit' : 'text-muted'
                              }`}
                            >
                              {formatDateTime(task.dueDate)}
                            </span>
                          </div>
                          {isOverdue && (
                            <span className="rounded bg-crit-bg px-1 py-0.2 text-[10px] font-medium text-crit">
                              Quá hạn
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom action buttons */}
                      {canManage && (
                        <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2">
                          {task.status === TaskStatus.TODO && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onStatusChange(task, TaskStatus.IN_PROGRESS)}
                              className="w-full text-xs h-7 border-info/30 text-info hover:bg-info-bg"
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
                                className="h-7 px-2 text-xs text-muted hover:text-fg"
                                title="Chuyển về Chưa thực hiện"
                              >
                                <ArrowLeft className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onStatusChange(task, TaskStatus.DONE)}
                                className="flex-1 text-xs h-7 border-ok/30 text-ok hover:bg-ok-bg"
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
                              className="w-full text-xs h-7 text-muted hover:text-fg"
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
