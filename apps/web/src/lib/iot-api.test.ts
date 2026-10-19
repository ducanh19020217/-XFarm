import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiModule from './api';
import {
  isOnline,
  generateCurlExample,
  getSensors,
  getSensor,
  createSensor,
  updateSensor,
  rotateSensorKey,
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  getTimeseries,
  getLatestReadings,
  SensorType,
  AlertOp,
} from './iot-api';

vi.mock('./api', () => ({
  apiFetch: vi.fn(),
}));

describe('iot-api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isOnline', () => {
    it('returns false for null or undefined', () => {
      expect(isOnline(null)).toBe(false);
      expect(isOnline(undefined)).toBe(false);
      expect(isOnline('')).toBe(false);
    });

    it('returns true for timestamps within 15 minutes', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(isOnline(fiveMinAgo)).toBe(true);
    });

    it('returns false for timestamps older than 15 minutes', () => {
      const twentyMinAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      expect(isOnline(twentyMinAgo)).toBe(false);
    });
  });

  describe('generateCurlExample', () => {
    it('generates curl with correct key and endpoint', () => {
      const curl = generateCurlExample('test-key-123', 'http://api.local/v1');
      expect(curl).toContain('POST "http://api.local/v1/iot/readings"');
      expect(curl).toContain('X-Sensor-Key: test-key-123');
      expect(curl).toContain('readings');
    });
  });

  describe('sensors CRUD', () => {
    it('getSensors queries /sensors with params', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({
        data: [{ id: 's1', name: 'Sensor 1' }],
        total: 1,
      });

      const res = await getSensors({ page: 1, pageSize: 10, search: 'temp' });
      expect(apiModule.apiFetch).toHaveBeenCalledWith(
        '/sensors?page=1&pageSize=10&search=temp',
        { signal: undefined },
      );
      expect(res.data).toHaveLength(1);
    });

    it('getSensor queries /sensors/:id', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({ data: { id: 's1', name: 'Sensor 1' } });
      const res = await getSensor('s1');
      expect(apiModule.apiFetch).toHaveBeenCalledWith('/sensors/s1', { signal: undefined });
      expect(res.id).toBe('s1');
    });

    it('createSensor posts to /sensors', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({
        data: { id: 's1', name: 'Sensor 1' },
        apiKey: 'key-123',
      });
      const res = await createSensor({
        name: 'Sensor 1',
        type: SensorType.TEMP,
        unit: '°C',
        areaId: 'area-1',
      });
      expect(apiModule.apiFetch).toHaveBeenCalledWith('/sensors', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Sensor 1',
          type: SensorType.TEMP,
          unit: '°C',
          areaId: 'area-1',
        }),
      });
      expect(res.apiKey).toBe('key-123');
    });

    it('updateSensor patches to /sensors/:id', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({ data: { id: 's1', name: 'Updated' } });
      const res = await updateSensor('s1', { name: 'Updated' });
      expect(apiModule.apiFetch).toHaveBeenCalledWith('/sensors/s1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      });
      expect(res.data.name).toBe('Updated');
    });

    it('rotateSensorKey posts to /sensors/:id/rotate-key', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({
        data: { id: 's1' },
        apiKey: 'new-key',
      });
      const res = await rotateSensorKey('s1');
      expect(apiModule.apiFetch).toHaveBeenCalledWith('/sensors/s1/rotate-key', { method: 'POST' });
      expect(res.apiKey).toBe('new-key');
    });
  });

  describe('alert rules', () => {
    it('getAlertRules queries /alert-rules', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({ data: [{ id: 'r1' }], total: 1 });
      const res = await getAlertRules({ sensorId: 's1' });
      expect(apiModule.apiFetch).toHaveBeenCalledWith('/alert-rules?sensorId=s1', { signal: undefined });
      expect(res.data).toHaveLength(1);
    });

    it('createAlertRule posts to /alert-rules', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({ data: { id: 'r1' } });
      const res = await createAlertRule({
        sensorId: 's1',
        op: AlertOp.GT,
        threshold: 35,
      });
      expect(apiModule.apiFetch).toHaveBeenCalledWith('/alert-rules', {
        method: 'POST',
        body: JSON.stringify({ sensorId: 's1', op: AlertOp.GT, threshold: 35 }),
      });
      expect(res.data.id).toBe('r1');
    });

    it('updateAlertRule patches to /alert-rules/:id', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({ data: { id: 'r1', threshold: 40 } });
      const res = await updateAlertRule('r1', { threshold: 40 });
      expect(apiModule.apiFetch).toHaveBeenCalledWith('/alert-rules/r1', {
        method: 'PATCH',
        body: JSON.stringify({ threshold: 40 }),
      });
      expect(res.data.threshold).toBe(40);
    });

    it('deleteAlertRule deletes /alert-rules/:id', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({
        data: { id: 'r1' },
        message: 'Đã tắt ngưỡng cảnh báo',
      });
      const res = await deleteAlertRule('r1');
      expect(apiModule.apiFetch).toHaveBeenCalledWith('/alert-rules/r1', { method: 'DELETE' });
      expect(res.message).toBe('Đã tắt ngưỡng cảnh báo');
    });
  });

  describe('timeseries and latest', () => {
    it('getTimeseries queries /iot/series with params', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({ data: [{ bucket: '2026-10-19', avg: 25 }] });
      const res = await getTimeseries({
        sensorId: 's1',
        from: '2026-10-18T00:00:00Z',
        to: '2026-10-19T00:00:00Z',
        bucket: '1h',
      });
      expect(apiModule.apiFetch).toHaveBeenCalledWith(
        '/iot/series?sensorId=s1&from=2026-10-18T00%3A00%3A00Z&to=2026-10-19T00%3A00%3A00Z&bucket=1h',
        { signal: undefined },
      );
      expect(res.data).toHaveLength(1);
    });

    it('getLatestReadings queries /iot/latest', async () => {
      vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({ data: [{ sensorId: 's1', value: 25.5 }] });
      const res = await getLatestReadings('area-1');
      expect(apiModule.apiFetch).toHaveBeenCalledWith('/iot/latest?areaId=area-1', { signal: undefined });
      expect(res.data).toHaveLength(1);
    });
  });
});
