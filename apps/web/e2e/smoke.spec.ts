import { expect, expectDialogInViewport, loginAs, test } from './fixtures';

test('OWNER mở được các trang chính và dialog nằm trong viewport', async ({ page, errors }) => {
  test.setTimeout(120_000);
  await loginAs(page);
  for (const route of [
    '/admin',
    '/admin/users',
    '/admin/areas',
    '/admin/cycles',
    '/admin/activities',
    '/admin/animals',
    '/admin/calendar',
  ]) {
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('main')).toBeVisible();
  }
  for (const [route, label] of [
    ['/admin/users', /thêm người dùng/i],
    ['/admin/areas', /thêm khu/i],
    ['/admin/cycles', /thêm mùa vụ/i],
    ['/admin/activities', /ghi nhật ký/i],
    ['/admin/animals', /thêm đàn/i],
  ] as const) {
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const button = page.getByRole('button', { name: label }).first();
    if (await button.isVisible().catch(() => false)) {
      await expect(button).toBeEnabled();
      await button.click();
      await expectDialogInViewport(page);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
    }
  }
  errors.assertClean();
});
