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
  Input,
} from '@xfarm/ui';
import { Calendar, ChevronLeft, ChevronRight, Clock, Users, CheckCircle2 } from 'lucide-react';
import { apiFetch, ApiError, isAbortError } from '@/lib/api';
import { useAdminUser } from '../../admin-user-context';
import { canEditAttendance, formatDate, formatHours } from '../common/format';
import type { AttendanceItem, EmployeeItem, CycleOption } from '../common/types';
import { AttendanceGrid, type WeekDay } from './_components/attendance-grid';
import { EditAttendanceDialog } from './_components/edit-attendance-dialog';

export default function AttendancePage() {
  const user = useAdminUser();
  const canEdit = canEditAttendance(user?.role);
  const { message, showToast, closeToast } = useToast();

  const [employees, setEmployees] = React.useState<EmployeeItem[]>([]);
  const [attendances, setAttendances] = React.useState<AttendanceItem[]>([]);
  const [cycles, setCycles] = React.useState<CycleOption[]>([]);
  const [cycleFilter, setCycleFilter] = React.useState<string>('ALL');
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  // Week offset (0 = current week, -1 = last week, +1 = next week)
  const [weekOffset, setWeekOffset] = React.useState(0);

  // Calculate 7 days for the selected week
  const weekDays = React.useMemo<WeekDay[]>(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + diffToMonday + weekOffset * 7,
    );

    const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

    const todayStr = new Date().toISOString().slice(0, 10);

    return dayLabels.map((label, idx) => {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx);
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      return {
        date: d,
        dateStr,
        dayLabel: label,
        formattedDate: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`,
        isToday: dateStr === todayStr,
      };
    });
  }, [weekOffset]);

  const weekStart = weekDays[0].dateStr;
  const weekEnd = weekDays[6].dateStr;

  // Selected cell for editing
  const [editingCell, setEditingCell] = React.useState<{
    employee: EmployeeItem;
    dateStr: string;
    attendance: AttendanceItem | null;
  } | null>(null);

  // Fetch employees and cycles on mount
  React.useEffect(() => {
    apiFetch<{ data: EmployeeItem[] }>('/employees?pageSize=100&isActive=true')
      .then((res) => setEmployees(res.data || []))
      .catch(() => setEmployees([]));

    apiFetch<{ data: CycleOption[] }>('/cycles?pageSize=100')
      .then((res) => setCycles(res.data || []))
      .catch(() => setCycles([]));
  }, []);

  // Fetch attendances for current week range and cycle filter
  const fetchAttendances = React.useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      const params = new URLSearchParams({
        from: weekStart,
        to: weekEnd,
        pageSize: '500',
      });
      if (cycleFilter !== 'ALL') {
        params.set('cycleId', cycleFilter);
      }

      try {
        const res = await apiFetch<{ data: AttendanceItem[] }>(`/attendance?${params}`, {
          signal,
        });
        setAttendances(res.data || []);
      } catch (err) {
        if (!isAbortError(err)) {
          if (err instanceof ApiError && err.statusCode === 404) {
            setAttendances([]);
          } else {
            showToast(err instanceof ApiError ? err.message : 'Không thể tải dữ liệu chấm công');
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [cycleFilter, showToast, weekEnd, weekStart],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchAttendances(controller.signal);
    return () => controller.abort();
  }, [fetchAttendances]);

  // Filter employees by search keyword
  const filteredEmployees = React.useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.trim().toLowerCase();
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q),
    );
  }, [employees, search]);

  // Statistics
  const stats = React.useMemo(() => {
    let totalHours = 0;
    const activeEmpIds = new Set<string>();

    attendances.forEach((att) => {
      if (att.hours && Number(att.hours) > 0) {
        totalHours += Number(att.hours);
        activeEmpIds.add(att.employeeId);
      }
    });

    return {
      totalHours,
      activeEmployees: activeEmpIds.size,
      avgHours: activeEmpIds.size > 0 ? (totalHours / activeEmpIds.size).toFixed(1) : '0',
    };
  }, [attendances]);

  // Save attendance from dialog
  const handleSaveAttendance = async (payload: {
    id?: string;
    employeeId: string;
    date: string;
    hours: number;
    checkIn?: string | null;
    checkOut?: string | null;
    cycleId?: string | null;
    pieceQty?: number | null;
    notes?: string | null;
  }) => {
    if (payload.id) {
      await apiFetch(`/attendance/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          hours: payload.hours,
          checkIn: payload.checkIn,
          checkOut: payload.checkOut,
          cycleId: payload.cycleId,
          pieceQty: payload.pieceQty,
          notes: payload.notes,
        }),
      });
      showToast('Cập nhật chấm công thành công');
    } else {
      await apiFetch('/attendance', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showToast('Lưu chấm công thành công');
    }
    await fetchAttendances();
  };

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} />

      <PageHeader
        title="Lưới chấm công tuần"
        description="Theo dõi giờ công, số lượng sản phẩm khoán và điều chỉnh ca làm việc"
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổng giờ công tuần</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {formatHours(stats.totalHours)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Nhân viên đi làm</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {stats.activeEmployees} / {employees.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Trung bình giờ / người</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {stats.avgHours}h
            </p>
          </div>
        </div>
      </div>

      {/* Controls & Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
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

          <div className="flex items-center gap-2 px-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <span>
              {formatDate(weekDays[0].date)} – {formatDate(weekDays[6].date)}
            </span>
            {weekOffset === 0 && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
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
              className="h-8 text-xs text-slate-500"
            >
              Hôm nay
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Cycle filter */}
          <div className="w-48">
            <Select value={cycleFilter} onValueChange={setCycleFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Lọc theo mùa vụ" />
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

          {/* Search employee */}
          <div className="w-52">
            <Input
              type="text"
              placeholder="Tìm theo tên hoặc mã NV..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {canEdit && (
        <p className="text-xs text-slate-500 italic">
          * Mẹo: Với quyền Quản lý (MANAGER / OWNER), bạn có thể bấm trực tiếp vào bất kỳ ô ngày nào
          để điều chỉnh giờ công.
        </p>
      )}

      {/* Attendance Weekly Matrix */}
      <AttendanceGrid
        days={weekDays}
        employees={filteredEmployees}
        attendances={attendances}
        canEdit={canEdit}
        isLoading={loading}
        onCellClick={(emp, dateStr, att) => {
          setEditingCell({ employee: emp, dateStr, attendance: att });
        }}
      />

      {/* Edit attendance modal */}
      <EditAttendanceDialog
        open={Boolean(editingCell)}
        onOpenChange={(open) => {
          if (!open) setEditingCell(null);
        }}
        employee={editingCell?.employee || null}
        dateStr={editingCell?.dateStr || null}
        attendance={editingCell?.attendance || null}
        cycles={cycles}
        onSave={handleSaveAttendance}
      />
    </div>
  );
}
