import { expect, loginAs, test } from './fixtures';

test('tạo mùa vụ CROP và chuyển trạng thái đến CLOSED', async ({ page, errors }) => {
  await loginAs(page);
  await page.goto('/admin/cycles');
  const name = `Vụ E2E ${Date.now()}`;
  await page.getByRole('button', { name: /thêm mùa vụ/i }).click();
  await page.getByLabel('Tên mùa vụ').fill(name);
  await page.locator('#cycle-area').selectOption({ index: 1 });
  await page.locator('#cycle-species').fill('Cải E2E');
  await page.getByRole('button', { name: /tạo mùa vụ/i }).click();
  await expect(page.getByText(name)).toBeVisible();
  await page.getByText(name).locator('xpath=ancestor::tr').getByRole('link').click();
  for (const status of [/bắt đầu hoạt động/i, /bắt đầu thu hoạch/i, /đóng mùa vụ/i]) {
    await page.getByRole('button', { name: status }).click();
    await page.getByRole('button', { name: /xác nhận/i }).click();
  }
  await expect(page.getByRole('button', { name: /ghi nhật ký/i })).toHaveCount(0);
  errors.assertClean();
});
