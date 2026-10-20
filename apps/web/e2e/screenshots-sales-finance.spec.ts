import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loginAs, api } from './fixtures';

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((t) => {
    localStorage.setItem('xfarm_theme', t);
    localStorage.setItem('theme', t);
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, theme);
  await page.waitForTimeout(300);
}

test.describe('Capture light and dark screenshots for Sales, Finance, Users, CMS', () => {
  test.setTimeout(180_000);

  test('Capture screenshots and verify file sizes <= 300 KB', async ({ page }) => {
    await loginAs(page, 'OWNER');

    const repoRoot = path.resolve(__dirname, '../../..');
    const screenshotsDir = path.resolve(repoRoot, 'docs/screenshots');

    // Ensure target subdirectories exist
    await fs.mkdir(path.resolve(screenshotsDir, 'sales'), { recursive: true });
    await fs.mkdir(path.resolve(screenshotsDir, 'finance'), { recursive: true });
    await fs.mkdir(path.resolve(screenshotsDir, 'users'), { recursive: true });
    await fs.mkdir(path.resolve(screenshotsDir, 'cms'), { recursive: true });

    // Find an existing order for detail and print pages
    const ordersRes = await api<{ data: Array<{ id: string }> }>(page, '/sales-orders?pageSize=1');
    const orderId = ordersRes.data?.[0]?.id || 'cmvg7eayr000jw4r9n3aaezu3';

    const pagesToCapture = [
      { group: 'sales', pageName: 'orders', url: '/admin/sales/orders' },
      { group: 'sales', pageName: 'orders-detail', url: `/admin/sales/orders/${orderId}` },
      { group: 'sales', pageName: 'orders-print', url: `/admin/sales/orders/${orderId}/print` },
      { group: 'sales', pageName: 'customers', url: '/admin/sales/customers' },
      { group: 'finance', pageName: 'transactions', url: '/admin/finance/transactions' },
      { group: 'finance', pageName: 'categories', url: '/admin/finance/categories' },
      { group: 'finance', pageName: 'reports', url: '/admin/finance/reports' },
      { group: 'finance', pageName: 'receivables', url: '/admin/finance/receivables' },
      { group: 'users', pageName: 'users', url: '/admin/users' },
      { group: 'cms', pageName: 'products', url: '/admin/cms/products' },
      { group: 'cms', pageName: 'posts', url: '/admin/cms/posts' },
      { group: 'cms', pageName: 'pages', url: '/admin/cms/pages' },
      { group: 'cms', pageName: 'settings', url: '/admin/cms/settings' },
    ];

    for (const item of pagesToCapture) {
      // 1. Desktop Viewport (1400px)
      await page.setViewportSize({ width: 1400, height: 900 });
      await page.goto(item.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      // Light mode screenshot
      await setTheme(page, 'light');
      const lightPath = path.resolve(screenshotsDir, item.group, `${item.pageName}-light.png`);
      await page.screenshot({ path: lightPath });
      const lightStat = await fs.stat(lightPath);
      expect(lightStat.size).toBeLessThanOrEqual(300 * 1024);

      // Dark mode screenshot
      await setTheme(page, 'dark');
      const darkPath = path.resolve(screenshotsDir, item.group, `${item.pageName}-dark.png`);
      await page.screenshot({ path: darkPath });
      const darkStat = await fs.stat(darkPath);
      expect(darkStat.size).toBeLessThanOrEqual(300 * 1024);

      // 2. Mobile Viewport (390px) responsive check
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(300);
      // Ensure page rendered without layout collapse
      await expect(page.locator('main')).toBeVisible();
    }
  });
});
