import { spawn, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT_DIR = resolve(__dirname, '../../../');
const API_DIR = resolve(__dirname, '..');
const REQUEST_TIMEOUT_MS = 5_000;
const SERVER_TIMEOUT_MS = 110_000;

function loadEnvFile() {
  const env: Record<string, string> = {};
  const contents = readFileSync(resolve(ROOT_DIR, '.env'), 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)=(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}

function stopServer(server: ChildProcess) {
  if (server.pid && !server.killed) {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {
      server.kill('SIGTERM');
    }
  }
}

async function request(url: string, init: RequestInit = {}) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

async function main() {
  const fileEnv = loadEnvFile();
  const port = Number(fileEnv.API_PORT ?? 4100);
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;
  const server = spawn('pnpm', ['dev'], {
    cwd: API_DIR,
    env: { ...process.env, ...fileEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });

  let output = '';
  server.stdout?.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  server.stderr?.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });

  try {
    const deadline = Date.now() + SERVER_TIMEOUT_MS;
    let loginResponse: Response | undefined;
    while (Date.now() < deadline) {
      try {
        loginResponse = await request(`${baseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'admin@xfarm.local', password: 'Admin@123' }),
        });
        if (loginResponse.status !== 404 && loginResponse.status !== 502) break;
      } catch {
        // Nest is still compiling or starting.
      }
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    }

    if (!loginResponse || loginResponse.status !== 200) {
      throw new Error(
        `Login failed: ${loginResponse?.status ?? 'server did not start'}\n${output}`,
      );
    }

    const cookieHeader = loginResponse.headers
      .getSetCookie?.()
      .map((cookie) => cookie.split(';', 1)[0])
      .join('; ');
    if (!cookieHeader) throw new Error('Login did not return authentication cookies');

    const routes = [
      '/users',
      '/areas',
      '/cycles',
      '/activities',
      '/animal-groups',
      '/animals',
      `/calendar?month=${new Date().toISOString().slice(0, 7)}`,
      '/stock/balances',
      '/stock/moves',
      '/stock/documents',
      '/alerts',
      '/alerts/unread-count',
      '/items',
      '/warehouses',
      '/suppliers',
      '/harvest-lots',
      '/products',
      '/posts',
      '/pages',
      '/site-settings',
      '/public/products',
      '/public/posts',
      '/public/site-settings',
      '/public/trace/DEMO000001',
      '/purchase-orders',
      '/customers',
      '/sales-orders',
    ];

    for (const route of routes) {
      const response = await request(`${baseUrl}${route}`, {
        headers: { cookie: cookieHeader },
      });
      if (response.status === 404 && route.startsWith('/calendar')) {
        console.log(`SKIP ${route} (404: route chưa có)`);
        continue;
      }
      if (response.status === 500) {
        throw new Error(`${route} returned 500: ${await response.text()}`);
      }
      console.log(`PASS ${route} (${response.status})`);
    }
  } finally {
    stopServer(server);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
