import { expect, loginAs, test } from './fixtures';

test('OWNER tạo và khóa được người dùng', async ({ page, errors }) => {
  await loginAs(page);
  await page.goto('/admin/users');
  const email = `e2e-${Date.now()}@example.com`;
  await page.getByRole('button', { name: /thêm người dùng/i }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill('Test@12345');
  await page.getByLabel('Họ và tên').fill('Người dùng E2E');
  await page.getByRole('button', { name: /tạo tài khoản/i }).click();
  await expect(page.getByText(email)).toBeVisible();
  await page
    .getByText(email)
    .locator('xpath=ancestor::tr')
    .getByRole('button', { name: 'Khóa người dùng' })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /khóa tài khoản/i })
    .click();
  await expect(
    page
      .getByText(email)
      .locator('xpath=ancestor::tr')
      .getByText(/đã khóa/i),
  ).toBeVisible();
  errors.assertClean();
});
