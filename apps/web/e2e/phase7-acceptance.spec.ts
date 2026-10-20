import path from 'node:path';
import { api, expect, expectDialogInViewport, loginAs, test } from './fixtures';

process.loadEnvFile?.(path.resolve(__dirname, '../../../.env'));

const slotApiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.API_PORT ? `http://localhost:${process.env.API_PORT}/api/v1` : '');

test.describe('Nghiệm thu GĐ 7 – Thiết bị & IoT', () => {
  test('Dashboard tổng quan hiển thị đủ KPI và biểu đồ', async ({ page, errors }) => {
    await loginAs(page, 'OWNER');
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Tổng quan' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Mùa vụ đang chạy')).toBeVisible();
    await expect(page.getByText('Doanh thu tháng này')).toBeVisible();
    await expect(page.getByText('Booking 7 ngày tới')).toBeVisible();
    await expect(page.getByText('Mặt hàng dưới minStock')).toBeVisible();
    await expect(page.getByText('Lô sắp hết hạn')).toBeVisible();
    await expect(page.getByText('Task quá hạn')).toBeVisible();
    await expect(page.getByText('Cảnh báo chưa đọc')).toBeVisible();
    await expect(page.getByTestId('revenue-chart')).toBeVisible();
    await expect(page.getByTestId('production-chart')).toBeVisible();
    errors.assertClean();
  });

  test('(a) Tạo sensor + AlertRule, gửi reading vượt ngưỡng qua POST /api/v1/iot/readings → chuông hiện Alert SENSOR_THRESHOLD ≤ 30s', async ({
    page,
    request,
    errors,
  }) => {
    test.setTimeout(60_000);
    // 1. Đăng nhập với quyền OWNER
    await loginAs(page, 'OWNER');

    const suffix = Date.now();
    const sensorCode = `SN-ACC-${suffix}`;
    const sensorName = `Cảm biến Ao GĐ7 ${suffix}`;
    const areaName = `Khu Ao GĐ7 ${suffix}`;

    // Tạo khu vực riêng cho test có Date.now(), không phụ thuộc dữ liệu cũ
    const newArea = await api<{ data: { id: string; code: string; name: string } }>(
      page,
      '/areas',
      {
        method: 'POST',
        body: JSON.stringify({ name: areaName, type: 'POND' }),
      },
    );
    const areaId = newArea.data.id;

    // 2. Vào trang quản lý cảm biến /admin/iot/sensors
    await page.goto('/admin/iot/sensors');
    await expect(page.getByRole('heading', { name: /quản lý cảm biến iot/i })).toBeVisible({
      timeout: 15_000,
    });

    // 3. Mở dialog tạo sensor + AlertRule ban đầu
    await page.getByTestId('create-sensor-btn').click();
    await expectDialogInViewport(page);

    await page.locator('#sensor-code').fill(sensorCode);
    await page.locator('#sensor-name').fill(sensorName);
    await page.locator('#sensor-unit').fill('°C');

    // Chọn khu vực vừa tạo
    const areaOption = page.locator(`#sensor-area option[value="${areaId}"]`);
    await expect(areaOption).toBeAttached({ timeout: 15_000 });
    await page.locator('#sensor-area').selectOption(areaId);

    // Bật cấu hình ngưỡng ban đầu: vượt ngưỡng 30 °C
    await page.locator('#enable-initial-rule').check();
    await page.locator('#initial-rule-threshold').fill('30');

    // Bấm tạo cảm biến
    await page.getByTestId('submit-sensor-form-btn').click();

    // 4. Nhận API Key từ dialog hiển thị một lần
    const keyInput = page.getByTestId('sensor-api-key');
    await expect(keyInput).toBeVisible({ timeout: 15_000 });
    const apiKey = await keyInput.inputValue();
    expect(apiKey).toBeTruthy();
    expect(apiKey.length).toBeGreaterThan(15);

    // Đóng dialog API Key
    await page.getByTestId('close-api-key-dialog-btn').click();
    await expect(keyInput).not.toBeVisible();

    // Dòng cảm biến xuất hiện trong bảng
    await expect(page.getByText(sensorName)).toBeVisible({ timeout: 15_000 });

    // 5. Gửi reading vượt ngưỡng qua POST /api/v1/iot/readings với header X-Sensor-Key
    const readingValue = 38.5; // > 30 ngưỡng
    const postPayload = {
      readings: [
        {
          value: readingValue,
          recordedAt: new Date().toISOString(),
        },
      ],
    };

    let readingRes = await request.post('/api/v1/iot/readings', {
      headers: {
        'Content-Type': 'application/json',
        'X-Sensor-Key': apiKey,
      },
      data: postPayload,
    });

    if (!readingRes.ok()) {
      if (!slotApiUrl) {
        throw new Error(
          'Thiếu cấu hình slot API (NEXT_PUBLIC_API_URL hoặc API_PORT). Không thể gửi reading tới API!',
        );
      }
      readingRes = await request.post(`${slotApiUrl}/iot/readings`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sensor-Key': apiKey,
        },
        data: postPayload,
      });
    }
    expect(readingRes.ok(), `Gửi reading thất bại với status ${readingRes.status()}`).toBeTruthy();

    // 6. Chuông hiện thông báo Alert SENSOR_THRESHOLD trong ≤ 30 giây (đúng tiêu chí PLAN GĐ 7)
    const badge = page.getByTestId('alerts-unread-badge');
    await expect(badge).toBeVisible({ timeout: 30_000 });
    const unreadCount = parseInt(await badge.innerText(), 10);
    expect(unreadCount).toBeGreaterThan(0);

    // Mở dropdown chuông
    await page.getByTestId('alerts-bell-button').click();
    const dropdown = page.getByTestId('alerts-dropdown');
    await expect(dropdown).toBeVisible();

    // Dropdown hiển thị alert SENSOR_THRESHOLD của đúng cảm biến vừa tạo
    const sensorAlert = dropdown
      .locator('[data-testid^="alert-item-"]')
      .filter({ hasText: sensorName })
      .first();
    await expect(sensorAlert).toBeVisible({ timeout: 15_000 });
    await expect(sensorAlert).toContainText(/Vượt ngưỡng cảm biến/i);

    // Link trong cảnh báo dẫn tới biểu đồ
    const chartLink = sensorAlert.getByRole('link', { name: /xem biểu đồ cảm biến/i });
    await expect(chartLink).toBeVisible();
    await chartLink.click();

    // Xác nhận điều hướng tới biểu đồ dữ liệu
    await expect(page).toHaveURL(/.*\/admin\/iot\/charts.*/);
    await expect(page.getByRole('heading', { name: sensorName })).toBeVisible({ timeout: 15_000 });

    errors.assertClean();
  });

  test('(b) Thiết bị có lịch đến hạn → chạy kiểm tra bảo trì → chuông hiện Alert MAINTENANCE_DUE', async ({
    page,
    errors,
  }) => {
    test.setTimeout(60_000);
    // 1. Đăng nhập với quyền OWNER
    await loginAs(page, 'OWNER');

    const suffix = Date.now();
    const eqName = `Máy bơm nghiệm thu GĐ7 ${suffix}`;
    const eqCode = `EQ-ACC-${suffix}`;
    const scheduleName = `Bảo dưỡng khẩn cấp ${suffix}`;

    // 2. Vào trang /admin/equipment và tạo thiết bị mới
    await page.goto('/admin/equipment');
    await expect(page.getByRole('heading', { name: 'Quản lý Thiết bị' })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: /thêm thiết bị/i }).click();
    await expectDialogInViewport(page);

    await page.locator('#equipment-code').fill(eqCode);
    await page.locator('#equipment-type').fill('PUMP');
    await page.locator('#equipment-name').fill(eqName);
    await page.getByRole('button', { name: 'Tạo mới' }).click();

    // 3. Mở chi tiết thiết bị vừa tạo
    await page.locator('#search-equipment').fill(eqName);
    const eqLink = page.getByRole('link', { name: eqName });
    await expect(eqLink).toBeVisible({ timeout: 15_000 });
    await eqLink.click();

    await expect(page).toHaveURL(/\/admin\/equipment\/[^/]+/);
    await expect(page.getByRole('heading', { name: eqName })).toBeVisible({ timeout: 15_000 });
    const equipmentUrl = page.url();
    const equipmentId = equipmentUrl.split('/').pop()!;

    // 4. Tạo lịch bảo trì đến hạn trong 2 ngày tới (≤ 3 ngày thỏa mãn điều kiện Alert MAINTENANCE_DUE)
    await page.getByRole('button', { name: /thêm lịch bảo trì/i }).click();
    await expectDialogInViewport(page);

    await page.locator('#schedule-name').fill(scheduleName);
    await page.locator('#schedule-intervalDays').fill('14');

    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const inTwoDaysStr = inTwoDays.toISOString().slice(0, 10);
    await page.locator('#schedule-nextDueDate').fill(inTwoDaysStr);

    await page.getByRole('button', { name: 'Tạo lịch' }).click();
    await expect(page.getByText(scheduleName)).toBeVisible({ timeout: 15_000 });

    // 5. Quay lại /admin/equipment và chạy kiểm tra bảo trì
    await page.goto('/admin/equipment');
    await expect(page.getByRole('heading', { name: 'Quản lý Thiết bị' })).toBeVisible({
      timeout: 15_000,
    });

    // Thấy badge "Đến hạn bảo trì" trên dòng thiết bị
    await page.locator('#search-equipment').fill(eqName);
    const row = page.getByText(eqName).locator('xpath=ancestor::tr');
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row.getByTestId('badge-due-soon')).toBeVisible();

    // Bấm nút "Kiểm tra bảo trì" trên giao diện
    const runMaintBtn = page.getByRole('button', { name: /kiểm tra bảo trì/i });
    if (await runMaintBtn.isVisible()) {
      await runMaintBtn.click();
    } else {
      await api(page, '/alerts/run-maintenance-check', { method: 'POST' });
    }

    // 6. Icon chuông có badge số chưa đọc (> 0)
    const unreadBadge = page.getByTestId('alerts-unread-badge');
    await expect(unreadBadge).toBeVisible({ timeout: 15_000 });

    // 7. Mở dropdown chuông và kiểm tra thông báo bảo trì MAINTENANCE_DUE
    await page.getByTestId('alerts-bell-button').click();
    const dropdown = page.getByTestId('alerts-dropdown');
    await expect(dropdown).toBeVisible();

    const maintAlert = dropdown
      .locator('[data-testid^="alert-item-"]')
      .filter({ hasText: eqName })
      .first();
    await expect(maintAlert).toBeVisible({ timeout: 15_000 });
    await expect(maintAlert).toContainText(/Đến hạn bảo trì/i);

    // Link trong cảnh báo trỏ sang trang chi tiết thiết bị /admin/equipment/[id]
    const alertEqLink = maintAlert.locator(`a[href*="/admin/equipment/${equipmentId}"]`).first();
    await expect(alertEqLink).toBeVisible();
    await alertEqLink.click();

    // Xác nhận đã điều hướng sang đúng trang thiết bị
    await expect(page).toHaveURL(`/admin/equipment/${equipmentId}`);
    await expect(page.getByRole('heading', { name: eqName })).toBeVisible({ timeout: 15_000 });

    errors.assertClean();
  });
});
