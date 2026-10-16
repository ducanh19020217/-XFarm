import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { CycleForm } from './cycle-form';

describe('CycleForm', () => {
  it('switches fields based on kind', async () => {
    const user = userEvent.setup();
    render(
      <CycleForm
        areas={[]}
        onSubmit={async () => undefined}
        isSubmitting={false}
        formError={null}
      />,
    );

    expect(screen.getByLabelText('Sản lượng dự kiến')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Loại mùa vụ *'), 'LIVESTOCK');
    expect(screen.getByLabelText('Số lượng thả ban đầu')).toBeInTheDocument();
    expect(screen.queryByLabelText('Sản lượng dự kiến')).not.toBeInTheDocument();
  });
});
