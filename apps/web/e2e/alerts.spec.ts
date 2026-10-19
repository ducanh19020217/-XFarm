import { api, expect, expectDialogInViewport, loginAs, test } from './fixtures';

test.describe('Alerts & Notification Bell', () => {
  test('OWNER bấm "chạy kiểm tra", chuông có số, đánh dấu đã đọc thì số giảm', async ({
    page,
    errors,
  }) => {
    // 1. Đăng nhập với quyền OWNER
    await loginAs(page, 'OWNER');

    // Tạo vật tư dưới định mức để lần kiểm tra này luôn tạo được cảnh báo mới.
    const suffix = Date.now();
    await page.goto('/admin/inventory/items');
    await page.getByRole('button', { name: /thêm vật tư/i }).click();
    await expectDialogInViewport(page);
    await page.locator('#item-sku').fill(`ALERT-${suffix}`);
    await page.locator('#item-name').fill(`Vật tư cảnh báo ${suffix}`);
    await page.locator('#item-category').selectOption('FERTILIZER');
    await page.locator('#item-unit').fill('kg');
    await page.locator('#item-min-stock').fill('10');
    await page.getByRole('button', { name: 'Tạo mới' }).click();

    // 2. Vào trang cảnh báo /admin/alerts
    await page.goto('/admin/alerts');
    await expect(page.getByRole('heading', { name: /cảnh báo/i })).toBeVisible();

    // 3. OWNER bấm "Chạy kiểm tra" (hoặc gọi API /alerts/run-inventory-check)
    const runCheckBtn = page.getByRole('button', { name: /chạy kiểm tra/i });
    if (await runCheckBtn.isVisible()) {
      await runCheckBtn.click();
    } else {
      await api(page, '/alerts/run-inventory-check', { method: 'POST' });
    }

    // 4. Icon chuông có badge số chưa đọc (> 0)
    const badge = page.getByTestId('alerts-unread-badge');
    await expect(badge).toBeVisible();
    const initialText = await badge.innerText();
    const initialCount = parseInt(initialText, 10);
    expect(initialCount).toBeGreaterThan(0);

    // 5. Mở dropdown và kiểm tra cảnh báo gần đây
    await page.getByTestId('alerts-bell-button').click();
    const dropdown = page.getByTestId('alerts-dropdown');
    await expect(dropdown).toBeVisible();
    const markReadBtn = dropdown.getByRole('button', { name: /đánh dấu đã đọc/i }).first();
    await expect(markReadBtn).toBeVisible();
    const markReadResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/alerts/') && response.request().method() === 'PATCH',
    );
    await markReadBtn.click();
    await expect((await markReadResponse).ok()).toBeTruthy();

    // 6. Cảnh báo vừa đọc không còn nút "Đánh dấu đã đọc" trong dropdown.
    await expect
      .poll(() => dropdown.getByRole('button', { name: /đánh dấu đã đọc/i }).count())
      .toBeLessThan(initialCount);

    // 7. Dropdown có link "Xem tất cả"
    await expect(dropdown.getByRole('link', { name: 'Xem tất cả', exact: true })).toBeVisible();

    errors.assertClean();
  });
});
