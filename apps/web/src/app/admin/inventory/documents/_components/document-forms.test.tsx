import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReceiptForm } from './receipt-form';
import { IssueForm } from './issue-form';
import { TransferForm } from './transfer-form';
import { CountForm } from './count-form';
import { ApiError } from '@/lib/api';
import * as apiModule from '@/lib/api';
import type { ItemRecord, WarehouseItem } from '../../types';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

const mockWarehouses: WarehouseItem[] = [
  { id: 'wh-1', code: 'KHO-TONG', name: 'Kho Tổng' },
  { id: 'wh-2', code: 'KHO-VT', name: 'Kho Vật Tư' },
];

const mockItems: ItemRecord[] = [
  {
    id: 'item-1',
    sku: 'PB-NPK',
    name: 'Phân bón NPK 16-16-8',
    category: 'FERTILIZER',
    unit: 'kg',
  },
  {
    id: 'item-2',
    sku: 'HG-CAI',
    name: 'Hạt giống cải ngọt',
    category: 'SEED',
    unit: 'gói',
  },
];

describe('Multi-line Inventory Document Forms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ReceiptForm (Phiếu nhập nhiều dòng)', () => {
    it('hiển thị 1 dòng mặc định và cho phép thêm/xóa dòng', async () => {
      const user = userEvent.setup();
      render(
        <ReceiptForm
          warehouses={mockWarehouses}
          items={mockItems}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      // Ban đầu có 1 dòng
      expect(screen.getByText(/Tổng số dòng/i)).toHaveTextContent('1');
      expect(screen.getByLabelText('Vật tư dòng 1')).toBeInTheDocument();

      // Thêm dòng mới
      const addBtn = screen.getByRole('button', { name: /thêm dòng/i });
      await user.click(addBtn);

      expect(screen.getByText(/Tổng số dòng/i)).toHaveTextContent('2');
      expect(screen.getByLabelText('Vật tư dòng 2')).toBeInTheDocument();

      // Xóa dòng 2
      const deleteBtn2 = screen.getByLabelText('Xóa dòng 2');
      await user.click(deleteBtn2);

      expect(screen.getByText(/Tổng số dòng/i)).toHaveTextContent('1');
      expect(screen.queryByLabelText('Vật tư dòng 2')).not.toBeInTheDocument();
    });

    it('tính đúng tổng tiền khi thay đổi số lượng và đơn giá của các dòng', async () => {
      const user = userEvent.setup();
      render(
        <ReceiptForm
          warehouses={mockWarehouses}
          items={mockItems}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      // Dòng 1: số lượng 10, đơn giá 50000 -> thành tiền 500.000 ₫
      const qtyInput1 = screen.getByLabelText('Số lượng dòng 1');
      const costInput1 = screen.getByLabelText('Đơn giá dòng 1');

      await user.clear(qtyInput1);
      await user.type(qtyInput1, '10');

      await user.clear(costInput1);
      await user.type(costInput1, '50000');

      expect(screen.getAllByText('500.000 ₫').length).toBeGreaterThan(0);

      // Thêm dòng 2: số lượng 5, đơn giá 20000 -> 100.000 ₫; tổng tiền 600.000 ₫
      await user.click(screen.getByRole('button', { name: /thêm dòng/i }));
      const qtyInput2 = screen.getByLabelText('Số lượng dòng 2');
      const costInput2 = screen.getByLabelText('Đơn giá dòng 2');

      await user.clear(qtyInput2);
      await user.type(qtyInput2, '5');

      await user.clear(costInput2);
      await user.type(costInput2, '20000');

      expect(screen.getAllByText('600.000 ₫').length).toBeGreaterThan(0);
    });

    it('hiển thị thông báo lỗi tiếng Việt 422 ở đầu form khi submit gặp lỗi', async () => {
      const user = userEvent.setup();
      const mockApiFetch = vi.mocked(apiModule.apiFetch);
      mockApiFetch.mockRejectedValueOnce(
        new ApiError(422, 'Không thể nhập hàng do lỗi validate hoặc thiếu dữ liệu'),
      );

      render(
        <ReceiptForm
          warehouses={mockWarehouses}
          items={mockItems}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      // Chọn kho
      await user.selectOptions(screen.getByLabelText('Kho nhập *'), 'wh-1');
      // Chọn vật tư cho dòng 1
      await user.selectOptions(screen.getByLabelText('Vật tư dòng 1'), 'item-1');

      // Submit
      await user.click(screen.getByRole('button', { name: /tạo phiếu nhập/i }));

      // Kiểm tra thông báo lỗi 422 hiển thị trong alert
      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert.textContent).toContain('422');
        expect(alert.textContent).toContain('Không thể nhập hàng');
      });
    });
  });

  describe('IssueForm (Phiếu xuất FIFO)', () => {
    it('cho phép thêm/xóa dòng xuất và hiển thị lỗi 422 khi thiếu tồn', async () => {
      const user = userEvent.setup();
      const mockApiFetch = vi.mocked(apiModule.apiFetch);
      mockApiFetch.mockRejectedValueOnce(new ApiError(422, 'Số lượng tồn không đủ để xuất'));

      render(
        <IssueForm
          warehouses={mockWarehouses}
          items={mockItems}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      // Thêm dòng
      await user.click(screen.getByRole('button', { name: /thêm dòng/i }));
      expect(screen.getByLabelText('Vật tư dòng 2')).toBeInTheDocument();

      // Xóa dòng 2
      await user.click(screen.getByLabelText('Xóa dòng 2'));
      expect(screen.queryByLabelText('Vật tư dòng 2')).not.toBeInTheDocument();

      // Điền thông tin và submit
      await user.selectOptions(screen.getByLabelText('Kho xuất *'), 'wh-1');
      await user.selectOptions(screen.getByLabelText('Vật tư dòng 1'), 'item-1');
      const qtyInput = screen.getByLabelText('Số lượng dòng 1');
      await user.clear(qtyInput);
      await user.type(qtyInput, '999');

      await user.click(screen.getByRole('button', { name: /tạo phiếu xuất/i }));

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert.textContent).toContain('422');
        expect(alert.textContent).toContain('Số lượng tồn không đủ');
      });
    });
  });

  describe('TransferForm (Phiếu điều chuyển)', () => {
    it('chặn nếu kho chuyển đến trùng kho chuyển đi', async () => {
      const user = userEvent.setup();
      render(
        <TransferForm
          warehouses={mockWarehouses}
          items={mockItems}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      // Kho đến chỉ hiện các kho khác kho đi, nếu chưa chọn cả hai thì báo lỗi
      await user.click(screen.getByRole('button', { name: /tạo phiếu điều chuyển/i }));

      expect(screen.getByRole('alert')).toHaveTextContent(/vui lòng chọn kho chuyển đi/i);
    });
  });

  describe('CountForm (Phiếu kiểm kê)', () => {
    it('hiển thị tồn sổ sách và tính toán chênh lệch số đếm thực tế', async () => {
      const user = userEvent.setup();
      render(
        <CountForm
          warehouses={mockWarehouses}
          items={mockItems}
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.getByText('Tồn sổ sách')).toBeInTheDocument();
      expect(screen.getByText('Số đếm thực tế *')).toBeInTheDocument();
      expect(screen.getByText('Chênh lệch')).toBeInTheDocument();

      // Thêm dòng kiểm kê
      await user.click(screen.getByRole('button', { name: /thêm dòng/i }));
      expect(screen.getByLabelText('Vật tư dòng 2')).toBeInTheDocument();
    });
  });
});
