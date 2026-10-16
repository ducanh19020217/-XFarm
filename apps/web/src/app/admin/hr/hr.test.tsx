import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PayType, TaskStatus, PayrollStatus, Role } from '@xfarm/shared';
import {
  formatCurrency,
  formatHours,
  canManageHR,
  canManagePayroll,
  canPayPayroll,
  canEditAttendance,
} from './common/format';
import { MoneyInput } from './common/money-input';
import { AttendanceGrid, type WeekDay } from './attendance/_components/attendance-grid';
import { EditAttendanceDialog } from './attendance/_components/edit-attendance-dialog';
import { PayrollTable } from './payroll/_components/payroll-table';
import { PayrollDetailsDialog } from './payroll/_components/payroll-details-dialog';
import { TaskKanban } from './tasks/_components/task-kanban';
import { EmployeeFormDialog } from './employees/_components/employee-form-dialog';
import type {
  EmployeeItem,
  AttendanceItem,
  PayrollItem,
  TaskItem,
  CycleOption,
} from './common/types';

describe('HR Module Unit & Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockEmployees: EmployeeItem[] = [
    {
      id: 'emp-1',
      code: 'NV-0001',
      fullName: 'Nguyễn Văn An',
      phone: '0901234561',
      position: 'Công nhân trồng trọt',
      payType: PayType.DAILY,
      baseRate: 300000,
      isActive: true,
      users: [
        { id: 'user-1', email: 'worker@xfarm.local', fullName: 'Nguyễn Văn An', role: Role.WORKER },
      ],
    },
    {
      id: 'emp-2',
      code: 'NV-0002',
      fullName: 'Trần Thị Bình',
      phone: '0901234562',
      position: 'Công nhân chăn nuôi',
      payType: PayType.MONTHLY,
      baseRate: 7800000,
      isActive: true,
    },
    {
      id: 'emp-3',
      code: 'NV-0003',
      fullName: 'Lê Văn Cường',
      phone: '0901234563',
      position: 'Công nhân thu hoạch khoán',
      payType: PayType.PIECE,
      baseRate: 2000,
      isActive: true,
    },
  ];

  const mockCycles: CycleOption[] = [
    { id: 'cycle-1', name: 'Vụ Rau Cải Mùa Đông 2026' },
    { id: 'cycle-2', name: 'Lứa Gà Thả Vườn Đợt 1' },
  ];

  const mockWeekDays: WeekDay[] = [
    {
      date: new Date('2026-10-12'),
      dateStr: '2026-10-12',
      dayLabel: 'Thứ 2',
      formattedDate: '12/10',
      isToday: false,
    },
    {
      date: new Date('2026-10-13'),
      dateStr: '2026-10-13',
      dayLabel: 'Thứ 3',
      formattedDate: '13/10',
      isToday: false,
    },
    {
      date: new Date('2026-10-14'),
      dateStr: '2026-10-14',
      dayLabel: 'Thứ 4',
      formattedDate: '14/10',
      isToday: true,
    },
    {
      date: new Date('2026-10-15'),
      dateStr: '2026-10-15',
      dayLabel: 'Thứ 5',
      formattedDate: '15/10',
      isToday: false,
    },
    {
      date: new Date('2026-10-16'),
      dateStr: '2026-10-16',
      dayLabel: 'Thứ 6',
      formattedDate: '16/10',
      isToday: false,
    },
    {
      date: new Date('2026-10-17'),
      dateStr: '2026-10-17',
      dayLabel: 'Thứ 7',
      formattedDate: '17/10',
      isToday: false,
    },
    {
      date: new Date('2026-10-18'),
      dateStr: '2026-10-18',
      dayLabel: 'Chủ nhật',
      formattedDate: '18/10',
      isToday: false,
    },
  ];

  const mockAttendances: AttendanceItem[] = [
    {
      id: 'att-1',
      employeeId: 'emp-1',
      date: '2026-10-12',
      hours: 8,
      cycleId: 'cycle-1',
      notes: 'Ca chuẩn 8h',
    },
    {
      id: 'att-2',
      employeeId: 'emp-1',
      date: '2026-10-13',
      hours: 8,
      cycleId: 'cycle-1',
    },
    {
      id: 'att-3',
      employeeId: 'emp-1',
      date: '2026-10-14',
      hours: 4,
      cycleId: 'cycle-1',
      notes: 'Nửa ngày',
    },
    {
      id: 'att-4',
      employeeId: 'emp-3',
      date: '2026-10-12',
      hours: 8,
      pieceQty: 150,
      cycleId: 'cycle-1',
    },
  ];

  describe('1. Định dạng tiền vi-VN và Helpers', () => {
    it('formatCurrency: định dạng VND chính xác theo chuẩn vi-VN', () => {
      expect(formatCurrency(0)).toContain('0');
      expect(formatCurrency(300000)).toContain('300.000');
      expect(formatCurrency(15000000)).toContain('15.000.000');
      expect(formatCurrency(null)).toContain('0');
      expect(formatCurrency(undefined)).toContain('0');
    });

    it('formatHours: hiển thị số giờ gọn gàng', () => {
      expect(formatHours(8)).toBe('8h');
      expect(formatHours(4.5)).toBe('4.5h');
      expect(formatHours(0)).toBe('0h');
      expect(formatHours(null)).toBe('0h');
    });

    it('Phân quyền RBAC HR chuẩn xác', () => {
      expect(canManageHR('OWNER')).toBe(true);
      expect(canManageHR('MANAGER')).toBe(true);
      expect(canManageHR('ACCOUNTANT')).toBe(false);
      expect(canManageHR('WORKER')).toBe(false);

      expect(canManagePayroll('OWNER')).toBe(true);
      expect(canManagePayroll('ACCOUNTANT')).toBe(true);
      expect(canManagePayroll('MANAGER')).toBe(false);
      expect(canManagePayroll('WORKER')).toBe(false);

      expect(canPayPayroll('OWNER')).toBe(true);
      expect(canPayPayroll('ACCOUNTANT')).toBe(false);
      expect(canPayPayroll('MANAGER')).toBe(false);

      expect(canEditAttendance('OWNER')).toBe(true);
      expect(canEditAttendance('MANAGER')).toBe(true);
      expect(canEditAttendance('ACCOUNTANT')).toBe(false);
      expect(canEditAttendance('WORKER')).toBe(false);
    });
  });

  describe('2. MoneyInput Component', () => {
    it('Hiển thị định dạng phân cách hàng nghìn và phát sinh onChange dạng số nguyên', () => {
      const onChange = vi.fn();
      render(<MoneyInput value={300000} onChange={onChange} data-testid="money-input" />);

      const input = screen.getByTestId('money-input') as HTMLInputElement;
      expect(input.value).toBe('300.000');
      expect(screen.getByText('₫')).toBeDefined();

      fireEvent.change(input, { target: { value: '1500000' } });
      expect(onChange).toHaveBeenCalledWith(1500000);
    });

    it('Xóa trắng input trả về 0', () => {
      const onChange = vi.fn();
      render(<MoneyInput value={300000} onChange={onChange} data-testid="money-input" />);

      const input = screen.getByTestId('money-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '' } });
      expect(onChange).toHaveBeenCalledWith(0);
    });
  });

  describe('3. AttendanceGrid (Lưới chấm công tuần)', () => {
    it('Hiển thị 7 ngày trong tuần và đầy đủ nhân viên', () => {
      render(
        <AttendanceGrid
          days={mockWeekDays}
          employees={mockEmployees}
          attendances={mockAttendances}
          canEdit={true}
          isLoading={false}
          onCellClick={vi.fn()}
        />,
      );

      expect(screen.getByText('Thứ 2')).toBeDefined();
      expect(screen.getByText('Thứ 3')).toBeDefined();
      expect(screen.getByText('Chủ nhật')).toBeDefined();
      expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
      expect(screen.getByText('Trần Thị Bình')).toBeDefined();
      expect(screen.getByText('Lê Văn Cường')).toBeDefined();
    });

    it('Tính đúng tổng giờ từng nhân viên và hiển thị số lượng khoán', () => {
      render(
        <AttendanceGrid
          days={mockWeekDays}
          employees={mockEmployees}
          attendances={mockAttendances}
          canEdit={true}
          isLoading={false}
          onCellClick={vi.fn()}
        />,
      );

      // NV-0001: ngày 12 (8h) + ngày 13 (8h) + ngày 14 (4h) = 20h
      expect(screen.getByText('20h')).toBeDefined();

      // NV-0003: 150 SP khoán
      expect(screen.getByText('150 SP')).toBeDefined();

      // Tổng cộng toàn bộ tuần: 8 + 8 + 4 + 8 = 28h
      expect(screen.getByText('28h')).toBeDefined();
    });

    it('Quyền MANAGER (canEdit=true): Bấm vào ô chấm công gọi onCellClick để sửa', () => {
      const onCellClick = vi.fn();
      render(
        <AttendanceGrid
          days={mockWeekDays}
          employees={mockEmployees}
          attendances={mockAttendances}
          canEdit={true}
          isLoading={false}
          onCellClick={onCellClick}
        />,
      );

      // Bấm vào ô ngày Thứ 2 của Nguyễn Văn An (8h)
      const eightHoursCells = screen.getAllByText('8h');
      fireEvent.click(eightHoursCells[0]);

      expect(onCellClick).toHaveBeenCalledTimes(1);
      expect(onCellClick).toHaveBeenCalledWith(
        mockEmployees[0],
        '2026-10-12',
        expect.objectContaining({ id: 'att-1', hours: 8 }),
      );
    });

    it('Quyền WORKER (canEdit=false): Bấm vào ô không kích hoạt onCellClick', () => {
      const onCellClick = vi.fn();
      render(
        <AttendanceGrid
          days={mockWeekDays}
          employees={mockEmployees}
          attendances={mockAttendances}
          canEdit={false}
          isLoading={false}
          onCellClick={onCellClick}
        />,
      );

      const eightHoursCells = screen.getAllByText('8h');
      fireEvent.click(eightHoursCells[0]);

      expect(onCellClick).not.toHaveBeenCalled();
    });
  });

  describe('4. EditAttendanceDialog', () => {
    it('Cho phép quản lý sửa giờ công và lưu dữ liệu', async () => {
      const onSave = vi.fn();
      render(
        <EditAttendanceDialog
          open={true}
          onOpenChange={vi.fn()}
          employee={mockEmployees[0]}
          dateStr="2026-10-12"
          attendance={mockAttendances[0]}
          cycles={mockCycles}
          onSave={onSave}
        />,
      );

      expect(screen.getByText(/Chấm công: Nguyễn Văn An/)).toBeDefined();

      // Sửa giờ từ 8 thành 10
      const hoursInput = screen.getByLabelText(/số giờ công/i);
      fireEvent.change(hoursInput, { target: { value: '10' } });

      fireEvent.click(screen.getByRole('button', { name: /lưu chấm công/i }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'att-1',
            employeeId: 'emp-1',
            date: '2026-10-12',
            hours: 10,
          }),
        );
      });
    });

    it('Báo lỗi khi số giờ công không hợp lệ (> 24 giờ)', async () => {
      const onSave = vi.fn();
      render(
        <EditAttendanceDialog
          open={true}
          onOpenChange={vi.fn()}
          employee={mockEmployees[0]}
          dateStr="2026-10-12"
          attendance={null}
          cycles={mockCycles}
          onSave={onSave}
        />,
      );

      const hoursInput = screen.getByLabelText(/số giờ công/i);
      fireEvent.change(hoursInput, { target: { value: '25' } });

      fireEvent.click(screen.getByRole('button', { name: /lưu chấm công/i }));

      await waitFor(() => {
        expect(screen.getByText('Số giờ làm việc phải từ 0 đến 24 giờ')).toBeDefined();
      });
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('5. PayrollTable & Bảng lương', () => {
    const mockPayrolls: PayrollItem[] = [
      {
        id: 'pay-1',
        employeeId: 'emp-1',
        employee: mockEmployees[0],
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        amount: 6600000,
        details: {
          days: 22,
          dailyBreakdown: [
            { date: '2026-10-12', hours: 8, amount: 300000, cycleName: 'Vụ Rau Cải Mùa Đông 2026' },
            { date: '2026-10-13', hours: 8, amount: 300000, cycleName: 'Vụ Rau Cải Mùa Đông 2026' },
          ],
        },
        status: PayrollStatus.DRAFT,
      },
      {
        id: 'pay-2',
        employeeId: 'emp-2',
        employee: mockEmployees[1],
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        amount: 7800000,
        details: {
          actualDays: 26,
          standardDays: 26,
        },
        status: PayrollStatus.APPROVED,
      },
    ];

    it('Hiển thị đầy đủ thông tin nhân viên, số công và thành tiền', () => {
      render(
        <PayrollTable
          items={mockPayrolls}
          total={2}
          page={1}
          pageSize={10}
          onPageChange={vi.fn()}
          searchValue=""
          onSearchChange={vi.fn()}
          isLoading={false}
          canApprove={true}
          canPay={true}
          onViewDetails={vi.fn()}
          onApprove={vi.fn()}
          onPay={vi.fn()}
        />,
      );

      expect(screen.getByText('Nguyễn Văn An')).toBeDefined();
      expect(screen.getByText('22 ngày')).toBeDefined();
      expect(screen.getByText(/6.600.000/)).toBeDefined();

      expect(screen.getByText('Trần Thị Bình')).toBeDefined();
      expect(screen.getByText('26 / 26 ngày')).toBeDefined();
      expect(screen.getByText(/7.800.000/)).toBeDefined();
    });

    it('Nút Duyệt và Đã trả hiển thị đúng theo trạng thái và vai trò', () => {
      const onApprove = vi.fn();
      const onPay = vi.fn();

      render(
        <PayrollTable
          items={mockPayrolls}
          total={2}
          page={1}
          pageSize={10}
          onPageChange={vi.fn()}
          searchValue=""
          onSearchChange={vi.fn()}
          isLoading={false}
          canApprove={true}
          canPay={true}
          onViewDetails={vi.fn()}
          onApprove={onApprove}
          onPay={onPay}
        />,
      );

      // Bản nháp (DRAFT) có nút Duyệt
      const approveBtn = screen.getByRole('button', { name: /duyệt/i });
      fireEvent.click(approveBtn);
      expect(onApprove).toHaveBeenCalledWith(mockPayrolls[0]);

      // Đã duyệt (APPROVED) có nút Đã trả
      const payBtn = screen.getByRole('button', { name: /đã trả/i });
      fireEvent.click(payBtn);
      expect(onPay).toHaveBeenCalledWith(mockPayrolls[1]);
    });

    it('ACCOUNTANT (canPay=false): thấy nút Duyệt nhưng KHÔNG thấy nút Đã trả', () => {
      render(
        <PayrollTable
          items={mockPayrolls}
          total={2}
          page={1}
          pageSize={10}
          onPageChange={vi.fn()}
          searchValue=""
          onSearchChange={vi.fn()}
          isLoading={false}
          canApprove={true}
          canPay={false}
          onViewDetails={vi.fn()}
          onApprove={vi.fn()}
          onPay={vi.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: /duyệt/i })).toBeDefined();
      expect(screen.queryByRole('button', { name: /đã trả/i })).toBeNull();
    });
  });

  describe('6. PayrollDetailsDialog', () => {
    it('Hiển thị thông tin tóm tắt và chi tiết từng ngày công', () => {
      const samplePayroll: PayrollItem = {
        id: 'pay-1',
        employeeId: 'emp-1',
        employee: mockEmployees[0],
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        amount: 600000,
        details: {
          days: 2,
          dailyBreakdown: [
            { date: '2026-10-12', hours: 8, amount: 300000, cycleName: 'Vụ Rau Cải Mùa Đông 2026' },
            { date: '2026-10-13', hours: 8, amount: 300000, cycleName: 'Vụ Rau Cải Mùa Đông 2026' },
          ],
        },
        status: PayrollStatus.DRAFT,
      };

      render(<PayrollDetailsDialog open={true} onOpenChange={vi.fn()} payroll={samplePayroll} />);

      expect(screen.getByText(/Chi tiết bảng lương: Nguyễn Văn An/)).toBeDefined();
      expect(screen.getByText('2 ngày')).toBeDefined();
      expect(screen.getAllByText('Vụ Rau Cải Mùa Đông 2026').length).toBe(2);
      expect(screen.getAllByText(/300.000/).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('7. TaskKanban Component', () => {
    const mockTasks: TaskItem[] = [
      {
        id: 'task-1',
        title: 'Tưới nước luống rau',
        description: 'Tưới phun sương lô A',
        assigneeId: 'emp-1',
        assignee: mockEmployees[0],
        dueDate: '2026-10-20T17:00:00Z',
        status: TaskStatus.TODO,
      },
      {
        id: 'task-2',
        title: 'Bón phân hữu cơ',
        assigneeId: 'emp-1',
        assignee: mockEmployees[0],
        dueDate: '2026-10-21T17:00:00Z',
        status: TaskStatus.IN_PROGRESS,
      },
      {
        id: 'task-3',
        title: 'Vệ sinh chuồng gà',
        assigneeId: 'emp-2',
        assignee: mockEmployees[1],
        dueDate: '2026-10-15T17:00:00Z',
        status: TaskStatus.DONE,
      },
    ];

    it('Phân loại công việc vào 3 cột Kanban và cho phép chuyển trạng thái', () => {
      const onStatusChange = vi.fn();
      render(
        <TaskKanban
          tasks={mockTasks}
          isLoading={false}
          canManage={true}
          onEdit={vi.fn()}
          onStatusChange={onStatusChange}
        />,
      );

      expect(screen.getByRole('heading', { name: 'Chưa thực hiện' })).toBeDefined();
      expect(screen.getByRole('heading', { name: 'Đang thực hiện' })).toBeDefined();
      expect(screen.getByRole('heading', { name: 'Hoàn thành' })).toBeDefined();

      expect(screen.getByText('Tưới nước luống rau')).toBeDefined();
      expect(screen.getByText('Bón phân hữu cơ')).toBeDefined();
      expect(screen.getByText('Vệ sinh chuồng gà')).toBeDefined();

      // Bấm nút "Bắt đầu thực hiện" ở task TODO
      const startBtn = screen.getByRole('button', { name: /bắt đầu thực hiện/i });
      fireEvent.click(startBtn);
      expect(onStatusChange).toHaveBeenCalledWith(mockTasks[0], TaskStatus.IN_PROGRESS);

      // Bấm nút "Hoàn thành" ở task IN_PROGRESS
      const completeBtn = screen.getByRole('button', { name: /hoàn thành/i });
      fireEvent.click(completeBtn);
      expect(onStatusChange).toHaveBeenCalledWith(mockTasks[1], TaskStatus.DONE);
    });
  });

  describe('8. EmployeeFormDialog', () => {
    it('Validate báo lỗi khi thiếu họ tên hoặc vị trí', async () => {
      const onSubmit = vi.fn();
      render(<EmployeeFormDialog open={true} onOpenChange={vi.fn()} onSubmit={onSubmit} />);

      const submitBtn = screen.getByRole('button', { name: /thêm nhân viên/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Họ tên không được để trống')).toBeDefined();
        expect(screen.getByText('Vị trí công việc không được để trống')).toBeDefined();
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('Điền thông tin hợp lệ với MoneyInput và submit thành công', async () => {
      const onSubmit = vi.fn();
      render(<EmployeeFormDialog open={true} onOpenChange={vi.fn()} onSubmit={onSubmit} />);

      fireEvent.change(screen.getByLabelText(/họ và tên/i), {
        target: { value: 'Phạm Văn Dũng' },
      });
      fireEvent.change(screen.getByLabelText(/vị trí công việc/i), {
        target: { value: 'Kỹ sư nông nghiệp' },
      });
      fireEvent.change(screen.getByLabelText(/mức lương cơ bản/i), {
        target: { value: '12000000' },
      });

      const submitBtn = screen.getByRole('button', { name: /thêm nhân viên/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Phạm Văn Dũng',
          position: 'Kỹ sư nông nghiệp',
          baseRate: 12000000,
        }),
      );
    });
  });
});
