import { api, expect, expectDialogInViewport, loginAs, test } from './fixtures';

function formatVNDate(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function calculateNextDueDate(baseDate: Date, intervalDays: number): Date {
  const copy = new Date(baseDate);
  copy.setDate(copy.getDate() + intervalDays);
  return copy;
}

test.describe('Equipment & Maintenance E2E Flow', () => {
  test('tạo thiết bị + lịch 30 ngày → ghi log theo lịch → thấy ngày đến hạn mới đúng', async ({
    page,
    errors,
  }) => {
    // 1. Đăng nhập với quyền OWNER
    await loginAs(page, 'OWNER');

    // 2. Vào trang /admin/equipment
    await page.goto('/admin/equipment');
    await expect(page.getByRole('heading', { name: 'Quản lý Thiết bị' })).toBeVisible({
      timeout: 15_000,
    });

    // 3. Mở FormDialog tạo thiết bị mới
    const suffix = Date.now();
    const eqName = `Máy cắt cỏ E2E ${suffix}`;
    const eqCode = `EQ-E2E-${suffix}`;

    await page.getByRole('button', { name: /thêm thiết bị/i }).click();
    await expectDialogInViewport(page);

    await page.locator('#equipment-code').fill(eqCode);
    await page.locator('#equipment-type').fill('MOWER');
    await page.locator('#equipment-name').fill(eqName);
    await page.getByRole('button', { name: 'Tạo mới' }).click();

    // 4. Tìm thiết bị vừa tạo và mở trang chi tiết
    await page.locator('#search-equipment').fill(eqName);
    const eqLink = page.getByRole('link', { name: eqName });
    await expect(eqLink).toBeVisible({ timeout: 15_000 });
    await eqLink.click();

    // 5. Kiểm tra đã chuyển sang trang chi tiết /admin/equipment/[id]
    await expect(page).toHaveURL(/\/admin\/equipment\/[^/]+/);
    await expect(page.getByRole('heading', { name: eqName })).toBeVisible({ timeout: 15_000 });

    // 6. Thêm lịch bảo trì 30 ngày
    await page.getByRole('button', { name: /thêm lịch bảo trì/i }).click();
    await expectDialogInViewport(page);

    const scheduleName = `Bảo dưỡng định kỳ 30 ngày ${suffix}`;
    await page.locator('#schedule-name').fill(scheduleName);
    await page.locator('#schedule-intervalDays').fill('30');

    // Đặt ngày đến hạn ban đầu là hôm nay
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    await page.locator('#schedule-nextDueDate').fill(todayStr);

    await page.getByRole('button', { name: 'Tạo lịch' }).click();

    // Lịch xuất hiện trong danh sách
    await expect(page.getByText(scheduleName)).toBeVisible({ timeout: 15_000 });

    // 7. Ghi nhận nhật ký bảo trì theo lịch vừa tạo
    const logButtons = page.getByRole('button', { name: /ghi nhận bảo trì/i });
    await logButtons.first().click();
    await expectDialogInViewport(page);

    await page.locator('#log-date').fill(todayStr);
    // Chọn lịch liên quan
    const scheduleOptionVal = await page
      .locator('#log-schedule option')
      .filter({ hasText: scheduleName })
      .first()
      .getAttribute('value');
    if (scheduleOptionVal) {
      await page.locator('#log-schedule').selectOption(scheduleOptionVal);
    }
    // Nhập chi phí qua MoneyInput
    await page.locator('#log-cost').fill('350000');
    await page.locator('#log-notes').fill(`Thay lưỡi cắt cỏ đợt ${suffix}`);

    await page.getByRole('button', { name: 'Lưu nhật ký' }).click();

    // 8. Kiểm tra nhật ký bảo trì xuất hiện và tổng chi phí cập nhật
    await expect(page.getByText(`Thay lưỡi cắt cỏ đợt ${suffix}`)).toBeVisible({
      timeout: 15_000,
    });
    const costCard = page.getByTestId('total-maintenance-cost');
    await expect(costCard).toBeVisible();
    await expect(costCard).toContainText('350.000');

    // 9. Kiểm tra ngày đến hạn mới của lịch được tự động cập nhật đúng (hôm nay + 30 ngày)
    const expectedNewDueDate = calculateNextDueDate(today, 30);
    const expectedDateFormatted = formatVNDate(expectedNewDueDate);
    const scheduleRow = page
      .getByTestId('schedules-table')
      .getByText(scheduleName)
      .locator('xpath=ancestor::tr');
    await expect(scheduleRow).toContainText(expectedDateFormatted);

    errors.assertClean();
  });

  test('chạy kiểm tra bảo trì với lịch đến hạn seed → chuông có thông báo và link sang thiết bị', async ({
    page,
    errors,
  }) => {
    // 1. Đăng nhập với quyền OWNER
    await loginAs(page, 'OWNER');

    // 2. Tạo thiết bị và lịch bảo trì đến hạn trong 2 ngày (đáp ứng điều kiện alert <= 3 ngày)
    const seedSuffix = Date.now();
    const eqRes = await api<{ data: { id: string; code: string; name: string } }>(
      page,
      '/equipment',
      {
        method: 'POST',
        body: JSON.stringify({
          name: `Thiết bị kiểm tra bảo trì ${seedSuffix}`,
          type: 'PUMP',
        }),
      },
    );
    const equipmentId = eqRes.data.id;
    const equipmentName = eqRes.data.name;

    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const scheduleName = `Bảo dưỡng khẩn cấp ${seedSuffix}`;
    await api(page, `/equipment/${equipmentId}/maintenance-schedules`, {
      method: 'POST',
      body: JSON.stringify({
        name: scheduleName,
        intervalDays: 14,
        nextDueDate: inTwoDays.toISOString(),
      }),
    });

    // 3. Vào /admin/equipment và chạy kiểm tra bảo trì
    await page.goto('/admin/equipment');
    await expect(page.getByRole('heading', { name: 'Quản lý Thiết bị' })).toBeVisible({
      timeout: 15_000,
    });

    // Tìm thiết bị để thấy badge "Đến hạn bảo trì"
    await page.locator('#search-equipment').fill(equipmentName);
    const row = page.getByText(equipmentName).locator('xpath=ancestor::tr');
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row.getByTestId('badge-due-soon')).toBeVisible();

    // Bấm nút "Kiểm tra bảo trì" trên giao diện (hoặc gọi API nếu nút ẩn)
    const runMaintBtn = page.getByRole('button', { name: /kiểm tra bảo trì/i });
    if (await runMaintBtn.isVisible()) {
      await runMaintBtn.click();
    } else {
      await api(page, '/alerts/run-maintenance-check', { method: 'POST' });
    }

    // 4. Icon chuông có badge số chưa đọc (> 0)
    const unreadBadge = page.getByTestId('alerts-unread-badge');
    await expect(unreadBadge).toBeVisible({ timeout: 15_000 });

    // 5. Mở dropdown chuông và kiểm tra thông báo bảo trì
    await page.getByTestId('alerts-bell-button').click();
    const dropdown = page.getByTestId('alerts-dropdown');
    await expect(dropdown).toBeVisible();

    // Cảnh báo chứa thông tin thiết bị hoặc lịch bảo trì
    await expect(dropdown.getByText(new RegExp(equipmentName))).toBeVisible({ timeout: 15_000 });

    // Link trong cảnh báo trỏ sang trang thiết bị /admin/equipment/[id]
    const alertEqLink = dropdown.locator(`a[href*="/admin/equipment/${equipmentId}"]`).first();
    await expect(alertEqLink).toBeVisible();
    await alertEqLink.click();

    // Kiểm tra đã điều hướng sang đúng trang thiết bị
    await expect(page).toHaveURL(`/admin/equipment/${equipmentId}`);
    await expect(page.getByRole('heading', { name: equipmentName })).toBeVisible({
      timeout: 15_000,
    });

    errors.assertClean();
  });
});
