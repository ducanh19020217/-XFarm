import { test, expect } from './fixtures';
import path from 'node:path';
import fs from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

test.describe('Webshop E2E – Cửa hàng online', () => {
  let prisma: PrismaClient;
  let testProduct1: { id: string; name: string; slug: string };
  let testProduct2: { id: string; name: string; slug: string };

  test.beforeAll(async () => {
    process.loadEnvFile?.(path.resolve(__dirname, '../../../.env'));
    prisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ||
            'postgresql://xfarm:xfarm_secret@localhost:5442/xfarm_s3?schema=public',
        },
      },
    });

    // Ensure warehouse exists
    let warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) {
      warehouse = await prisma.warehouse.create({
        data: {
          code: 'WH-WEBSHOP-TEST',
          name: 'Kho Webshop E2E',
        },
      });
    }

    // Ensure at least 2 published products with stock
    const products = await prisma.product.findMany({
      where: { isPublished: true },
      take: 2,
    });

    if (products.length >= 2) {
      testProduct1 = products[0];
      testProduct2 = products[1];
    } else {
      // Create products if missing
      const item1 = await prisma.item.create({
        data: {
          sku: `ITEM-WS-1-${Date.now()}`,
          name: 'Nông sản test 1',
          category: 'PRODUCE',
          unit: 'kg',
          isSellable: true,
        },
      });
      const item2 = await prisma.item.create({
        data: {
          sku: `ITEM-WS-2-${Date.now()}`,
          name: 'Nông sản test 2',
          category: 'PRODUCE',
          unit: 'hộp',
          isSellable: true,
        },
      });
      testProduct1 = await prisma.product.create({
        data: {
          slug: `prod-ws-1-${Date.now()}`,
          name: 'Nông sản test 1',
          itemId: item1.id,
          price: 35000,
          unit: 'kg',
          isPublished: true,
        },
      });
      testProduct2 = await prisma.product.create({
        data: {
          slug: `prod-ws-2-${Date.now()}`,
          name: 'Nông sản test 2',
          itemId: item2.id,
          price: 50000,
          unit: 'hộp',
          isPublished: true,
        },
      });
    }

    // Ensure stock for both products
    for (const prod of [testProduct1, testProduct2]) {
      const fullProd = await prisma.product.findUniqueOrThrow({ where: { id: prod.id } });
      const lot = await prisma.stockLot.create({
        data: {
          itemId: fullProd.itemId,
          warehouseId: warehouse.id,
          lotCode: `LOT-WS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          unitCost: 10000,
        },
      });
      await prisma.stockMove.create({
        data: {
          type: 'IN',
          itemId: fullProd.itemId,
          stockLotId: lot.id,
          toWarehouseId: warehouse.id,
          quantity: 100,
          unitCost: 10000,
        },
      });
    }

    // Ensure bank.vietqr setting exists
    const bankSetting = await prisma.siteSetting.findUnique({ where: { key: 'bank.vietqr' } });
    if (!bankSetting) {
      await prisma.siteSetting.create({
        data: {
          key: 'bank.vietqr',
          value: { bank: 'VCB', accountNumber: '0123456789', accountName: 'XFARM' },
        },
      });
    }
  });

  test.afterAll(async () => {
    await prisma?.$disconnect();
  });

  test('luồng hoàn chỉnh: thêm 2 SP vào giỏ → reload còn → checkout VietQR → QR và mã đơn → tra cứu PENDING → kiểm tra qua API', async ({
    page,
    errors,
  }) => {
    test.setTimeout(120_000);
    const timestamp = Date.now();
    const customerPhone = '0988776655';
    const customerName = `Khách hàng Test ${timestamp}`;

    // 1. Vào trang sản phẩm
    await page.goto('/san-pham');
    await expect(page.getByRole('heading', { name: /sản phẩm trang trại/i })).toBeVisible();

    // 2. Thêm sản phẩm thứ nhất vào giỏ (từ danh sách sản phẩm)
    const addBtn1 = page
      .locator('#main-content')
      .getByTestId(`add-to-cart-${testProduct1.id}`)
      .first();
    await expect(addBtn1).toBeVisible();
    await addBtn1.click();

    // 3. Vào chi tiết sản phẩm thứ 2 và thêm vào giỏ
    await page.goto(`/san-pham/${testProduct2.slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(testProduct2.name);
    const detailAddBtn = page.locator('#main-content').getByTestId('add-to-cart-button').first();
    await expect(detailAddBtn).toBeVisible();
    await detailAddBtn.click();
    await expect(page.getByText('Đã thêm vào giỏ!')).toBeVisible();

    // 4. Kiểm tra icon giỏ trên header có badge số lượng
    const cartBadge = page.getByTestId('cart-badge-count');
    await expect(cartBadge).toBeVisible();
    const countText = await cartBadge.textContent();
    expect(Number(countText)).toBeGreaterThanOrEqual(2);

    // 5. Reload trang → giỏ hàng vẫn còn trong localStorage
    await page.reload();
    await expect(page.getByTestId('cart-badge-count')).toBeVisible();

    // 6. Đi tới trang giỏ hàng /gio-hang
    await page.goto('/gio-hang');
    await expect(page.getByRole('heading', { name: /giỏ hàng của bạn/i })).toBeVisible();
    await expect(page.getByTestId(`cart-row-${testProduct1.id}`)).toBeVisible();
    await expect(page.getByTestId(`cart-row-${testProduct2.id}`)).toBeVisible();

    // Reload lại trang giỏ hàng để xác nhận một lần nữa
    await page.reload();
    await expect(page.getByTestId(`cart-row-${testProduct1.id}`)).toBeVisible();
    await expect(page.getByTestId(`cart-row-${testProduct2.id}`)).toBeVisible();

    // 7. Nhấn Tiến hành thanh toán
    const checkoutLink = page.getByTestId('proceed-to-checkout');
    await expect(checkoutLink).toBeVisible();
    await checkoutLink.click();

    // 8. Trang thanh toán /thanh-toan
    await page.waitForURL('**/thanh-toan');
    await expect(page.getByRole('heading', { name: /thông tin thanh toán/i })).toBeVisible();

    // Điền form thanh toán
    await page.locator('#fullName').fill(customerName);
    await page.locator('#phone').fill(customerPhone);
    await page.locator('#address').fill('123 Đường Nông Nghiệp Xanh, Hà Nội');
    await page.locator('#notes').fill('Giao giờ hành chính');

    // Chọn phương thức chuyển khoản (BANK_TRANSFER)
    const bankTransferRadio = page.locator('input[value="BANK_TRANSFER"]');
    await bankTransferRadio.check();
    expect(await bankTransferRadio.isChecked()).toBe(true);

    // Submit đơn hàng
    const submitBtn = page.getByTestId('submit-checkout');
    await submitBtn.click();

    // 9. Chuyển hướng sang trang /dat-hang-thanh-cong/[code]
    await page.waitForURL(/\/dat-hang-thanh-cong\/[\w-]+/);
    await expect(page.getByRole('heading', { name: /đặt hàng thành công/i })).toBeVisible();

    // Thấy mã đơn hàng và QR VietQR
    const orderCodeEl = page.getByTestId('order-code-text');
    await expect(orderCodeEl).toBeVisible();
    const orderCode = (await orderCodeEl.textContent())?.trim();
    expect(orderCode).toBeTruthy();
    expect(orderCode).toMatch(/^SO-\d{4}-\d+$/);

    // Thấy ảnh QR VietQR và số tài khoản
    const qrImage = page.getByTestId('vietqr-image');
    await expect(qrImage).toBeVisible();
    await expect(page.getByTestId('bank-account-number')).toBeVisible();
    await expect(page.getByTestId('transfer-content')).toHaveText(orderCode!);

    // Giỏ hàng đã được xóa sau khi đặt thành công
    await expect(page.getByTestId('cart-badge-count')).toHaveCount(0);

    // 10. Đi tới trang /tra-cuu-don
    await page.goto('/tra-cuu-don');
    await expect(page.getByRole('heading', { name: /tra cứu đơn hàng/i })).toBeVisible();

    // Nhập mã đơn + SĐT
    await page.locator('#code').fill(orderCode!);
    await page.locator('#phone').fill(customerPhone);
    await page.getByTestId('submit-lookup').click();

    // Thấy trạng thái đơn hàng PENDING
    await expect(page.getByTestId('lookup-order-code')).toHaveText(orderCode!);
    const statusBadge = page.getByTestId('order-status-badge');
    await expect(statusBadge).toBeVisible();
    await expect(statusBadge).toContainText('PENDING');

    // 11. Đăng nhập OWNER và kiểm tra đơn
    const statePath = path.resolve('e2e/.auth', 'owner.json');
    const state = JSON.parse(await fs.readFile(statePath, 'utf8'));
    await page.context().clearCookies();
    await page.context().addCookies(state.cookies || []);
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Xin chào,/)).toBeVisible({ timeout: 15_000 });

    // Kiểm tra /admin/sales/orders nếu có trên nhánh, nếu không kiểm tra qua API
    const adminOrdersRes = await page
      .goto('/admin/sales/orders', { waitUntil: 'domcontentloaded' })
      .catch(() => null);
    if (adminOrdersRes && adminOrdersRes.status() === 200) {
      const searchInput = page.getByPlaceholder(/tìm theo mã đơn/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill(orderCode!);
        await page.waitForTimeout(500);
      }
      await expect(page.getByText(orderCode!)).toBeVisible();
    } else {
      // Kiểm tra qua API public order lookup
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4350/api/v1';
      const apiRes = await page.request.get(
        `${apiBase}/public/orders/lookup?code=${orderCode}&phone=${customerPhone}`,
      );
      expect(apiRes.status()).toBe(200);
      const data = await apiRes.json();
      expect(data.code).toBe(orderCode);
      expect(data.status).toBe('PENDING');
    }

    errors.assertClean();
  });

  test('giao diện webshop trên màn hình Mobile 390px không bị vỡ layout', async ({
    page,
    errors,
  }) => {
    // Thiết lập viewport mobile 390x844 (iPhone 12/13/14)
    await page.setViewportSize({ width: 390, height: 844 });

    // 1. Kiểm tra trang danh sách sản phẩm
    await page.goto('/san-pham');
    let scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    let clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);

    // 2. Thêm vào giỏ từ mobile
    const addBtn = page
      .locator('#main-content')
      .getByTestId(`add-to-cart-${testProduct1.id}`)
      .first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Icon giỏ trên mobile top bar hiển thị
    const mobileCartBtn = page.getByTestId('cart-header-mobile-btn');
    await expect(mobileCartBtn).toBeVisible();

    // 3. Kiểm tra trang giỏ hàng trên mobile
    await page.goto('/gio-hang');
    scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
    await expect(page.getByTestId('proceed-to-checkout')).toBeVisible();

    // 4. Kiểm tra trang thanh toán trên mobile
    await page.goto('/thanh-toan');
    scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
    await expect(page.locator('#fullName')).toBeVisible();
    await expect(page.getByTestId('submit-checkout')).toBeVisible();

    // 5. Kiểm tra trang tra cứu đơn trên mobile
    await page.goto('/tra-cuu-don');
    scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
    await expect(page.locator('#code')).toBeVisible();
    await expect(page.getByTestId('submit-lookup')).toBeVisible();

    errors.assertClean();
  });
});
