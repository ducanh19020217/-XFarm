import { api, expect, loginAs, test } from './fixtures';

test('ghi nhật ký WATER_TEST và thấy tóm tắt pH', async ({ page, errors }) => {
  await loginAs(page);
  await page.goto('/admin/activities');
  await page.getByRole('button', { name: /ghi nhật ký/i }).click();
  await page.getByLabel('Khu/lô').selectOption({ index: 1 });
  await page.getByLabel('Loại nhật ký').selectOption('WATER_TEST');
  await page.locator('#activity-date').fill('2099-01-01T10:00');
  await page.getByLabel(/pH/i).fill('7.2');
  await page.getByLabel(/DO/i).fill('5.1');
  await page.getByLabel(/nhiệt độ/i).fill('26');
  const presign = await api<{ data: { uploadUrl: string } }>(page, '/media/presign', {
    method: 'POST',
    body: JSON.stringify({ filename: 'e2e.png', mime: 'image/png', size: 70 }),
  });
  await page.getByLabel('Ảnh đính kèm').setInputFiles({
    name: 'e2e.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360f8cf000000020001e221bc330000000049454e44ae426082',
      'hex',
    ),
  });
  await page.getByRole('button', { name: /lưu nhật ký/i }).click();
  await page.getByLabel('Lọc theo loại').selectOption('WATER_TEST');
  await expect(page.getByText(/DO 5\.1 · pH 7\.2 · Nhiệt độ \(°C\) 26/i).first()).toBeVisible();
  errors.assertClean();
});
