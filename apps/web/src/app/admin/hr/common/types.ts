import { PayType, TaskStatus, PayrollStatus, Role } from '@xfarm/shared';

export interface EmployeeItem {
  id: string;
  code: string;
  fullName: string;
  phone?: string | null;
  position: string;
  payType: PayType;
  baseRate: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  users?: {
    id: string;
    email: string;
    fullName: string;
    role: Role;
  }[];
}

export interface UserOption {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  employeeId?: string | null;
}

export interface AreaOption {
  id: string;
  name: string;
  code?: string;
}

export interface CycleOption {
  id: string;
  name: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  assigneeId: string;
  assignee?: EmployeeItem;
  areaId?: string | null;
  area?: AreaOption | null;
  cycleId?: string | null;
  cycle?: CycleOption | null;
  dueDate: string;
  status: TaskStatus;
  activityId?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  pendingSync?: boolean;
  clientId?: string;
}

export interface AttendanceItem {
  id: string;
  employeeId: string;
  employee?: EmployeeItem;
  date: string; // ISO string YYYY-MM-DD
  checkIn?: string | null;
  checkOut?: string | null;
  hours: number;
  cycleId?: string | null;
  cycle?: CycleOption | null;
  pieceQty?: number | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  pendingSync?: boolean;
  clientId?: string;
}

export interface PayrollDailyDetail {
  date: string;
  hours?: number;
  cycleId?: string | null;
  cycleName?: string;
  pieceQty?: number;
  amount: number;
  notes?: string;
}

export interface PayrollItem {
  id: string;
  employeeId: string;
  employee: EmployeeItem;
  periodStart: string;
  periodEnd: string;
  amount: number;
  details: {
    days?: number;
    hours?: number;
    pieceQty?: number;
    standardDays?: number;
    actualDays?: number;
    dailyBreakdown?: PayrollDailyDetail[];
    [key: string]: unknown;
  };
  status: PayrollStatus;
  approvedById?: string | null;
  approvedBy?: { id: string; fullName: string } | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
