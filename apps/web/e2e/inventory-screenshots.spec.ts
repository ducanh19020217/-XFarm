import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loginAs } from './fixtures';

const PAGES = [
  { name: 'inventory', url: '/admin/inventory' },
  { name: 'moves', url: '/admin/inventory/moves' },
  { name: 'documents', url: '/admin/inventory/documents' },
  { name: 'items', url: '/admin/inventory/items' },
  { name: 'warehouses', url: '/admin/inventory/warehouses' },
  { name: 'suppliers', url: '/admin/inventory/suppliers' },
  { name: 'purchase-orders', url: '/admin/purchase-orders' },
  { name: 'alerts', url: '/admin/alerts' },
  { name: 'equipment', url: '/admin/equipment' },
  { name: 'iot-sensors', url: '/admin/iot/sensors' },
  { name: 'iot-charts', url: '/admin/iot/charts' },
];

async function applyTheme(page: Page, theme: 'light' | 'dark') {
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

test.describe('Inventory and related pages UI & Theme screenshots', () => {
  test('chụp ảnh giao diện SÁNG và TỐI ở 1400px và kiểm tra hiển thị ở 390px', async ({ page }) => {
    test.setTimeout(180_000);

    const repoRoot = path.resolve(__dirname, '../../..');
    const screenshotDir = path.resolve(repoRoot, 'docs/screenshots/inventory');
    await fs.mkdir(screenshotDir, { recursive: true });

    await loginAs(page, 'OWNER');

    for (const item of PAGES) {
      // 1. Kiểm tra ở 1400px desktop
      await page.setViewportSize({ width: 1400, height: 900 });
      await page.goto(item.url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // --- Light Theme ---
      await applyTheme(page, 'light');
      await expect(page.locator('html')).not.toHaveClass(/dark/);
      await page.waitForTimeout(400);

      const lightPath = path.resolve(screenshotDir, `${item.name}-light.png`);
      await page.screenshot({ path: lightPath });
      const lightStat = await fs.stat(lightPath);
      expect(lightStat.size).toBeLessThanOrEqual(300 * 1024);

      // --- Dark Theme ---
      await applyTheme(page, 'dark');
      await expect(page.locator('html')).toHaveClass(/dark/);
      await page.waitForTimeout(400);

      const darkPath = path.resolve(screenshotDir, `${item.name}-dark.png`);
      await page.screenshot({ path: darkPath });
      const darkStat = await fs.stat(darkPath);
      expect(darkStat.size).toBeLessThanOrEqual(300 * 1024);

      // 2. Kiểm tra ở 390px mobile (đáp ứng responsive, không tràn ngang)
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(300);

      // Verify no horizontal overflow body scrollWidth <= window.innerWidth
      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(isOverflowing).toBe(false);
    }
  });
});
