import { expect, expectDialogInViewport, loginAs, test, api } from './fixtures';

process.loadEnvFile?.('../../.env');
const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api/v1';

test('quy trình bán hàng admin: tạo khách -> tạo đơn 2 dòng -> xác nhận (trừ kho) -> hủy (hoàn kho) -> trang in', async ({
  page,
  errors,
}) => {
  test.setTimeout(90_000);
  await loginAs(page, 'OWNER');

  const formatVi = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

  // Helper lấy tổng tồn kho của một mặt hàng tại kho cụ thể qua API
  const getItemStockInWh = async (itemId: string, warehouseId: string): Promise<number> => {
    const res = await api<{ data: Array<{ quantity?: number | string }> }>(
      page,
      `/stock/balances?itemId=${itemId}&warehouseId=${warehouseId}&includeZero=true&pageSize=100`,
    );
    const rows = Array.isArray(res?.data) ? res.data : [];
    return rows.reduce(
      (sum: number, r: { quantity?: number | string }) => sum + Number(r.quantity || 0),
      0,
    );
  };

  // 1. Chuẩn bị dữ liệu: Lấy kho WH-FINISHED và 2 sản phẩm seed
  const warehousesRes = await api<{
    data: Array<{ id: string; code: string; name: string }>;
  }>(page, '/warehouses?pageSize=100');
  const finishedWarehouse = warehousesRes.data.find(
    (w) => w.code === 'WH-FINISHED' || w.name.includes('thành phẩm'),
  );
  expect(finishedWarehouse, 'Kho thành phẩm phải tồn tại').toBeDefined();

  const productsRes = await api<{
    data: Array<{
      id: string;
      name: string;
      itemId: string;
      price: number;
      unit: string;
      item?: { name: string };
    }>;
  }>(page, '/products?isPublished=true&pageSize=100');
  expect(productsRes.data.length).toBeGreaterThanOrEqual(2);

  const prod1 = productsRes.data[0];
  const prod2 = productsRes.data[1];
  expect(prod1).toBeDefined();
  expect(prod2).toBeDefined();
  const prod2ItemName = prod2.name;

  // Đảm bảo cả prod1 và prod2 có đủ tồn kho trong kho thành phẩm trước khi test
  for (const prod of [prod1, prod2]) {
    const currentStock = await getItemStockInWh(prod.itemId, finishedWarehouse!.id);
    if (currentStock < 10) {
      await api(page, '/stock/receipts', {
        method: 'POST',
        body: JSON.stringify({
          warehouseId: finishedWarehouse!.id,
          notes: 'Nhập kho chuẩn bị test e2e bán hàng',
          lines: [{ itemId: prod.itemId, quantity: 50, unitCost: 15000 }],
        }),
      });
    }
  }

  const initialStock1 = await getItemStockInWh(prod1.itemId, finishedWarehouse!.id);
  const initialStock2 = await getItemStockInWh(prod2.itemId, finishedWarehouse!.id);
  expect(initialStock1).toBeGreaterThanOrEqual(10);
  expect(initialStock2).toBeGreaterThanOrEqual(10);

  // Đọc tồn kho ban đầu của lô hàng trên giao diện /admin/inventory
  await page.goto('/admin/inventory', { waitUntil: 'domcontentloaded' });
  await expect(
    page.locator(`#filter-warehouse option[value="${finishedWarehouse!.id}"]`),
  ).toBeAttached();
  await page.locator('#filter-warehouse').selectOption(finishedWarehouse!.id);
  await page.getByPlaceholder(/tìm kiếm theo mã sku hoặc tên vật tư/i).fill(prod2ItemName);
  const rowProd2Initial = page.locator('tbody tr').filter({ hasText: prod2ItemName }).first();
  await expect(rowProd2Initial).toBeVisible();
  const initialRowText = await rowProd2Initial.locator('td').nth(6).textContent();
  const initialLotQty = parseInt(initialRowText?.replace(/\D/g, '') || '0', 10);
  expect(initialLotQty).toBeGreaterThanOrEqual(3);

  // -------------------------------------------------------------
  // Bước 1: Tạo khách hàng qua UI tại /admin/sales/customers
  // -------------------------------------------------------------
  await page.goto('/admin/sales/customers', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Khách hàng' })).toBeVisible();

  const timestamp = Date.now();
  const customerName = `Khách Test ${timestamp}`;
  const customerPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
  const customerAddress = `${timestamp} Đường Giải Phóng, Hà Nội`;

  await page.getByRole('button', { name: /thêm khách hàng/i }).click();
  await expectDialogInViewport(page);

  await page.locator('#customer-name').fill(customerName);
  await page.locator('#customer-phone').fill(customerPhone);
  await page.locator('#customer-address').fill(customerAddress);
  await page.getByRole('button', { name: /tạo khách hàng/i }).click();

  // Xác nhận dialog đã đóng và khách hàng xuất hiện trong bảng
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByPlaceholder(/tìm theo mã, tên/i).fill(customerName);
  await expect(page.locator('tbody tr').filter({ hasText: customerName }).first()).toBeVisible();

  // -------------------------------------------------------------
  // Bước 2: Tạo đơn hàng 2 dòng qua UI tại /admin/sales/orders/new
  // -------------------------------------------------------------
  await page.goto('/admin/sales/orders/new', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /tạo đơn hàng mới|tạo đơn/i })).toBeVisible();

  // Chọn khách hàng vừa tạo
  await page.locator('#customer-search').fill(customerPhone);
  const custOption = page
    .locator('#customer-select option')
    .filter({ hasText: customerName })
    .first();
  await expect(custOption).toBeAttached();
  const custVal = await custOption.getAttribute('value');
  await page.locator('#customer-select').selectOption(custVal!);
  await expect(page.locator('#shipping-address')).toHaveValue(customerAddress);

  // Dòng 1: chọn sản phẩm 1, số lượng 2
  await page.locator('#order-line-product-0').selectOption(prod1.id);
  await page.locator('#order-line-qty-0').fill('2');

  // Thêm dòng 2: chọn sản phẩm 2, số lượng 3
  await page.getByRole('button', { name: /thêm dòng/i }).click();
  await page.locator('#order-line-product-1').selectOption(prod2.id);
  await page.locator('#order-line-qty-1').fill('3');

  // Chọn phương thức thanh toán BANK_TRANSFER để test VietQR
  await page.locator('#payment-method').selectOption('BANK_TRANSFER');

  // Submit tạo đơn hàng
  await page.getByRole('button', { name: /tạo đơn hàng/i }).click();

  // Chờ chuyển hướng tới trang chi tiết đơn hàng
  await page.waitForURL(/\/admin\/sales\/orders\/[a-z0-9]+/);
  await expect(page.getByText('Chờ xử lý').first()).toBeVisible();
  await expect(page.getByText(customerName).first()).toBeVisible();

  // Lấy mã đơn hàng từ giao diện
  const orderUrl = page.url();
  const orderId = orderUrl.split('/').pop()?.split('?')[0] || '';
  expect(orderId).toBeTruthy();

  // -------------------------------------------------------------
  // Bước 3: Xác nhận đơn (chọn kho thành phẩm) -> Trừ tồn kho
  // -------------------------------------------------------------
  await page.getByRole('button', { name: /xác nhận đơn/i }).click();
  await expectDialogInViewport(page);

  // Chọn kho thành phẩm trong ConfirmOrderDialog
  await page.locator('#warehouse-select').selectOption(finishedWarehouse!.id);
  await page.getByRole('button', { name: /xác nhận xuất kho/i }).click();

  // Dialog đóng, trạng thái chuyển sang "Đã xác nhận"
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('Đã xác nhận').first()).toBeVisible({ timeout: 15_000 });

  // Kiểm tra tồn kho trên /admin/inventory đã giảm tương ứng:
  // Dòng 1 giảm 2, Dòng 2 giảm 3
  const stockAfterConfirm1 = await getItemStockInWh(prod1.itemId, finishedWarehouse!.id);
  const stockAfterConfirm2 = await getItemStockInWh(prod2.itemId, finishedWarehouse!.id);
  expect(stockAfterConfirm1).toBe(initialStock1 - 2);
  expect(stockAfterConfirm2).toBe(initialStock2 - 3);

  // Kiểm tra hiển thị trên bảng tồn kho UI (lô hàng trừ đúng 3 đơn vị)
  await page.goto('/admin/inventory', { waitUntil: 'domcontentloaded' });
  await page.locator('#filter-warehouse').selectOption(finishedWarehouse!.id);
  await page.getByPlaceholder(/tìm kiếm theo mã sku hoặc tên vật tư/i).fill(prod2ItemName);
  const rowProd2 = page.locator('tbody tr').filter({ hasText: prod2ItemName }).first();
  await expect(rowProd2).toBeVisible();
  await expect(rowProd2.locator('td').nth(6)).toContainText(formatVi(initialLotQty - 3));

  // -------------------------------------------------------------
  // Bước 4: Hủy đơn hàng -> Tồn kho được hoàn trả
  // -------------------------------------------------------------
  await page.goto(`/admin/sales/orders/${orderId}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Đã xác nhận').first()).toBeVisible();

  // Bấm nút "Hủy đơn"
  await page.getByRole('button', { name: /hủy đơn/i }).click();
  await expectDialogInViewport(page);

  // Xác nhận hủy đơn trong ConfirmDialog
  await page.getByRole('button', { name: 'Hủy đơn hàng' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  // Trạng thái đơn chuyển sang "Đã hủy"
  await expect(page.getByText('Đã hủy').first()).toBeVisible({ timeout: 15_000 });

  // Kiểm tra tồn kho trên /admin/inventory đã được khôi phục nguyên trạng
  const stockAfterCancel1 = await getItemStockInWh(prod1.itemId, finishedWarehouse!.id);
  const stockAfterCancel2 = await getItemStockInWh(prod2.itemId, finishedWarehouse!.id);
  expect(stockAfterCancel1).toBe(initialStock1);
  expect(stockAfterCancel2).toBe(initialStock2);

  // Kiểm tra hiển thị trên bảng tồn kho UI (lô hàng hoàn lại đúng initialLotQty)
  await page.goto('/admin/inventory', { waitUntil: 'domcontentloaded' });
  await page.locator('#filter-warehouse').selectOption(finishedWarehouse!.id);
  await page.getByPlaceholder(/tìm kiếm theo mã sku hoặc tên vật tư/i).fill(prod2ItemName);
  const rowRestored = page.locator('tbody tr').filter({ hasText: prod2ItemName }).first();
  await expect(rowRestored).toBeVisible();
  await expect(rowRestored.locator('td').nth(6)).toContainText(formatVi(initialLotQty));

  // -------------------------------------------------------------
  // Bước 5: Mở trang in -> Thấy mã đơn và tổng tiền
  // -------------------------------------------------------------
  await page.goto(`/admin/sales/orders/${orderId}/print?type=invoice`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByRole('heading', { name: /hóa đơn bán hàng/i })).toBeVisible();

  // Xác minh thông tin mã đơn hàng hiển thị trên bản in
  const printOrderCode = page.locator('.font-mono').first();
  await expect(printOrderCode).toBeVisible();
  const codeText = await printOrderCode.textContent();
  expect(codeText).toMatch(/^SO-\d{4}-\d+/);

  // Xác minh tổng thanh toán hiển thị
  await expect(page.getByText(/tổng thanh toán/i)).toBeVisible();
  await expect(page.getByText(/₫/i).first()).toBeVisible();

  // Xác minh khối VietQR hiển thị cho phương thức BANK_TRANSFER chưa thanh toán
  await expect(page.locator('[data-testid="vietqr-block"]')).toBeVisible();

  // Đảm bảo không có lỗi không mong muốn
  errors.assertClean();
});
