import { expect, test as base, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

process.loadEnvFile?.('../../.env');
const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api/v1';
const users = {
  OWNER: 'admin@xfarm.local',
  MANAGER: 'manager@xfarm.local',
  SALES: 'sales@xfarm.local',
  WORKER: 'worker@xfarm.local',
} as const;
export type Role = keyof typeof users;

export async function loginAs(page: Page, role: Role = 'OWNER') {
  const statePath = path.resolve('e2e/.auth', `${role.toLowerCase()}.json`);
  const state = JSON.parse(await fs.readFile(statePath, 'utf8')) as {
    cookies?: Parameters<Page['context']['addCookies']>[0];
  };
  await page.context().clearCookies();
  await page.context().addCookies(state.cookies || []);
  await page.goto('/admin');
  await page.waitForURL('**/admin');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/Xin chào,/)).toBeVisible({ timeout: 15_000 });
}

export async function api<T>(page: Page, path: string, init: RequestInit = {}) {
  return page.evaluate(
    async ({ apiBase, path, init }) => {
      const response = await fetch(`${apiBase}${path}`, {
        ...init,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
      });
      const body = await response.json().catch(() => undefined);
      if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`);
      return body as T;
    },
    { apiBase, path, init },
  );
}

export function guard(page: Page) {
  const errors: string[] = [];
  const expected = new Set<string>();
  const onPageError = (error: Error) => errors.push(`pageerror: ${error.message}`);
  const onConsole = (message: { type(): string; text(): string }) => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) {
      errors.push(`console: ${message.text()}`);
    }
  };
  const onResponse = (response: { url(): string; status(): number }) => {
    const url = response.url();
    if (
      url.includes('/api/v1/') &&
      response.status() >= 400 &&
      !url.includes('/auth/me') &&
      !url.includes('/auth/refresh') &&
      ![...expected].some((path) => url.includes(path))
    ) {
      errors.push(`api ${response.status()}: ${url}`);
    }
  };
  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  page.on('response', onResponse);
  return {
    expectError(path: string) {
      expected.add(path);
    },
    assertClean() {
      expect(errors, errors.join('\n')).toEqual([]);
    },
    dispose() {
      page.off('pageerror', onPageError);
      page.off('console', onConsole);
      page.off('response', onResponse);
    },
  };
}

export async function expectDialogInViewport(page: Page) {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
}

export const test = base.extend<{ errors: ReturnType<typeof guard> }>({
  errors: async ({ page }, use) => {
    const state = guard(page);
    await use(state);
    state.dispose();
  },
});
export { expect };
