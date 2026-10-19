import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EquipmentDetailPage from './page';
import { AdminUserProvider } from '../../admin-user-context';
import * as equipmentApi from '@/lib/equipment-api';
import * as apiModule from '@/lib/api';
import { EquipmentStatus, MaintenanceType } from '@xfarm/shared';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'eq-123' }),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/lib/equipment-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/equipment-api')>(
    '@/lib/equipment-api',
  );
  return {
    ...actual,
    getEquipmentDetail: vi.fn(),
    updateEquipment: vi.fn(),
    createEquipmentSchedule: vi.fn(),
    updateEquipmentSchedule: vi.fn(),
    deleteEquipmentSchedule: vi.fn(),
    createEquipmentLog: vi.fn(),
  };
});

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

const mockEquipmentDetail: equipmentApi.EquipmentItem = {
  id: 'eq-123',
  code: 'EQ-0001',
  name: 'Máy cày Kubota L5018',
  type: 'TRACTOR',
  areaId: 'area-1',
  area: { id: 'area-1', code: 'A1', name: 'Khu A' },
  purchaseDate: '2026-01-15T00:00:00.000Z',
  value: 150000000,
  status: EquipmentStatus.ACTIVE,
  notes: 'Động cơ Diesel 50HP',
  isActive: true,
  createdAt: '2026-01-15T00:00:00.000Z',
  updatedAt: '2026-01-15T00:00:00.000Z',
  totalMaintenanceCost: 3500000,
  totalCost: 3500000,
  maintenanceSchedules: [
    {
      id: 'sch-1',
      equipmentId: 'eq-123',
      name: 'Bảo dưỡng định kỳ 30 ngày',
      intervalDays: 30,
      nextDueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      createdAt: '2026-01-15T00:00:00.000Z',
    },
  ],
  maintenanceLogs: [
    {
      id: 'log-1',
      equipmentId: 'eq-123',
      scheduleId: 'sch-1',
      date: '2026-01-20T00:00:00.000Z',
      type: MaintenanceType.ROUTINE,
      cost: 1500000,
      notes: 'Thay dầu nhớt động cơ và lọc gió',
      performedBy: {
        id: 'usr-1',
        fullName: 'Nguyễn Văn Kỹ Thuật',
        email: 'tech@xfarm.vn',
      },
      schedule: {
        id: 'sch-1',
        name: 'Bảo dưỡng định kỳ 30 ngày',
      },
    },
  ],
};

describe('EquipmentDetailPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiModule.apiFetch).mockResolvedValue({
      data: [{ id: 'area-1', code: 'A1', name: 'Khu A' }],
    });
  });

  it('renders equipment details, total cost, schedules and logs', async () => {
    vi.mocked(equipmentApi.getEquipmentDetail).mockResolvedValueOnce(mockEquipmentDetail);

    render(
      <AdminUserProvider
        user={{ id: '1', email: 'owner@xfarm.vn', fullName: 'Owner', role: 'OWNER' }}
      >
        <EquipmentDetailPage />
      </AdminUserProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Máy cày Kubota L5018' }),
      ).toBeInTheDocument();
    });

    // Code and details
    expect(screen.getByText('EQ-0001')).toBeInTheDocument();
    expect(screen.getByText('Động cơ Diesel 50HP')).toBeInTheDocument();

    // Total cost card
    const costStat = screen.getByTestId('total-maintenance-cost');
    expect(costStat).toBeInTheDocument();
    expect(costStat.textContent).toContain('3.500.000');

    // Schedules list
    expect(screen.getAllByText('Bảo dưỡng định kỳ 30 ngày').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('30 ngày')).toBeInTheDocument();

    // Logs list
    expect(screen.getByText('Thay dầu nhớt động cơ và lọc gió')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn Kỹ Thuật')).toBeInTheDocument();
  });

  it('adds a maintenance schedule via ScheduleDialog', async () => {
    vi.mocked(equipmentApi.getEquipmentDetail).mockResolvedValue(mockEquipmentDetail);
    vi.mocked(equipmentApi.createEquipmentSchedule).mockResolvedValueOnce({
      id: 'sch-new',
      equipmentId: 'eq-123',
      name: 'Kiểm tra hệ thống phanh',
      intervalDays: 60,
      nextDueDate: '2026-11-20T00:00:00.000Z',
      isActive: true,
      createdAt: '2026-10-19T00:00:00.000Z',
    });

    render(
      <AdminUserProvider
        user={{ id: '1', email: 'owner@xfarm.vn', fullName: 'Owner', role: 'OWNER' }}
      >
        <EquipmentDetailPage />
      </AdminUserProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Máy cày Kubota L5018' }),
      ).toBeInTheDocument();
    });

    // Click "Thêm lịch bảo trì"
    const addBtn = screen.getByRole('button', { name: /thêm lịch bảo trì/i });
    fireEvent.click(addBtn);

    expect(screen.getByRole('heading', { name: 'Thêm lịch bảo trì mới' })).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByLabelText(/tên lịch bảo trì \*/i), {
      target: { value: 'Kiểm tra hệ thống phanh' },
    });
    fireEvent.change(screen.getByLabelText(/chu kỳ lặp lại/i), {
      target: { value: '60' },
    });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Tạo lịch' }));

    await waitFor(() => {
      expect(equipmentApi.createEquipmentSchedule).toHaveBeenCalledWith(
        'eq-123',
        expect.objectContaining({
          name: 'Kiểm tra hệ thống phanh',
          intervalDays: 60,
        }),
      );
    });
  });

  it('records maintenance log via LogDialog with MoneyInput', async () => {
    vi.mocked(equipmentApi.getEquipmentDetail).mockResolvedValue(mockEquipmentDetail);
    vi.mocked(equipmentApi.createEquipmentLog).mockResolvedValueOnce({
      id: 'log-new',
      equipmentId: 'eq-123',
      date: '2026-10-19T00:00:00.000Z',
      type: MaintenanceType.ROUTINE,
      cost: 200000,
      scheduleId: 'sch-1',
    });

    render(
      <AdminUserProvider
        user={{ id: '2', email: 'worker@xfarm.vn', fullName: 'Worker', role: 'WORKER' }}
      >
        <EquipmentDetailPage />
      </AdminUserProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Máy cày Kubota L5018' }),
      ).toBeInTheDocument();
    });

    // Worker can click "Ghi nhận bảo trì"
    const logBtn = screen.getAllByRole('button', { name: /ghi nhận bảo trì/i })[0];
    fireEvent.click(logBtn);

    expect(screen.getByRole('heading', { name: 'Ghi nhật ký bảo trì mới' })).toBeInTheDocument();

    // Fill notes
    fireEvent.change(screen.getByLabelText(/ghi chú/i), {
      target: { value: 'Vừa bảo dưỡng xong dầu bôi trơn' },
    });

    // Fill MoneyInput
    const costInput = screen.getByLabelText(/chi phí bảo trì/i);
    fireEvent.change(costInput, { target: { value: '200000' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nhật ký' }));

    await waitFor(() => {
      expect(equipmentApi.createEquipmentLog).toHaveBeenCalledWith(
        'eq-123',
        expect.objectContaining({
          cost: 200000,
          notes: 'Vừa bảo dưỡng xong dầu bôi trơn',
        }),
      );
    });
  });
});
