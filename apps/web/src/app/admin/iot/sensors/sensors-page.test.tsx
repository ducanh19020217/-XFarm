import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SensorsPage from './page';
import { AdminUserProvider } from '../../admin-user-context';
import * as iotApi from '@/lib/iot-api';
import * as apiModule from '@/lib/api';
import { SensorType, AlertOp } from '@/lib/iot-api';

vi.mock('@/lib/iot-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/iot-api')>('@/lib/iot-api');
  return {
    ...actual,
    getSensors: vi.fn(),
    createSensor: vi.fn(),
    updateSensor: vi.fn(),
    rotateSensorKey: vi.fn(),
    createAlertRule: vi.fn(),
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

const mockSensors: iotApi.SensorItem[] = [
  {
    id: 'sensor-1',
    code: 'SN-0001',
    name: 'Cảm biến nhiệt độ hồ cá',
    type: SensorType.TEMP,
    unit: '°C',
    areaId: 'area-1',
    area: { id: 'area-1', code: 'A1', name: 'Khu A' },
    lastSeenAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // Online
    isActive: true,
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    readings: [
      {
        value: 28.5,
        recordedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      },
    ],
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
  {
    id: 'sensor-2',
    code: 'SN-0002',
    name: 'Cảm biến pH đất',
    type: SensorType.PH,
    unit: 'pH',
    areaId: 'area-2',
    area: { id: 'area-2', code: 'A2', name: 'Khu B' },
    lastSeenAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Offline (> 15m)
    isActive: true,
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    readings: [],
    alertRules: [],
  },
];

describe('SensorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiModule.apiFetch).mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/areas')) {
        return Promise.resolve({
          data: [
            { id: 'area-1', code: 'A1', name: 'Khu A' },
            { id: 'area-2', code: 'A2', name: 'Khu B' },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    vi.mocked(iotApi.getSensors).mockResolvedValue({
      data: mockSensors,
      total: mockSensors.length,
      page: 1,
      pageSize: 10,
    });
    vi.mocked(iotApi.getAlertRules).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 50,
    });
  });

  const renderComponent = (role: 'OWNER' | 'MANAGER' | 'WORKER' = 'OWNER') => {
    const user = {
      id: 'u-1',
      email: 'owner@xfarm.local',
      fullName: 'Farm Owner',
      role,
    };
    return render(
      <AdminUserProvider user={user}>
        <SensorsPage />
      </AdminUserProvider>,
    );
  };

  it('renders sensor list with online status and latest reading', async () => {
    renderComponent('OWNER');

    await waitFor(() => {
      expect(screen.getByText('Cảm biến nhiệt độ hồ cá')).toBeInTheDocument();
      expect(screen.getByText('Cảm biến pH đất')).toBeInTheDocument();
    });

    // Check online / offline badges
    expect(screen.getByTestId('sensor-status-online-sensor-1')).toHaveTextContent('Online');
    expect(screen.getByTestId('sensor-status-offline-sensor-2')).toHaveTextContent('Offline');

    // Check latest reading
    expect(screen.getByText(/28,5/)).toBeInTheDocument();
  });

  it('opens create dialog, creates sensor, and displays API Key dialog once', async () => {
    vi.mocked(iotApi.createSensor).mockResolvedValueOnce({
      data: {
        id: 'sensor-3',
        code: 'SN-0003',
        name: 'Cảm biến Oxy',
        type: SensorType.DO,
        unit: 'mg/L',
        areaId: 'area-1',
        lastSeenAt: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      apiKey: 'generated-sensor-secret-key-12345',
    });

    renderComponent('OWNER');

    const addBtn = screen.getByTestId('create-sensor-btn');
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Thêm Cảm biến Mới')).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText(/tên cảm biến/i), {
      target: { value: 'Cảm biến Oxy' },
    });
    fireEvent.change(screen.getByLabelText(/đơn vị đo/i), {
      target: { value: 'mg/L' },
    });
    fireEvent.change(screen.getByLabelText(/khu\/lô lắp đặt/i), {
      target: { value: 'area-1' },
    });

    // Submit
    const submitBtn = screen.getByTestId('submit-sensor-form-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(iotApi.createSensor).toHaveBeenCalled();
    });

    // Verify API key dialog appears
    await waitFor(() => {
      expect(screen.getByTestId('sensor-api-key')).toHaveValue('generated-sensor-secret-key-12345');
      expect(screen.getByTestId('curl-command-block')).toHaveTextContent('generated-sensor-secret-key-12345');
      expect(screen.getByTestId('copy-key-btn')).toBeInTheDocument();
      expect(screen.getByTestId('copy-curl-btn')).toBeInTheDocument();
    });
  });

  it('rotates API key and displays new key in dialog', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(iotApi.rotateSensorKey).mockResolvedValueOnce({
      data: mockSensors[0],
      apiKey: 'rotated-api-key-999',
    });

    renderComponent('OWNER');

    await waitFor(() => {
      expect(screen.getByTestId('rotate-key-btn-sensor-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('rotate-key-btn-sensor-1'));

    await waitFor(() => {
      expect(iotApi.rotateSensorKey).toHaveBeenCalledWith('sensor-1');
      expect(screen.getByTestId('sensor-api-key')).toHaveValue('rotated-api-key-999');
    });
  });

  it('opens alert rules dialog for a sensor', async () => {
    renderComponent('OWNER');

    await waitFor(() => {
      expect(screen.getByText(/1 ngưỡng/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/1 ngưỡng/));

    await waitFor(() => {
      expect(screen.getByTestId('alert-rules-dialog-content')).toBeInTheDocument();
      expect(screen.getByTestId('alert-rule-form')).toBeInTheDocument();
    });
  });
});
