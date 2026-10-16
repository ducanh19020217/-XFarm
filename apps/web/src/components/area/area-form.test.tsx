import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AreaFormDialog } from './area-form-dialog';
import { AreaType } from '@xfarm/shared';
import { AreaItem } from '@/lib/area-constants';

describe('AreaFormDialog Component', () => {
  const mockParentOptions = [
    { id: 'p1', name: 'Khu A Trồng Trọt', code: 'AR-0001' },
    { id: 'p2', name: 'Khu B Chăn Nuôi', code: 'AR-0002' },
  ];

  it('hiển thị lỗi validate khi để trống tên khu/lô', async () => {
    const handleSubmit = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <AreaFormDialog
        open={true}
        onOpenChange={handleOpenChange}
        parentOptions={mockParentOptions}
        onSubmit={handleSubmit}
      />,
    );

    expect(screen.getByText('Thêm Khu/lô mới')).toBeDefined();

    // Nhấn nút submit mà không nhập tên
    const submitBtn = screen.getByRole('button', { name: 'Tạo mới' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Tên khu/lô không được để trống')).toBeDefined();
    });

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('hiển thị lỗi validate khi nhập diện tích <= 0', async () => {
    const handleSubmit = vi.fn();

    render(
      <AreaFormDialog
        open={true}
        onOpenChange={vi.fn()}
        parentOptions={mockParentOptions}
        onSubmit={handleSubmit}
      />,
    );

    const nameInput = screen.getByLabelText(/Tên khu\/lô/i);
    const m2Input = screen.getByLabelText(/Diện tích/i);

    fireEvent.change(nameInput, { target: { value: 'Lô thử nghiệm' } });
    fireEvent.change(m2Input, { target: { value: '-10' } });

    const submitBtn = screen.getByRole('button', { name: 'Tạo mới' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Diện tích phải lớn hơn 0')).toBeDefined();
    });

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('submit thành công với dữ liệu hợp lệ', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <AreaFormDialog
        open={true}
        onOpenChange={vi.fn()}
        parentOptions={mockParentOptions}
        onSubmit={handleSubmit}
      />,
    );

    const codeInput = screen.getByLabelText(/Mã khu\/lô/i);
    const nameInput = screen.getByLabelText(/Tên khu\/lô/i);
    const m2Input = screen.getByLabelText(/Diện tích/i);
    const descInput = screen.getByLabelText(/Mô tả \/ Ghi chú/i);

    fireEvent.change(codeInput, { target: { value: 'AR-9999' } });
    fireEvent.change(nameInput, { target: { value: 'Lô rau sạch số 1' } });
    fireEvent.change(m2Input, { target: { value: '1250.5' } });
    fireEvent.change(descInput, { target: { value: 'Đất phù sa màu mỡ' } });

    const submitBtn = screen.getByRole('button', { name: 'Tạo mới' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'AR-9999',
        name: 'Lô rau sạch số 1',
        areaM2: 1250.5,
        description: 'Đất phù sa màu mỡ',
        type: AreaType.FIELD,
        isActive: true,
      }),
    );
  });

  it('điền sẵn dữ liệu khi ở chế độ chỉnh sửa khu/lô', () => {
    const existingArea: AreaItem = {
      id: 'area-123',
      code: 'AR-0004',
      name: 'Chuồng gà 1',
      type: AreaType.BARN,
      parentId: 'p2',
      areaM2: 800,
      geojson: null,
      description: 'Đệm lót sinh học',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    render(
      <AreaFormDialog
        open={true}
        onOpenChange={vi.fn()}
        area={existingArea}
        parentOptions={mockParentOptions}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText('Chỉnh sửa thông tin Khu/lô')).toBeDefined();
    expect(screen.getByDisplayValue('AR-0004')).toBeDefined();
    expect(screen.getByDisplayValue('Chuồng gà 1')).toBeDefined();
    expect(screen.getByDisplayValue('800')).toBeDefined();
    expect(screen.getByDisplayValue('Đệm lót sinh học')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Cập nhật' })).toBeDefined();
  });

  it('hiển thị thông báo lỗi từ server khi có formError', () => {
    render(
      <AreaFormDialog
        open={true}
        onOpenChange={vi.fn()}
        parentOptions={mockParentOptions}
        onSubmit={vi.fn()}
        formError="Mã khu AR-0001 đã tồn tại trong hệ thống"
      />,
    );

    expect(screen.getByText('Mã khu AR-0001 đã tồn tại trong hệ thống')).toBeDefined();
  });
});
