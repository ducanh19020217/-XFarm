'use client';

import * as React from 'react';
import {
  FormDialog,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@xfarm/ui';
import { Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { formatDate } from '../../common/format';
import type { AttendanceItem, EmployeeItem, CycleOption } from '../../common/types';

interface EditAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeItem | null;
  dateStr: string | null; // YYYY-MM-DD
  attendance: AttendanceItem | null;
  cycles: CycleOption[];
  onSave: (payload: {
    id?: string;
    employeeId: string;
    date: string;
    hours: number;
    checkIn?: string | null;
    checkOut?: string | null;
    cycleId?: string | null;
    pieceQty?: number | null;
    notes?: string | null;
  }) => Promise<void>;
}

export function EditAttendanceDialog({
  open,
  onOpenChange,
  employee,
  dateStr,
  attendance,
  cycles,
  onSave,
}: EditAttendanceDialogProps) {
  const [hours, setHours] = React.useState<number | ''>(8);
  const [checkInTime, setCheckInTime] = React.useState('07:30');
  const [checkOutTime, setCheckOutTime] = React.useState('16:30');
  const [cycleId, setCycleId] = React.useState<string>('none');
  const [pieceQty, setPieceQty] = React.useState<number | ''>('');
  const [notes, setNotes] = React.useState('');

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setError(null);
      setFieldErrors({});
      if (attendance) {
        setHours(Number(attendance.hours) || 0);
        // Extract time strings HH:mm
        if (attendance.checkIn) {
          const d = new Date(attendance.checkIn);
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          setCheckInTime(`${hh}:${mm}`);
        } else {
          setCheckInTime('');
        }

        if (attendance.checkOut) {
          const d = new Date(attendance.checkOut);
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          setCheckOutTime(`${hh}:${mm}`);
        } else {
          setCheckOutTime('');
        }

        setCycleId(attendance.cycleId || 'none');
        setPieceQty(
          attendance.pieceQty !== null && attendance.pieceQty !== undefined
            ? Number(attendance.pieceQty)
            : '',
        );
        setNotes(attendance.notes || '');
      } else {
        setHours(8);
        setCheckInTime('07:30');
        setCheckOutTime('16:30');
        setCycleId('none');
        setPieceQty('');
        setNotes('');
      }
    }
  }, [open, attendance, employee?.id, dateStr]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !dateStr) return;

    const numHours = typeof hours === 'number' ? hours : 0;
    if (numHours < 0 || numHours > 24) {
      setError('Số giờ làm việc phải từ 0 đến 24 giờ');
      setFieldErrors({});
      return;
    }

    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    // Build ISO dates for checkIn / checkOut if provided
    let isoCheckIn: string | null = null;
    let isoCheckOut: string | null = null;

    if (checkInTime) {
      isoCheckIn = new Date(`${dateStr}T${checkInTime}:00`).toISOString();
    }
    if (checkOutTime) {
      isoCheckOut = new Date(`${dateStr}T${checkOutTime}:00`).toISOString();
    }

    try {
      await onSave({
        id: attendance?.id,
        employeeId: employee.id,
        date: dateStr,
        hours: numHours,
        checkIn: isoCheckIn,
        checkOut: isoCheckOut,
        cycleId: cycleId === 'none' ? null : cycleId,
        pieceQty: pieceQty !== '' ? Number(pieceQty) : null,
        notes: notes.trim() || null,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const errorsMap: Record<string, string> = {};
        const details: string[] = [];
        if (Array.isArray(err.errors) && err.errors.length > 0) {
          for (const item of err.errors as Array<{
            field?: string;
            path?: string[];
            message?: string;
          }>) {
            const field = item.field || (Array.isArray(item.path) ? item.path.join('.') : '');
            const msg = item.message || 'Dữ liệu không hợp lệ';
            if (field) {
              errorsMap[field] = msg;
              details.push(`${field}: ${msg}`);
            } else {
              details.push(msg);
            }
          }
        }
        setFieldErrors(errorsMap);
        setError(details.length > 0 ? `${err.message}: ${details.join('; ')}` : err.message);
      } else {
        const msg = err instanceof Error ? err.message : 'Lỗi khi lưu thông tin chấm công';
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!employee || !dateStr) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Chấm công: ${employee.fullName}`}
      description={`Cập nhật giờ công ngày ${formatDate(dateStr)} cho ${employee.fullName} (${employee.code} - ${employee.position}).`}
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="hours">
              Số giờ công <span className="text-red-500">*</span>
            </Label>
            <Input
              id="hours"
              type="number"
              step="0.25"
              min="0"
              max="24"
              value={hours}
              onChange={(e) => {
                const val = e.target.value;
                setHours(val === '' ? '' : Number(val));
              }}
              disabled={submitting}
              required
            />
            {fieldErrors.hours && (
              <p className="text-xs text-red-500 font-medium">{fieldErrors.hours}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="checkIn">Giờ vào</Label>
            <Input
              id="checkIn"
              type="time"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              disabled={submitting}
            />
            {fieldErrors.checkIn && (
              <p className="text-xs text-red-500 font-medium">{fieldErrors.checkIn}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="checkOut">Giờ ra</Label>
            <Input
              id="checkOut"
              type="time"
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
              disabled={submitting}
            />
            {fieldErrors.checkOut && (
              <p className="text-xs text-red-500 font-medium">{fieldErrors.checkOut}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="cycle">Mùa vụ áp dụng</Label>
            <Select value={cycleId} onValueChange={setCycleId} disabled={submitting}>
              <SelectTrigger id="cycle">
                <SelectValue placeholder="Chọn mùa vụ..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Không gắn mùa vụ --</SelectItem>
                {cycles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-400">Gắn vào mùa vụ để tính chi phí công</p>
            {fieldErrors.cycleId && (
              <p className="text-xs text-red-500 font-medium">{fieldErrors.cycleId}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="pieceQty">Số lượng khoán (sản phẩm)</Label>
            <Input
              id="pieceQty"
              type="number"
              step="1"
              min="0"
              placeholder="VD: 100"
              value={pieceQty}
              onChange={(e) => {
                const val = e.target.value;
                setPieceQty(val === '' ? '' : Number(val));
              }}
              disabled={submitting}
            />
            <p className="text-[11px] text-slate-400">
              Dành cho nhân viên hưởng lương theo sản phẩm
            </p>
            {fieldErrors.pieceQty && (
              <p className="text-xs text-red-500 font-medium">{fieldErrors.pieceQty}</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="notes">Ghi chú</Label>
          <Input
            id="notes"
            placeholder="Ghi chú tăng ca, đi trễ, phân công đặc biệt..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
          />
          {fieldErrors.notes && (
            <p className="text-xs text-red-500 font-medium">{fieldErrors.notes}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu chấm công
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
