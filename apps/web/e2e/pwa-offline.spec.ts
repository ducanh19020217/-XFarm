import { api, expect, loginAs, test } from './fixtures';

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
    test.setTimeout(60_000);
    // 1. Kiểm tra endpoint đồng bộ thật /sync/batch (đã merge vào backend API server)
    const apiCheck = await fetch(`${apiBase}/sync/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    });
    expect(apiCheck.status).not.toBe(404);

    // 2. Đăng nhập với vai trò WORKER và nạp dữ liệu ban đầu
    await loginAs(page, 'WORKER');
    // Chờ Service Worker đăng ký và kiểm soát trang trước khi điều hướng tới module PWA
    await page.waitForFunction(
      () => 'serviceWorker' in navigator && !!navigator.serviceWorker.controller,
    );
    await page.goto('/admin/m/quick-log');
    await expect(page.getByRole('heading', { name: /ghi nhanh nhật ký/i })).toBeVisible();

    const areaSelect = page.locator('button[role="combobox"]').first();
    await expect(areaSelect).toBeEnabled();

    // Lấy số lượng nhật ký ban đầu qua API để kiểm tra sau đồng bộ
    const initialActivitiesRes = await api<{ data: Array<{ id: string; notes?: string }> }>(
      page,
      '/activities?pageSize=100',
    );
    const initialCount = initialActivitiesRes?.data?.length ?? 0;

    // 3. Ngắt kết nối mạng (Offline)
    await context.setOffline(true);

    const runId = Date.now();
    const note1 = `Nhật ký offline 1 - Tưới nước ${runId}`;
    const note2 = `Nhật ký offline 2 - Bón phân ${runId}`;

    // 4. Ghi nhật ký nhanh lần 1 khi offline (Tưới nước: điền bắt buộc thời gian tưới 20 phút)
    await expect(areaSelect).toBeEnabled();
    await areaSelect.click();
    const firstAreaOption = page.locator('div[role="option"]').first();
    await expect(firstAreaOption).toBeVisible();
    await firstAreaOption.click();

    await page.locator('input[name="durationMin"]').fill('20');
    await page.locator('textarea').fill(note1);
    await page.getByRole('button', { name: /lưu nhật ký/i }).click();

    // Kiểm tra đã về màn hình chính và thanh trạng thái xuất hiện "1 thao tác chờ"
    await expect(page).toHaveURL(/\/admin\/m/);
    await expect(page.getByText(/1 thao tác chờ/i)).toBeVisible();

    // 5. Ghi nhật ký nhanh lần 2 khi offline (Bón phân)
    await page.goto('/admin/m/quick-log');
    await expect(page.getByRole('heading', { name: /ghi nhanh nhật ký/i })).toBeVisible();

    await expect(areaSelect).toBeEnabled();
    await areaSelect.click();
    const secondAreaOption = page.locator('div[role="option"]').first();
    await expect(secondAreaOption).toBeVisible();
    await secondAreaOption.click();

    await page.getByRole('button', { name: /bón phân/i }).click();
    await page.locator('textarea').fill(note2);
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
    // Chờ hệ thống tự động đồng bộ xong
    await expect(page.getByText(/đã đồng bộ/i)).toBeVisible({ timeout: 15000 });

    // Kiểm tra outbox đã trống sau khi đồng bộ
    await page.goto('/admin/m/outbox');
    await expect(page.getByText(/hàng đợi trống/i)).toBeVisible();

    // 7. Kiểm tra qua API có đúng 2 activity mới được tạo từ 2 thao tác offline (không trùng)
    const afterSyncRes = await api<{ data: Array<{ id: string; notes?: string }> }>(
      page,
      '/activities?pageSize=100',
    );
    const syncedNotes = (afterSyncRes?.data || [])
      .map((a) => a.notes)
      .filter((note) => note === note1 || note === note2);
    expect(syncedNotes).toHaveLength(2);
    expect(afterSyncRes?.data?.length ?? 0).toBe(initialCount + 2);

    // 8. Reload trang và xác nhận không phát sinh trùng lặp
    await page.reload();
    await expect(page.getByText(/hàng đợi trống/i)).toBeVisible();

    const afterReloadRes = await api<{ data: Array<{ id: string; notes?: string }> }>(
      page,
      '/activities?pageSize=100',
    );
    const syncedNotesAfterReload = (afterReloadRes?.data || [])
      .map((a) => a.notes)
      .filter((note) => note === note1 || note === note2);
    expect(syncedNotesAfterReload).toHaveLength(2);
    expect(afterReloadRes?.data?.length ?? 0).toBe(initialCount + 2);
  });
});
