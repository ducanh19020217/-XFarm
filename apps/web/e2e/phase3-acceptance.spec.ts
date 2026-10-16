import { expect, loginAs, test } from './fixtures';

test('GĐ3: HARVEST → QR → truy xuất public → tắt công khai trả 404', async ({ page, errors }) => {
  await loginAs(page);
  await page.goto('/admin/activities', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /ghi nhật ký/i }).click();

  await page.getByLabel('Loại nhật ký').selectOption('HARVEST');
  await page
    .getByLabel('Mùa vụ', { exact: true })
    .selectOption({ label: 'CY-2026-0001 - Vụ rau cải ngọt mùa xuân 2026' });
  await page.getByLabel('Khu/lô').selectOption({ label: 'AR-0002 - Lô rau 1' });
  await page.getByLabel('Sản phẩm thu hoạch').selectOption({ label: 'Rau cải ngọt (kg)' });
  await page.getByLabel('Kho nhập').selectOption({ index: 1 });
  await page.getByLabel('Số lượng thu hoạch').fill('12');
  await page.getByLabel('Đơn vị tính').fill('kg');
  await page.getByLabel('Chứng nhận').fill('VietGAP');
  await page.getByLabel('Công khai truy xuất').check();
  await page.getByRole('button', { name: /lưu nhật ký/i }).click();

  const lotLink = page.getByRole('link', { name: /xem lô thu hoạch/i });
  await expect(lotLink).toBeVisible();
  const lotHref = await lotLink.getAttribute('href');
  expect(lotHref).toMatch(/^\/admin\/harvest-lots\/[\w-]+$/);
  await page.goto(lotHref!);
  await expect(page).toHaveURL(/\/admin\/harvest-lots\/[^/]+$/);
  const lotUrl = page.url();

  const qr = page.getByTestId('harvest-lot-qr');
  await expect(qr).toBeVisible();
  const traceUrl = await qr.getAttribute('data-trace-url');
  expect(traceUrl).toMatch(/\/trace\/[A-Za-z0-9_-]+$/);

  const traceCode = new URL(traceUrl!).pathname.split('/').pop();
  const apiTraceResponse = await page.request.get(
    `${process.env.NEXT_PUBLIC_API_URL}/public/trace/${traceCode}`,
  );
  expect(apiTraceResponse.status()).toBe(200);
  const publicResponse = await page.request.get(traceUrl!);
  expect(publicResponse.status()).toBe(200);

  await page.context().clearCookies();
  await page.goto(traceUrl!, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await loginAs(page);
  await page.goto(lotUrl, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /ẩn công khai/i }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /ẩn công khai/i })
    .click();
  await expect(page.getByText(/lưu trữ nội bộ/i)).toBeVisible();

  const privateApiResponse = await page.request.get(
    `${process.env.NEXT_PUBLIC_API_URL}/public/trace/${traceCode}`,
  );
  expect(privateApiResponse.status()).toBe(404);

  await page.goto(`${traceUrl}?acceptance=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(
    page.getByRole('heading', { name: /không tìm thấy thông tin truy xuất/i }),
  ).toBeVisible();
  errors.assertClean();
});
