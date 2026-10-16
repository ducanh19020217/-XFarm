import { expect, expectDialogInViewport, loginAs, test } from './fixtures';
import type { Locator } from '@playwright/test';

async function selectOptionByText(select: Locator, text: string) {
  const option = select.locator('option').filter({ hasText: text }).first();
  const value = await option.getAttribute('value');
  expect(value).toBeTruthy();
  await select.selectOption(value!);
}

test.describe('Nghiệm thu GĐ2 qua giao diện', () => {
  test('nhập, sử dụng, xuất kho và nhận một phần đơn mua hàng', async ({ page, errors }) => {
    test.setTimeout(60_000);
    await loginAs(page, 'OWNER');

    const suffix = Date.now();
    const itemName = `AAA Phân nghiệm thu ${suffix}`;
    const sku = `ACCEPT-${suffix}`;

    // Tạo vật tư riêng để nghiệm thu lặp lại không phụ thuộc số tồn của dữ liệu seed.
    await page.goto('/admin/inventory/items');
    await page.getByRole('button', { name: /thêm vật tư/i }).click();
    await expectDialogInViewport(page);
    await page.locator('#item-sku').fill(sku);
    await page.locator('#item-name').fill(itemName);
    await page.locator('#item-category').selectOption('FERTILIZER');
    await page.locator('#item-unit').fill('kg');
    await page.getByRole('button', { name: 'Tạo mới' }).click();
    await expect(page.getByText(itemName).first()).toBeVisible();

    // Nhập đúng 10 kg qua phiếu nhập.
    const inventoryItemsResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/items') &&
        response.url().includes('pageSize=100') &&
        response.request().method() === 'GET',
    );
    await page.goto('/admin/inventory/documents');
    await expect((await inventoryItemsResponse).ok()).toBeTruthy();
    await page.getByRole('button', { name: /phiếu nhập/i }).click();
    await page.locator('#receipt-warehouse').selectOption({ index: 1 });
    await selectOptionByText(page.locator('select[aria-label="Vật tư dòng 1"]'), itemName);
    await page.locator('input[aria-label="Số lượng dòng 1"]').fill('10');
    await page.locator('input[aria-label="Đơn giá dòng 1"]').fill('50000');
    await page.getByRole('button', { name: /tạo phiếu nhập/i }).click();
    await expect(page.getByText(/tạo phiếu nhập thành công/i)).toBeVisible();

    // Ghi nhật ký bón phân dùng 3 kg, tồn còn 7 kg.
    await page.goto('/admin/activities');
    await page.getByRole('button', { name: /ghi nhật ký/i }).click();
    await page.getByLabel('Khu/lô *').selectOption({ index: 1 });
    await page.getByLabel('Loại nhật ký *').selectOption('FERTILIZING');
    await selectOptionByText(page.getByLabel('Chọn vật tư'), itemName);
    await page.getByLabel('Số lượng vật tư').fill('3');
    await page.getByRole('button', { name: /lưu nhật ký/i }).click();
    await expect(page.getByText(itemName).first()).toBeVisible();

    await page.goto('/admin/inventory');
    await page.getByPlaceholder(/tìm kiếm theo mã sku hoặc tên vật tư/i).fill(sku);
    const balanceRow = page.locator('tbody tr').filter({ hasText: itemName });
    await expect(balanceRow).toContainText('7');
    await expect(balanceRow).toContainText('kg');

    // Xuất quá tồn phải bị chặn và hiển thị lỗi trên form.
    await page.goto('/admin/inventory/documents');
    await page.getByRole('button', { name: /phiếu xuất/i }).click();
    await page.locator('#issue-warehouse').selectOption({ index: 1 });
    await selectOptionByText(page.locator('select[aria-label="Vật tư dòng 1"]'), itemName);
    await page.locator('input[aria-label="Số lượng dòng 1"]').fill('8');
    errors.expectError('/stock/issues');
    await page.getByRole('button', { name: /tạo phiếu xuất/i }).click();
    await expect(page.getByRole('alert')).toContainText(/lỗi xuất kho|không đủ tồn/i);

    // Tạo PO và nhận một phần; trạng thái phải là PARTIAL trên UI.
    await page.goto('/admin/purchase-orders');
    await page.getByRole('button', { name: /tạo đơn mua hàng/i }).click();
    await page.locator('#po-supplier').selectOption({ index: 1 });
    await selectOptionByText(page.locator('#po-line-item-0'), itemName);
    await page.locator('#po-line-qty-0').fill('10');
    await page.locator('#po-line-price-0').fill('50000');
    const createdPoResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/purchase-orders') &&
        response.request().method() === 'POST',
    );
    await page
      .getByRole('button', { name: /tạo đơn mua hàng/i })
      .last()
      .click();
    const createdPo = await (await createdPoResponse).json();
    const createdPoId = createdPo?.data?.id as string;
    await expect(page.getByRole('cell', { name: 'Nháp' }).first()).toBeVisible();
    await page.goto(`/admin/purchase-orders/${createdPoId}`);
    await page.getByRole('button', { name: /đặt hàng/i }).click();
    await page
      .getByRole('button', { name: /xác nhận|đặt hàng/i })
      .last()
      .click();
    await expect(page.getByText('Đã đặt').first()).toBeVisible();

    await page.getByRole('button', { name: /nhận hàng/i }).click();
    await page.locator('#receive-warehouse').selectOption({ index: 1 });
    await page.locator('input[id^="receive-qty-"]').fill('4');
    await page.getByRole('button', { name: /xác nhận nhận hàng/i }).click();
    await expect(page.getByText('Nhận một phần').first()).toBeVisible();

    errors.assertClean();
  });
});
