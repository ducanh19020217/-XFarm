import {
  PayType,
  PAY_TYPE_LABELS,
  TaskStatus,
  TASK_STATUS_LABELS,
  PayrollStatus,
  PAYROLL_STATUS_LABELS,
} from '@xfarm/shared';

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0 ₫';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (Number.isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

export function formatHours(hours: number | string | null | undefined): string {
  if (hours === null || hours === undefined || hours === '') return '0h';
  const num = typeof hours === 'number' ? hours : Number(hours);
  if (Number.isNaN(num) || num === 0) return '0h';
  return `${num.toFixed(1).replace(/\.0$/, '')}h`;
}

export function getPayTypeLabel(payType: PayType | string): string {
  return PAY_TYPE_LABELS[payType as PayType] || payType;
}

export function getTaskStatusLabel(status: TaskStatus | string): string {
  return TASK_STATUS_LABELS[status as TaskStatus] || status;
}

export function getPayrollStatusLabel(status: PayrollStatus | string): string {
  return PAYROLL_STATUS_LABELS[status as PayrollStatus] || status;
}

export function canManageHR(role?: string | null): boolean {
  return role === 'OWNER' || role === 'MANAGER';
}

export function canManagePayroll(role?: string | null): boolean {
  return role === 'OWNER' || role === 'ACCOUNTANT';
}

export function canPayPayroll(role?: string | null): boolean {
  return role === 'OWNER';
}

export function canEditAttendance(role?: string | null): boolean {
  return role === 'OWNER' || role === 'MANAGER';
}
