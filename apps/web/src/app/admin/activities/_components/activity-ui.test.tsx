import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ActivityType, CycleStatus } from '@xfarm/shared';
import { ActivityForm } from './activity-form';
import { ActivityTimeline } from './activity-timeline';
import { ActivityDetailDialog } from './activity-detail-dialog';
import { activitySummary, canCreateActivity, canRecordActivity } from './constants';
import { AdminUserProvider } from '../../admin-user-context';
import { ApiError } from '@/lib/api';
import type { ActivityRecord, AvailableItem } from './types';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

const mockItems: AvailableItem[] = [
  {
    id: 'item-npk',
    sku: 'NPK-16-16-8',
    name: 'Phân NPK 16-16-8',
    category: 'FERTILIZER',
    unit: 'kg',
    currentStock: 10,
    warehouseId: 'wh-1',
  },
  {
    id: 'item-bio-pest',
    sku: 'BIO-PEST',
    name: 'Thuốc trừ sâu sinh học',
    category: 'PESTICIDE',
    unit: 'lít',
    currentStock: 5,
    warehouseId: 'wh-1',
  },
  {
    id: 'item-chicken-feed',
    sku: 'CHICKEN-FEED',
    name: 'Cám gà',
    category: 'FEED',
    unit: 'kg',
    currentStock: 20,
    warehouseId: 'wh-1',
  },
  {
    id: 'item-empty',
    sku: 'OUT-OF-STOCK',
    name: 'Hạt giống hết hàng',
    category: 'SEED',
    unit: 'gói',
    currentStock: 0,
    warehouseId: 'wh-1',
  },
];

const mockActivityWithMaterial: ActivityRecord = {
  id: 'act-1',
  type: ActivityType.FERTILIZING,
  performedAt: '2026-10-16T09:00:00.000Z',
  area: { id: 'area-1', code: 'A1', name: 'Khu A' },
  cycle: {
    id: 'cycle-1',
    code: 'C1',
    name: 'Mùa vụ 1',
    areaId: 'area-1',
    status: CycleStatus.ACTIVE,
  },
  performedBy: { id: 'user-1', fullName: 'Nguyễn Văn A', email: 'worker@xfarm.local' },
  materials: [
    {
      id: 'mat-1',
      itemId: 'item-npk',
      itemName: 'Phân NPK 16-16-8',
      quantity: 3,
      unit: 'kg',
      unitCost: 12000,
    },
  ],
};

describe('activity UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('changes data fields when the activity type changes', async () => {
    const user = userEvent.setup();
    render(
      <ActivityForm
        areas={[{ id: 'area-1', code: 'A1', name: 'Khu A' }]}
        cycles={[
          {
            id: 'cycle-1',
            code: 'C1',
            name: 'Mùa 1',
            areaId: 'area-1',
            status: CycleStatus.ACTIVE,
          },
        ]}
        availableItems={mockItems}
        onSaved={() => undefined}
      />,
    );
    expect(screen.queryByLabelText('pH')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Loại nhật ký *'), ActivityType.WATER_TEST);
    expect(screen.getByLabelText('pH')).toBeInTheDocument();
    expect(screen.getByLabelText('DO (mg/L)')).toBeInTheDocument();
    expect(screen.getByLabelText('Nhiệt độ (°C)')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Mùa vụ'), 'cycle-1');
    expect(screen.getByLabelText('Khu/lô *')).toHaveValue('area-1');
    await user.selectOptions(screen.getByLabelText('Loại nhật ký *'), ActivityType.WEIGHING);
    expect(screen.getByLabelText('Cân trung bình (kg)')).toBeInTheDocument();
    expect(screen.getByLabelText('Số mẫu')).toBeInTheDocument();
    expect(screen.queryByLabelText('pH')).not.toBeInTheDocument();
  });

  it('summarizes structured data and hides recording for closed cycles', () => {
    expect(activitySummary(ActivityType.WATER_TEST, { pH: 7.2, DO: 5.1 })).toBe('pH 7.2 · DO 5.1');
    expect(activitySummary(ActivityType.WATER_TEST, {})).toBe('');
    expect(canRecordActivity(CycleStatus.CLOSED)).toBe(false);
    expect(canRecordActivity(CycleStatus.CANCELLED)).toBe(false);
    expect(canRecordActivity(CycleStatus.ACTIVE)).toBe(true);
    expect(canCreateActivity('OWNER')).toBe(true);
    expect(canCreateActivity('MANAGER')).toBe(true);
    expect(canCreateActivity('WORKER')).toBe(true);
    expect(canCreateActivity('SALES')).toBe(false);
  });

  it('allows adding and removing material rows in ActivityForm', async () => {
    const user = userEvent.setup();
    render(
      <ActivityForm
        areas={[{ id: 'area-1', code: 'A1', name: 'Khu A' }]}
        cycles={[]}
        availableItems={mockItems}
        onSaved={() => undefined}
      />,
    );

    expect(screen.getByText('Chưa có vật tư nào được chọn.')).toBeInTheDocument();

    const addButton = screen.getByRole('button', { name: /thêm vật tư/i });
    await user.click(addButton);

    expect(screen.queryByText('Chưa có vật tư nào được chọn.')).not.toBeInTheDocument();
    const select = screen.getByLabelText('Chọn vật tư');
    expect(select).toBeInTheDocument();

    await user.selectOptions(select, 'item-npk');
    expect(screen.getAllByText(/Tồn:/).length).toBeGreaterThan(0);
    expect(screen.getByText('10', { selector: 'strong' })).toBeInTheDocument();

    const qtyInput = screen.getByLabelText('Số lượng vật tư');
    await user.type(qtyInput, '3.5');
    expect(qtyInput).toHaveValue(3.5);

    const removeBtn = screen.getByRole('button', { name: /xóa vật tư dòng 1/i });
    await user.click(removeBtn);

    expect(screen.getByText('Chưa có vật tư nào được chọn.')).toBeInTheDocument();
  });

  it('automatically suggests material row based on activity type', async () => {
    const user = userEvent.setup();
    render(
      <ActivityForm
        areas={[{ id: 'area-1', code: 'A1', name: 'Khu A' }]}
        cycles={[]}
        availableItems={mockItems}
        onSaved={() => undefined}
      />,
    );

    const typeSelect = screen.getByLabelText('Loại nhật ký *');

    // FERTILIZING suggests FERTILIZER item (NPK)
    await user.selectOptions(typeSelect, ActivityType.FERTILIZING);
    expect(screen.getByLabelText('Chọn vật tư')).toHaveValue('item-npk');
    expect(screen.getByText('10', { selector: 'strong' })).toBeInTheDocument();

    // SPRAYING suggests PESTICIDE item (BIO-PEST)
    await user.selectOptions(typeSelect, ActivityType.SPRAYING);
    expect(screen.getByLabelText('Chọn vật tư')).toHaveValue('item-bio-pest');
    expect(screen.getByText('5', { selector: 'strong' })).toBeInTheDocument();

    // FEEDING suggests FEED item (CHICKEN-FEED)
    await user.selectOptions(typeSelect, ActivityType.FEEDING);
    expect(screen.getByLabelText('Chọn vật tư')).toHaveValue('item-chicken-feed');
    expect(screen.getByText('20', { selector: 'strong' })).toBeInTheDocument();
  });

  it('displays 422 stock error prominently when submission fails', async () => {
    const { apiFetch } = await import('@/lib/api');
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new ApiError(422, 'Không đủ tồn kho để xuất 15 kg phân NPK (tồn hiện tại: 10 kg)'),
    );

    const user = userEvent.setup();
    render(
      <ActivityForm
        areas={[{ id: 'area-1', code: 'A1', name: 'Khu A' }]}
        cycles={[]}
        availableItems={mockItems}
        onSaved={() => undefined}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Khu/lô *'), 'area-1');
    await user.selectOptions(screen.getByLabelText('Loại nhật ký *'), ActivityType.FERTILIZING);

    const qtyInput = screen.getByLabelText('Số lượng vật tư');
    await user.type(qtyInput, '15');

    const saveButton = screen.getByRole('button', { name: /lưu nhật ký/i });
    await user.click(saveButton);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/Không đủ tồn kho để xuất 15 kg phân NPK/);
    });
  });

  it('renders materials with unit cost only for OWNER, MANAGER, ACCOUNTANT in timeline', () => {
    // 1. OWNER sees cost
    const { rerender } = render(
      <AdminUserProvider
        user={{ id: '1', email: 'owner@xfarm.local', fullName: 'Owner User', role: 'OWNER' }}
      >
        <ActivityTimeline activities={[mockActivityWithMaterial]} />
      </AdminUserProvider>,
    );
    expect(screen.getByText(/Phân NPK 16-16-8/)).toBeInTheDocument();
    expect(screen.getByText(/Giá vốn:/)).toBeInTheDocument();

    // 2. WORKER does NOT see cost
    rerender(
      <AdminUserProvider
        user={{ id: '2', email: 'worker@xfarm.local', fullName: 'Worker User', role: 'WORKER' }}
      >
        <ActivityTimeline activities={[mockActivityWithMaterial]} />
      </AdminUserProvider>,
    );
    expect(screen.getByText(/Phân NPK 16-16-8/)).toBeInTheDocument();
    expect(screen.queryByText(/Giá vốn:/)).not.toBeInTheDocument();
  });

  it('renders materials with unit cost only for authorized roles in detail dialog', () => {
    // 1. ACCOUNTANT sees cost column
    const { rerender } = render(
      <AdminUserProvider
        user={{
          id: '1',
          email: 'acc@xfarm.local',
          fullName: 'Accountant User',
          role: 'ACCOUNTANT',
        }}
      >
        <ActivityDetailDialog
          activity={mockActivityWithMaterial}
          open={true}
          onOpenChange={() => undefined}
        />
      </AdminUserProvider>,
    );
    expect(screen.getByText('Chi tiết nhật ký sản xuất')).toBeInTheDocument();
    expect(screen.getByText('Phân NPK 16-16-8')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Giá vốn' })).toBeInTheDocument();

    // 2. SALES does NOT see cost column
    rerender(
      <AdminUserProvider
        user={{ id: '2', email: 'sales@xfarm.local', fullName: 'Sales User', role: 'SALES' }}
      >
        <ActivityDetailDialog
          activity={mockActivityWithMaterial}
          open={true}
          onOpenChange={() => undefined}
        />
      </AdminUserProvider>,
    );
    expect(screen.queryByRole('columnheader', { name: 'Giá vốn' })).not.toBeInTheDocument();
  });
});
