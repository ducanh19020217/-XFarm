import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { CycleCreateButton } from './cycle-create-button';
import { describe, expect, it } from 'vitest';

describe('CycleCreateButton', () => {
  it('does not render for WORKER permissions', () => {
    render(<CycleCreateButton canManage={false} onClick={() => undefined} />);
    expect(screen.queryByRole('button', { name: 'Thêm mùa vụ' })).not.toBeInTheDocument();
  });
});
