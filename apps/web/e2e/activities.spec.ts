import { api, expect, loginAs, test } from './fixtures';

test('ghi nhật ký WATER_TEST và thấy tóm tắt pH', async ({ page, errors }) => {
  await loginAs(page);
  await page.goto('/admin/activities');
  await page.getByRole('button', { name: /ghi nhật ký/i }).click();
  await page.getByLabel('Khu/lô').selectOption({ index: 1 });
  await page.getByLabel('Loại nhật ký').selectOption('WATER_TEST');
  await page.getByLabel(/pH/i).fill('7.2');
  await page.getByLabel(/DO/i).fill('5.1');
  await page.getByLabel(/nhiệt độ/i).fill('26');
  const storageHealth = await page.request
    .get('http://localhost:9010/minio/health/live')
    .then((response) => response.ok())
    .catch(() => false);
  if (!storageHealth) test.skip(true, 'RustFS/MinIO không chạy trên cổng 9010');
  const presign = await api<{ data: { uploadUrl: string } }>(page, '/media/presign', {
    method: 'POST',
    body: JSON.stringify({ filename: 'e2e.png', mime: 'image/png', size: 70 }),
  });
  const preflight = await page.request.fetch(presign.data.uploadUrl, {
    method: 'OPTIONS',
    headers: {
      Origin: new URL(process.env.WEB_URL || 'http://localhost:3100').origin,
      'Access-Control-Request-Method': 'PUT',
    },
  });
  if (!preflight.headers()['access-control-allow-origin']) {
    test.skip(true, 'RustFS chưa cho phép CORS upload từ web');
  }
  await page.getByLabel('Ảnh đính kèm').setInputFiles({
    name: 'e2e.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360f8cf000000020001e221bc330000000049454e44ae426082',
      'hex',
    ),
  });
  await page.getByRole('button', { name: /lưu nhật ký/i }).click();
  await expect(page.getByText(/DO 5\.1 · pH 7\.2 · Nhiệt độ \(°C\) 26/i).last()).toBeVisible();
  errors.assertClean();
});
