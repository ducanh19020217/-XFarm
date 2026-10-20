import { expect, loginAs, test, api } from './fixtures';

test('GĐ4 acceptance: webshop → admin → kho → thu tiền → transaction → báo cáo', async ({
  page,
  errors,
}) => {
  test.setTimeout(120_000);

  // Chuẩn bị một sản phẩm public có tồn kho, nhưng các bước nghiệp vụ vẫn đi qua UI.
  await loginAs(page, 'OWNER');
  const products = await api<{
    data: Array<{ id: string; slug: string; name: string; itemId: string; price: number }>;
  }>(page, '/products?page=1&pageSize=100');
  let product = products.data.find((item) => item.price > 0);
  if (!product) {
    const itemResponse = await api<{ data: { id: string } }>(page, '/items', {
      method: 'POST',
      body: JSON.stringify({
        name: `Nông sản nghiệm thu ${Date.now()}`,
        category: 'PRODUCE',
        unit: 'kg',
        isSellable: true,
      }),
    });
    const productResponse = await api<{
      data: { id: string; slug: string; name: string; itemId: string; price: number };
    }>(page, '/products', {
      method: 'POST',
      body: JSON.stringify({
        name: `Sản phẩm nghiệm thu ${Date.now()}`,
        itemId: itemResponse.data.id,
        description: 'Sản phẩm dùng cho nghiệm thu GĐ4',
        price: 125000,
        unit: 'kg',
        isPublished: true,
      }),
    });
    product = productResponse.data;
  }
  expect(product, 'Cần có sản phẩm bán được').toBeDefined();

  const warehouses = await api<{
    data: Array<{ id: string; code: string; name: string }>;
  }>(page, '/warehouses?page=1&pageSize=100');
  const warehouse =
    warehouses.data.find((item) => item.code === 'WH-FINISHED') ?? warehouses.data[0];
  expect(warehouse, 'Cần có kho xuất hàng').toBeDefined();

  const balance = await api<{
    data: Array<{ quantity: string | number }>;
  }>(
    page,
    `/stock/balances?itemId=${product!.itemId}&warehouseId=${warehouse!.id}&includeZero=true&pageSize=100`,
  );
  const initialStock = balance.data.reduce((sum, row) => sum + Number(row.quantity), 0);
  if (initialStock < 1) {
    await api(page, '/stock/receipts', {
      method: 'POST',
      body: JSON.stringify({
        warehouseId: warehouse!.id,
        notes: 'Chuẩn bị nghiệm thu GĐ4',
        lines: [{ itemId: product!.itemId, quantity: 10, unitCost: 10000 }],
      }),
    });
  }

  // 1. Khách đặt hàng trên website.
  const phone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
  const customerName = `Khách nghiệm thu ${Date.now()}`;
  await page.context().clearCookies();
  await page.goto(`/san-pham/${product!.slug}`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('add-to-cart-button').first().click();
  await page.goto('/gio-hang');
  await page.getByTestId('proceed-to-checkout').click();
  await page.waitForURL('**/thanh-toan');
  await page.locator('#fullName').fill(customerName);
  await page.locator('#phone').fill(phone);
  await page.locator('#address').fill('Khu nông nghiệp XFarm');
  await page.locator('input[value="COD"]').check();
  await page.getByTestId('submit-checkout').click();
  await page.waitForURL(/\/dat-hang-thanh-cong\/[\w-]+/);
  const orderCode = (await page.getByTestId('order-code-text').textContent())?.trim();
  expect(orderCode).toMatch(/^SO-\d{4}-\d+$/);

  // 2. Đơn xuất hiện trong admin, xác nhận và kiểm tra kho giảm đúng 1.
  await loginAs(page, 'OWNER');
  await page.goto('/admin/sales/orders', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder(/tìm theo mã đơn/i).fill(orderCode!);
  await page.waitForTimeout(500);
  await expect(page.getByText(orderCode!, { exact: true })).toBeVisible();
  const orders = await api<{
    data: Array<{ id: string; code: string; total: string | number }>;
  }>(page, `/sales-orders?search=${encodeURIComponent(orderCode!)}&pageSize=20`);
  const order = orders.data.find((item) => item.code === orderCode);
  expect(order, 'Đơn webshop phải có trong API admin').toBeDefined();

  const beforeConfirm = await api<{ data: Array<{ quantity: string | number }> }>(
    page,
    `/stock/balances?itemId=${product!.itemId}&warehouseId=${warehouse!.id}&includeZero=true&pageSize=100`,
  );
  const stockBeforeConfirm = beforeConfirm.data.reduce((sum, row) => sum + Number(row.quantity), 0);
  await page.goto(`/admin/sales/orders/${order!.id}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /xác nhận đơn/i }).click();
  await page.locator('#warehouse-select').selectOption(warehouse!.id);
  await page.getByRole('button', { name: /xác nhận xuất kho/i }).click();
  await expect(page.getByText('Đã xác nhận').first()).toBeVisible();

  const afterConfirm = await api<{ data: Array<{ quantity: string | number }> }>(
    page,
    `/stock/balances?itemId=${product!.itemId}&warehouseId=${warehouse!.id}&includeZero=true&pageSize=100`,
  );
  const stockAfterConfirm = afterConfirm.data.reduce((sum, row) => sum + Number(row.quantity), 0);
  expect(stockAfterConfirm).toBe(stockBeforeConfirm - 1);
  expect(stockBeforeConfirm).toBeGreaterThanOrEqual(initialStock);

  // 3. Thu đủ tiền, hệ thống sinh Payment và Transaction INCOME.
  await page.locator('#payment-amount').fill(String(order!.total));
  await page.locator('#payment-notes').fill(`Thu nghiệm thu ${orderCode}`);
  await page.getByRole('button', { name: /ghi nhận (thu tiền|thanh toán)/i }).click();
  await expect(page.getByText(/Đã thanh toán|PAID/).first()).toBeVisible();

  await page.goto('/admin/finance/transactions', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Tìm theo mã giao dịch, ghi chú...').fill(orderCode!);
  await expect(page.getByText(orderCode!, { exact: false }).first()).toBeVisible();
  const transactions = await api<{
    data: Array<{ type: string; amount: string | number; orderCode?: string | null }>;
  }>(page, `/transactions?search=${encodeURIComponent(orderCode!)}&pageSize=20`);
  const income = transactions.data.find((item) => item.type === 'INCOME');
  expect(income, 'Thu tiền đơn hàng phải sinh Transaction INCOME').toBeDefined();
  expect(Number(income!.amount)).toBe(Number(order!.total));

  // 4. Báo cáo dòng tiền và doanh thu sản phẩm đã cập nhật.
  await page.goto('/admin/finance/reports', { waitUntil: 'domcontentloaded' });
  const cashflow = await api<{
    data: Array<{ month: number; income: string | number }>;
  }>(page, `/reports/cashflow?year=${new Date().getFullYear()}`);
  const reportMonth = cashflow.data.find((item) => Number(item.income) >= Number(order!.total));
  expect(reportMonth, 'Báo cáo thu chi phải ghi nhận đủ tiền đơn hàng').toBeDefined();
  await expect(page.locator('table tbody tr').first()).toBeVisible();
  await page.getByRole('button', { name: /doanh thu sản phẩm/i }).click();
  await expect(page.getByText(product!.name, { exact: true }).first()).toBeVisible();
  errors.assertClean();
});
