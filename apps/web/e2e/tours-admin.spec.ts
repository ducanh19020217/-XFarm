import { expect, expectDialogInViewport, loginAs, api, test } from './fixtures';
import { toVietnamDateString } from '@xfarm/shared';

test.describe('Admin Tours & Booking Workflow', () => {
  test('tạo tour → tạo slot hàng loạt 2 tuần → thấy đúng số slot → tạo booking qua API public → xác nhận + thu đủ tiền trên UI → PAID', async ({
    page,
    errors,
  }) => {
    test.setTimeout(120_000);

    // 1. Đăng nhập với quyền OWNER
    await loginAs(page, 'OWNER');
    await page.goto('/admin/tours');
    await expect(page.locator('main')).toBeVisible();

    // 2. Tạo tour mới trên UI
    const unique = Date.now();
    const tourName = `Tour trải nghiệm sinh thái ${unique}`;

    const addTourBtn = page.getByRole('button', { name: /thêm tour mới/i });
    await expect(addTourBtn).toBeVisible();
    await addTourBtn.click();
    await expectDialogInViewport(page);

    await page.locator('#tour-name').fill(tourName);

    // Điền mô tả Tiptap
    const tiptapEditor = page.locator('[data-testid="rich-text-editor"] .tiptap');
    await tiptapEditor.click();
    await tiptapEditor.fill(
      'Khám phá trang trại sinh thái XFarm, hái quả và trải nghiệm nông nghiệp.',
    );

    await page.locator('#tour-duration').fill('120');
    await page.locator('#tour-capacity').fill('25');
    await page.locator('#tour-price-adult').fill('200000');
    await page.locator('#tour-price-child').fill('100000');

    // Đánh dấu xuất bản
    await page.locator('#tour-publish').check();

    // Bấm Tạo tour
    await page.getByRole('button', { name: /tạo tour/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 });

    // Kiểm tra tour mới xuất hiện trong bảng danh sách
    await expect(page.getByText(tourName)).toBeVisible({ timeout: 15_000 });

    // 3. Điều hướng vào chi tiết tour (Lịch suất)
    await page.getByRole('link', { name: tourName }).click();
    await page.waitForURL('**/admin/tours/**');
    await expect(page.getByText(tourName)).toBeVisible();

    // 4. Mở dialog "Tạo slot hàng loạt" 2 tuần
    const bulkBtn = page.getByRole('button', { name: /tạo slot hàng loạt/i });
    await expect(bulkBtn).toBeVisible();
    await bulkBtn.click();
    await expectDialogInViewport(page);

    // Tính toán khoảng ngày 2 tuần bắt đầu từ thứ 2 tuần tới
    const now = new Date();
    const nextMon = new Date(now);
    const daysToMon = (1 - now.getDay() + 7) % 7 || 7;
    nextMon.setDate(now.getDate() + daysToMon);
    const nextSun = new Date(nextMon);
    nextSun.setDate(nextMon.getDate() + 13); // đúng 14 ngày (2 tuần trọn vẹn từ T2 đến CN)

    const fromDateStr = toVietnamDateString(nextMon);
    const toDateStr = toVietnamDateString(nextSun);

    await page.locator('#bulk-from').fill(fromDateStr);
    await page.locator('#bulk-to').fill(toDateStr);

    // Dialog mặc định đã chọn thứ 7 và CN (weekdays [6, 0]) và 2 khung giờ [08:00, 14:00]
    // 2 tuần có 2 thứ 7 và 2 CN = 4 ngày * 2 khung giờ = 8 suất
    await page.getByRole('button', { name: /tạo hàng loạt suất/i }).click();

    // Kiểm tra báo cáo tạo thành công (đã tạo 8 suất)
    await expect(page.getByText(/đã tạo 8 suất/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 });

    // 5. Kiểm tra đúng số slot đã tạo qua API
    const currentUrl = page.url();
    const tourId = currentUrl.split('/admin/tours/')[1].split('?')[0];

    const slotsResponse = await api<{
      data: Array<{ id: string; startAt: string; capacity: number }>;
    }>(page, `/tours/${tourId}/slots?pageSize=100`);
    expect(slotsResponse.data.length).toBeGreaterThanOrEqual(8);

    // 6. Đặt chỗ qua API public cho 1 slot vừa tạo
    const targetSlot = slotsResponse.data[0];
    const customerName = `Khách hàng trải nghiệm ${unique}`;

    const bookingResponse = await api<{ code: string; total: string }>(page, '/public/bookings', {
      method: 'POST',
      body: JSON.stringify({
        slotId: targetSlot.id,
        customerName,
        phone: '0901234567',
        email: 'khachhang@xfarm.local',
        adults: 2,
        children: 1,
        paymentMethod: 'CASH',
        notes: 'Đặt trải nghiệm cho cả gia đình',
      }),
    });
    expect(bookingResponse.code).toMatch(/^BK-/);

    // 7. Vào trang Quản lý Đặt chỗ (/admin/tours/bookings)
    await page.goto('/admin/tours/bookings');
    await page.waitForLoadState('networkidle');

    // Tìm kiếm mã booking
    const searchInput = page.getByPlaceholder('Mã, tên, số ĐT...');
    await searchInput.fill(bookingResponse.code);

    const bookingRow = page.locator('tr', { hasText: bookingResponse.code });
    await expect(bookingRow).toBeVisible({ timeout: 15_000 });
    await expect(bookingRow).toContainText('Chờ xác nhận');
    await expect(bookingRow).toContainText('Chưa thanh toán');

    // 8. Mở chi tiết booking
    await bookingRow.getByRole('button', { name: /chi tiết/i }).click();
    await expectDialogInViewport(page);

    // Xác nhận booking trên UI
    const confirmBtn = page.getByRole('button', { name: /xác nhận đặt chỗ/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Trạng thái cập nhật thành Đã xác nhận
    await expect(page.getByRole('dialog').getByText('Đã xác nhận')).toBeVisible({
      timeout: 15_000,
    });

    // 9. Thu đủ tiền trên UI
    const payBtn = page.getByRole('button', { name: /ghi thu tiền/i });
    await expect(payBtn).toBeVisible();
    await payBtn.click();
    await expectDialogInViewport(page);

    // Tiền đã được tự động điền đủ số tiền còn lại (2 lớn * 200k + 1 nhỏ * 100k = 500k)
    const confirmPayBtn = page.getByRole('button', { name: /xác nhận thu tiền/i });
    await expect(confirmPayBtn).toBeVisible();
    await confirmPayBtn.click();

    // Trạng thái thanh toán cập nhật thành Đã thanh toán đủ (PAID)
    await expect(page.getByRole('dialog').getByText('Đã thanh toán đủ')).toBeVisible({
      timeout: 15_000,
    });

    // Đóng dialog chi tiết
    await page.getByRole('button', { name: /đóng/i }).first().click();
    await expect(page.getByRole('dialog')).toBeHidden();

    // Kiểm tra hàng trong bảng cũng hiện đúng Đã xác nhận và Đã thanh toán đủ
    await expect(bookingRow).toContainText('Đã xác nhận');
    await expect(bookingRow).toContainText('Đã thanh toán đủ');

    errors.assertClean();
  });
});
