import { expect, loginAs, test, api } from './fixtures';

test.describe('Alerts & Notification Bell', () => {
  test('OWNER bấm "chạy kiểm tra", chuông có số, đánh dấu đã đọc thì số giảm', async ({
    page,
    errors,
  }) => {
    // API /alerts do task p2-alerts-job phát triển song song và chưa merge vào nhánh này.
    // Khi merge vào phase-2-inventory, Claude sẽ gỡ test.fixme để chạy e2e thật.
    test.fixme(
      true,
      'API /alerts chưa có trên nhánh vì task p2-alerts-job chạy song song chưa merge. Claude sẽ bật lại khi merge.',
    );

    // 1. Đăng nhập với quyền OWNER
    await loginAs(page, 'OWNER');

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

    // 5. Kiểm tra danh sách hiển thị cảnh báo
    const alertRow = page.locator('tbody tr').first();
    await expect(alertRow).toBeVisible();

    // 6. Đánh dấu đã đọc một cảnh báo trên trang
    const markReadBtn = page.getByRole('button', { name: /đánh dấu đã đọc/i }).first();
    await expect(markReadBtn).toBeVisible();
    await markReadBtn.click();

    // 7. Số trên chuông giảm
    await expect(async () => {
      const currentText = await badge.innerText().catch(() => '0');
      const currentCount = parseInt(currentText, 10);
      expect(currentCount).toBeLessThan(initialCount);
    }).toPass();

    // 8. Bấm chuông mở dropdown 5 cảnh báo và link "Xem tất cả"
    await page.getByTestId('alerts-bell-button').click();
    const dropdown = page.getByTestId('alerts-dropdown');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.getByRole('link', { name: /xem tất cả/i })).toBeVisible();

    errors.assertClean();
  });
});
