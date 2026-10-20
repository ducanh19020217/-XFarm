import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EquipmentPage from './page';
import { AdminUserProvider } from '../admin-user-context';
import * as equipmentApi from '@/lib/equipment-api';
import * as apiModule from '@/lib/api';
import { EquipmentStatus } from '@xfarm/shared';

vi.mock('@/lib/equipment-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/equipment-api')>('@/lib/equipment-api');
  return {
    ...actual,
    getEquipmentList: vi.fn(),
    createEquipment: vi.fn(),
    updateEquipment: vi.fn(),
  };
});

vi.mock('@/lib/alerts-api', () => ({
  runMaintenanceCheck: vi.fn(),
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

const mockEquipments: equipmentApi.EquipmentItem[] = [
  {
    id: 'eq-1',
    code: 'EQ-0001',
    name: 'Máy cày Kubota',
    type: 'TRACTOR',
    areaId: 'area-1',
    area: { id: 'area-1', code: 'A1', name: 'Khu A' },
    purchaseDate: '2026-01-15T00:00:00.000Z',
    value: 120000000,
    status: EquipmentStatus.ACTIVE,
    isActive: true,
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    maintenanceSchedules: [
      {
        id: 'sch-1',
        equipmentId: 'eq-1',
        name: 'Bảo dưỡng 30 ngày',
        intervalDays: 30,
        nextDueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Due in 2 days
        isActive: true,
        createdAt: '2026-01-15T00:00:00.000Z',
        updatedAt: '2026-01-15T00:00:00.000Z',
      },
    ],
  },
  {
    id: 'eq-2',
    code: 'EQ-0002',
    name: 'Máy bơm chìm',
    type: 'PUMP',
    areaId: null,
    area: null,
    purchaseDate: '2026-02-01T00:00:00.000Z',
    value: 15000000,
    status: EquipmentStatus.MAINTENANCE,
    isActive: true,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    maintenanceSchedules: [
      {
        id: 'sch-2',
        equipmentId: 'eq-2',
        name: 'Kiểm tra máy bơm',
        intervalDays: 15,
        nextDueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Overdue 2 days
        isActive: true,
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
      },
    ],
  },
];

describe('EquipmentPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiModule.apiFetch).mockResolvedValue({
      data: [{ id: 'area-1', code: 'A1', name: 'Khu A' }],
    });
  });

  it('renders equipment list with badges for "Đến hạn bảo trì" and "Quá hạn"', async () => {
    vi.mocked(equipmentApi.getEquipmentList).mockResolvedValueOnce({
      data: mockEquipments,
      total: 2,
      page: 1,
      pageSize: 10,
    });

    render(
      <AdminUserProvider
        user={{ id: '1', email: 'owner@xfarm.vn', fullName: 'Owner', role: 'OWNER' }}
      >
        <EquipmentPage />
      </AdminUserProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Quản lý Thiết bị' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Máy cày Kubota')).toBeInTheDocument();
      expect(screen.getByText('Máy bơm chìm')).toBeInTheDocument();
    });

    expect(screen.getByText('EQ-0001')).toBeInTheDocument();
    expect(screen.getByText('EQ-0002')).toBeInTheDocument();

    // Verify badges
    expect(screen.getByText('Đến hạn bảo trì')).toBeInTheDocument();
    expect(screen.getByText('Quá hạn')).toBeInTheDocument();
  });

  it('filters by search, type, and status', async () => {
    vi.mocked(equipmentApi.getEquipmentList).mockResolvedValue({
      data: mockEquipments,
      total: 2,
      page: 1,
      pageSize: 10,
    });

    render(
      <AdminUserProvider
        user={{ id: '1', email: 'owner@xfarm.vn', fullName: 'Owner', role: 'OWNER' }}
      >
        <EquipmentPage />
      </AdminUserProvider>,
    );

    await waitFor(() => {
      expect(equipmentApi.getEquipmentList).toHaveBeenCalled();
    });

    // Type in search
    const searchInput = screen.getByPlaceholderText('Tìm theo tên hoặc mã thiết bị...');
    fireEvent.change(searchInput, { target: { value: 'Kubota' } });

    await waitFor(() => {
      expect(equipmentApi.getEquipmentList).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Kubota',
        }),
        expect.anything(),
      );
    });

    // Change status filter
    const statusSelect = screen.getByLabelText('Trạng thái');
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });

    await waitFor(() => {
      expect(equipmentApi.getEquipmentList).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ACTIVE',
        }),
        expect.anything(),
      );
    });
  });

  it('opens FormDialog to create equipment and submits successfully', async () => {
    vi.mocked(equipmentApi.getEquipmentList).mockResolvedValue({
      data: mockEquipments,
      total: 2,
      page: 1,
      pageSize: 10,
    });
    vi.mocked(equipmentApi.createEquipment).mockResolvedValueOnce({
      id: 'eq-new',
      code: 'EQ-0003',
      name: 'Máy gặt lúa mới',
      type: 'HARVESTER',
      status: EquipmentStatus.ACTIVE,
      isActive: true,
      createdAt: '2026-10-19T00:00:00.000Z',
      updatedAt: '2026-10-19T00:00:00.000Z',
    });

    render(
      <AdminUserProvider
        user={{ id: '1', email: 'owner@xfarm.vn', fullName: 'Owner', role: 'OWNER' }}
      >
        <EquipmentPage />
      </AdminUserProvider>,
    );

    const createBtn = await screen.findByRole('button', { name: /thêm thiết bị/i });
    fireEvent.click(createBtn);

    // Dialog title
    expect(screen.getByRole('heading', { name: 'Thêm thiết bị mới' })).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByLabelText(/tên thiết bị \*/i), {
      target: { value: 'Máy gặt lúa mới' },
    });
    fireEvent.change(screen.getByLabelText(/loại thiết bị \*/i), {
      target: { value: 'HARVESTER' },
    });

    // Click submit
    fireEvent.click(screen.getByRole('button', { name: 'Tạo mới' }));

    await waitFor(() => {
      expect(equipmentApi.createEquipment).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Máy gặt lúa mới',
          type: 'HARVESTER',
        }),
      );
    });
  });

  it('hides "Thêm thiết bị" button for WORKER or ACCOUNTANT', async () => {
    vi.mocked(equipmentApi.getEquipmentList).mockResolvedValueOnce({
      data: mockEquipments,
      total: 2,
      page: 1,
      pageSize: 10,
    });

    render(
      <AdminUserProvider
        user={{ id: '2', email: 'worker@xfarm.vn', fullName: 'Worker', role: 'WORKER' }}
      >
        <EquipmentPage />
      </AdminUserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Máy cày Kubota')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /thêm thiết bị/i })).not.toBeInTheDocument();
  });

  it('discards out-of-order stale responses when search changes quickly', async () => {
    let resolveFirstRequest!: (val: unknown) => void;
    const firstRequestPromise = new Promise((resolve) => {
      resolveFirstRequest = resolve;
    });

    vi.mocked(equipmentApi.getEquipmentList).mockImplementation(async (params) => {
      if (!params?.search) {
        // Initial / empty search returns slowly
        return firstRequestPromise as Promise<never>;
      }
      // Search for specific item returns quickly
      return {
        data: [
          {
            id: 'eq-fast',
            code: 'EQ-FAST',
            name: 'Máy phun thuốc nhanh',
            type: 'OTHER',
            status: EquipmentStatus.ACTIVE,
            isActive: true,
            createdAt: '2026-10-19T00:00:00.000Z',
            updatedAt: '2026-10-19T00:00:00.000Z',
            maintenanceSchedules: [],
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      };
    });

    render(
      <AdminUserProvider
        user={{ id: '1', email: 'owner@xfarm.vn', fullName: 'Owner', role: 'OWNER' }}
      >
        <EquipmentPage />
      </AdminUserProvider>,
    );

    // Type into search input before first request resolves
    const searchInput = screen.getByPlaceholderText(/tìm theo tên hoặc mã/i);
    fireEvent.change(searchInput, { target: { value: 'phun thuốc' } });

    // Fast search results should appear
    await waitFor(() => {
      expect(screen.getByText('Máy phun thuốc nhanh')).toBeInTheDocument();
    });

    // Now resolve the older first request with stale data
    resolveFirstRequest({
      data: mockEquipments,
      total: 2,
      page: 1,
      pageSize: 10,
    });

    // The fast search result must remain and NOT be overwritten by stale response
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText('Máy phun thuốc nhanh')).toBeInTheDocument();
    expect(screen.queryByText('Máy cày Kubota')).not.toBeInTheDocument();
  });
});
