import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FinanceCategoriesPage from './page';
import * as api from '@/lib/api';
import { TransactionType } from '@xfarm/shared';

describe('Finance Categories Tree & Lock System Category', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockCategories = [
    {
      id: 'cat-sys-sales',
      name: 'Doanh thu bán hàng',
      type: TransactionType.INCOME,
      parentId: null,
      isActive: true,
      systemKey: 'SALES',
      children: [],
    },
    {
      id: 'cat-sys-po',
      name: 'Chi phí mua hàng',
      type: TransactionType.EXPENSE,
      parentId: null,
      isActive: true,
      systemKey: 'PURCHASE',
      children: [],
    },
    {
      id: 'cat-custom-tree',
      name: 'Chi phí vật tư',
      type: TransactionType.EXPENSE,
      parentId: null,
      isActive: true,
      systemKey: null,
      children: [
        {
          id: 'cat-child-1',
          name: 'Phân bón lá',
          type: TransactionType.EXPENSE,
          parentId: 'cat-custom-tree',
          isActive: true,
          systemKey: null,
          children: [],
        },
      ],
    },
  ];

  it('hiển thị cây danh mục và huy hiệu Hệ thống cho danh mục hệ thống', async () => {
    vi.spyOn(api, 'apiFetch').mockResolvedValueOnce({ data: mockCategories });

    render(<FinanceCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Doanh thu bán hàng')).toBeDefined();
      expect(screen.getByText('Chi phí mua hàng')).toBeDefined();
      expect(screen.getByText('Chi phí vật tư')).toBeDefined();
      expect(screen.getByText('Phân bón lá')).toBeDefined();
    });

    // Danh mục hệ thống hiển thị badge 'Hệ thống'
    const systemBadges = screen.getAllByText('Hệ thống');
    expect(systemBadges.length).toBe(2);
  });

  it('khóa nút xóa đối với danh mục hệ thống và danh mục có con', async () => {
    vi.spyOn(api, 'apiFetch').mockResolvedValueOnce({ data: mockCategories });

    render(<FinanceCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Doanh thu bán hàng')).toBeDefined();
    });

    const disabledSysBtn = screen.getAllByRole('button', {
      name: 'Không thể xóa danh mục hệ thống',
    });
    expect(disabledSysBtn.length).toBeGreaterThan(0);
    expect(disabledSysBtn[0].hasAttribute('disabled')).toBe(true);
  });

  it('mở form tạo danh mục mới và gửi request POST', async () => {
    const fetchSpy = vi
      .spyOn(api, 'apiFetch')
      .mockResolvedValueOnce({ data: mockCategories })
      .mockResolvedValueOnce({ data: { id: 'new-cat', name: 'Chi phí điện nước' } })
      .mockResolvedValueOnce({ data: mockCategories });

    render(<FinanceCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Doanh thu bán hàng')).toBeDefined();
    });

    const addBtn = screen.getByRole('button', { name: /thêm danh mục/i });
    fireEvent.click(addBtn);

    expect(screen.getByText('Thêm danh mục mới')).toBeDefined();

    const nameInput = screen.getByPlaceholderText(/VD: Chi phí phân bón/i);
    fireEvent.change(nameInput, { target: { value: 'Chi phí điện nước' } });

    const submitBtn = screen.getByRole('button', { name: /tạo mới/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/finance-categories',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });
});
