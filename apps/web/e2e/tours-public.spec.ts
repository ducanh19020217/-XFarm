import { test, expect, loginAs, api } from './fixtures';

test.describe('Tour Du Lịch Public (e2e/tours-public)', () => {
  let tourId: string;
  let tourSlug: string;
  let availableSlotId: string;
  let fullSlotId: string;
  const uniqueTimestamp = Date.now();
  const testPhone = `090${String(uniqueTimestamp).slice(-7)}`;

  test.beforeAll(async ({ browser }) => {
    // Setup test tour and slots via authenticated API
    const page = await browser.newPage();
    await loginAs(page, 'OWNER');

    // 1. Tạo tour mới
    const tourRes = await api<{ data: { id: string; slug: string } }>(page, '/tours', {
      method: 'POST',
      body: JSON.stringify({
        name: `Tour Trải Nghiệm Sinh Thái ${uniqueTimestamp}`,
        description:
          '<p>Một ngày hòa mình vào thiên nhiên, bắt cá ao sinh thái và hái rau quả hữu cơ.</p>',
        durationMinutes: 150,
        priceAdult: 200000,
        priceChild: 100000,
        capacity: 25,
        isPublished: true,
      }),
    });
    tourId = tourRes.data.id;
    tourSlug = tourRes.data.slug;

    // 2. Tạo 2 slot cho 2 ngày tới
    const slotDate = new Date(Date.now() + 48 * 3600 * 1000);
    slotDate.setHours(8, 30, 0, 0);

    const slot1Res = await api<{ data: { id: string } }>(page, `/tours/${tourId}/slots`, {
      method: 'POST',
      body: JSON.stringify({
        startAt: slotDate.toISOString(),
        capacity: 10,
      }),
    });
    availableSlotId = slot1Res.data.id;

    const fullSlotDate = new Date(Date.now() + 48 * 3600 * 1000);
    fullSlotDate.setHours(14, 0, 0, 0);

    const slot2Res = await api<{ data: { id: string } }>(page, `/tours/${tourId}/slots`, {
      method: 'POST',
      body: JSON.stringify({
        startAt: fullSlotDate.toISOString(),
        capacity: 2,
      }),
    });
    fullSlotId = slot2Res.data.id;

    // Đặt hết 2 chỗ của slot 2 để biến thành slot đầy
    await api(page, '/public/bookings', {
      method: 'POST',
      body: JSON.stringify({
        slotId: fullSlotId,
        customerName: 'Khách Đã Chiếm Hết Chỗ',
        phone: `091${String(uniqueTimestamp).slice(-7)}`,
        adults: 2,
      }),
    });

    // Xuất bản tour
    await api(page, `/tours/${tourId}/publish`, { method: 'PATCH' });

    await page.close();
  });

  test('luồng đặt tour: chọn tour → ngày → giờ → 2 người lớn 1 trẻ em → đặt → mã BK- & tổng đúng → tra cứu PENDING; slot đầy không chọn được', async ({
    page,
    errors,
  }) => {
    test.setTimeout(120_000);

    // Không dùng cookie đăng nhập (khách vãng lai)
    await page.context().clearCookies();

    // 1. Vào trang danh sách tour /tour
    await page.goto('/tour', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /tour trải nghiệm nông trại/i })).toBeVisible();

    // Tìm thẻ tour vừa tạo theo slug hoặc tên
    const tourCard = page.locator(`article:has(a[href="/tour/${tourSlug}"])`);
    await expect(tourCard).toBeVisible();
    await expect(tourCard.getByText('200.000')).toBeVisible();
    await expect(tourCard.getByText('100.000')).toBeVisible();
    await expect(tourCard.getByText('150 phút')).toBeVisible();

    // 2. Click vào chi tiết tour
    const bookButton = tourCard.getByRole('link', { name: /đặt chỗ/i });
    await bookButton.click();
    await page.waitForURL(`**/tour/${tourSlug}`);

    // Kiểm tra thông tin tour
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      `Tour Trải Nghiệm Sinh Thái ${uniqueTimestamp}`,
    );

    // 3. Khung giờ đầy không chọn được
    // Slot đầy (14:00) nếu hiển thị thì bị disabled
    const fullSlotBtn = page.getByTestId(`slot-option-${fullSlotId}`);
    if (await fullSlotBtn.isVisible()) {
      await expect(fullSlotBtn).toBeDisabled();
      await expect(fullSlotBtn).toContainText(/hết chỗ/i);
    }

    // 4. Chọn khung giờ còn chỗ (08:30)
    const availableSlotBtn = page.getByTestId(`slot-option-${availableSlotId}`);
    await expect(availableSlotBtn).toBeVisible();
    await expect(availableSlotBtn).toBeEnabled();
    await availableSlotBtn.click();

    // 5. Chọn số khách: 2 người lớn, 1 trẻ em
    // Người lớn: mặc định là 1, tăng thêm 1 thành 2
    const increaseAdultsBtn = page.getByTestId('increase-adults-button');
    await increaseAdultsBtn.click();
    await expect(page.getByTestId('adults-input')).toHaveValue('2');

    // Trẻ em: mặc định là 0, tăng thêm 1 thành 1
    const increaseChildrenBtn = page.getByTestId('increase-children-button');
    await increaseChildrenBtn.click();
    await expect(page.getByTestId('children-input')).toHaveValue('1');

    // 6. Kiểm tra tổng tiền tạm tính: 2 * 200.000 + 1 * 100.000 = 500.000 ₫
    const estimatedTotal = page.getByTestId('estimated-total');
    await expect(estimatedTotal).toBeVisible();
    await expect(estimatedTotal).toContainText('500.000');

    // 7. Nhập form thông tin khách hàng
    await page.getByTestId('customer-name-input').fill('Nguyễn Văn Khách Test');
    await page.getByTestId('phone-input').fill(testPhone);
    await page.getByTestId('email-input').fill('khachtest@example.com');
    await page.getByTestId('payment-method-select').selectOption('BANK_TRANSFER');

    // 8. Bấm xác nhận đặt chỗ
    const submitBtn = page.getByTestId('submit-booking-button');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 9. Chuyển sang trang đặt chỗ thành công (/tour/dat-cho-thanh-cong/[code])
    await page.waitForURL(/\/tour\/dat-cho-thanh-cong\/BK-\d{4}-\d+/);
    await expect(page.getByText(/đặt chỗ thành công/i).first()).toBeVisible();

    // Thấy mã BK- và tổng tiền đúng
    const bookingCodeEl = page.getByTestId('booking-code');
    await expect(bookingCodeEl).toBeVisible();
    const bookingCode = (await bookingCodeEl.textContent())?.trim() || '';
    expect(bookingCode).toMatch(/^BK-\d{4}-\d+$/);

    const totalEl = page.getByTestId('booking-total');
    await expect(totalEl).toContainText('500.000');

    // Có mục QR VietQR thanh toán
    await expect(page.getByTestId('vietqr-transfer-section')).toBeVisible();
    await expect(page.getByTestId('vietqr-image')).toBeVisible();
    await expect(page.getByTestId('bank-account-no')).toBeVisible();
    await expect(page.getByTestId('bank-amount')).toContainText('500.000');
    await expect(page.getByTestId('bank-add-info')).toContainText(bookingCode);

    // 10. Tra cứu đặt chỗ → thấy PENDING
    // Điều hướng tới trang tra cứu
    await page.goto(`/tour/tra-cuu?code=${bookingCode}&phone=${testPhone}`);
    await expect(page.getByTestId('lookup-result-section')).toBeVisible({ timeout: 15_000 });

    // Kiểm tra mã và trạng thái PENDING
    await expect(page.getByTestId('lookup-result-code')).toHaveText(bookingCode);
    const statusBadge = page.getByTestId('lookup-result-status');
    await expect(statusBadge).toBeVisible();
    await expect(statusBadge).toHaveText(/PENDING/i);

    // Kiểm tra tổng tiền
    await expect(page.getByTestId('lookup-result-total')).toContainText('500.000');
    // Kiểm tra số khách: 2 người lớn, 1 trẻ em
    await expect(page.getByTestId('lookup-result-guests')).toContainText(/2 người lớn/i);
    await expect(page.getByTestId('lookup-result-guests')).toContainText(/1 trẻ em/i);

    errors.assertClean();
  });

  test('giao diện tour thân thiện với mobile 390px, không bị tràn ngang', async ({
    page,
    errors,
  }) => {
    // Đặt viewport mobile chuẩn 390px x 844px
    await page.setViewportSize({ width: 390, height: 844 });

    // 1. Kiểm tra trang danh sách tour
    await page.goto('/tour', { waitUntil: 'domcontentloaded' });
    let scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    let clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    // 2. Kiểm tra trang chi tiết tour
    await page.goto(`/tour/${tourSlug}`, { waitUntil: 'domcontentloaded' });
    scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    // 3. Kiểm tra trang tra cứu
    await page.goto('/tour/tra-cuu', { waitUntil: 'domcontentloaded' });
    scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    errors.assertClean();
  });
});
