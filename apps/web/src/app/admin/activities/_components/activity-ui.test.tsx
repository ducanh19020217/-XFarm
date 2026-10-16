import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { ActivityType, CycleStatus } from '@xfarm/shared';
import { ActivityForm } from './activity-form';
import { activitySummary, canCreateActivity, canRecordActivity } from './constants';

describe('activity UI', () => {
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
});
