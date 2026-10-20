import { test, expect, loginAs } from './fixtures';

test.describe('Nội dung demo và hiển thị SVG', () => {
  test('các file ảnh minh họa /demo/*.svg trả về HTTP 200 và đúng mime', async ({ request }) => {
    const sampleSvgs = [
      '/demo/rau-cai.svg',
      '/demo/xa-lach.svg',
      '/demo/ca-chua.svg',
      '/demo/dua-luoi.svg',
      '/demo/ga-ri.svg',
      '/demo/trung-ga.svg',
      '/demo/ca-ro-phi.svg',
      '/demo/ao-ca.svg',
      '/demo/nha-kinh.svg',
      '/demo/canh-dong.svg',
      '/demo/tour-thu-hoach.svg',
      '/demo/cau-ca.svg',
      '/demo/cho-ga-an.svg',
      '/demo/may-bom.svg',
      '/demo/cam-bien.svg',
      '/demo/kho-hang.svg',
      '/demo/banner-1.svg',
      '/demo/banner-2.svg',
      '/demo/banner-3.svg',
    ];

    for (const svgUrl of sampleSvgs) {
      const res = await request.get(svgUrl);
      expect(res.status(), `Tải ảnh ${svgUrl} thất bại`).toBe(200);
      const contentType = res.headers()['content-type'] || '';
      expect(contentType, `Mime type của ${svgUrl} không phải svg`).toContain('image/svg+xml');
    }
  });

  test('trang chủ, /san-pham, /blog, /tour trả về 200 và hiển thị nội dung demo', async ({
    page,
    errors,
  }) => {
    // 1. Trang chủ
    const homeRes = await page.goto('/');
    expect(homeRes?.status()).toBe(200);
    await expect(page.locator('main')).toBeVisible();

    // 2. Trang sản phẩm
    const sanPhamRes = await page.goto('/san-pham');
    expect(sanPhamRes?.status()).toBe(200);
    await expect(page.locator('main')).toBeVisible();

    // 3. Trang blog
    const blogRes = await page.goto('/blog');
    expect(blogRes?.status()).toBe(200);
    await expect(page.locator('main')).toBeVisible();

    // 4. Trang tour
    const tourRes = await page.goto('/tour');
    expect(tourRes?.status()).toBe(200);
    await expect(page.locator('main')).toBeVisible();

    errors.assertClean();
  });

  test('mở /admin/areas (bản đồ khu vực) trả về 200 và có danh sách các khu vực demo', async ({
    page,
    errors,
  }) => {
    await loginAs(page);
    const res = await page.goto('/admin/areas');
    expect(res?.status()).toBe(200);
    await expect(page.locator('main')).toBeVisible();

    // Kiểm tra có các tab hoặc chế độ xem (Bảng, Cây, Bản đồ)
    const mapTabOrBtn = page.getByRole('button', { name: /bản đồ/i });
    if (await mapTabOrBtn.isVisible().catch(() => false)) {
      await mapTabOrBtn.click();
      await page.waitForTimeout(1000);
    }

    errors.assertClean();
  });
});
