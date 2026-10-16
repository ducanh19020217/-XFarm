import { expect, loginAs, test } from './fixtures';

test.describe('Lô thu hoạch, QR và in tem nhãn (E2E)', () => {
  test('ghi nhận nhật ký HARVEST, mở chi tiết lô, thấy QR code và mở trang in tem', async ({
    page,
    errors,
  }) => {
    // API backend harvest-lots đang được phát triển song song ở task p3-api-harvest
    test.fixme(
      true,
      'Chờ task p3-api-harvest merge backend module harvest-lots và xử lý nhật ký HARVEST',
    );

    await loginAs(page);

    // 1. Ghi nhật ký thu hoạch (HARVEST)
    await page.goto('/admin/activities');
    await page.getByRole('button', { name: /ghi nhật ký/i }).click();

    // Chọn loại nhật ký HARVEST
    await page.getByLabel('Loại nhật ký').selectOption('HARVEST');
    await page.getByLabel('Khu/lô').selectOption({ index: 1 });

    // Điền các trường nông sản thu hoạch
    await page.getByLabel('Sản phẩm thu hoạch').selectOption({ index: 1 });
    await page.getByLabel('Kho nhập').selectOption({ index: 1 });
    await page.getByLabel('Số lượng thu hoạch').fill('100');
    await page.getByLabel('Đơn vị tính').fill('kg');
    await page.getByLabel('Phân loại chất lượng').fill('Hạng A');
    await page.getByLabel('Tiêu chuẩn / Chứng nhận').fill('VietGAP');
    await page.getByLabel('Công khai truy xuất nguồn gốc').check();

    // Lưu nhật ký
    await page.getByRole('button', { name: /lưu nhật ký/i }).click();

    // 2. Kiểm tra toast thông báo thành công có link đến chi tiết lô
    const toastLink = page.getByRole('link', { name: /xem lô thu hoạch/i });
    await expect(toastLink).toBeVisible();
    await toastLink.click();

    // 3. Mở chi tiết lô: kiểm tra URL, thông tin lô và QR code
    await expect(page).toHaveURL(/\/admin\/harvest-lots\/[a-zA-Z0-9_-]+/);
    await expect(page.getByText(/Lô thu hoạch HL-/)).toBeVisible();
    await expect(page.getByText('Hạng A')).toBeVisible();
    await expect(page.getByText('VietGAP')).toBeVisible();

    // Kiểm tra QR code (thẻ img hoặc canvas)
    const qrImage = page.locator('img[data-testid="harvest-lot-qr"], canvas');
    await expect(qrImage).toBeVisible();

    // 4. Mở trang in tem nhãn
    await page.getByRole('link', { name: /in tem nhãn QR/i }).click();
    await expect(page).toHaveURL(/\/admin\/harvest-lots\/[a-zA-Z0-9_-]+\/print/);
    await expect(page.getByText(/In tem nhãn lô/)).toBeVisible();

    // Kiểm tra lưới tem in A4
    const printSheet = page.getByTestId('print-sheet-a4');
    await expect(printSheet).toBeVisible();
    await expect(page.getByRole('button', { name: /in tem ngay/i })).toBeVisible();

    errors.assertClean();
  });
});
