import { expect, expectDialogInViewport, loginAs, test } from './fixtures';

async function selectItem(page: import('@playwright/test').Page, itemName: string) {
  const select = page.locator('select[aria-label="Vật tư dòng 1"]');
  const option = select.locator('option').filter({ hasText: itemName }).first();
  const value = await option.getAttribute('value');
  expect(value).toBeTruthy();
  await select.selectOption(value!);
}

test('nhập 10 kg rồi xuất 3 kg thì tồn hiện 7; xuất quá tồn thì thấy lỗi tiếng Việt', async ({
  page,
  errors,
}) => {
  test.fixme(
    true,
    'Test phụ phụ thuộc dữ liệu tồn phân trang; luồng nghiệm thu chính ở phase2-acceptance',
  );
  test.setTimeout(60_000);
  await loginAs(page, 'OWNER');
  const suffix = Date.now();
  const itemName = `Phân tồn kho ${suffix}`;
  const sku = `STOCK-${suffix}`;

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
  await selectItem(page, itemName);
  await page.locator('input[aria-label="Số lượng dòng 1"]').fill('10');
  await page.locator('input[aria-label="Đơn giá dòng 1"]').fill('50000');
  await page.getByRole('button', { name: /tạo phiếu nhập/i }).click();
  await expect(page.getByText(/tạo phiếu nhập thành công/i)).toBeVisible();

  await page.goto('/admin/inventory');
  let row = page.locator('tbody tr').filter({ hasText: itemName });
  await expect(row).toContainText('10');

  await page.goto('/admin/inventory/documents');
  await page.getByRole('button', { name: /phiếu xuất/i }).click();
  await page.locator('#issue-warehouse').selectOption({ index: 1 });
  await selectItem(page, itemName);
  await page.locator('input[aria-label="Số lượng dòng 1"]').fill('3');
  await page.getByRole('button', { name: /tạo phiếu xuất/i }).click();
  await expect(page.getByText(/tạo phiếu xuất thành công/i)).toBeVisible();

  await page.goto('/admin/inventory');
  row = page.locator('tbody tr').filter({ hasText: itemName });
  await expect(row).toContainText('7');

  await page.goto('/admin/inventory/documents');
  await page.getByRole('button', { name: /phiếu xuất/i }).click();
  await page.locator('#issue-warehouse').selectOption({ index: 1 });
  await selectItem(page, itemName);
  await page.locator('input[aria-label="Số lượng dòng 1"]').fill('8');
  errors.expectError('/stock/issues');
  await page.getByRole('button', { name: /tạo phiếu xuất/i }).click();
  await expect(page.getByRole('alert')).toContainText(/lỗi xuất kho|không đủ tồn/i);

  errors.assertClean();
});
