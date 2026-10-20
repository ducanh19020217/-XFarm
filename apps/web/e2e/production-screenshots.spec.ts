import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loginAs } from './fixtures';

const PAGES = [
  { name: 'areas', path: '/admin/areas' },
  { name: 'cycles', path: '/admin/cycles' },
  { name: 'activities', path: '/admin/activities' },
  { name: 'animals', path: '/admin/animals' },
  { name: 'calendar', path: '/admin/calendar' },
  { name: 'harvest-lots', path: '/admin/harvest-lots' },
];

test.describe('Production Module UI & Screenshots', () => {
  test('chụp ảnh màn hình 6 trang chính ở Light và Dark mode (1400px), kiểm tra kích thước <= 300KB', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const repoRoot = path.resolve(__dirname, '../../..');
    const screenshotDir = path.resolve(repoRoot, 'docs/screenshots/production');
    await fs.mkdir(screenshotDir, { recursive: true });

    await page.setViewportSize({ width: 1400, height: 900 });
    await loginAs(page, 'OWNER');

    for (const mode of ['light', 'dark'] as const) {
      // Đổi theme sang mode tương ứng
      await page.evaluate((themeMode) => {
        localStorage.setItem('xfarm_theme', themeMode);
        localStorage.setItem('theme', themeMode);
        if (themeMode === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }, mode);

      if (mode === 'dark') {
        await expect(page.locator('html')).toHaveClass(/dark/);
      } else {
        await expect(page.locator('html')).not.toHaveClass(/dark/);
      }

      for (const { name, path: pagePath } of PAGES) {
        await page.goto(pagePath);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });

        // Chờ CSS & Leaflet / animation ổn định
        await page.waitForTimeout(500);

        const screenshotPath = path.resolve(screenshotDir, `${name}-${mode}.png`);
        await page.screenshot({ path: screenshotPath });

        const stat = await fs.stat(screenshotPath);
        expect(
          stat.size,
          `File size for ${name}-${mode}.png exceeds 300KB: ${stat.size} bytes`,
        ).toBeLessThanOrEqual(300 * 1024);
      }
    }
  });

  test('kiểm tra hiển thị responsive trên mobile 390px (Sáng và Tối)', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, 'OWNER');

    for (const mode of ['light', 'dark'] as const) {
      await page.evaluate((themeMode) => {
        localStorage.setItem('xfarm_theme', themeMode);
        localStorage.setItem('theme', themeMode);
        if (themeMode === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }, mode);

      for (const { name, path: pagePath } of PAGES) {
        await page.goto(pagePath);
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });

        // Kiểm tra không bị bể layout hoặc tràn trang bất thường
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(
          scrollWidth,
          `Page ${name} at 390px width has overflow: ${scrollWidth}`,
        ).toBeLessThanOrEqual(400);
      }
    }
  });
});
