import { expect, loginAs, test } from './fixtures';

test.describe('Quản lý tồn kho và phiếu kho (Inventory Stock E2E)', () => {
  test('nhập 10 kg rồi xuất 3 kg thì tồn hiện 7; xuất quá tồn thì thấy lỗi tiếng Việt', async ({
    page,
    errors,
  }) => {
    // Đánh dấu fixme do API thực tế từ task p2-api-stock-docs đang chạy song song, chưa merge vào nhánh này.
    // Claude sẽ bật lại test khi merge API backend.
    test.fixme(true, 'Chờ API p2-api-stock-docs merge vào nhánh');

    await loginAs(page, 'OWNER');

    // 1. Vào trang chứng từ kho và lập phiếu nhập 10 kg
    await page.goto('/admin/inventory/documents');
    await page.getByRole('button', { name: /phiếu nhập/i }).click();

    // Điền thông tin phiếu nhập
    await page.locator('#receipt-warehouse').selectOption({ index: 1 });
    await page.locator('select[aria-label="Vật tư dòng 1"]').selectOption({ index: 1 });
    await page.locator('input[aria-label="Số lượng dòng 1"]').fill('10');
    await page.locator('input[aria-label="Đơn giá dòng 1"]').fill('50000');
    await page.getByRole('button', { name: /tạo phiếu nhập/i }).click();

    // 2. Chuyển sang trang Tồn kho để kiểm tra tồn 10 kg
    await page.goto('/admin/inventory');
    await expect(page.getByText(/10\s*(kg|gói|hộp|con|cây)?/i)).toBeVisible();

    // 3. Lập phiếu xuất 3 kg
    await page.goto('/admin/inventory/documents');
    await page.getByRole('button', { name: /phiếu xuất/i }).click();

    await page.locator('#issue-warehouse').selectOption({ index: 1 });
    await page.locator('select[aria-label="Vật tư dòng 1"]').selectOption({ index: 1 });
    await page.locator('input[aria-label="Số lượng dòng 1"]').fill('3');
    await page.getByRole('button', { name: /tạo phiếu xuất/i }).click();

    // 4. Kiểm tra tồn kho sau xuất giảm còn 7 kg
    await page.goto('/admin/inventory');
    await expect(page.getByText(/7\s*(kg|gói|hộp|con|cây)?/i)).toBeVisible();

    // 5. Thử xuất quá tồn (ví dụ 100 kg) -> hiển thị lỗi 422 bằng tiếng Việt
    await page.goto('/admin/inventory/documents');
    await page.getByRole('button', { name: /phiếu xuất/i }).click();

    await page.locator('#issue-warehouse').selectOption({ index: 1 });
    await page.locator('select[aria-label="Vật tư dòng 1"]').selectOption({ index: 1 });
    await page.locator('input[aria-label="Số lượng dòng 1"]').fill('100');
    await page.getByRole('button', { name: /tạo phiếu xuất/i }).click();

    // Kiểm tra thông báo lỗi tiếng Việt hiển thị
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/không đủ tồn|lỗi xuất kho/i);

    errors.assertClean();
  });
});
