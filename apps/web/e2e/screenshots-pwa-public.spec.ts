import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
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
  await page.waitForTimeout(400);
}

async function captureScreenshot(page: Page, filePath: string) {
  await page.screenshot({ path: filePath });
  const stat = await fs.stat(filePath);
  if (stat.size > 280 * 1024) {
    try {
      execSync(
        `python3 -c "from PIL import Image; img = Image.open('${filePath}'); q = img.convert('P', palette=Image.Palette.ADAPTIVE, colors=256); q.save('${filePath}', optimize=True)"`,
      );
    } catch {
      // fallback
    }
  }
  const finalStat = await fs.stat(filePath);
  expect(finalStat.size).toBeLessThanOrEqual(300 * 1024);
}

test.describe('Capture light and dark screenshots for PWA and Public pages', () => {
  test.setTimeout(240_000);

  test('Capture PWA mobile screenshots and verify file sizes <= 300 KB', async ({ page }) => {
    await loginAs(page, 'WORKER');

    const repoRoot = path.resolve(__dirname, '../../..');
    const screenshotsDir = path.resolve(repoRoot, 'docs/screenshots');
    await fs.mkdir(path.resolve(screenshotsDir, 'pwa'), { recursive: true });

    const pwaPages = [
      { pageName: 'today', url: '/admin/m' },
      { pageName: 'quick-log', url: '/admin/m/quick-log' },
      { pageName: 'attendance', url: '/admin/m/attendance' },
      { pageName: 'scan', url: '/admin/m/scan' },
      { pageName: 'outbox', url: '/admin/m/outbox' },
    ];

    for (const item of pwaPages) {
      // PWA is designed primarily for mobile 390px
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(item.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      // Light mode screenshot
      await setTheme(page, 'light');
      const lightPath = path.resolve(screenshotsDir, 'pwa', `${item.pageName}-light.png`);
      await captureScreenshot(page, lightPath);

      // Dark mode screenshot
      await setTheme(page, 'dark');
      const darkPath = path.resolve(screenshotsDir, 'pwa', `${item.pageName}-dark.png`);
      await captureScreenshot(page, darkPath);

      // Desktop 1400px verification
      await page.setViewportSize({ width: 1400, height: 900 });
      await page.waitForTimeout(300);
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('Capture Public web screenshots and verify file sizes <= 300 KB', async ({ page }) => {
    const repoRoot = path.resolve(__dirname, '../../..');
    const screenshotsDir = path.resolve(repoRoot, 'docs/screenshots');
    await fs.mkdir(path.resolve(screenshotsDir, 'public'), { recursive: true });

    // Find first product slug and first tour slug
    let productSlug = 'demo-prod-cai-ngot';
    try {
      const prodRes = await api<{ data: Array<{ slug: string }> }>(page, '/public/products?pageSize=1');
      if (prodRes.data?.[0]?.slug) {
        productSlug = prodRes.data[0].slug;
      }
    } catch {}

    let tourSlug = 'demo-tour-kham-pha-nong-trai-xanh';
    try {
      const tourRes = await api<{ data: Array<{ slug: string }> }>(page, '/public/tours?pageSize=1');
      if (tourRes.data?.[0]?.slug) {
        tourSlug = tourRes.data[0].slug;
      }
    } catch {}

    const publicPages = [
      { pageName: 'home', url: '/' },
      { pageName: 'products', url: '/san-pham' },
      { pageName: 'product-detail', url: `/san-pham/${productSlug}` },
      { pageName: 'tours', url: '/tour' },
      { pageName: 'tour-detail', url: `/tour/${tourSlug}` },
      { pageName: 'blog', url: '/blog' },
      { pageName: 'about', url: '/gioi-thieu' },
      { pageName: 'contact', url: '/lien-he' },
      { pageName: 'cart', url: '/gio-hang' },
      { pageName: 'checkout', url: '/thanh-toan' },
      { pageName: 'order-lookup', url: '/tra-cuu-don' },
      { pageName: 'tour-lookup', url: '/tour/tra-cuu' },
      { pageName: 'trace', url: '/trace/DEMO000001' },
    ];

    for (const item of publicPages) {
      // 1. Desktop Viewport (1400px)
      await page.setViewportSize({ width: 1400, height: 900 });
      await page.goto(item.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      // Light mode screenshot
      await setTheme(page, 'light');
      const lightPath = path.resolve(screenshotsDir, 'public', `${item.pageName}-light.png`);
      await captureScreenshot(page, lightPath);

      // Dark mode screenshot
      await setTheme(page, 'dark');
      const darkPath = path.resolve(screenshotsDir, 'public', `${item.pageName}-dark.png`);
      await captureScreenshot(page, darkPath);

      // 2. Mobile Viewport (390px) responsive check
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(300);
      await expect(page.locator('#main-content')).toBeVisible();
    }
  });
});
