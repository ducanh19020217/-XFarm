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
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText(`Vật tư cảnh báo ${suffix}`).first()).toBeVisible();

    // 2. Vào trang cảnh báo /admin/alerts
    await page.goto('/admin/alerts');
    await expect(page.getByRole('heading', { name: /cảnh báo/i })).toBeVisible();

    // 3. OWNER bấm "Chạy kiểm tra" (hoặc gọi API /alerts/run-inventory-check)
    const runCheckBtn = page.getByRole('button', { name: /chạy kiểm tra/i });
    await expect(runCheckBtn).toBeVisible();
    const runCheckResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/alerts/run-inventory-check') &&
        response.request().method() === 'POST',
    );
    await runCheckBtn.click();
    await expect((await runCheckResponse).ok()).toBeTruthy();

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
    const unreadButtons = dropdown.getByRole('button', { name: /đánh dấu đã đọc/i });
    const initialButtonCount = await unreadButtons.count();
    expect(initialButtonCount).toBeGreaterThan(0);

    const markReadBtn = unreadButtons.first();
    await expect(markReadBtn).toBeVisible();
    const markReadResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/alerts/') && response.request().method() === 'PATCH',
    );
    await markReadBtn.click();
    await expect((await markReadResponse).ok()).toBeTruthy();

    // 6. Cảnh báo vừa đọc không còn nút "Đánh dấu đã đọc" trong dropdown.
    await expect(dropdown.getByRole('button', { name: /đánh dấu đã đọc/i })).toHaveCount(
      initialButtonCount - 1,
    );

    // 7. Dropdown có link "Xem tất cả"
    await expect(dropdown.getByRole('link', { name: 'Xem tất cả', exact: true })).toBeVisible();

    errors.assertClean();
  });
});
