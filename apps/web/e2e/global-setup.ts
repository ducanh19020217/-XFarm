import { request, type FullConfig } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

process.loadEnvFile?.(path.resolve(__dirname, '../../../.env'));

const users = {
  OWNER: 'admin@xfarm.local',
  MANAGER: 'manager@xfarm.local',
  SALES: 'sales@xfarm.local',
  WORKER: 'worker@xfarm.local',
} as const;

for (const envFile of ['../../.env', '../.env', '.env']) {
  try {
    process.loadEnvFile?.(envFile);
  } catch {}
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL || 'http://localhost:3100';
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.API_PORT
      ? `http://localhost:${process.env.API_PORT}/api/v1`
      : 'http://localhost:4100/api/v1');
  const authDir = path.resolve(config.rootDir, '.auth');
  await fs.mkdir(authDir, { recursive: true });

  for (const [role, email] of Object.entries(users)) {
    const statePath = path.join(authDir, `${role.toLowerCase()}.json`);
    const context = await request.newContext({ baseURL });
    const response = await context.post(`${apiBase}/auth/login`, {
      data: { email, password: 'Admin@123' },
    });
    if (!response.ok()) {
      throw new Error(`Đăng nhập e2e cho ${role} thất bại: ${response.status()}`);
    }
    await context.storageState({ path: statePath });
    await context.dispose();
  }

  const warmup = await request.newContext({ baseURL });
  for (const route of [
    '/admin',
    '/admin/users',
    '/admin/areas',
    '/admin/cycles',
    '/admin/activities',
    '/admin/animals',
    '/admin/calendar',
  ]) {
    await warmup.get(route);
  }
  await warmup.dispose();
}
