import { expect, expectDialogInViewport, loginAs, api, test } from './fixtures';
import { toVietnamDateString } from '@xfarm/shared';
import path from 'node:path';

// Nạp Prisma client từ workspace packages/db
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require(path.resolve(__dirname, '../../../packages/db'));

test.describe('Nghiệm thu Giai đoạn 5 – Tour & Booking (Phase 5 Acceptance)', () => {
  test('admin tạo tour + slot hàng loạt → khách đặt chỗ web public → admin xác nhận + thu tiền → có Transaction INCOME (TOUR) → slot giảm chỗ đúng; hủy booking thì trả chỗ', async ({
    page,
    errors,
  }) => {
    test.setTimeout(180_000);

    const unique = Date.now();
    const tourName = `Tour Nghiệm Thu GĐ5 ${unique}`;
    const customerName = `Khách Nghiệm Thu ${unique}`;
    const customerPhone = `090${String(unique).slice(-7)}`;
    const customerEmail = `acceptance-${unique}@xfarm.local`;

    // =========================================================================
    // 1. ADMIN TẠO TOUR MỚI
    // =========================================================================
    await loginAs(page, 'OWNER');
    await page.goto('/admin/tours');
    await expect(page.locator('main')).toBeVisible();

    const addTourBtn = page.getByRole('button', { name: /thêm tour mới/i });
    await expect(addTourBtn).toBeVisible();
    await addTourBtn.click();
    await expectDialogInViewport(page);

    await page.locator('#tour-name').fill(tourName);

    // Điền mô tả Tiptap
    const tiptapEditor = page.locator('[data-testid="rich-text-editor"] .tiptap');
    await tiptapEditor.click();
    await tiptapEditor.fill(
      'Khám phá nông trại sinh thái XFarm, trải nghiệm trồng trọt, thu hoạch và ẩm thực hữu cơ.',
    );

    await page.locator('#tour-duration').fill('120');
    await page.locator('#tour-capacity').fill('20');
    await page.locator('#tour-price-adult').fill('200000');
    await page.locator('#tour-price-child').fill('100000');

    // Đánh dấu xuất bản công khai
    await page.locator('#tour-publish').check();

    // Bấm Tạo tour
    await page.getByRole('button', { name: /tạo tour/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 });

    // Kiểm tra tour xuất hiện trong bảng danh sách
    await expect(page.getByText(tourName)).toBeVisible({ timeout: 15_000 });

    // =========================================================================
    // 2. ADMIN TẠO SLOT HÀNG LOẠT TRONG 2 TUẦN
    // =========================================================================
    await page.getByRole('link', { name: tourName }).click();
    await page.waitForURL('**/admin/tours/**');
    await expect(page.getByText(tourName)).toBeVisible();

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
    nextSun.setDate(nextMon.getDate() + 13);

    const fromDateStr = toVietnamDateString(nextMon);
    const toDateStr = toVietnamDateString(nextSun);

    await page.locator('#bulk-from').fill(fromDateStr);
    await page.locator('#bulk-to').fill(toDateStr);

    // Dialog mặc định đã chọn thứ 7 và CN (weekdays [6, 0]) và 2 khung giờ [08:00, 14:00]
    await page.getByRole('button', { name: /tạo hàng loạt suất/i }).click();

    // Chờ thông báo tạo thành công và dialog đóng
    await expect(page.getByText(/đã tạo \d+ suất/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 });

    // Lấy thông tin tour và các slot đã tạo
    const currentUrl = page.url();
    const tourId = currentUrl.split('/admin/tours/')[1].split('?')[0];

    const tourRes = await api<{ data: { slug: string; capacity: number } }>(
      page,
      `/tours/${tourId}`,
    );
    const tourSlug = tourRes.data.slug;

    const slotsResponse = await api<{
      data: Array<{ id: string; startAt: string; capacity: number; bookedCount: number }>;
    }>(page, `/tours/${tourId}/slots?pageSize=100`);

    expect(slotsResponse.data.length).toBeGreaterThanOrEqual(4);
    const targetSlot = slotsResponse.data[0];
    expect(targetSlot.capacity).toBe(20);
    expect(targetSlot.bookedCount).toBe(0);

    // =========================================================================
    // 3. KHÁCH ĐẶT CHỖ TRÊN WEB PUBLIC (2 người lớn + 1 trẻ em = 3 khách)
    // =========================================================================
    await page.context().clearCookies();

    // Truy cập trực tiếp trang chi tiết tour public
    await page.goto(`/tour/${tourSlug}`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(`**/tour/${tourSlug}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(tourName);

    // Tìm và chọn ngày của targetSlot
    const targetDateKey = targetSlot.startAt.split('T')[0];
    const dateBtn = page.getByTestId(`date-option-${targetDateKey}`);
    if (await dateBtn.isVisible()) {
      await dateBtn.evaluate((el) => {
        el.scrollIntoView({ block: 'center' });
        (el as HTMLElement).click();
      });
    }

    // Chọn khung giờ targetSlot
    const slotBtn = page.getByTestId(`slot-option-${targetSlot.id}`);
    await expect(slotBtn).toBeVisible({ timeout: 15_000 });
    await expect(slotBtn).toBeEnabled();
    await slotBtn.evaluate((el) => {
      el.scrollIntoView({ block: 'center' });
      (el as HTMLElement).click();
    });

    // Chọn số khách: 2 người lớn, 1 trẻ em (mặc định 1 người lớn, 0 trẻ em)
    const increaseAdultsBtn = page.getByTestId('increase-adults-button');
    await increaseAdultsBtn.evaluate((el) => {
      el.scrollIntoView({ block: 'center' });
      (el as HTMLElement).click();
    });
    await expect(page.getByTestId('adults-input')).toHaveValue('2');

    const increaseChildrenBtn = page.getByTestId('increase-children-button');
    await increaseChildrenBtn.evaluate((el) => {
      el.scrollIntoView({ block: 'center' });
      (el as HTMLElement).click();
    });
    await expect(page.getByTestId('children-input')).toHaveValue('1');

    // Kiểm tra tổng tiền tính toán: 2 * 200.000 + 1 * 100.000 = 500.000 ₫
    const estimatedTotal = page.getByTestId('estimated-total');
    await expect(estimatedTotal).toBeVisible();
    await expect(estimatedTotal).toContainText('500.000');

    // Điền thông tin liên hệ của khách hàng
    await page.getByTestId('customer-name-input').fill(customerName);
    await page.getByTestId('phone-input').fill(customerPhone);
    await page.getByTestId('email-input').fill(customerEmail);
    await page.getByTestId('payment-method-select').selectOption('BANK_TRANSFER');

    // Gửi form đặt chỗ
    const submitBtn = page.getByTestId('submit-booking-button');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.evaluate((el) => {
      el.scrollIntoView({ block: 'center' });
      (el as HTMLElement).click();
    });

    // Chuyển hướng sang trang đặt chỗ thành công (/tour/dat-cho-thanh-cong/[code])
    await page.waitForURL(/\/tour\/dat-cho-thanh-cong\/BK-\d{4}-\d+/, { timeout: 20_000 });
    await expect(page.getByText(/đặt chỗ thành công/i).first()).toBeVisible();

    const bookingCodeEl = page.getByTestId('booking-code');
    await expect(bookingCodeEl).toBeVisible();
    const bookingCode = (await bookingCodeEl.textContent())?.trim() || '';
    expect(bookingCode).toMatch(/^BK-\d{4}-\d+$/);

    const totalEl = page.getByTestId('booking-total');
    await expect(totalEl).toContainText('500.000');

    // =========================================================================
    // 4. KIỂM TRA SLOT GIẢM CHỖ ĐÚNG (bookedCount tăng từ 0 -> 3)
    // =========================================================================
    const slotAfterBooking = await prisma.tourSlot.findUnique({
      where: { id: targetSlot.id },
    });
    expect(slotAfterBooking?.bookedCount).toBe(3);

    // =========================================================================
    // 5. ADMIN XÁC NHẬN VÀ THU TIỀN TRÊN GIAO DIỆN QUẢN TRỊ
    // =========================================================================
    await loginAs(page, 'OWNER');
    await page.goto('/admin/tours/bookings');
    await page.waitForLoadState('networkidle');

    // Tìm kiếm đặt chỗ theo mã BK-
    const searchInput = page.getByPlaceholder('Mã, tên, số ĐT...');
    await searchInput.fill(bookingCode);

    const bookingRow = page.locator('tr', { hasText: bookingCode });
    await expect(bookingRow).toBeVisible({ timeout: 15_000 });
    await expect(bookingRow).toContainText('Chờ xác nhận');
    await expect(bookingRow).toContainText('Chưa thanh toán');

    // Mở hộp thoại chi tiết đặt chỗ
    await bookingRow.getByRole('button', { name: /chi tiết/i }).click();
    await expectDialogInViewport(page);

    // Xác nhận đặt chỗ
    const confirmBookingBtn = page.getByRole('button', { name: /xác nhận đặt chỗ/i });
    await expect(confirmBookingBtn).toBeVisible();
    await confirmBookingBtn.click();
    await expect(page.getByRole('dialog').getByText('Đã xác nhận')).toBeVisible({
      timeout: 15_000,
    });

    // Ghi thu đủ tiền
    const payBtn = page.getByRole('button', { name: /ghi thu tiền/i });
    await expect(payBtn).toBeVisible();
    await payBtn.click();
    await expectDialogInViewport(page);

    const confirmPayBtn = page.getByRole('button', { name: /xác nhận thu tiền/i });
    await expect(confirmPayBtn).toBeVisible();
    await confirmPayBtn.click();

    // Trạng thái cập nhật thành Đã thanh toán đủ (PAID)
    await expect(page.getByRole('dialog').getByText('Đã thanh toán đủ')).toBeVisible({
      timeout: 15_000,
    });

    // =========================================================================
    // 6. KIỂM TRA TRANSACTION INCOME (TOUR) TỰ ĐỘNG SINH TRONG DATABASE
    // =========================================================================
    const bookingInDb = await prisma.booking.findUnique({
      where: { code: bookingCode },
      include: { payments: true },
    });
    expect(bookingInDb).not.toBeNull();
    expect(bookingInDb?.paymentStatus).toBe('PAID');
    expect(bookingInDb?.status).toBe('CONFIRMED');
    expect(bookingInDb?.payments.length).toBe(1);

    const transaction = await prisma.transaction.findFirst({
      where: {
        refType: 'Booking',
        refId: bookingInDb?.id,
        type: 'INCOME',
        category: { systemKey: 'TOUR' },
      },
      include: { category: true },
    });

    expect(transaction).not.toBeNull();
    expect(Number(transaction?.amount)).toBe(500000);
    expect(transaction?.category.systemKey).toBe('TOUR');
    expect(transaction?.category.name).toMatch(/tour/i);

    // =========================================================================
    // 7. HỦY BOOKING VÀ KIỂM TRA TRẢ LẠI SỐ CHỖ (bookedCount trở về 0)
    // =========================================================================
    // Nút Hủy đặt chỗ nằm trong hộp thoại chi tiết booking đang mở
    const cancelBtn = page.getByRole('button', { name: /hủy đặt chỗ/i });
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    // Hộp thoại ConfirmDialog xác nhận hủy
    const confirmCancelDialog = page
      .getByRole('dialog')
      .filter({ hasText: /xác nhận hủy đặt chỗ/i });
    await expect(confirmCancelDialog).toBeVisible();
    await confirmCancelDialog.getByRole('button', { name: /hủy đặt chỗ/i }).click();

    // Trạng thái cập nhật thành Đã hủy (CANCELLED)
    await expect(page.getByRole('dialog').getByText('Đã hủy')).toBeVisible({
      timeout: 15_000,
    });

    // Đóng hộp thoại chi tiết
    await page.getByRole('button', { name: /đóng/i }).first().click();
    await expect(page.getByRole('dialog')).toBeHidden();

    // Kiểm tra trong database: slot đã được hoàn trả đủ chỗ (bookedCount = 0)
    const slotAfterCancel = await prisma.tourSlot.findUnique({
      where: { id: targetSlot.id },
    });
    expect(slotAfterCancel?.bookedCount).toBe(0);

    // Kiểm tra qua API chi tiết slot: slot đã được hoàn trả đủ chỗ
    const slotDetail = await api<{ data: { id: string; bookedCount: number; capacity: number } }>(
      page,
      `/tour-slots/${targetSlot.id}`,
    );
    expect(slotDetail.data.bookedCount).toBe(0);
    expect(slotDetail.data.capacity).toBe(20);

    // Kiểm tra hàng đặt chỗ trong bảng danh sách quản trị cập nhật thành Đã hủy
    await expect(bookingRow).toContainText('Đã hủy');

    // Kiểm tra trên giao diện chi tiết tour của admin (chế độ xem Tháng)
    await page.goto(`/admin/tours/${tourId}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Tháng' }).click();
    await expect(page.getByText(`0/${targetSlot.capacity}`).first()).toBeVisible({
      timeout: 15_000,
    });

    errors.assertClean();
  });
});
