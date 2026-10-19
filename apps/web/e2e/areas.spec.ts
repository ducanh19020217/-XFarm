import { expect, loginAs, test } from './fixtures';

test('tạo khu cha và khu con, mở chi tiết bản đồ', async ({ page, errors }) => {
  test.setTimeout(60_000);
  await loginAs(page);
  await page.goto('/admin/areas');
  const suffix = Date.now();
  for (const name of [`Khu E2E ${suffix}`, `Lô E2E ${suffix}`]) {
    await page.getByRole('button', { name: /thêm khu/i }).click();
    await page.getByLabel('Tên khu/lô').fill(name);
    await page.getByRole('button', { name: 'Tạo mới' }).click();
    await page.getByPlaceholder(/tìm theo tên hoặc mã khu/i).fill(name);
    await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 });
  }
  await page.getByPlaceholder(/tìm theo tên hoặc mã khu/i).fill(`Khu E2E ${suffix}`);
  await page.getByRole('link', { name: `Khu E2E ${suffix}`, exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/areas\/[^/]+/, { timeout: 15_000 });
  await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15_000 });
  errors.assertClean();
});
