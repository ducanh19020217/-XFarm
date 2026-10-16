import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PurchaseOrderStatus } from '@xfarm/shared';
import { StatusBadge } from '@xfarm/ui';
import {
  canCreatePO,
  canOrderPO,
  canCancelPO,
  canReceivePO,
  formatCurrency,
  formatDate,
} from './_components/constants';
import { POActions } from './_components/po-actions';
import { POForm, type POFormSubmitData } from './_components/po-form';
import { POReceiveDialog, type ReceiveSubmitPayload } from './_components/po-receive-dialog';
import { POInfoCard } from './_components/po-info-card';
import { POLinesTable } from './_components/po-lines-table';
import type {
  PurchaseOrderDetail,
  SupplierOption,
  ItemOption,
  WarehouseOption,
} from './_components/types';

describe('Purchase Orders Unit & Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockSupplier: SupplierOption = {
    id: 'sup-1',
    code: 'NCC-001',
    name: 'Công ty Giống & Phân bón An Phát',
    phone: '0901234567',
    address: '123 Đường Nông Nghiệp, Hà Nội',
    taxCode: '0101234567',
  };

  const mockItems: ItemOption[] = [
    { id: 'item-1', sku: 'PB-NPK-01', name: 'Phân NPK 16-16-8', unit: 'Bao 50kg' },
    { id: 'item-2', sku: 'G-LUA-01', name: 'Lúa giống ST25', unit: 'kg' },
  ];

  const mockWarehouses: WarehouseOption[] = [
    { id: 'wh-1', code: 'KHO-VT', name: 'Kho Vật tư Chính' },
    { id: 'wh-2', code: 'KHO-NS', name: 'Kho Nông sản' },
  ];

  const mockPO: PurchaseOrderDetail = {
    id: 'po-1',
    code: 'PO-2026-0001',
    supplierId: 'sup-1',
    supplier: mockSupplier,
    status: PurchaseOrderStatus.DRAFT,
    orderDate: '2026-04-10T00:00:00.000Z',
    total: 1500000,
    notes: 'Giao hàng giờ hành chính',
    lines: [
      {
        id: 'line-1',
        poId: 'po-1',
        itemId: 'item-1',
        item: mockItems[0],
        quantity: 10,
        unitPrice: 100000,
        receivedQty: 0,
      },
      {
        id: 'line-2',
        poId: 'po-1',
        itemId: 'item-2',
        item: mockItems[1],
        quantity: 50,
        unitPrice: 10000,
        receivedQty: 0,
      },
    ],
  };

  describe('1. Phân quyền theo vai trò (Role Permissions)', () => {
    it('canCreatePO: OWNER, MANAGER, ACCOUNTANT có quyền tạo PO; SALES, WORKER thì không', () => {
      expect(canCreatePO('OWNER')).toBe(true);
      expect(canCreatePO('MANAGER')).toBe(true);
      expect(canCreatePO('ACCOUNTANT')).toBe(true);
      expect(canCreatePO('SALES')).toBe(false);
      expect(canCreatePO('WORKER')).toBe(false);
      expect(canCreatePO(null)).toBe(false);
      expect(canCreatePO(undefined)).toBe(false);
    });

    it('canOrderPO: OWNER, MANAGER, ACCOUNTANT có quyền đặt hàng; SALES, WORKER thì không', () => {
      expect(canOrderPO('OWNER')).toBe(true);
      expect(canOrderPO('MANAGER')).toBe(true);
      expect(canOrderPO('ACCOUNTANT')).toBe(true);
      expect(canOrderPO('SALES')).toBe(false);
      expect(canOrderPO('WORKER')).toBe(false);
    });

    it('canCancelPO: OWNER, MANAGER, ACCOUNTANT có quyền hủy đơn; SALES, WORKER thì không', () => {
      expect(canCancelPO('OWNER')).toBe(true);
      expect(canCancelPO('MANAGER')).toBe(true);
      expect(canCancelPO('ACCOUNTANT')).toBe(true);
      expect(canCancelPO('SALES')).toBe(false);
      expect(canCancelPO('WORKER')).toBe(false);
    });

    it('canReceivePO: CHỈ OWNER và MANAGER có quyền nhận hàng; ACCOUNTANT, SALES, WORKER thì không', () => {
      expect(canReceivePO('OWNER')).toBe(true);
      expect(canReceivePO('MANAGER')).toBe(true);
      expect(canReceivePO('ACCOUNTANT')).toBe(false);
      expect(canReceivePO('SALES')).toBe(false);
      expect(canReceivePO('WORKER')).toBe(false);
      expect(canReceivePO(null)).toBe(false);
    });
  });

  describe('2. Hiển thị StatusBadge', () => {
    it('Hiển thị đúng nhãn tiếng Việt cho từng trạng thái PO', () => {
      const { unmount: u1 } = render(<StatusBadge status={PurchaseOrderStatus.DRAFT} />);
      expect(screen.getByText('Nháp')).toBeDefined();
      u1();

      const { unmount: u2 } = render(<StatusBadge status={PurchaseOrderStatus.ORDERED} />);
      expect(screen.getByText('Đã đặt')).toBeDefined();
      u2();

      const { unmount: u3 } = render(<StatusBadge status={PurchaseOrderStatus.PARTIAL} />);
      expect(screen.getByText('Nhận một phần')).toBeDefined();
      u3();

      const { unmount: u4 } = render(<StatusBadge status={PurchaseOrderStatus.RECEIVED} />);
      expect(screen.getByText('Đã nhận đủ')).toBeDefined();
      u4();

      const { unmount: u5 } = render(<StatusBadge status={PurchaseOrderStatus.CANCELLED} />);
      expect(screen.getByText('Đã hủy')).toBeDefined();
      u5();
    });
  });

  describe('3. Định dạng và tính toán (Helpers & Calculations)', () => {
    it('formatCurrency định dạng tiền VND chính xác', () => {
      expect(formatCurrency(0)).toContain('0');
      expect(formatCurrency(1500000)).toContain('1.500.000');
      expect(formatCurrency(null)).toContain('0');
    });

    it('formatDate chuyển đổi ISO sang dd/mm/yyyy', () => {
      expect(formatDate('2026-04-10T00:00:00.000Z')).toBe('10/04/2026');
      expect(formatDate(null)).toBe('-');
    });
  });

  describe('4. Bảng thông tin PO và dòng hàng (POInfoCard & POLinesTable)', () => {
    it('POInfoCard hiển thị đầy đủ mã PO, nhà cung cấp, tổng tiền và ghi chú', () => {
      render(<POInfoCard po={mockPO} />);
      expect(screen.getByText('PO-2026-0001')).toBeDefined();
      expect(screen.getByText('Công ty Giống & Phân bón An Phát')).toBeDefined();
      expect(screen.getByText('Giao hàng giờ hành chính')).toBeDefined();
      expect(screen.getByText(/1.500.000/)).toBeDefined();
    });

    it('POLinesTable tính đúng số lượng còn lại và thành tiền từng dòng', () => {
      const partialPO: PurchaseOrderDetail = {
        ...mockPO,
        lines: [
          {
            id: 'line-1',
            poId: 'po-1',
            itemId: 'item-1',
            item: mockItems[0],
            quantity: 10,
            unitPrice: 100000,
            receivedQty: 4, // Đã nhận 4, còn lại 6
          },
        ],
      };
      render(<POLinesTable lines={partialPO.lines} />);
      expect(screen.getByText('Phân NPK 16-16-8')).toBeDefined();
      expect(screen.getByText('10')).toBeDefined(); // Đã đặt
      expect(screen.getByText('4')).toBeDefined(); // Đã nhận
      expect(screen.getAllByText(/1.000.000/).length).toBeGreaterThanOrEqual(1); // Thành tiền và tổng tiền
    });
  });

  describe('5. Nút thao tác theo trạng thái và vai trò (POActions)', () => {
    it('Trạng thái DRAFT: OWNER/MANAGER/ACCOUNTANT thấy Đặt hàng và Hủy', () => {
      const onOrder = vi.fn();
      const onCancel = vi.fn();
      const onReceive = vi.fn();

      render(
        <POActions
          status={PurchaseOrderStatus.DRAFT}
          role="OWNER"
          onOrder={onOrder}
          onCancel={onCancel}
          onReceive={onReceive}
        />,
      );

      expect(screen.getByRole('button', { name: /đặt hàng/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /hủy/i })).toBeDefined();
      expect(screen.queryByRole('button', { name: /nhận hàng/i })).toBeNull();
    });

    it('Trạng thái ORDERED: OWNER thấy Nhận hàng và Hủy', () => {
      const onOrder = vi.fn();
      const onCancel = vi.fn();
      const onReceive = vi.fn();

      render(
        <POActions
          status={PurchaseOrderStatus.ORDERED}
          role="OWNER"
          onOrder={onOrder}
          onCancel={onCancel}
          onReceive={onReceive}
        />,
      );

      expect(screen.getByRole('button', { name: /nhận hàng/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /hủy/i })).toBeDefined();
      expect(screen.queryByRole('button', { name: /đặt hàng/i })).toBeNull();
    });

    it('Trạng thái ORDERED: ACCOUNTANT thấy Hủy nhưng KHÔNG thấy Nhận hàng', () => {
      render(
        <POActions
          status={PurchaseOrderStatus.ORDERED}
          role="ACCOUNTANT"
          onOrder={vi.fn()}
          onCancel={vi.fn()}
          onReceive={vi.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: /hủy/i })).toBeDefined();
      expect(screen.queryByRole('button', { name: /nhận hàng/i })).toBeNull();
    });

    it('Trạng thái PARTIAL: OWNER thấy Nhận hàng', () => {
      render(
        <POActions
          status={PurchaseOrderStatus.PARTIAL}
          role="OWNER"
          onOrder={vi.fn()}
          onCancel={vi.fn()}
          onReceive={vi.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: /nhận hàng/i })).toBeDefined();
      expect(screen.queryByRole('button', { name: /đặt hàng/i })).toBeNull();
    });

    it('Trạng thái RECEIVED và CANCELLED: không hiển thị nút nào', () => {
      const { container: c1 } = render(
        <POActions
          status={PurchaseOrderStatus.RECEIVED}
          role="OWNER"
          onOrder={vi.fn()}
          onCancel={vi.fn()}
          onReceive={vi.fn()}
        />,
      );
      expect(c1.innerHTML).toBe('');

      const { container: c2 } = render(
        <POActions
          status={PurchaseOrderStatus.CANCELLED}
          role="OWNER"
          onOrder={vi.fn()}
          onCancel={vi.fn()}
          onReceive={vi.fn()}
        />,
      );
      expect(c2.innerHTML).toBe('');
    });

    it('Vai trò WORKER hoặc SALES: không thấy nút thao tác nào', () => {
      const { container } = render(
        <POActions
          status={PurchaseOrderStatus.DRAFT}
          role="WORKER"
          onOrder={vi.fn()}
          onCancel={vi.fn()}
          onReceive={vi.fn()}
        />,
      );
      expect(container.innerHTML).toBe('');
    });
  });

  describe('6. Form tạo đơn mua hàng (POForm)', () => {
    it('Báo lỗi validate khi thiếu nhà cung cấp hoặc dòng hàng không hợp lệ', async () => {
      const onSubmit = vi.fn();
      render(<POForm suppliers={[mockSupplier]} items={mockItems} onSubmit={onSubmit} />);

      const submitBtn = screen.getByRole('button', { name: /tạo đơn mua hàng/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Vui lòng chọn nhà cung cấp')).toBeDefined();
        expect(screen.getByText('Vui lòng chọn vật tư')).toBeDefined();
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('Thêm dòng mới và tự động tính tổng tiền', async () => {
      const onSubmit = vi.fn();
      render(<POForm suppliers={[mockSupplier]} items={mockItems} onSubmit={onSubmit} />);

      // Chọn nhà cung cấp
      fireEvent.change(screen.getByLabelText(/nhà cung cấp/i), {
        target: { value: 'sup-1' },
      });

      // Dòng 1: Chọn vật tư 1, số lượng 5, đơn giá 20000
      fireEvent.change(screen.getByLabelText('Vật tư dòng 1'), {
        target: { value: 'item-1' },
      });
      fireEvent.change(screen.getByLabelText('Số lượng dòng 1'), {
        target: { value: '5' },
      });
      fireEvent.change(screen.getByLabelText('Đơn giá dòng 1'), {
        target: { value: '20000' },
      });

      // Bấm thêm dòng
      fireEvent.click(screen.getByRole('button', { name: /thêm dòng/i }));

      // Dòng 2: Chọn vật tư 2, số lượng 10, đơn giá 15000
      fireEvent.change(screen.getByLabelText('Vật tư dòng 2'), {
        target: { value: 'item-2' },
      });
      fireEvent.change(screen.getByLabelText('Số lượng dòng 2'), {
        target: { value: '10' },
      });
      fireEvent.change(screen.getByLabelText('Đơn giá dòng 2'), {
        target: { value: '15000' },
      });

      // Tổng = (5 * 20000) + (10 * 15000) = 100000 + 150000 = 250000
      expect(screen.getByText(/250.000/)).toBeDefined();

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /tạo đơn mua hàng/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData: POFormSubmitData = onSubmit.mock.calls[0][0];
      expect(submittedData.supplierId).toBe('sup-1');
      expect(submittedData.lines).toHaveLength(2);
      expect(submittedData.lines[0]).toEqual({
        itemId: 'item-1',
        quantity: 5,
        unitPrice: 20000,
      });
      expect(submittedData.lines[1]).toEqual({
        itemId: 'item-2',
        quantity: 10,
        unitPrice: 15000,
      });
    });
  });

  describe('7. Form nhận hàng (POReceiveDialog)', () => {
    it('Mặc định số lượng nhận bằng phần còn lại và báo lỗi khi nhận vượt', async () => {
      const onSubmit = vi.fn();
      const poWithRemaining: PurchaseOrderDetail = {
        ...mockPO,
        status: PurchaseOrderStatus.ORDERED,
        lines: [
          {
            id: 'line-1',
            poId: 'po-1',
            itemId: 'item-1',
            item: mockItems[0],
            quantity: 10,
            unitPrice: 100000,
            receivedQty: 3, // còn lại 7
          },
        ],
      };

      render(
        <POReceiveDialog
          open={true}
          onOpenChange={vi.fn()}
          purchaseOrder={poWithRemaining}
          warehouses={mockWarehouses}
          onSubmit={onSubmit}
        />,
      );

      // Kiểm tra input mặc định = 7
      const qtyInput = screen.getByLabelText(/số nhận dòng/i) as HTMLInputElement;
      expect(qtyInput.value).toBe('7');

      // Nhập vượt: 8 > 7
      fireEvent.change(qtyInput, { target: { value: '8' } });
      fireEvent.click(screen.getByRole('button', { name: /xác nhận nhận hàng/i }));

      await waitFor(() => {
        expect(
          screen.getByText('Số lượng nhận không được vượt quá số lượng còn lại (7)'),
        ).toBeDefined();
      });
      expect(onSubmit).not.toHaveBeenCalled();

      // Sửa lại hợp lệ: 4 (nhận một phần)
      fireEvent.change(qtyInput, { target: { value: '4' } });
      fireEvent.click(screen.getByRole('button', { name: /xác nhận nhận hàng/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      const payload: ReceiveSubmitPayload = onSubmit.mock.calls[0][0];
      expect(payload.warehouseId).toBe('wh-1');
      expect(payload.lines).toHaveLength(1);
      expect(payload.lines[0].lineId).toBe('line-1');
      expect(payload.lines[0].quantity).toBe(4);
    });
  });
});
