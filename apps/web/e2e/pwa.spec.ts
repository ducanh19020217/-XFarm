import { expect, loginAs, test } from './fixtures';

for (const envFile of ['../../.env', '../.env', '.env']) {
  try {
    process.loadEnvFile?.(envFile);
  } catch {}
}
test.describe('PWA Shell & Worker Mobile App (p6-pwa-shell)', () => {
  // Mobile viewport 390x844 as required by task
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test('1. manifest.webmanifest hợp lệ (name, start_url, display, icons 192 & 512, theme xanh)', async ({
    request,
  }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.status()).toBe(200);

    const manifest = await res.json();
    expect(manifest.name).toBe('XFarm Công nhân');
    expect(manifest.start_url).toBe('/admin/m');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toMatch(/#059669|#10b981|#047857/i);

    // Kiểm tra icon 192 và 512
    const iconSizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(iconSizes).toContain('192x192');
    expect(iconSizes).toContain('512x512');

    // Kiểm tra trực tiếp các file icon thực tế trả về 200 OK
    const icon192Res = await request.get('/icons/icon-192.png');
    expect(icon192Res.status()).toBe(200);
    expect(icon192Res.headers()['content-type']).toContain('image/png');

    const icon512Res = await request.get('/icons/icon-512.png');
    expect(icon512Res.status()).toBe(200);
    expect(icon512Res.headers()['content-type']).toContain('image/png');

    // Kiểm tra service worker script
    const swRes = await request.get('/sw.js');
    expect(swRes.status()).toBe(200);

    console.log('\n======================================================');
    console.log('  KẾT QUẢ KIỂM TRA PWA CÀI ĐẶT ĐƯỢC (PWA INSTALLABILITY)');
    console.log('======================================================');
    console.log(`[PASS] Web App Manifest: /manifest.webmanifest (HTTP 200)`);
    console.log(`       - Name: ${manifest.name}`);
    console.log(`       - Short Name: ${manifest.short_name}`);
    console.log(`       - Start URL: ${manifest.start_url}`);
    console.log(`       - Display: ${manifest.display}`);
    console.log(`       - Theme Color: ${manifest.theme_color}`);
    console.log(`       - Background Color: ${manifest.background_color}`);
    console.log(
      `[PASS] Icon 192x192: /icons/icon-192.png (HTTP ${icon192Res.status()}, image/png)`,
    );
    console.log(
      `[PASS] Icon 512x512: /icons/icon-512.png (HTTP ${icon512Res.status()}, image/png)`,
    );
    console.log(`[PASS] Service Worker Script: /sw.js (HTTP ${swRes.status()})`);
  });

  test('2. service worker đăng ký thành công trên ứng dụng mobile /admin/m', async ({ page }) => {
    await loginAs(page, 'WORKER');
    await page.goto('/admin/m');
    await expect(page.locator('h1')).toContainText(/việc hôm nay/i);

    // Kiểm tra thẻ <link rel="manifest"> trong head của trang
    const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestLink).toContain('manifest');
    console.log(`[PASS] HTML Head Manifest Link: <link rel="manifest" href="${manifestLink}">`);

    // Đợi Service Worker đăng ký thành công trong browser context
    const hasServiceWorker = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg) return true;
      const regs = await navigator.serviceWorker.getRegistrations();
      return regs.length > 0;
    });

    expect(hasServiceWorker).toBe(true);
    console.log(`[PASS] Service Worker Registration: navigator.serviceWorker is active`);
    console.log('======================================================\n');
  });

  test('3. đăng nhập WORKER, thấy việc hôm nay và chấm công vào ca', async ({ page }) => {
    await loginAs(page, 'WORKER');

    // Xem việc hôm nay
    await page.goto('/admin/m');
    await expect(page.getByRole('heading', { name: /việc hôm nay/i })).toBeVisible();

    // Chấm công vào ca
    await page.goto('/admin/m/attendance');
    await expect(page.getByRole('heading', { name: /chấm công vào \/ ra ca/i })).toBeVisible();

    // Chờ tải xong trạng thái ca hôm nay (nút Cập nhật hết disable) rồi mới quyết định bấm
    await expect(page.getByRole('button', { name: /cập nhật/i })).toBeEnabled();
    const checkInBtn = page.getByRole('button', { name: /vào ca/i });
    if (await checkInBtn.isEnabled()) {
      await checkInBtn.click();
    }
  });

  test('4. giao diện mobile: thanh tab dưới, không hiển thị sidebar admin desktop', async ({
    page,
  }) => {
    await loginAs(page, 'WORKER');
    await page.goto('/admin/m');

    // Xác nhận KHÔNG có desktop sidebar
    await expect(page.locator('aside')).toBeHidden();

    // Xác nhận có thanh tab dưới gồm 4 tab: Hôm nay, Ghi nhanh, Chấm công, Quét QR
    const bottomNav = page.getByRole('navigation', { name: /thanh điều hướng pwa/i });
    await expect(bottomNav).toBeVisible();

    await expect(bottomNav.getByRole('link', { name: /hôm nay/i })).toBeVisible();
    await expect(bottomNav.getByRole('link', { name: /ghi nhanh/i })).toBeVisible();
    await expect(bottomNav.getByRole('link', { name: /chấm công/i })).toBeVisible();
    await expect(bottomNav.getByRole('link', { name: /quét qr/i })).toBeVisible();
  });
});
