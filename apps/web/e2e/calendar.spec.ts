import { expect, loginAs, test } from './fixtures';

test('lịch chuyển tháng trước và sau không lỗi', async ({ page, errors }) => {
  await loginAs(page);
  await page.goto('/admin/calendar');
  await expect(page.getByText('Lịch sản xuất')).toBeVisible();
  await page.getByRole('button', { name: /tháng trước/i }).click();
  await page.getByRole('button', { name: /tháng sau/i }).click();
  await expect(page.locator('main')).toBeVisible();
  errors.assertClean();
});
