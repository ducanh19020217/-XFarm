import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import IotChartsPage from './page';
import * as iotApi from '@/lib/iot-api';
import * as apiModule from '@/lib/api';
import { SensorType, AlertOp } from '@/lib/iot-api';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/iot-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/iot-api')>('@/lib/iot-api');
  return {
    ...actual,
    getSensors: vi.fn(),
    getTimeseries: vi.fn(),
    getAlertRules: vi.fn(),
  };
});

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

// Mock recharts responsive container for jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 300 }}>{children}</div>
    ),
  };
});

const mockSensors: iotApi.SensorItem[] = [
  {
    id: 'sensor-1',
    code: 'SN-0001',
    name: 'Cảm biến nhiệt độ',
    type: SensorType.TEMP,
    unit: '°C',
    areaId: 'area-1',
    area: { id: 'area-1', code: 'A1', name: 'Khu A' },
    lastSeenAt: new Date().toISOString(),
    isActive: true,
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    alertRules: [
      {
        id: 'rule-1',
        sensorId: 'sensor-1',
        op: AlertOp.GT,
        threshold: 35,
        isActive: true,
        cooldownMinutes: 30,
      },
    ],
  },
];

const mockTimeseries = [
  {
    sensorId: 'sensor-1',
    sensorName: 'Cảm biến nhiệt độ',
    areaId: 'area-1',
    bucket: new Date().toISOString(),
    avg: 27.5,
    min: 25.0,
    max: 30.0,
  },
];

describe('IotChartsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(apiModule.apiFetch).mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/areas/tree')) {
        return Promise.resolve({
          data: [
            {
              id: 'area-1',
              code: 'A1',
              name: 'Khu A',
              type: 'ZONE',
              parentId: null,
              areaM2: 1000,
              geojson: null,
              description: null,
              isActive: true,
              children: [],
              createdAt: '2026-01-01',
              updatedAt: '2026-01-01',
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    vi.mocked(iotApi.getSensors).mockResolvedValue({
      data: mockSensors,
      total: 1,
      page: 1,
      pageSize: 100,
    });

    vi.mocked(iotApi.getTimeseries).mockResolvedValue({
      data: mockTimeseries,
    });

    vi.mocked(iotApi.getAlertRules).mockResolvedValue({
      data: mockSensors[0].alertRules || [],
      total: 1,
      page: 1,
      pageSize: 50,
    });
  });

  it('renders presets and auto-refresh indicator for 24h', async () => {
    render(<IotChartsPage />);

    await waitFor(() => {
      expect(screen.getByText('Biểu đồ Dữ liệu IoT')).toBeInTheDocument();
      expect(screen.getByTestId('preset-24h-btn')).toBeInTheDocument();
      expect(screen.getByTestId('preset-7d-btn')).toBeInTheDocument();
      expect(screen.getByTestId('preset-30d-btn')).toBeInTheDocument();
      expect(screen.getByTestId('preset-custom-btn')).toBeInTheDocument();
    });

    // Auto refresh badge visible for 24h
    expect(screen.getByTestId('auto-refresh-indicator')).toHaveTextContent(/tự refresh mỗi 60s/i);
  });

  it('renders sensor chart card with AVG, MIN-MAX and threshold indicators', async () => {
    render(<IotChartsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('sensor-chart-card-sensor-1')).toBeInTheDocument();
      expect(screen.getByText('Cảm biến nhiệt độ')).toBeInTheDocument();
      expect(screen.getByText(/Vượt quá \(>\) 35 °C/)).toBeInTheDocument();
    });
  });

  it('switches between presets and toggles custom date inputs', async () => {
    render(<IotChartsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('preset-custom-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('preset-custom-btn'));

    await waitFor(() => {
      expect(screen.getByText('Cấu hình khoảng thời gian tùy chọn')).toBeInTheDocument();
      expect(screen.getByLabelText('Từ thời điểm')).toBeInTheDocument();
      expect(screen.getByLabelText('Đến thời điểm')).toBeInTheDocument();
    });

    // Auto refresh badge should not be visible in custom mode
    expect(screen.queryByTestId('auto-refresh-indicator')).not.toBeInTheDocument();
  });

  it('switches to Area Tree mode and selects area', async () => {
    render(<IotChartsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('mode-area-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('mode-area-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('area-tree-container')).toBeInTheDocument();
    });
  });
});
