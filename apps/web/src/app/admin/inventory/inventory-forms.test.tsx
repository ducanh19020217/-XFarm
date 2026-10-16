import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ItemCategory } from '@xfarm/shared';
import { ItemFormDialog } from './items/item-form-dialog';
import { WarehouseFormDialog } from './warehouses/warehouse-form-dialog';
import { SupplierFormDialog } from './suppliers/supplier-form-dialog';
import ItemsPage from './items/page';
import WarehousesPage from './warehouses/page';
import SuppliersPage from './suppliers/page';
import { AdminUserProvider, type AdminUser } from '../admin-user-context';
import { apiFetch } from '@/lib/api';

// Mock apiFetch
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      public statusCode = 400,
      public message: string = '',
      public errors?: unknown,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

describe('Inventory Catalog Form Dialogs & RBAC', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.mocked(apiFetch).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
    } as never);
  });

  afterEach(() => {
    cleanup();
  });

  describe('ItemFormDialog', () => {
    it('trường tùy chọn trống (sku, minStock) vẫn lưu được và chuẩn hóa thành undefined', async () => {
      const handleSubmit = vi.fn().mockResolvedValue(undefined);
      const handleOpenChange = vi.fn();

      render(
        <ItemFormDialog
          open={true}
          onOpenChange={handleOpenChange}
          onSubmit={handleSubmit}
          isLoading={false}
        />,
      );

      expect(screen.getByText('Thêm vật tư mới')).toBeDefined();

      // Để trống SKU và minStock, chỉ điền trường bắt buộc
      const nameInput = screen.getByLabelText(/Tên vật tư/i);
      const unitInput = screen.getByLabelText(/Đơn vị tính/i);

      fireEvent.change(nameInput, { target: { value: 'Phân vi sinh hữu cơ' } });
      fireEvent.change(unitInput, { target: { value: 'bao 25kg' } });

      const submitBtn = screen.getByRole('button', { name: 'Tạo mới' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledTimes(1);
      });

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Phân vi sinh hữu cơ',
          unit: 'bao 25kg',
          category: ItemCategory.FERTILIZER,
          sku: undefined,
          minStock: undefined,
          isSellable: false,
          isActive: true,
        }),
      );
    });

    it('hiển thị lỗi validate dưới từng ô khi để trống trường bắt buộc', async () => {
      const handleSubmit = vi.fn();

      render(
        <ItemFormDialog
          open={true}
          onOpenChange={vi.fn()}
          onSubmit={handleSubmit}
          isLoading={false}
        />,
      );

      const submitBtn = screen.getByRole('button', { name: 'Tạo mới' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Tên vật tư không được để trống')).toBeDefined();
        expect(screen.getByText('Đơn vị tính không được để trống')).toBeDefined();
      });

      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('hiển thị lỗi khi nhập minStock âm', async () => {
      const handleSubmit = vi.fn();

      render(
        <ItemFormDialog
          open={true}
          onOpenChange={vi.fn()}
          onSubmit={handleSubmit}
          isLoading={false}
        />,
      );

      const nameInput = screen.getByLabelText(/Tên vật tư/i);
      const unitInput = screen.getByLabelText(/Đơn vị tính/i);
      const minStockInput = screen.getByLabelText(/Tồn tối thiểu/i);

      fireEvent.change(nameInput, { target: { value: 'Hạt giống bắp' } });
      fireEvent.change(unitInput, { target: { value: 'gói' } });
      fireEvent.change(minStockInput, { target: { value: '-5' } });

      const submitBtn = screen.getByRole('button', { name: 'Tạo mới' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Tồn tối thiểu không được âm')).toBeDefined();
      });

      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });

  describe('WarehouseFormDialog', () => {
    it('trường tùy chọn trống (code, areaId) vẫn lưu được', async () => {
      const handleSubmit = vi.fn().mockResolvedValue(undefined);

      render(
        <WarehouseFormDialog
          open={true}
          onOpenChange={vi.fn()}
          onSubmit={handleSubmit}
          isLoading={false}
        />,
      );

      const nameInput = screen.getByLabelText(/Tên kho hàng/i);
      fireEvent.change(nameInput, { target: { value: 'Kho lạnh bảo quản' } });

      const submitBtn = screen.getByRole('button', { name: 'Tạo mới' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledTimes(1);
      });

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Kho lạnh bảo quản',
          code: undefined,
          areaId: undefined,
        }),
      );
    });
  });

  describe('SupplierFormDialog', () => {
    it('trường tùy chọn trống (code, phone, address, taxCode) vẫn lưu được', async () => {
      const handleSubmit = vi.fn().mockResolvedValue(undefined);

      render(
        <SupplierFormDialog
          open={true}
          onOpenChange={vi.fn()}
          onSubmit={handleSubmit}
          isLoading={false}
        />,
      );

      const nameInput = screen.getByLabelText(/Tên nhà cung cấp/i);
      fireEvent.change(nameInput, { target: { value: 'Công ty Giống Cây Trồng Miền Nam' } });

      const submitBtn = screen.getByRole('button', { name: 'Tạo mới' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledTimes(1);
      });

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Công ty Giống Cây Trồng Miền Nam',
          code: undefined,
          phone: undefined,
          address: undefined,
          taxCode: undefined,
        }),
      );
    });
  });

  describe('RBAC UI Check', () => {
    it('WORKER không thấy nút Thêm vật tư trên ItemsPage', async () => {
      const workerUser: AdminUser = {
        id: 'u-worker',
        email: 'worker@xfarm.local',
        fullName: 'Nguyễn Văn Công Nhân',
        role: 'WORKER',
      };

      render(
        <AdminUserProvider user={workerUser}>
          <ItemsPage />
        </AdminUserProvider>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).toBeNull();
      });

      expect(screen.queryByRole('button', { name: /Thêm vật tư/i })).toBeNull();
    });

    it('MANAGER thấy nút Thêm vật tư trên ItemsPage', async () => {
      const managerUser: AdminUser = {
        id: 'u-mgr',
        email: 'manager@xfarm.local',
        fullName: 'Trần Quản Lý',
        role: 'MANAGER',
      };

      render(
        <AdminUserProvider user={managerUser}>
          <ItemsPage />
        </AdminUserProvider>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).toBeNull();
      });

      expect(screen.getByRole('button', { name: /Thêm vật tư/i })).toBeDefined();
    });

    it('ACCOUNTANT thấy nút Thêm nhà cung cấp trên SuppliersPage nhưng KHÔNG thấy nút Thêm kho trên WarehousesPage', async () => {
      const accountantUser: AdminUser = {
        id: 'u-acc',
        email: 'accountant@xfarm.local',
        fullName: 'Lê Kế Toán',
        role: 'ACCOUNTANT',
      };

      const { unmount } = render(
        <AdminUserProvider user={accountantUser}>
          <SuppliersPage />
        </AdminUserProvider>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).toBeNull();
      });
      expect(screen.getByRole('button', { name: /Thêm nhà cung cấp/i })).toBeDefined();
      unmount();

      render(
        <AdminUserProvider user={accountantUser}>
          <WarehousesPage />
        </AdminUserProvider>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).toBeNull();
      });

      expect(screen.queryByRole('button', { name: /Thêm kho/i })).toBeNull();
    });
  });

  describe('Soft Lock & Deletion with ConfirmDialog', () => {
    it('WarehousesPage: hiển thị ConfirmDialog khi bấm khóa kho và gửi PATCH isActive', async () => {
      const managerUser: AdminUser = {
        id: 'u-mgr',
        email: 'manager@xfarm.local',
        fullName: 'Trần Quản Lý',
        role: 'MANAGER',
      };

      vi.mocked(apiFetch).mockResolvedValueOnce({
        data: [
          {
            id: 'wh-1',
            code: 'WH-0001',
            name: 'Kho phân bón 1',
            isActive: true,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      } as never);

      render(
        <AdminUserProvider user={managerUser}>
          <WarehousesPage />
        </AdminUserProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Kho phân bón 1')).toBeDefined();
      });

      // Bấm nút khóa
      const lockBtn = screen.getByTitle('Khóa kho hàng');
      fireEvent.click(lockBtn);

      // ConfirmDialog mở ra
      expect(screen.getByText('Xác nhận khóa kho hàng')).toBeDefined();
      expect(
        screen.getByText(/Bạn có chắc chắn muốn khóa kho hàng "Kho phân bón 1"/),
      ).toBeDefined();

      // Bấm nút xác nhận trong dialog
      vi.mocked(apiFetch).mockResolvedValueOnce({} as never); // PATCH response
      vi.mocked(apiFetch).mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
      } as never); // refetch

      const confirmBtn = screen.getByRole('button', { name: 'Khóa kho' });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledWith(
          '/warehouses/wh-1',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ isActive: false }),
          }),
        );
      });
    });

    it('WarehousesPage: xử lý lỗi 422 khi xóa kho đã phát sinh giao dịch', async () => {
      const managerUser: AdminUser = {
        id: 'u-mgr',
        email: 'manager@xfarm.local',
        fullName: 'Trần Quản Lý',
        role: 'MANAGER',
      };

      vi.mocked(apiFetch).mockResolvedValueOnce({
        data: [
          {
            id: 'wh-2',
            code: 'WH-0002',
            name: 'Kho đã có tồn kho',
            isActive: true,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      } as never);

      render(
        <AdminUserProvider user={managerUser}>
          <WarehousesPage />
        </AdminUserProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Kho đã có tồn kho')).toBeDefined();
      });

      // Bấm nút xóa
      const deleteBtn = screen.getByTitle('Xóa kho hàng');
      fireEvent.click(deleteBtn);

      expect(screen.getByText('Xác nhận xóa kho hàng')).toBeDefined();

      // Mock DELETE trả về lỗi 422
      const { ApiError } = await import('@/lib/api');
      vi.mocked(apiFetch).mockRejectedValueOnce(
        new ApiError(422, 'Không thể xóa kho đã phát sinh giao dịch'),
      );

      const confirmDeleteBtn = screen.getByRole('button', { name: 'Xóa kho hàng' });
      fireEvent.click(confirmDeleteBtn);

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledWith(
          '/warehouses/wh-2',
          expect.objectContaining({ method: 'DELETE' }),
        );
        expect(screen.getByText('Không thể xóa kho đã phát sinh giao dịch')).toBeDefined();
      });
    });

    it('SuppliersPage: hiển thị ConfirmDialog khi bấm khóa và xóa nhà cung cấp', async () => {
      const ownerUser: AdminUser = {
        id: 'u-owner',
        email: 'owner@xfarm.local',
        fullName: 'Chủ Trang Trại',
        role: 'OWNER',
      };

      vi.mocked(apiFetch).mockResolvedValueOnce({
        data: [
          {
            id: 'sup-1',
            code: 'SUP-0001',
            name: 'NCC Vật tư Miền Tây',
            isActive: true,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      } as never);

      render(
        <AdminUserProvider user={ownerUser}>
          <SuppliersPage />
        </AdminUserProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('NCC Vật tư Miền Tây')).toBeDefined();
      });

      // Bấm nút khóa nhà cung cấp
      const lockBtn = screen.getByTitle('Khóa nhà cung cấp');
      fireEvent.click(lockBtn);

      expect(screen.getByText('Xác nhận khóa nhà cung cấp')).toBeDefined();

      vi.mocked(apiFetch).mockResolvedValueOnce({} as never); // PATCH response
      vi.mocked(apiFetch).mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
      } as never); // refetch

      const confirmBtn = screen.getByRole('button', { name: 'Khóa nhà cung cấp' });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledWith(
          '/suppliers/sup-1',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ isActive: false }),
          }),
        );
      });
    });
  });
});
