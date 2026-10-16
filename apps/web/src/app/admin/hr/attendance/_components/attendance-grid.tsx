'use client';

import * as React from 'react';
import { Clock, Edit3, User } from 'lucide-react';
import { formatHours, getPayTypeLabel } from '../../common/format';
import type { AttendanceItem, EmployeeItem } from '../../common/types';

export interface WeekDay {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayLabel: string; // Thứ 2, Thứ 3,...
  formattedDate: string; // 13/10
  isToday: boolean;
}

interface AttendanceGridProps {
  days: WeekDay[];
  employees: EmployeeItem[];
  attendances: AttendanceItem[];
  canEdit: boolean;
  isLoading: boolean;
  onCellClick: (employee: EmployeeItem, dateStr: string, attendance: AttendanceItem | null) => void;
}

export function AttendanceGrid({
  days,
  employees,
  attendances,
  canEdit,
  isLoading,
  onCellClick,
}: AttendanceGridProps) {
  // Map key: `${employeeId}_${dateStr}` -> AttendanceItem
  const attendanceMap = React.useMemo(() => {
    const map = new Map<string, AttendanceItem>();
    attendances.forEach((att) => {
      // att.date can be ISO string or YYYY-MM-DD
      const dStr = att.date.slice(0, 10);
      map.set(`${att.employeeId}_${dStr}`, att);
    });
    return map;
  }, [attendances]);

  // Calculate total hours for an employee in the current week
  const getEmployeeTotalHours = (employeeId: string): number => {
    let sum = 0;
    days.forEach((day) => {
      const att = attendanceMap.get(`${employeeId}_${day.dateStr}`);
      if (att && att.hours) {
        sum += Number(att.hours);
      }
    });
    return sum;
  };

  // Calculate total hours across all employees for a specific day
  const getDayTotalHours = (dateStr: string): number => {
    let sum = 0;
    employees.forEach((emp) => {
      const att = attendanceMap.get(`${emp.id}_${dateStr}`);
      if (att && att.hours) {
        sum += Number(att.hours);
      }
    });
    return sum;
  };

  const grandTotalHours = React.useMemo(() => {
    let sum = 0;
    attendances.forEach((att) => {
      if (att.hours) sum += Number(att.hours);
    });
    return sum;
  }, [attendances]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-center gap-2">
          <Clock className="h-5 w-5 animate-spin text-emerald-600" />
          <span>Đang tải dữ liệu chấm công...</span>
        </div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        Chưa có nhân viên nào trong danh sách.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <table
        className="w-full border-collapse text-left text-sm"
        data-testid="attendance-grid-table"
      >
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-900/50">
            {/* Employee info column */}
            <th className="min-w-[200px] p-3.5 font-semibold text-slate-700 dark:text-slate-200">
              Nhân viên
            </th>

            {/* 7 Day columns */}
            {days.map((day) => (
              <th
                key={day.dateStr}
                className={`min-w-[100px] p-3 text-center font-medium ${
                  day.isToday
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="font-semibold">{day.dayLabel}</div>
                <div className="text-xs text-slate-400 font-normal">{day.formattedDate}</div>
              </th>
            ))}

            {/* Total column */}
            <th className="min-w-[110px] p-3 text-center font-bold text-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 dark:text-emerald-400">
              Tổng giờ
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {employees.map((emp) => {
            const empTotalHours = getEmployeeTotalHours(emp.id);

            return (
              <tr
                key={emp.id}
                className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
              >
                {/* Employee info */}
                <td className="p-3.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {emp.fullName}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span>{emp.code}</span>
                        <span>•</span>
                        <span>{getPayTypeLabel(emp.payType)}</span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Day cells */}
                {days.map((day) => {
                  const att = attendanceMap.get(`${emp.id}_${day.dateStr}`);
                  const hours = att ? Number(att.hours) : 0;
                  const hasAttendance = Boolean(att && hours > 0);
                  const pieceQty = att?.pieceQty ? Number(att.pieceQty) : 0;

                  return (
                    <td
                      key={day.dateStr}
                      onClick={() => canEdit && onCellClick(emp, day.dateStr, att || null)}
                      className={`p-2.5 text-center transition-colors select-none ${
                        canEdit
                          ? 'cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30'
                          : ''
                      } ${day.isToday ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}
                      title={
                        canEdit ? `Bấm để chỉnh sửa chấm công ngày ${day.formattedDate}` : undefined
                      }
                    >
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        {hasAttendance ? (
                          <div className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                            <span>{formatHours(hours)}</span>
                            {canEdit && (
                              <Edit3 className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 text-slate-400" />
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}

                        {pieceQty > 0 && (
                          <span className="rounded bg-amber-50 px-1 py-0.2 text-[10px] font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                            {pieceQty} SP
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}

                {/* Total hours for employee */}
                <td className="p-3 text-center font-bold text-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/10 dark:text-emerald-400">
                  {formatHours(empTotalHours)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
            <td className="p-3.5">Tổng cộng theo ngày</td>
            {days.map((day) => {
              const dayTotal = getDayTotalHours(day.dateStr);
              return (
                <td
                  key={day.dateStr}
                  className="p-3 text-center text-xs text-slate-600 dark:text-slate-300"
                >
                  {formatHours(dayTotal)}
                </td>
              );
            })}
            <td className="p-3 text-center font-bold text-emerald-700 dark:text-emerald-400">
              {formatHours(grandTotalHours)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
