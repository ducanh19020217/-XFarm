import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MoneyInput } from './money-input';

describe('MoneyInput Component (vi-VN)', () => {
  it('định dạng số ban đầu theo chuẩn tiếng Việt vi-VN', () => {
    render(<MoneyInput value={150000} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('150.000');
  });

  it('tự động định dạng khi người dùng gõ số và gọi onChange với giá trị số nguyên', async () => {
    const handleChange = vi.fn();
    render(<MoneyInput value={0} onChange={handleChange} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    await userEvent.clear(input);
    await userEvent.type(input, '500000');

    expect(input.value).toBe('500.000');
    expect(handleChange).toHaveBeenLastCalledWith(500000);
  });

  it('xóa trắng ô nhập sẽ trả về 0', async () => {
    const handleChange = vi.fn();
    render(<MoneyInput value={200000} onChange={handleChange} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    await userEvent.clear(input);
    expect(input.value).toBe('');
    expect(handleChange).toHaveBeenCalledWith(0);
  });

  it('hiển thị hậu tố đơn vị tiền tệ việt nam (₫)', () => {
    render(<MoneyInput value={50000} suffix="₫" />);
    expect(screen.getByText('₫')).toBeInTheDocument();
  });
});
