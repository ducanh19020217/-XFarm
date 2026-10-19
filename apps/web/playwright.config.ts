import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

process.loadEnvFile?.(path.resolve(__dirname, '../../.env'));
const baseURL = process.env.WEB_URL || 'http://localhost:3100';
const apiURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api/v1';

export default defineConfig({
  testDir: './e2e',
  globalSetup: require.resolve('./e2e/global-setup'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: `cd ../.. && pnpm --filter @xfarm/api exec tsx dist/src/main.js`,
      url: `${apiURL}/auth/me`,
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'pnpm build && pnpm start',
      url: baseURL,
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
