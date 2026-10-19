import { api, expect, expectDialogInViewport, loginAs, test } from './fixtures';

test.describe('IoT Sensors & Charts Flow', () => {
  test('tạo sensor → copy key từ dialog → gửi reading vượt ngưỡng qua POST /api/v1/iot/readings → chuông hiện thông báo trong ≤ 30s → mở biểu đồ thấy series', async ({
    page,
    request,
    errors,
  }) => {
    // 1. Đăng nhập với quyền OWNER
    await loginAs(page, 'OWNER');

    // Đảm bảo có ít nhất 1 khu vực (Area) để gán cho cảm biến
    const areasRes = await api<{ data: Array<{ id: string; name: string }> }>(page, '/areas');
    let areaId = areasRes.data?.[0]?.id;
    if (!areaId) {
      const newArea = await api<{ data: { id: string } }>(page, '/areas', {
        method: 'POST',
        body: JSON.stringify({ name: 'Khu Ao E2E', type: 'POND' }),
      });
      areaId = newArea.data.id;
    }

    // 2. Vào trang quản lý cảm biến /admin/iot/sensors
    await page.goto('/admin/iot/sensors');
    await expect(
      page.getByRole('heading', { name: /quản lý cảm biến iot/i }),
    ).toBeVisible({ timeout: 15_000 });

    // 3. Mở dialog tạo sensor
    const suffix = Date.now();
    const sensorName = `Nhiệt độ Ao E2E ${suffix}`;

    await page.getByTestId('create-sensor-btn').click();
    await expectDialogInViewport(page);

    await page.locator('#sensor-name').fill(sensorName);
    await page.locator('#sensor-unit').fill('°C');
    await page.locator('#sensor-area').selectOption(areaId);

    // Bật cấu hình ngưỡng ban đầu: vượt ngưỡng 30 °C
    await page.locator('#enable-initial-rule').check();
    await page.locator('#initial-rule-threshold').fill('30');

    // Bấm tạo cảm biến
    await page.getByTestId('submit-sensor-form-btn').click();

    // 4. Dialog API Key hiển thị một lần với key và nút sao chép
    const keyInput = page.getByTestId('sensor-api-key');
    await expect(keyInput).toBeVisible({ timeout: 15_000 });
    const apiKey = await keyInput.inputValue();
    expect(apiKey).toBeTruthy();
    expect(apiKey.length).toBeGreaterThan(15);

    // Kiểm tra nút sao chép và curl example
    await expect(page.getByTestId('copy-key-btn')).toBeVisible();
    await expect(page.getByTestId('curl-command-block')).toContainText(apiKey);
    await page.getByTestId('copy-key-btn').click();

    // Đóng dialog API Key
    await page.getByTestId('close-api-key-dialog-btn').click();
    await expect(keyInput).not.toBeVisible();

    // Kiểm tra dòng cảm biến xuất hiện trong bảng
    await expect(page.getByText(sensorName)).toBeVisible({ timeout: 15_000 });

    // 5. Gửi reading vượt ngưỡng qua request.post('/api/v1/iot/readings') với header X-Sensor-Key
    const readingValue = 38.5; // > 30 ngưỡng
    const postPayload = {
      readings: [
        {
          value: readingValue,
          recordedAt: new Date().toISOString(),
        },
      ],
    };

    // Gửi qua request context
    let readingRes = await request.post('/api/v1/iot/readings', {
      headers: {
        'Content-Type': 'application/json',
        'X-Sensor-Key': apiKey,
      },
      data: postPayload,
    });

    if (!readingRes.ok()) {
      // Fallback nếu baseURL của request khác API port
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api/v1';
      readingRes = await request.post(`${apiUrl}/iot/readings`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sensor-Key': apiKey,
        },
        data: postPayload,
      });
    }
    expect(readingRes.ok()).toBeTruthy();

    // 6. Chuông hiện thông báo trong ≤ 30 giây (đúng tiêu chí PLAN GĐ 7)
    const badge = page.getByTestId('alerts-unread-badge');
    await expect(badge).toBeVisible({ timeout: 30_000 });
    const unreadCount = parseInt(await badge.innerText(), 10);
    expect(unreadCount).toBeGreaterThan(0);

    // Mở dropdown chuông
    await page.getByTestId('alerts-bell-button').click();
    const dropdown = page.getByTestId('alerts-dropdown');
    await expect(dropdown).toBeVisible();

    // Dropdown hiển thị alert và có link sang biểu đồ cảm biến
    const chartLink = dropdown
      .getByRole('link', { name: /xem biểu đồ cảm biến/i })
      .first();
    await expect(chartLink).toBeVisible();

    // 7. Mở biểu đồ thấy series
    await chartLink.click();

    await expect(page).toHaveURL(/.*\/admin\/iot\/charts.*/);
    await expect(
      page.getByRole('heading', { name: /biểu đồ dữ liệu iot/i }),
    ).toBeVisible({ timeout: 15_000 });

    // Thấy biểu đồ của sensor vừa tạo
    await expect(page.getByText(sensorName)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('sensor-charts-container')).toBeVisible({
      timeout: 15_000,
    });

    // Thấy giá trị vừa gửi hiển thị trên card (38.5 hoặc 38,5)
    await expect(
      page.getByText('38.5 °C').or(page.getByText('38,5 °C')),
    ).toBeVisible({ timeout: 15_000 });

    errors.assertClean();
  });
});
