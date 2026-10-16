import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Role, slugify } from '@xfarm/shared';
import { AdminUserProvider } from '../admin-user-context';
import ProductsCmsPage from './products/page';
import PostsCmsPage from './posts/page';
import StaticPagesCmsPage from './pages/page';
import SettingsCmsPage from './settings/page';

// Mock apiFetch
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    statusCode: number;
    constructor(code: number, msg: string) {
      super(msg);
      this.statusCode = code;
    }
  },
  isAbortError: () => false,
}));

import { apiFetch } from '@/lib/api';

describe('CMS Admin Pages & Form Slugify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Slugify trong Form', () => {
    it('tạo slug chuẩn tiếng Việt từ chuỗi có dấu và khoảng trắng', () => {
      expect(slugify('Rau Cải Xoăn Kale Hữu Cơ')).toBe('rau-cai-xoan-kale-huu-co');
      expect(slugify('Đặc Sản Đồng Bằng Sông Cửu Long!')).toBe('dac-san-dong-bang-song-cuu-long');
    });

    it('tự động điền slug khi gõ tên sản phẩm nhưng vẫn cho phép sửa thủ công', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
      });

      const user = userEvent.setup();
      render(
        <AdminUserProvider
          user={{ id: '1', email: 'owner@xfarm.vn', fullName: 'Chủ Trại', role: Role.OWNER }}
        >
          <ProductsCmsPage />
        </AdminUserProvider>,
      );

      // Click "Thêm sản phẩm mới"
      const addBtn = screen.getByRole('button', { name: /Thêm sản phẩm mới/i });
      await user.click(addBtn);

      const nameInput = screen.getByLabelText(/Tên sản phẩm \*/i);
      const slugInput = screen.getByLabelText(/Đường dẫn tĩnh \(Slug\)/i) as HTMLInputElement;

      // Type name -> slug automatically updates
      await user.type(nameInput, 'Cà chua bi organic');
      expect(slugInput.value).toBe('ca-chua-bi-organic');

      // Edit slug manually
      await user.clear(slugInput);
      await user.type(slugInput, 'ca-chua-dac-biet');
      expect(slugInput.value).toBe('ca-chua-dac-biet');
    });

    it('tự động điền slug khi gõ tiêu đề bài viết và cho phép sửa thủ công', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
      });

      const user = userEvent.setup();
      render(
        <AdminUserProvider
          user={{ id: '1', email: 'owner@xfarm.vn', fullName: 'Chủ Trại', role: Role.OWNER }}
        >
          <PostsCmsPage />
        </AdminUserProvider>,
      );

      const addBtn = screen.getByRole('button', { name: /Viết bài mới/i });
      await user.click(addBtn);

      const titleInput = screen.getByLabelText(/Tiêu đề bài viết \*/i);
      const slugInput = screen.getByLabelText(/Đường dẫn tĩnh \(Slug\)/i) as HTMLInputElement;

      await user.type(titleInput, 'Bí quyết ủ phân trùn quế');
      expect(slugInput.value).toBe('bi-quyet-u-phan-trun-que');

      // Edit slug manually
      await user.clear(slugInput);
      await user.type(slugInput, 'bi-quyet-phan-trun');
      expect(slugInput.value).toBe('bi-quyet-phan-trun');
    });

    it('tự động sinh slug cho trang tĩnh và hỗ trợ chọn mẫu nhanh', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
      });

      const user = userEvent.setup();
      render(
        <AdminUserProvider
          user={{ id: '1', email: 'manager@xfarm.vn', fullName: 'Quản Lý', role: Role.MANAGER }}
        >
          <StaticPagesCmsPage />
        </AdminUserProvider>,
      );

      const addBtn = screen.getByRole('button', { name: /Thêm trang mới/i });
      await user.click(addBtn);

      // Click template button "+ Thông tin liên hệ (/lien-he)"
      const tplBtn = screen.getByRole('button', { name: /\+ Thông tin liên hệ/i });
      await user.click(tplBtn);

      const titleInput = screen.getByLabelText(/Tiêu đề trang \*/i) as HTMLInputElement;
      const slugInput = screen.getByLabelText(/Đường dẫn tĩnh \(Slug\)/i) as HTMLInputElement;

      expect(titleInput.value).toBe('Thông tin liên hệ');
      expect(slugInput.value).toBe('lien-he');
    });
  });

  describe('Phân quyền RBAC (SALES chỉ sửa sản phẩm và bài viết)', () => {
    it('vai trò SALES có nút thêm/sửa trên trang Sản phẩm và Bài viết', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        data: [
          {
            id: 'prod-1',
            name: 'Rau cải',
            slug: 'rau-cai',
            price: 25000,
            unit: 'kg',
            itemId: 'item-1',
            description: '<p>Ngon</p>',
            mediaIds: [],
            isPublished: true,
            sortOrder: 1,
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      });

      render(
        <AdminUserProvider
          user={{ id: '2', email: 'sales@xfarm.vn', fullName: 'Nhân Viên Sales', role: Role.SALES }}
        >
          <ProductsCmsPage />
        </AdminUserProvider>,
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Thêm sản phẩm mới/i })).toBeInTheDocument();
        expect(screen.getByTitle('Chỉnh sửa sản phẩm')).toBeInTheDocument();
      });
    });

    it('vai trò SALES BỊ ẨN nút thêm/sửa trên trang Trang Tĩnh (/admin/cms/pages)', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        data: [
          {
            id: 'page-1',
            title: 'Giới thiệu XFarm',
            slug: 'gioi-thieu',
            content: '<p>XFarm</p>',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      });

      render(
        <AdminUserProvider
          user={{ id: '2', email: 'sales@xfarm.vn', fullName: 'Nhân Viên Sales', role: Role.SALES }}
        >
          <StaticPagesCmsPage />
        </AdminUserProvider>,
      );

      await waitFor(() => {
        // SALES should NOT see create button
        expect(screen.queryByRole('button', { name: /Thêm trang mới/i })).not.toBeInTheDocument();
        // SALES should NOT see edit button
        expect(screen.queryByTitle('Chỉnh sửa nội dung trang')).not.toBeInTheDocument();
      });
    });

    it('vai trò SALES BỊ ẨN nút lưu và hiển thị cảnh báo chỉ đọc trên Cài đặt (/admin/cms/settings)', async () => {
      vi.mocked(apiFetch).mockResolvedValue({ data: [] });

      render(
        <AdminUserProvider
          user={{ id: '2', email: 'sales@xfarm.vn', fullName: 'Nhân Viên Sales', role: Role.SALES }}
        >
          <SettingsCmsPage />
        </AdminUserProvider>,
      );

      await waitFor(() => {
        // SALES should NOT see save button
        expect(
          screen.queryByRole('button', { name: /Lưu tất cả thay đổi/i }),
        ).not.toBeInTheDocument();
        // SALES should see read-only banner
        expect(screen.getByText(/Bạn đang xem ở chế độ chỉ đọc/i)).toBeInTheDocument();
      });
    });

    it('vai trò WORKER bị ẩn toàn bộ nút thêm/sửa trên các trang CMS', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
      });

      render(
        <AdminUserProvider
          user={{ id: '3', email: 'worker@xfarm.vn', fullName: 'Công Nhân', role: Role.WORKER }}
        >
          <ProductsCmsPage />
        </AdminUserProvider>,
      );

      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /Thêm sản phẩm mới/i }),
        ).not.toBeInTheDocument();
      });
    });
  });
});
