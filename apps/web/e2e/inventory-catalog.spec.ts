import { expect, loginAs, test, expectDialogInViewport } from './fixtures';

test('tạo item, sửa minStock, thấy trong danh sách', async ({ page, errors }) => {
  await loginAs(page);
  await page.goto('/admin/inventory/items');

  const suffix = Date.now();
  const itemName = `Vật tư E2E ${suffix}`;

  // 1. Mở FormDialog tạo item mới
  await page.getByRole('button', { name: /thêm vật tư/i }).click();
  await expectDialogInViewport(page);

  // 2. Điền thông tin vật tư
  await page.getByLabel(/Tên vật tư/i).fill(itemName);
  await page.getByLabel(/Đơn vị tính/i).fill('kg');
  await page.getByLabel(/Tồn tối thiểu/i).fill('15');
  await page.getByRole('button', { name: 'Tạo mới' }).click();

  // 3. Kiểm tra thấy item trong danh sách
  await expect(page.getByText(itemName)).toBeVisible();

  // 4. Mở FormDialog chỉnh sửa minStock
  const row = page.getByText(itemName).first().locator('xpath=ancestor::tr');
  await row.getByTitle(/chỉnh sửa vật tư/i).click();
  await expectDialogInViewport(page);

  await page.getByLabel(/Tồn tối thiểu/i).fill('25');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();

  // 5. Kiểm tra thấy định mức tồn mới trong danh sách
  await expect(row.getByText(/25/)).toBeVisible();

  errors.assertClean();
});
