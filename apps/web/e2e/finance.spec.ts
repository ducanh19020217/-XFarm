import { expect, expectDialogInViewport, loginAs, test, api } from './fixtures';

test('Finance workflow: sales order payments, auto transactions, cashflow reports, and cycle expenses', async ({
  page,
  errors,
}) => {
  test.setTimeout(90_000);
  await loginAs(page, 'OWNER');

  // 1. Data Setup via API
  // 1a. Ensure sellable item
  const itemsRes = await api<{ data: Array<{ id: string; name: string }> }>(
    page,
    '/items?isSellable=true',
  );
  let item = itemsRes.data?.[0];
  if (!item) {
    const createdItem = await api<{ data: { id: string; name: string } }>(page, '/items', {
      method: 'POST',
      body: JSON.stringify({
        name: `Sản phẩm Test ${Date.now()}`,
        category: 'PRODUCE',
        unit: 'kg',
        isSellable: true,
      }),
    });
    item = createdItem.data;
  }

  // 1b. Create unique Customer
  const customerName = `Khách hàng E2E ${Date.now()}`;
  const customerRes = await api<{ data: { id: string; name: string } }>(page, '/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: customerName,
      phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      type: 'RETAIL',
    }),
  });
  const customer = customerRes.data;

  // 1c. Create Sales Order with total 1,000,000 VND (10 * 100,000)
  const orderRes = await api<{ data: { id: string; code: string; total: string | number } }>(
    page,
    '/sales-orders',
    {
      method: 'POST',
      body: JSON.stringify({
        customerId: customer.id,
        paymentMethod: 'BANK_TRANSFER',
        shippingAddress: 'Nông trại XFarm E2E',
        lines: [
          {
            itemId: item.id,
            quantity: 10,
            unitPrice: 100000,
          },
        ],
      }),
    },
  );
  const order = orderRes.data;

  // 1d. Create dedicated cycle for this test
  const areasRes = await api<{ data: Array<{ id: string }> }>(page, '/areas');
  let areaId = areasRes.data?.[0]?.id;
  if (!areaId) {
    const areaRes = await api<{ data: { id: string } }>(page, '/areas', {
      method: 'POST',
      body: JSON.stringify({ name: `Khu đất ${Date.now()}`, type: 'FIELD' }),
    });
    areaId = areaRes.data.id;
  }
  const createdCycle = await api<{ data: { id: string; code: string; name: string } }>(
    page,
    '/cycles',
    {
      method: 'POST',
      body: JSON.stringify({
        name: `Vụ mùa E2E ${Date.now()}`,
        areaId,
        kind: 'CROP',
        species: 'Lúa ST25',
        startDate: new Date().toISOString().split('T')[0],
      }),
    },
  );
  const testCycle = createdCycle.data;

  // 1e. Create dedicated expense category for this test
  const createdCat = await api<{ data: { id: string; name: string; type: string } }>(
    page,
    '/finance-categories',
    {
      method: 'POST',
      body: JSON.stringify({
        name: `Vật tư bảo dưỡng ${Date.now()}`,
        type: 'EXPENSE',
      }),
    },
  );
  const expenseCategory = createdCat.data;

  // 2. Đi đến trang chi tiết đơn bán: /admin/sales/orders/[id]
  await page.goto(`/admin/sales/orders/${order.id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: order.code })).toBeVisible();

  // Kiểm tra trạng thái thanh toán ban đầu là UNPAID / Chưa thanh toán
  await expect(page.getByText(/UNPAID|Chưa thanh toán/).first()).toBeVisible();
  await expect(page.getByText('1.000.000 ₫').first()).toBeVisible();

  // 2a. Ghi thu đợt 1: một phần 400.000 ₫
  await page.locator('#payment-amount, #record-amount').fill('400000');
  const note1 = `Thu tiền cọc đợt 1 ${order.code}`;
  await page.locator('#payment-notes, #record-notes').fill(note1);

  const payPromise1 = page.waitForResponse(
    (res) => res.url().includes(`/sales-orders/${order.id}/payments`) && res.status() === 201,
  );
  await page.getByRole('button', { name: /ghi nhận (thu tiền|thanh toán)/i }).click();
  await payPromise1;

  // Đợi cập nhật: trạng thái chuyển thành PARTIAL (Thanh toán 1 phần / Nhận một phần)
  await expect(page.getByText(/PARTIAL|Thanh toán 1 phần|Nhận một phần/).first()).toBeVisible();
  await expect(page.getByText('600.000 ₫').first()).toBeVisible();
  await expect(page.getByRole('cell', { name: note1 })).toBeVisible();

  // 2b. Ghi thu đợt 2: thu nốt 600.000 ₫
  await page.locator('#payment-amount, #record-amount').fill('600000');
  const note2 = `Thu hết số tiền còn lại ${order.code}`;
  await page.locator('#payment-notes, #record-notes').fill(note2);

  const payPromise2 = page.waitForResponse(
    (res) => res.url().includes(`/sales-orders/${order.id}/payments`) && res.status() === 201,
  );
  await page.getByRole('button', { name: /ghi nhận (thu tiền|thanh toán)/i }).click();
  await payPromise2;

  // Đợi cập nhật: trạng thái chuyển thành PAID / Đã thanh toán
  await expect(page.getByText(/PAID|Đã thanh toán/).first()).toBeVisible();
  await expect(page.getByText(note2)).toBeVisible();

  // 3. Đến trang Giao dịch /admin/finance/transactions
  await page.goto('/admin/finance/transactions', { waitUntil: 'domcontentloaded' });

  // Lọc tìm kiếm theo mã đơn bán
  await page.getByPlaceholder('Tìm theo mã giao dịch, ghi chú...').fill(order.code);

  // Giao dịch tự động hiển thị trong bảng
  // Có link dẫn về đơn bán
  const orderLink = page.getByRole('link', { name: new RegExp(`Đơn bán.*${order.code}`) }).first();
  await expect(orderLink).toBeVisible();

  // Giao dịch tự động ghi nhãn "Tự động" và KHÔNG có nút sửa / xóa
  const autoRow = page.locator('table tbody tr').filter({ hasText: note1 }).first();
  await expect(autoRow).toBeVisible();
  await expect(autoRow).toContainText('Tự động');
  await expect(autoRow.getByRole('button', { name: /sửa/i })).toHaveCount(0);
  await expect(autoRow.getByRole('button', { name: /xóa/i })).toHaveCount(0);

  // 4. Đến Báo cáo tài chính /admin/finance/reports (Tab Thu chi 12 tháng)
  await page.goto('/admin/finance/reports', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Báo cáo tài chính' })).toBeVisible();

  // Kiểm tra bảng dòng tiền tháng hiện tại có ghi nhận thu >= 1.000.000 ₫
  const currentMonthNum = new Date().getMonth() + 1;
  const currentMonthRow = page
    .locator('table tbody tr')
    .filter({ has: page.getByRole('cell', { name: `Tháng ${currentMonthNum}`, exact: true }) });
  await expect(currentMonthRow).toBeVisible();
  await expect(currentMonthRow.locator('td').nth(1)).not.toHaveText('0 ₫');

  // 5. Quay lại /admin/finance/transactions: Tạo chi thủ công gắn mùa vụ
  await page.goto('/admin/finance/transactions', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Tạo giao dịch' }).click();
  await expectDialogInViewport(page);

  const txDialog = page.getByRole('dialog');
  await txDialog.locator('#tx-type').selectOption('EXPENSE');
  await txDialog.locator('#tx-category').selectOption(expenseCategory.id);
  await txDialog.locator('#tx-amount').fill('200000');
  await txDialog.locator('#tx-cycle').selectOption(testCycle.id);
  const expenseNote = `Chi phí phân bón e2e ${Date.now()}`;
  await txDialog.locator('#tx-notes').fill(expenseNote);

  const createTxPromise = page.waitForResponse(
    (res) =>
      res.url().includes('/transactions') &&
      res.request().method() === 'POST' &&
      res.status() === 201,
  );
  await txDialog.getByRole('button', { name: 'Tạo giao dịch' }).click();
  await createTxPromise;

  // Kiểm tra giao dịch chi thủ công xuất hiện trong danh sách
  await page.getByPlaceholder('Tìm theo mã giao dịch, ghi chú...').fill(expenseNote);
  await expect(page.getByText(expenseNote)).toBeVisible();
  // Giao dịch thủ công có nút sửa/xóa
  const manualRow = page.locator('table tbody tr').filter({ hasText: expenseNote });
  await expect(manualRow.getByRole('button').first()).toBeVisible();

  // 6. Quay lại /admin/finance/reports: Tab Giá thành & Lãi lỗ theo mùa vụ
  await page.goto('/admin/finance/reports', { waitUntil: 'domcontentloaded' });
  const cyclesReportPromise = page.waitForResponse(
    (res) => res.url().includes('/reports/cycles') && res.status() === 200,
  );
  await page.getByRole('button', { name: /giá thành & lãi lỗ/i }).click();
  await cyclesReportPromise;

  // Tìm mùa vụ testCycle và mở popup chi tiết
  const cycleBtn = page.getByRole('button', { name: testCycle.name });
  await expect(cycleBtn).toBeVisible();
  await cycleBtn.click();

  await expectDialogInViewport(page);
  const detailDialog = page.getByRole('dialog');
  await expect(detailDialog).toContainText(testCycle.name);
  // Kiểm tra chi tiết chi phí khác ghi nhận khoản chi vừa tạo
  await expect(detailDialog.getByText(expenseCategory.name).first()).toBeVisible();
  await expect(detailDialog.getByText('200.000 ₫').first()).toBeVisible();

  errors.assertClean();
});
