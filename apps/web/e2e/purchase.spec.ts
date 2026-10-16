import { expect, loginAs, test } from './fixtures';

process.loadEnvFile?.('../../.env');
const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api/v1';

test('tạo PO 2 dòng, đặt hàng, nhận một phần và nhận nốt', async ({ page, errors }) => {
  // Kiểm tra API backend purchase-orders đã sẵn sàng chưa (task p2-api-purchase chạy song song)
  const apiCheck = await fetch(`${apiBase}/purchase-orders`, {
    headers: { 'Content-Type': 'application/json' },
  }).catch(() => null);

  if (!apiCheck || apiCheck.status === 404) {
    test.fixme(
      true,
      'API purchase-orders chưa merge vào nhánh (task p2-api-purchase chạy song song)',
    );
  }

  // Helper lấy tổng tồn kho hiện tại của một mặt hàng qua API
  const getStockQty = async (itemId: string): Promise<number> => {
    if (!itemId) return 0;
    return page.evaluate(
      async ({ apiBase, itemId }) => {
        const response = await fetch(
          `${apiBase}/stock/balances?itemId=${itemId}&includeZero=true`,
          {
            credentials: 'include',
          },
        );
        if (!response.ok) return 0;
        const json = await response.json().catch(() => null);
        const rows = Array.isArray(json?.data) ? json.data : [];
        return rows.reduce(
          (sum: number, r: { quantity?: number | string }) => sum + Number(r.quantity || 0),
          0,
        );
      },
      { apiBase, itemId },
    );
  };

  await loginAs(page, 'OWNER');
  await page.goto('/admin/purchase-orders');

  // Mở form tạo đơn mua hàng
  await page.getByRole('button', { name: /tạo đơn mua hàng/i }).click();

  // Chọn nhà cung cấp và nhập thông tin dòng 1
  await page.locator('#po-supplier').selectOption({ index: 1 });
  await page.locator('#po-line-item-0').selectOption({ index: 1 });
  const item1Id = await page.locator('#po-line-item-0').inputValue();
  await page.locator('#po-line-qty-0').fill('10');
  await page.locator('#po-line-price-0').fill('50000');

  // Thêm dòng 2
  await page.getByRole('button', { name: /thêm dòng/i }).click();
  await page.locator('#po-line-item-1').selectOption({ index: 2 });
  const item2Id = await page.locator('#po-line-item-1').inputValue();
  await page.locator('#po-line-qty-1').fill('20');
  await page.locator('#po-line-price-1').fill('30000');

  // Lấy tồn kho ban đầu của 2 mặt hàng trước khi nhận PO
  const initialStock1 = await getStockQty(item1Id);
  const initialStock2 = await getStockQty(item2Id);

  // Submit tạo PO
  await page
    .getByRole('button', { name: /tạo đơn mua hàng/i })
    .last()
    .click();

  // Kiểm tra hiển thị trong bảng danh sách đơn mua
  await expect(page.getByText('Nháp').first()).toBeVisible();

  // Nhấp vào đơn mua hàng để xem chi tiết
  await page.locator('table tbody tr').first().locator('a').click();
  await page.waitForURL(/\/admin\/purchase-orders\/.+/);

  // Đặt hàng
  await page.getByRole('button', { name: /đặt hàng/i }).click();
  await page
    .getByRole('button', { name: /xác nhận|đặt hàng/i })
    .last()
    .click();
  await expect(page.getByText('Đã đặt').first()).toBeVisible();

  // Mở dialog nhận hàng
  await page.getByRole('button', { name: /nhận hàng/i }).click();
  await page.locator('#receive-warehouse').selectOption({ index: 1 });
  const warehouseId = await page.locator('#receive-warehouse').inputValue();

  const firstQtyInput = page.locator('input[id^="receive-qty-"]').first();
  const secondQtyInput = page.locator('input[id^="receive-qty-"]').nth(1);
  const firstQtyId = await firstQtyInput.getAttribute('id');
  const line1Id = firstQtyId ? firstQtyId.replace('receive-qty-', '') : '';

  // 1. Kiểm tra trường hợp nhận vượt bị từ chối trên giao diện (UI validation)
  // Dòng 1 đặt 10, nhập vượt thành 15 -> form hiển thị lỗi từ chối nhận vượt và không cho submit
  await firstQtyInput.fill('15');
  await page.getByRole('button', { name: /xác nhận nhận hàng/i }).click();
  await expect(page.getByText(/không được vượt quá số lượng còn lại|vượt quá/i)).toBeVisible();

  // 2. Kiểm tra API backend từ chối nhận vượt (422) theo hợp đồng API
  const currentUrl = page.url();
  const poId = currentUrl.split('/').pop()?.split('?')[0] || '';
  if (poId && line1Id && warehouseId) {
    errors.expectError('/receive');
    const overReceiveStatus = await page.evaluate(
      async ({ apiBase, poId, line1Id, warehouseId }) => {
        const res = await fetch(`${apiBase}/purchase-orders/${poId}/receive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            warehouseId,
            lines: [{ lineId: line1Id, quantity: 999 }],
          }),
        });
        return res.status;
      },
      { apiBase, poId, line1Id, warehouseId },
    );
    expect(overReceiveStatus).toBe(422);
  }

  // 3. Nhận một phần hợp lệ: dòng 1 nhận 5 (còn lại 5), dòng 2 nhận 0 (còn lại 20)
  await firstQtyInput.fill('5');
  await secondQtyInput.fill('0');

  await page.getByRole('button', { name: /xác nhận nhận hàng/i }).click();
  await expect(page.getByText('Nhận một phần').first()).toBeVisible();

  // Kiểm tra tồn kho tăng tương ứng sau khi nhận một phần: item 1 tăng 5, item 2 chưa tăng
  const stockAfterPartial1 = await getStockQty(item1Id);
  expect(stockAfterPartial1).toBe(initialStock1 + 5);
  const stockAfterPartial2 = await getStockQty(item2Id);
  expect(stockAfterPartial2).toBe(initialStock2);

  // 4. Nhận nốt phần còn lại
  await page.getByRole('button', { name: /nhận hàng/i }).click();
  await page.locator('#receive-warehouse').selectOption({ index: 1 });
  // Mặc định các ô nhận đã điền đúng phần còn lại (5 và 20)
  await page.getByRole('button', { name: /xác nhận nhận hàng/i }).click();
  await expect(page.getByText('Đã nhận đủ').first()).toBeVisible();

  // Kiểm tra tồn kho tăng đủ sau khi nhận nốt: item 1 tăng đủ 10, item 2 tăng đủ 20
  const stockAfterFull1 = await getStockQty(item1Id);
  expect(stockAfterFull1).toBe(initialStock1 + 10);
  const stockAfterFull2 = await getStockQty(item2Id);
  expect(stockAfterFull2).toBe(initialStock2 + 20);

  errors.assertClean();
});
