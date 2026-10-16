import { expect, loginAs, test } from './fixtures';

try {
  process.loadEnvFile?.('../../.env');
} catch {}
try {
  process.loadEnvFile?.('../.env');
} catch {}
try {
  process.loadEnvFile?.('.env');
} catch {}
const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api/v1';

test.describe('PWA Offline IndexedDB Queue & Idempotent Auto-Sync (p6-pwa-offline)', () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test('Ghi 2 nhật ký khi offline, bật lại mạng tự đồng bộ, reload không tạo trùng', async ({
    page,
    context,
  }) => {
    // 1. Kiểm tra endpoint đồng bộ thật /sync/batch (p6-api-sync chạy song song có thể chưa merge)
    const apiCheck = await fetch(`${apiBase}/sync/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    }).catch(() => null);

    if (!apiCheck || apiCheck.status === 404) {
      test.fixme(
        true,
        'API POST /sync/batch chưa merge vào backend API server (task p6-api-sync chạy song song)',
      );
    }

    // 2. Đăng nhập với vai trò WORKER và nạp dữ liệu ban đầu
    await loginAs(page, 'WORKER');
    await page.goto('/admin/m/quick-log');
    await expect(page.getByRole('heading', { name: /ghi nhanh nhật ký/i })).toBeVisible();

    // Đợi nạp danh sách khu/lô vào cache
    await page.waitForTimeout(1000);

    // 3. Ngắt kết nối mạng (Offline)
    await context.setOffline(true);

    // 4. Ghi nhật ký nhanh lần 1 khi offline
    // Chọn khu/lô đầu tiên nếu chưa chọn
    const areaSelect = page.locator('button[role="combobox"]').first();
    if (await areaSelect.isVisible()) {
      await areaSelect.click();
      const firstAreaOption = page.locator('div[role="option"]').first();
      if (await firstAreaOption.isVisible()) {
        await firstAreaOption.click();
      }
    }

    await page.locator('textarea').fill('Nhật ký offline 1 - Tưới nước khu A');
    await page.getByRole('button', { name: /lưu nhật ký/i }).click();

    // Kiểm tra đã về màn hình chính và thanh trạng thái xuất hiện "1 thao tác chờ"
    await expect(page).toHaveURL(/\/admin\/m/);
    await expect(page.getByText(/1 thao tác chờ/i)).toBeVisible();

    // 5. Ghi nhật ký nhanh lần 2 khi offline
    await page.goto('/admin/m/quick-log');
    await expect(page.getByRole('heading', { name: /ghi nhanh nhật ký/i })).toBeVisible();

    if (await areaSelect.isVisible()) {
      await areaSelect.click();
      const firstAreaOption = page.locator('div[role="option"]').first();
      if (await firstAreaOption.isVisible()) {
        await firstAreaOption.click();
      }
    }

    await page.locator('textarea').fill('Nhật ký offline 2 - Bón phân khu A');
    await page.getByRole('button', { name: /lưu nhật ký/i }).click();

    // Kiểm tra về màn hình chính và thanh trạng thái hiển thị "2 thao tác chờ"
    await expect(page).toHaveURL(/\/admin\/m/);
    await expect(page.getByText(/2 thao tác chờ/i)).toBeVisible();

    // Mở màn hình outbox để kiểm tra đủ 2 thao tác
    await page.goto('/admin/m/outbox');
    await expect(page.getByText(/2 thao tác trong hàng đợi/i)).toBeVisible();

    // 6. Bật lại mạng (Online)
    await context.setOffline(false);

    // Quay lại trang chính và đợi tự động đồng bộ khi có mạng lại
    await page.goto('/admin/m');

    // Chờ hệ thống tự động đồng bộ xong
    await expect(page.getByText(/đã đồng bộ/i)).toBeVisible({ timeout: 15000 });

    // Kiểm tra outbox đã trống sau khi đồng bộ
    await page.goto('/admin/m/outbox');
    await expect(page.getByText(/hàng đợi trống/i)).toBeVisible();

    // 7. Reload trang và xác nhận không phát sinh trùng lặp
    await page.reload();
    await expect(page.getByText(/hàng đợi trống/i)).toBeVisible();
  });
});
