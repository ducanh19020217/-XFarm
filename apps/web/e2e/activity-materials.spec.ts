import { expect, expectDialogInViewport, loginAs, test } from './fixtures';

async function selectItem(page: import('@playwright/test').Page, itemName: string) {
  const select = page.getByLabel('Chọn vật tư');
  const option = select.locator('option').filter({ hasText: itemName }).first();
  const value = await option.getAttribute('value');
  expect(value).toBeTruthy();
  await select.selectOption(value!);
}

test.describe('Nhật ký sản xuất có vật tư sử dụng', () => {
  test('ghi bón phân dùng 3 kg thì tồn giảm 3', async ({ page, errors }) => {
    test.fixme(
      true,
      'Test phụ phụ thuộc dữ liệu tồn phân trang; luồng nghiệm thu chính ở phase2-acceptance',
    );
    await loginAs(page, 'OWNER');
    const suffix = Date.now();
    const itemName = `Phân nhật ký ${suffix}`;
    const sku = `ACT-${suffix}`;

    await page.goto('/admin/inventory/items');
    await page.getByRole('button', { name: /thêm vật tư/i }).click();
    await expectDialogInViewport(page);
    await page.locator('#item-sku').fill(sku);
    await page.locator('#item-name').fill(itemName);
    await page.locator('#item-category').selectOption('FERTILIZER');
    await page.locator('#item-unit').fill('kg');
    await page.getByRole('button', { name: 'Tạo mới' }).click();
    await expect(page.getByText(itemName).first()).toBeVisible();

    await page.goto('/admin/inventory/documents');
    await page.getByRole('button', { name: /phiếu nhập/i }).click();
    await page.locator('#receipt-warehouse').selectOption({ index: 1 });
    const receiptItem = page.locator('select[aria-label="Vật tư dòng 1"]');
    const receiptOption = receiptItem.locator('option').filter({ hasText: itemName }).first();
    await receiptItem.selectOption((await receiptOption.getAttribute('value'))!);
    await page.locator('input[aria-label="Số lượng dòng 1"]').fill('10');
    await page.locator('input[aria-label="Đơn giá dòng 1"]').fill('50000');
    await page.getByRole('button', { name: /tạo phiếu nhập/i }).click();
    await expect(page.getByText(/tạo phiếu nhập thành công/i)).toBeVisible();

    await page.goto('/admin/activities');
    await page.getByRole('button', { name: /ghi nhật ký/i }).click();
    await page.getByLabel('Khu/lô *').selectOption({ index: 1 });
    await page.getByLabel('Loại nhật ký *').selectOption('FERTILIZING');
    await selectItem(page, itemName);
    await page.getByLabel('Số lượng vật tư').fill('3');
    await page.getByRole('button', { name: /lưu nhật ký/i }).click();
    await expect(page.getByRole('cell', { name: /bón phân/i }).first()).toBeVisible();

    await page.goto('/admin/inventory');
    const row = page.locator('tbody tr').filter({ hasText: itemName });
    await expect(row).toContainText('7');
    errors.assertClean();
  });
});
