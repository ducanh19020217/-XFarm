import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AreasPage from './page';
import { AreaType, Role } from '@xfarm/shared';
import * as apiModule from '@/lib/api';

// Mock API module
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

// Mock next/dynamic Leaflet map components
vi.mock('@/components/map', () => ({
  DynamicAreaMapOverview: () => (
    <div data-testid="mock-map-overview">Mock Leaflet Map Overview</div>
  ),
  DynamicAreaMapEditor: () => <div data-testid="mock-map-editor">Mock Leaflet Map Editor</div>,
}));

const mockAreasList = [
  {
    id: 'area-1',
    code: 'AR-0001',
    name: 'Khu A Trồng Trọt',
    type: AreaType.ZONE,
    parentId: null,
    areaM2: 50000,
    geojson: {
      type: 'Polygon',
      coordinates: [
        [
          [105.8, 21.0],
          [105.81, 21.0],
          [105.81, 21.01],
          [105.8, 21.0],
        ],
      ],
    },
    description: 'Khu vực chuyên canh rau củ quả',
    isActive: true,
    activeCyclesCount: 2,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    parent: null,
  },
  {
    id: 'area-2',
    code: 'AR-0002',
    name: 'Lô rau hữu cơ 1',
    type: AreaType.FIELD,
    parentId: 'area-1',
    areaM2: 5000,
    geojson: null,
    description: 'Lô đất trồng cải ngọt',
    isActive: true,
    activeCyclesCount: 1,
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    parent: {
      id: 'area-1',
      code: 'AR-0001',
      name: 'Khu A Trồng Trọt',
    },
  },
  {
    id: 'area-3',
    code: 'AR-0003',
    name: 'Nhà màng dưa lưới',
    type: AreaType.GREENHOUSE,
    parentId: 'area-1',
    areaM2: 2000,
    geojson: null,
    description: 'Nhà màng công nghệ cao Israel',
    isActive: false,
    activeCyclesCount: 0,
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-03T00:00:00Z',
    parent: {
      id: 'area-1',
      code: 'AR-0001',
      name: 'Khu A Trồng Trọt',
    },
  },
];

const mockTreeData = [
  {
    ...mockAreasList[0],
    children: [mockAreasList[1], mockAreasList[2]],
  },
];

function setupApiMock(options?: { role?: Role; patchReject422?: boolean }) {
  const role = options?.role || Role.OWNER;
  (apiModule.apiFetch as ReturnType<typeof vi.fn>).mockImplementation(
    (endpoint: string, reqOptions?: RequestInit) => {
      // debug
      // console.log('ENDPOINT:', endpoint, reqOptions?.method);
      if (endpoint.includes('/auth/me')) {
        return Promise.resolve({
          data: {
            id: 'u1',
            fullName: 'Người Dùng Test',
            email: 'test@xfarm.vn',
            role,
          },
        });
      }
      if (endpoint.includes('/areas/tree')) {
        return Promise.resolve({ data: mockTreeData });
      }
      if (endpoint.includes('/areas/area-1') && reqOptions?.method === 'PATCH') {
        if (options?.patchReject422) {
          return Promise.reject(
            new apiModule.ApiError(
              422,
              'Không thể khóa khu vực đang có mùa vụ ACTIVE hoặc HARVESTING.',
            ),
          );
        }
        return Promise.resolve({
          data: { ...mockAreasList[0], isActive: false },
        });
      }
      if (endpoint.startsWith('/areas')) {
        return Promise.resolve({
          data: mockAreasList,
          total: mockAreasList.length,
          page: 1,
          pageSize: 15,
        });
      }
      return Promise.resolve({ data: [] });
    },
  );
}

describe('AreasPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bảng hiển thị đúng danh sách dữ liệu mock', async () => {
    setupApiMock({ role: Role.OWNER });

    render(<AreasPage />);

    // Kiểm tra render dữ liệu
    await waitFor(() => {
      expect(screen.getByText('AR-0001')).toBeDefined();
      expect(screen.getAllByText('Khu A Trồng Trọt').length).toBeGreaterThan(0);
      expect(screen.getByText('Lô rau hữu cơ 1')).toBeDefined();
      expect(screen.getByText('Nhà màng dưa lưới')).toBeDefined();
    });

    // Kiểm tra nhãn tiếng Việt cho AreaType
    expect(screen.getByText('Khu vực')).toBeDefined();
    expect(screen.getByText('Lô/Ruộng')).toBeDefined();
    expect(screen.getByText('Nhà màng')).toBeDefined();

    // Kiểm tra định dạng diện tích m² và mùa vụ
    expect(screen.getByText('50.000 m²')).toBeDefined();
    expect(screen.getByText('2 vụ')).toBeDefined();
    expect(screen.getByText('1 vụ')).toBeDefined();
  });

  it('ẩn các nút ghi đối với vai trò WORKER', async () => {
    setupApiMock({ role: Role.WORKER });

    render(<AreasPage />);

    await waitFor(() => {
      expect(screen.getByText('AR-0001')).toBeDefined();
    });

    // WORKER không được thấy nút "Thêm khu/lô mới"
    expect(screen.queryByText('Thêm khu/lô mới')).toBeNull();

    // WORKER không có các nút Sửa / Khóa
    expect(screen.queryByTitle('Chỉnh sửa khu/lô')).toBeNull();
    expect(screen.queryByTitle('Khóa khu/lô')).toBeNull();
  });

  it('hiển thị các nút ghi đối với vai trò MANAGER hoặc OWNER', async () => {
    setupApiMock({ role: Role.MANAGER });

    render(<AreasPage />);

    await waitFor(() => {
      expect(screen.getByText('Thêm khu/lô mới')).toBeDefined();
    });

    const editButtons = screen.getAllByTitle('Chỉnh sửa khu/lô');
    expect(editButtons.length).toBeGreaterThan(0);
  });

  it('chuyển đổi sang tab Dạng cây phân cấp và thu gọn / mở rộng', async () => {
    setupApiMock({ role: Role.OWNER });

    render(<AreasPage />);

    await waitFor(() => {
      expect(screen.getByText('Danh sách bảng')).toBeDefined();
    });

    // Chuyển sang tab Cây phân cấp
    const treeTabBtn = screen.getByText('Dạng cây phân cấp');
    fireEvent.click(treeTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Cây phân cấp Khu & Lô canh tác/)).toBeDefined();
      expect(screen.getByText('Thu gọn tất cả')).toBeDefined();
      expect(screen.getByText('Mở rộng tất cả')).toBeDefined();
    });

    // Kiểm tra thu gọn tất cả
    const collapseBtn = screen.getByText('Thu gọn tất cả');
    fireEvent.click(collapseBtn);

    // Khu con trong cây bị ẩn khi thu gọn
    expect(screen.queryByText('Lô rau hữu cơ 1')).toBeNull();

    // Mở rộng lại tất cả
    const expandBtn = screen.getByText('Mở rộng tất cả');
    fireEvent.click(expandBtn);

    expect(screen.getByText('Lô rau hữu cơ 1')).toBeDefined();
  });

  it('chuyển đổi sang tab Bản đồ nông trại', async () => {
    setupApiMock({ role: Role.OWNER });

    render(<AreasPage />);

    await waitFor(() => {
      expect(screen.getByText('Bản đồ nông trại')).toBeDefined();
    });

    const mapTabBtn = screen.getByText('Bản đồ nông trại');
    fireEvent.click(mapTabBtn);

    await waitFor(() => {
      expect(screen.getByTestId('mock-map-overview')).toBeDefined();
    });
  });

  it('xử lý Khóa khu vực và hiển thị lỗi 422 từ API', async () => {
    setupApiMock({ role: Role.OWNER, patchReject422: true });

    render(<AreasPage />);

    await waitFor(() => {
      expect(screen.getByText('AR-0001')).toBeDefined();
    });

    // Bấm nút khóa của Khu A Trồng Trọt
    const lockButtons = screen.getAllByTitle('Khóa khu/lô');
    fireEvent.click(lockButtons[0]);

    // Confirm dialog mở ra
    await waitFor(() => {
      expect(screen.getByText('Khóa Khu/lô')).toBeDefined();
    });

    // Bấm nút "Khóa khu vực" để xác nhận
    const confirmBtn = screen.getByRole('button', { name: 'Khóa khu vực' });
    fireEvent.click(confirmBtn);

    // Chờ thông báo lỗi 422 hiển thị
    await waitFor(() => {
      expect(
        screen.getByText(/LỖI: Không thể khóa khu vực đang có mùa vụ ACTIVE hoặc HARVESTING/),
      ).toBeDefined();
    });
  });
});
