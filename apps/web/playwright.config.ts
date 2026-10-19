import { defineConfig, devices } from '@playwright/test';

for (const envFile of ['../../.env', '../.env', '.env']) {
  try {
    process.loadEnvFile?.(envFile);
  } catch {}
}
const baseURL = process.env.WEB_URL || 'http://localhost:3100';
const apiURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api/v1';
const webPort = new URL(baseURL).port || '3100';

export default defineConfig({
  testDir: './e2e',
  globalSetup: require.resolve('./e2e/global-setup'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
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
      command: `cd ../.. && pnpm --filter @xfarm/api build && pnpm --filter @xfarm/api exec tsx dist/src/main.js`,
      url: `${apiURL}/auth/me`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: `NEXT_PUBLIC_API_URL=${apiURL} pnpm exec next dev -p ${webPort}`,
      url: baseURL,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
