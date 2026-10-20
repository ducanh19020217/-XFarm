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
      const dStr =
        typeof att.date === 'string'
          ? att.date.slice(0, 10)
          : new Date(att.date).toISOString().slice(0, 10);
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
      <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted shadow-xs">
        <div className="flex items-center justify-center gap-2">
          <Clock className="h-5 w-5 animate-spin text-accent" />
          <span>Đang tải dữ liệu chấm công...</span>
        </div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted shadow-xs">
        Chưa có nhân viên nào trong danh sách.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-xs">
      <table
        className="w-full border-collapse text-left text-sm"
        data-testid="attendance-grid-table"
      >
        <thead>
          <tr className="border-b border-line bg-surface-2">
            {/* Employee info column */}
            <th className="min-w-[200px] p-3.5 font-semibold text-fg-2">
              Nhân viên
            </th>

            {/* 7 Day columns */}
            {days.map((day) => (
              <th
                key={day.dateStr}
                className={`min-w-[100px] p-3 text-center font-medium ${
                  day.isToday
                    ? 'bg-accent-bg text-accent'
                    : 'text-fg-2'
                }`}
              >
                <div className="font-semibold">{day.dayLabel}</div>
                <div className="text-xs text-muted font-normal">{day.formattedDate}</div>
              </th>
            ))}

            {/* Total column */}
            <th className="min-w-[110px] p-3 text-center font-bold text-accent bg-accent-bg/40">
              Tổng giờ
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {employees.map((emp) => {
            const empTotalHours = getEmployeeTotalHours(emp.id);

            return (
              <tr
                key={emp.id}
                data-employee-id={emp.id}
                data-testid={`attendance-row-${emp.id}`}
                className="hover:bg-hover/30 transition-colors"
              >
                {/* Employee info */}
                <td className="p-3.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-muted">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-fg">
                        {emp.fullName}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted">
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
                      data-employee-id={emp.id}
                      data-date={day.dateStr}
                      data-testid={`attendance-cell-${emp.id}-${day.dateStr}`}
                      onClick={() => canEdit && onCellClick(emp, day.dateStr, att || null)}
                      className={`p-2.5 text-center transition-colors select-none ${
                        canEdit
                          ? 'cursor-pointer hover:bg-hover'
                          : ''
                      } ${day.isToday ? 'bg-accent-bg/20' : ''}`}
                      title={
                        canEdit
                          ? `Bấm để chỉnh sửa chấm công ngày ${day.formattedDate} cho ${emp.fullName}`
                          : undefined
                      }
                    >
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        {hasAttendance ? (
                          <div className="flex items-center gap-1 font-semibold text-accent">
                            <span>{formatHours(hours)}</span>
                            {canEdit && (
                              <Edit3 className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 text-muted" />
                            )}
                          </div>
                        ) : (
                          <span className="text-muted/50">-</span>
                        )}

                        {pieceQty > 0 && (
                          <span className="rounded bg-warn-bg px-1 py-0.2 text-[10px] font-medium text-warn">
                            {pieceQty} SP
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}

                {/* Total hours for employee */}
                <td className="p-3 text-center font-bold text-accent bg-accent-bg/20">
                  {formatHours(empTotalHours)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-line bg-surface-2 font-semibold text-fg">
            <td className="p-3.5">Tổng cộng theo ngày</td>
            {days.map((day) => {
              const dayTotal = getDayTotalHours(day.dateStr);
              return (
                <td
                  key={day.dateStr}
                  className="p-3 text-center text-xs text-muted"
                >
                  {formatHours(dayTotal)}
                </td>
              );
            })}
            <td className="p-3 text-center font-bold text-accent">
              {formatHours(grandTotalHours)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
