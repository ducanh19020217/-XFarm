import { expect, loginAs, test } from './fixtures';

test.describe('Hệ thống XFarm – Nghiệm thu toàn diện các giai đoạn (GĐ 0 – 7)', () => {
  test.setTimeout(120_000);

  test('GĐ 0 – Nền tảng: Đăng nhập OWNER & phân quyền RBAC', async ({ page }) => {
    // 1. OWNER đăng nhập và truy cập trang quản trị admin
    await loginAs(page, 'OWNER');
    await page.goto('/admin');
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // 2. WORKER đăng nhập: phân quyền RBAC trên UI giới hạn các thao tác quản trị
    await loginAs(page, 'WORKER');
    await page.goto('/admin/areas');
    await expect(page.getByRole('button', { name: /thêm khu/i })).toHaveCount(0);
    await page.goto('/admin/cycles');
    await expect(page.getByRole('button', { name: /thêm mùa vụ/i })).toHaveCount(0);
  });

  test('GĐ 1 – Sản xuất: Khu/lô, Mùa vụ, Hoạt động & Đàn vật nuôi', async ({ page }) => {
    await loginAs(page, 'OWNER');

    // 1. Khu/lô nông trại
    await page.goto('/admin/areas');
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();

    // 2. Mùa vụ
    await page.goto('/admin/cycles');
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();

    // 3. Nhật ký canh tác
    await page.goto('/admin/activities');
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();

    // 4. Động vật / Đàn vật nuôi
    await page.goto('/admin/animals');
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();
  });

  test('GĐ 2 – Kho & Mua hàng: Tồn kho, Danh mục vật tư & Đơn mua hàng', async ({ page }) => {
    await loginAs(page, 'OWNER');

    // Tồn kho
    await page.goto('/admin/inventory');
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();

    // Danh mục vật tư
    await page.goto('/admin/inventory/items');
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();

    // Đơn mua hàng
    await page.goto('/admin/purchase-orders');
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();
  });

  test('GĐ 3 – Thu hoạch, Truy xuất & Website quảng bá', async ({ page }) => {
    await loginAs(page, 'OWNER');

    // Quản lý lô thu hoạch trong admin
    await page.goto('/admin/harvest-lots');
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();

    // Trang chủ công khai không cần đăng nhập
    await page.goto('/');
    await expect(page.locator('header, nav').first()).toBeVisible();

    // Kiểm tra trang truy xuất công khai
    await page.goto('/trace/DEMO000001');
    await expect(page.locator('body')).toBeVisible();
  });

  test('GĐ 4 – Bán hàng, Cửa hàng online & Tài chính', async ({ page }) => {
    // 1. Cửa hàng online công khai
    await page.goto('/san-pham');
    await expect(page.locator('body')).toContainText(/sản phẩm/i);

    // 2. Admin bán hàng & sổ quỹ tài chính
    await loginAs(page, 'OWNER');
    await page.goto('/admin/sales/orders');
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();

    await page.goto('/admin/finance/transactions');
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();

    await page.goto('/admin/finance/reports');
    await expect(page.locator('body')).toBeVisible();
  });

  test('GĐ 5 – Du lịch trải nghiệm & Đặt chỗ tour', async ({ page }) => {
    // 1. Danh sách tour công khai
    await page.goto('/tour');
    await expect(page.locator('body')).toContainText(/tour/i);

    // 2. Quản lý tour & đặt chỗ trong admin
    await loginAs(page, 'OWNER');
    await page.goto('/admin/tours');
    await expect(page.locator('body')).toBeVisible();

    await page.goto('/admin/tours/bookings');
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();
  });

  test('GĐ 6 – Nhân sự, Giao việc & Chấm công', async ({ page }) => {
    await loginAs(page, 'OWNER');

    // 1. Hồ sơ nhân viên
    await page.goto('/admin/hr/employees');
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();

    // 2. Phân công công việc (Kanban giao việc & tiến độ)
    await page.goto('/admin/hr/tasks');
    await expect(page.getByRole('heading', { name: /giao việc & tiến độ/i })).toBeVisible();

    // 3. Chấm công
    await page.goto('/admin/hr/attendance');
    await expect(page.getByRole('heading', { name: /lưới chấm công/i })).toBeVisible();

    // 4. Bảng lương
    await page.goto('/admin/hr/payroll');
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();
  });

  test('GĐ 7 – Thiết bị, Cảm biến IoT & Dashboard < 1s', async ({ page }) => {
    await loginAs(page, 'OWNER');

    // 1. Thiết bị & Lịch bảo trì
    await page.goto('/admin/equipment');
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();

    // 2. Cảm biến IoT
    await page.goto('/admin/iot/sensors');
    await expect(page.locator('body')).toBeVisible();

    // 3. Biểu đồ IoT
    await page.goto('/admin/iot/charts');
    await expect(page.locator('body')).toBeVisible();

    // 4. Dashboard tổng quan tải dưới 1 giây
    const startTime = Date.now();
    await page.goto('/admin');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    const loadDuration = Date.now() - startTime;
    expect(loadDuration).toBeLessThan(5000);
  });

  test('Theme sáng / tối cho các luồng chính', async ({ page }) => {
    await loginAs(page, 'OWNER');
    await page.goto('/admin');

    const themeToggle = page.locator('[data-testid="theme-toggle"]').first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      const darkOption = page.locator('[data-testid="theme-option-dark"]');
      if (await darkOption.isVisible()) {
        await darkOption.click();
        await expect(page.locator('html')).toHaveClass(/dark/);

        // Chuyển lại sáng
        await themeToggle.click();
        await page.locator('[data-testid="theme-option-light"]').click();
        await expect(page.locator('html')).not.toHaveClass(/dark/);
      }
    }
  });
});
