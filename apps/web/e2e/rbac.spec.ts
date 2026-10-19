import { expect, loginAs, test } from './fixtures';

test('WORKER và SALES thấy đúng quyền trên UI', async ({ page, errors }) => {
  errors.expectError('/alerts/unread-count');
  await loginAs(page, 'WORKER');
  await page.goto('/admin/areas');
  await expect(page.getByRole('button', { name: /thêm khu/i })).toHaveCount(0);
  await page.goto('/admin/cycles');
  await expect(page.getByRole('button', { name: /thêm mùa vụ/i })).toHaveCount(0);
  await page.goto('/admin/activities');
  await expect(page.getByRole('button', { name: /ghi nhật ký/i })).toBeVisible();
  await page.context().clearCookies();
  await loginAs(page, 'SALES');
  await page.goto('/admin/activities');
  await expect(page.getByRole('button', { name: /ghi nhật ký/i })).toHaveCount(0);
  errors.assertClean();
});
