'use client';

import * as React from 'react';
import {
  PageHeader,
  Button,
  Toast,
  useToast,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@xfarm/ui';
import {
  Plus,
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  Clock,
  ListTodo,
} from 'lucide-react';
import { TaskStatus, type CreateTaskInput, type Paginated } from '@xfarm/shared';
import { apiFetch, ApiError, isAbortError } from '@/lib/api';
import { useAdminUser } from '../../admin-user-context';
import { canManageHR, formatDate } from '../common/format';
import type { TaskItem, EmployeeItem, AreaOption, CycleOption } from '../common/types';
import { TaskFormDialog } from './_components/task-form-dialog';
import { TaskTable } from './_components/task-table';
import { TaskKanban } from './_components/task-kanban';

export default function TasksPage() {
  const user = useAdminUser();
  const canManage = canManageHR(user?.role);
  const { message, showToast, closeToast } = useToast();

  const [viewMode, setViewMode] = React.useState<'table' | 'kanban'>('kanban');
  const [tasks, setTasks] = React.useState<TaskItem[]>([]);
  const [employees, setEmployees] = React.useState<EmployeeItem[]>([]);
  const [areas, setAreas] = React.useState<AreaOption[]>([]);
  const [cycles, setCycles] = React.useState<CycleOption[]>([]);

  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  // Filters
  const [assigneeId, setAssigneeId] = React.useState<string>('ALL');
  const [areaId, setAreaId] = React.useState<string>('ALL');
  const [cycleId, setCycleId] = React.useState<string>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');

  // Week offset (0 = current week, -1 = last week, +1 = next week)
  const [weekOffset, setWeekOffset] = React.useState(0);

  // Calculate start and end of week (Monday to Sunday)
  const { weekStart, weekEnd } = React.useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + diffToMonday + weekOffset * 7,
    );
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { weekStart: monday, weekEnd: sunday };
  }, [weekOffset]);

  // Dialogs
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<TaskItem | null>(null);

  const pageSize = 50; // Load enough for weekly board

  // Fetch dropdown options
  React.useEffect(() => {
    apiFetch<Paginated<EmployeeItem>>('/employees?pageSize=100&isActive=true')
      .then((res) => setEmployees(res.data || []))
      .catch(() => setEmployees([]));

    apiFetch<{ data: AreaOption[] }>('/areas?pageSize=100')
      .then((res) => setAreas(res.data || []))
      .catch(() => setAreas([]));

    apiFetch<{ data: CycleOption[] }>('/cycles?pageSize=100')
      .then((res) => setCycles(res.data || []))
      .catch(() => setCycles([]));
  }, []);

  const fetchTasks = React.useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        from: weekStart.toISOString(),
        to: weekEnd.toISOString(),
      });
      if (search.trim()) params.set('search', search.trim());
      if (assigneeId !== 'ALL') params.set('assigneeId', assigneeId);
      if (areaId !== 'ALL') params.set('areaId', areaId);
      if (cycleId !== 'ALL') params.set('cycleId', cycleId);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      try {
        const res = await apiFetch<Paginated<TaskItem>>(`/tasks?${params}`, { signal });
        setTasks(res.data || []);
        setTotal(res.total || 0);
      } catch (err) {
        if (!isAbortError(err)) {
          if (err instanceof ApiError && err.statusCode === 404) {
            setTasks([]);
            setTotal(0);
          } else {
            showToast(err instanceof ApiError ? err.message : 'Không thể tải danh sách công việc');
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [
      areaId,
      assigneeId,
      cycleId,
      page,
      pageSize,
      search,
      showToast,
      statusFilter,
      weekEnd,
      weekStart,
    ],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchTasks(controller.signal);
    return () => controller.abort();
  }, [fetchTasks]);

  const handleCreateOrUpdate = async (data: CreateTaskInput) => {
    if (editingTask) {
      await apiFetch(`/tasks/${editingTask.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      showToast('Cập nhật công việc thành công');
    } else {
      await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      showToast('Giao việc thành công');
    }
    await fetchTasks();
  };

  const handleStatusChange = async (task: TaskItem, newStatus: TaskStatus) => {
    try {
      if (newStatus === TaskStatus.IN_PROGRESS) {
        await apiFetch(`/tasks/${task.id}/start`, { method: 'POST' }).catch(() =>
          apiFetch(`/tasks/${task.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus }),
          }),
        );
      } else if (newStatus === TaskStatus.DONE) {
        await apiFetch(`/tasks/${task.id}/complete`, {
          method: 'POST',
          body: JSON.stringify({ completedAt: new Date().toISOString() }),
        }).catch(() =>
          apiFetch(`/tasks/${task.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus, completedAt: new Date().toISOString() }),
          }),
        );
      } else {
        await apiFetch(`/tasks/${task.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus }),
        });
      }
      showToast('Đã cập nhật trạng thái công việc');
      await fetchTasks();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không thể cập nhật trạng thái');
    }
  };

  const todoCount = React.useMemo(
    () => tasks.filter((t) => t.status === TaskStatus.TODO).length,
    [tasks],
  );
  const inProgressCount = React.useMemo(
    () => tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
    [tasks],
  );
  const doneCount = React.useMemo(
    () => tasks.filter((t) => t.status === TaskStatus.DONE).length,
    [tasks],
  );

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} />

      <PageHeader
        title="Giao việc & Tiến độ"
        description="Theo dõi phân công công việc theo tuần dạng bảng hoặc Kanban"
      >
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex rounded-lg border border-line bg-surface-2 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-surface text-accent shadow-xs'
                  : 'text-muted hover:text-fg'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-surface text-accent shadow-xs'
                  : 'text-muted hover:text-fg'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Dạng bảng</span>
            </button>
          </div>

          {canManage && (
            <Button
              onClick={() => {
                setEditingTask(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Giao việc mới
            </Button>
          )}
        </div>
      </PageHeader>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4 shadow-xs text-fg">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-muted">
            <ListTodo className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Chưa thực hiện</p>
            <p className="text-xl font-bold text-fg">{todoCount} việc</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4 shadow-xs text-fg">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info-bg text-info">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Đang thực hiện</p>
            <p className="text-xl font-bold text-fg">{inProgressCount} việc</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4 shadow-xs text-fg">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ok-bg text-ok">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Đã hoàn thành</p>
            <p className="text-xl font-bold text-fg">{doneCount} việc</p>
          </div>
        </div>
      </div>

      {/* Week Navigator & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 shadow-xs text-fg">
        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="h-8 w-8 p-0"
            title="Tuần trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 px-2 text-xs font-medium text-fg">
            <Calendar className="h-4 w-4 text-accent" />
            <span>
              {formatDate(weekStart)} – {formatDate(weekEnd)}
            </span>
            {weekOffset === 0 && (
              <span className="rounded bg-accent-bg px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                Tuần này
              </span>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="h-8 w-8 p-0"
            title="Tuần sau"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {weekOffset !== 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset(0)}
              className="h-8 text-xs text-muted hover:text-fg"
            >
              Hôm nay
            </Button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Assignee filter */}
          <div className="w-48">
            <Select value={assigneeId} onValueChange={(val) => setAssigneeId(val)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Tất cả nhân viên" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả nhân viên</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.code} - {emp.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Area filter */}
          <div className="w-40">
            <Select value={areaId} onValueChange={(val) => setAreaId(val)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Tất cả khu/lô" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả khu/lô</SelectItem>
                {areas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cycle filter */}
          <div className="w-40">
            <Select value={cycleId} onValueChange={(val) => setCycleId(val)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Tất cả mùa vụ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả mùa vụ</SelectItem>
                {cycles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status filter (Table only) */}
          {viewMode === 'table' && (
            <div className="w-36">
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value={TaskStatus.TODO}>Chưa thực hiện</SelectItem>
                  <SelectItem value={TaskStatus.IN_PROGRESS}>Đang thực hiện</SelectItem>
                  <SelectItem value={TaskStatus.DONE}>Hoàn thành</SelectItem>
                  <SelectItem value={TaskStatus.CANCELLED}>Đã hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Main View */}
      {viewMode === 'kanban' ? (
        <TaskKanban
          tasks={tasks}
          isLoading={loading}
          canManage={canManage}
          onEdit={(task) => {
            setEditingTask(task);
            setFormOpen(true);
          }}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <TaskTable
          tasks={tasks}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          isLoading={loading}
          canManage={canManage}
          onEdit={(task) => {
            setEditingTask(task);
            setFormOpen(true);
          }}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Form Dialog */}
      <TaskFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        employees={employees}
        areas={areas}
        cycles={cycles}
        onSubmit={handleCreateOrUpdate}
      />
    </div>
  );
}
