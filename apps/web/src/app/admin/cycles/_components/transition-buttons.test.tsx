import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { CycleStatus } from '@xfarm/shared';
import { describe, expect, it } from 'vitest';
import { TransitionButtons } from './transition-buttons';

describe('TransitionButtons', () => {
  it('shows only valid ACTIVE transitions', () => {
    render(<TransitionButtons status={CycleStatus.ACTIVE} canManage onSelect={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Bắt đầu thu hoạch' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hủy mùa vụ' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đóng mùa vụ' })).not.toBeInTheDocument();
  });

  it('shows no buttons for CLOSED', () => {
    render(<TransitionButtons status={CycleStatus.CLOSED} canManage onSelect={() => undefined} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('hides transitions for WORKER permissions', () => {
    render(
      <TransitionButtons
        status={CycleStatus.ACTIVE}
        canManage={false}
        onSelect={() => undefined}
      />,
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
