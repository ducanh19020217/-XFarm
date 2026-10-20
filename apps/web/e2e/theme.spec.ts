import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loginAs } from './fixtures';

test.describe('Theme sáng / tối (Dark mode foundation)', () => {
  test('chuyển theme sang tối, reload vẫn tối không nháy, và chụp ảnh lưu vào docs/screenshots', async ({
    page,
  }) => {
    // 1. Đăng nhập và truy cập trang /admin
    await loginAs(page, 'OWNER');

    const themeToggle = page.locator('[data-testid="theme-toggle"]').first();
    await expect(themeToggle).toBeVisible();

    // 2. Chuyển sang giao diện Sáng trước để chụp ảnh Light
    await themeToggle.click();
    const lightOption = page.locator('[data-testid="theme-option-light"]');
    await expect(lightOption).toBeVisible();
    await lightOption.click();

    await expect(page.locator('html')).not.toHaveClass(/dark/);

    const repoRoot = path.resolve(__dirname, '../../..');
    await fs.mkdir(path.resolve(repoRoot, 'docs/screenshots'), { recursive: true });

    // Chờ một chút để UI ổn định và chụp ảnh Light theme
    await page.waitForTimeout(500);
    const lightScreenshotPath = path.resolve(repoRoot, 'docs/screenshots/theme-light.png');
    await page.screenshot({ path: lightScreenshotPath });

    const lightStat = await fs.stat(lightScreenshotPath);
    expect(lightStat.size).toBeLessThanOrEqual(300 * 1024); // <= 300 KB

    // 3. Đổi sang giao diện Tối
    await themeToggle.click();
    const darkOption = page.locator('[data-testid="theme-option-dark"]');
    await expect(darkOption).toBeVisible();
    await darkOption.click();

    // Kiểm tra html có class dark
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Kiểm tra localStorage đã lưu theme
    const savedTheme = await page.evaluate(
      () => localStorage.getItem('xfarm_theme') || localStorage.getItem('theme'),
    );
    expect(savedTheme).toBe('dark');

    // Chờ UI ổn định và chụp ảnh Dark theme
    await page.waitForTimeout(500);
    const darkScreenshotPath = path.resolve(repoRoot, 'docs/screenshots/theme-dark.png');
    await page.screenshot({ path: darkScreenshotPath });

    const darkStat = await fs.stat(darkScreenshotPath);
    expect(darkStat.size).toBeLessThanOrEqual(300 * 1024); // <= 300 KB

    // 4. Reload trang và kiểm tra html vẫn giữ class dark ngay sau domcontentloaded
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveClass(/dark/);

    // 5. Kiểm tra đổi lại sang sáng
    await themeToggle.click();
    await page.locator('[data-testid="theme-option-light"]').click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('nút chuyển theme hoạt động trên trang login', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const toggle = page.locator('[data-testid="theme-toggle"]').first();
    await expect(toggle).toBeVisible();

    // Chọn Tối
    await toggle.click();
    await page.locator('[data-testid="theme-option-dark"]').click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Reload vẫn tối
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Chọn lại Sáng
    await toggle.click();
    await page.locator('[data-testid="theme-option-light"]').click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('nút chuyển theme hiển thị trên web public và PWA', async ({ page }) => {
    // Web public
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const publicToggle = page.locator('[data-testid="theme-toggle"]').first();
    await expect(publicToggle).toBeVisible();

    // PWA mobile
    await page.goto('/admin/m');
    await page.waitForLoadState('domcontentloaded');
    const pwaToggle = page.locator('[data-testid="theme-toggle"]').first();
    await expect(pwaToggle).toBeVisible();
  });
});
