import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loginAs } from './fixtures';

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((t) => {
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('xfarm_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('xfarm_theme', 'light');
    }
  }, theme);
  await page.waitForTimeout(300);
}

async function captureAndAssertScreenshot(page: Page, relPath: string, theme: 'light' | 'dark') {
  await setTheme(page, theme);
  const repoRoot = path.resolve(__dirname, '../../..');
  const fullPath = path.resolve(repoRoot, relPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });

  await page.screenshot({ path: fullPath });
  const stat = await fs.stat(fullPath);
  expect(stat.size).toBeLessThanOrEqual(300 * 1024); // <= 300 KB
}

test.describe('UI Pages Theme & Responsive (Dashboard, HR, Tours)', () => {
  test.setTimeout(120_000);

  test('Dashboard Tổng quan (/admin) hiển thị đẹp ở 1400px và 390px, chụp ảnh sáng & tối', async ({
    page,
  }) => {
    await loginAs(page, 'OWNER');

    // 1. Desktop 1400px
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin');
    await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tổng quan' })).toBeVisible();
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();

    // Chụp ảnh sáng & tối
    await captureAndAssertScreenshot(
      page,
      'docs/screenshots/dashboard/dashboard-light.png',
      'light',
    );
    await captureAndAssertScreenshot(page, 'docs/screenshots/dashboard/dashboard-dark.png', 'dark');

    // 2. Mobile 390px
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible();
  });

  test('HR Employees (/admin/hr/employees) hiển thị đẹp, chụp ảnh sáng & tối', async ({ page }) => {
    await loginAs(page, 'OWNER');
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/hr/employees');
    await expect(page.getByRole('heading', { name: /quản lý nhân viên/i })).toBeVisible();

    await captureAndAssertScreenshot(page, 'docs/screenshots/hr/employees-light.png', 'light');
    await captureAndAssertScreenshot(page, 'docs/screenshots/hr/employees-dark.png', 'dark');

    // Mobile check
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('heading', { name: /quản lý nhân viên/i })).toBeVisible();
  });

  test('HR Tasks (/admin/hr/tasks) hiển thị đẹp, chụp ảnh sáng & tối', async ({ page }) => {
    await loginAs(page, 'OWNER');
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/hr/tasks');
    await expect(page.getByRole('heading', { name: /giao việc & tiến độ/i })).toBeVisible();

    await captureAndAssertScreenshot(page, 'docs/screenshots/hr/tasks-light.png', 'light');
    await captureAndAssertScreenshot(page, 'docs/screenshots/hr/tasks-dark.png', 'dark');

    // Mobile check
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('heading', { name: /giao việc & tiến độ/i })).toBeVisible();
  });

  test('HR Attendance (/admin/hr/attendance) hiển thị đẹp, chụp ảnh sáng & tối', async ({
    page,
  }) => {
    await loginAs(page, 'OWNER');
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/hr/attendance');
    await expect(page.getByRole('heading', { name: /lưới chấm công tuần/i })).toBeVisible();

    await captureAndAssertScreenshot(page, 'docs/screenshots/hr/attendance-light.png', 'light');
    await captureAndAssertScreenshot(page, 'docs/screenshots/hr/attendance-dark.png', 'dark');

    // Mobile check
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('heading', { name: /lưới chấm công tuần/i })).toBeVisible();
  });

  test('HR Payroll (/admin/hr/payroll) hiển thị đẹp, chụp ảnh sáng & tối', async ({ page }) => {
    await loginAs(page, 'OWNER');
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/hr/payroll');
    await expect(page.getByRole('heading', { name: /bảng lương nhân sự/i })).toBeVisible();

    await captureAndAssertScreenshot(page, 'docs/screenshots/hr/payroll-light.png', 'light');
    await captureAndAssertScreenshot(page, 'docs/screenshots/hr/payroll-dark.png', 'dark');

    // Mobile check
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('heading', { name: /bảng lương nhân sự/i })).toBeVisible();
  });

  test('Tours Management (/admin/tours) hiển thị đẹp, chụp ảnh sáng & tối', async ({ page }) => {
    await loginAs(page, 'OWNER');
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/tours');
    await expect(page.getByRole('heading', { name: /quản lý tour du lịch/i })).toBeVisible();

    await captureAndAssertScreenshot(page, 'docs/screenshots/tours/tours-light.png', 'light');
    await captureAndAssertScreenshot(page, 'docs/screenshots/tours/tours-dark.png', 'dark');

    // Mobile check
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('heading', { name: /quản lý tour du lịch/i })).toBeVisible();
  });

  test('Tours Bookings (/admin/tours/bookings) hiển thị đẹp, chụp ảnh sáng & tối', async ({
    page,
  }) => {
    await loginAs(page, 'OWNER');
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/tours/bookings');
    await expect(page.getByRole('heading', { name: /quản lý đặt chỗ tour/i })).toBeVisible();

    await captureAndAssertScreenshot(page, 'docs/screenshots/tours/bookings-light.png', 'light');
    await captureAndAssertScreenshot(page, 'docs/screenshots/tours/bookings-dark.png', 'dark');

    // Mobile check
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('heading', { name: /quản lý đặt chỗ tour/i })).toBeVisible();
  });

  test('Tour Detail (/admin/tours/[id]) hiển thị đẹp, chụp ảnh sáng & tối', async ({ page }) => {
    await loginAs(page, 'OWNER');
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/admin/tours');

    // Check if there is an existing tour, or create a quick one if none exists
    const tourLinks = page.locator('table tbody tr a');
    const tourCount = await tourLinks.count();
    if (tourCount > 0) {
      await tourLinks.first().click();
    } else {
      // Create a tour
      const addTourBtn = page.getByRole('button', { name: /thêm tour mới/i });
      await addTourBtn.click();
      await page.locator('#tour-name').fill(`Tour Trải Nghiệm Demo ${Date.now()}`);
      await page.locator('#tour-duration').fill('90');
      await page.locator('#tour-capacity').fill('20');
      await page.locator('#tour-price-adult').fill('150000');
      await page.locator('#tour-price-child').fill('80000');
      const tiptapEditor = page.locator('[data-testid="rich-text-editor"] .tiptap');
      await tiptapEditor.click();
      await tiptapEditor.fill('Mô tả tour trải nghiệm sinh thái XFarm');
      await page.getByRole('button', { name: /tạo tour/i }).click();
      await page.waitForTimeout(1000);
      await page.locator('table tbody tr a').first().click();
    }

    await page.waitForURL('**/admin/tours/**');
    await page.waitForTimeout(500);

    await captureAndAssertScreenshot(page, 'docs/screenshots/tours/tour-detail-light.png', 'light');
    await captureAndAssertScreenshot(page, 'docs/screenshots/tours/tour-detail-dark.png', 'dark');

    // Mobile check
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
  });
});
