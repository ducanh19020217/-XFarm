export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api/v1';

export class ApiError extends Error {
  statusCode: number;
  errors?: unknown;

  constructor(statusCode: number, message: string, errors?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export class ApiAbortError extends Error {
  constructor() {
    super('Yêu cầu đã bị hủy');
    this.name = 'AbortError';
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

let refreshPromise: Promise<boolean> | null = null;
let isPageUnloading = false;

if (typeof window !== 'undefined') {
  const markPageUnloading = () => {
    isPageUnloading = true;
  };
  window.addEventListener('pagehide', markPageUnloading);
  window.addEventListener('beforeunload', markPageUnloading);
}

async function fetchWithAbortHandling(input: RequestInfo | URL, init: RequestInit) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new TypeError('Failed to fetch: network offline');
  }
  try {
    return await fetch(input, init);
  } catch (error) {
    if (isPageUnloading || init.signal?.aborted) {
      throw new ApiAbortError();
    }
    throw error;
  }
}

function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    credentials: 'include',
    signal: options.signal,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  let response = await fetchWithAbortHandling(url, config);

  // If 401 and not an auth endpoint, attempt token refresh once
  if (
    response.status === 401 &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/refresh')
  ) {
    try {
      if (await refreshSession()) {
        // Retry the original request once
        response = await fetchWithAbortHandling(url, config);
      } else if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
    } catch {
      // Refresh failed, proceed to handle original 401 response
    }
  }

  if (!response.ok) {
    let errorData: { message?: string; errors?: unknown } = {};
    try {
      errorData = await response.json();
    } catch {
      // Non-json response
    }

    const message =
      response.status === 429
        ? 'Bạn đăng nhập quá nhiều lần, vui lòng thử lại sau 1 phút'
        : errorData.message || `Lỗi yêu cầu: ${response.status}`;
    throw new ApiError(response.status, message, errorData.errors);
  }

  if (options.signal?.aborted) {
    throw new ApiAbortError();
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();
  if (options.signal?.aborted) {
    throw new ApiAbortError();
  }

  return data;
}
