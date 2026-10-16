import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch, isAbortError } from './api';

// Cùng nguồn URL với api.ts để test không phụ thuộc cổng trong .env (mỗi slot AgentHub dùng cổng riêng).
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api/v1';

describe('apiFetch client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('gọi refresh token khi nhận 401 và thử lại request thành công', async () => {
    const originalRequestUrl = `${API_BASE}/users`;
    const refreshUrl = `${API_BASE}/auth/refresh`;

    let callCount = 0;

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      callCount++;
      if (callCount === 1) {
        // First call to /users -> return 401
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ message: 'Token expired' }),
        });
      }

      if (callCount === 2) {
        // Second call should be to /auth/refresh
        expect(url).toBe(refreshUrl);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ message: 'Refreshed' }),
        });
      }

      if (callCount === 3) {
        // Third call should retry the original request to /users
        expect(url).toBe(originalRequestUrl);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: [{ id: '1', name: 'Admin' }] }),
        });
      }

      return Promise.reject(new Error('Unexpected call'));
    });

    global.fetch = mockFetch;

    const result = await apiFetch<{ data: Array<{ id: string; name: string }> }>('/users');

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.name).toBe('Admin');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('khi refresh thất bại thì ném ra ApiError với statusCode 401', async () => {
    let callCount = 0;

    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ message: 'Hết phiên đăng nhập' }),
        });
      }

      if (callCount === 2) {
        // Refresh fails
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ message: 'Refresh token hết hạn' }),
        });
      }

      return Promise.reject(new Error('Unexpected call'));
    });

    global.fetch = mockFetch;

    await expect(apiFetch('/users')).rejects.toMatchObject({
      name: 'ApiError',
      statusCode: 401,
    });
  });

  it('ba request 401 dùng chung một lần refresh', async () => {
    const refreshUrl = `${API_BASE}/auth/refresh`;
    let refreshCount = 0;
    let requestCount = 0;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === refreshUrl) {
        refreshCount++;
        return new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }), 5);
        });
      }

      requestCount++;
      if (requestCount <= 3) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ message: 'Token expired' }),
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { ok: true } }),
      });
    });

    const results = await Promise.all([apiFetch('/users'), apiFetch('/users'), apiFetch('/users')]);

    expect(refreshCount).toBe(1);
    expect(results).toHaveLength(3);
  });

  it('giữ nguyên lỗi mạng khi trang chưa unload', async () => {
    const networkError = new TypeError('Failed to fetch');
    global.fetch = vi.fn().mockRejectedValue(networkError);

    await expect(apiFetch('/users')).rejects.toBe(networkError);
  });

  it('chuẩn hóa lỗi fetch thành AbortError khi trang đang unload', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    window.dispatchEvent(new Event('pagehide'));

    const error = await apiFetch('/users').catch((reason) => reason);

    expect(isAbortError(error)).toBe(true);
    expect(error).toMatchObject({ name: 'AbortError' });
  });
});
