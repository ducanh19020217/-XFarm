import { expect, loginAs, test, expectDialogInViewport } from './fixtures';

process.loadEnvFile?.('../../.env');
const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api/v1';

test.describe('E2E Quản lý Nhân sự, Giao việc, Chấm công, Tính lương (p6-web-hr)', () => {
  test('tạo nhân viên, giao việc, sửa chấm công, tính lương và thấy đúng số tiền', async ({
    page,
    errors,
  }) => {
    // 1. Kiểm tra API backend hr (p6-api-hr và p6-api-payroll chạy song song)
    const apiCheck = await fetch(`${apiBase}/employees`, {
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => null);

    if (!apiCheck || apiCheck.status === 404) {
      test.fixme(
        true,
        'API employees/tasks/attendance/payrolls chưa merge vào backend API server (task p6-api-hr và p6-api-payroll chạy song song)',
      );
    }

    await loginAs(page, 'OWNER');

    // 2. Tạo nhân viên mới
    await page.goto('/admin/hr/employees');
    await expect(page.getByRole('heading', { name: /quản lý nhân viên/i })).toBeVisible();

    const empName = `Công nhân E2E ${Date.now()}`;
    await page.getByRole('button', { name: /thêm nhân viên/i }).click();
    await expectDialogInViewport(page);

    await page.getByLabel(/họ và tên/i).fill(empName);
    await page.getByLabel(/vị trí công việc/i).fill('Công nhân chăm sóc rau');
    // baseRate MoneyInput: 300.000 ₫
    await page.getByLabel(/mức lương cơ bản/i).fill('300000');
    await page
      .getByRole('button', { name: /thêm nhân viên/i })
      .last()
      .click();

    // Xác nhận nhân viên mới xuất hiện trong DataTable
    await page.getByPlaceholder(/tìm theo mã hoặc họ tên/i).fill(empName);
    const empRow = page.getByText(empName).locator('xpath=ancestor::tr');
    await expect(empRow).toBeVisible();
    await expect(empRow.getByText(/300.000/)).toBeVisible();

    // 3. Giao việc mới cho nhân viên
    await page.goto('/admin/hr/tasks');
    await expect(page.getByRole('heading', { name: /giao việc & tiến độ/i })).toBeVisible();

    const taskTitle = `Tưới nước khu A ${Date.now()}`;
    await page.getByRole('button', { name: /giao việc mới/i }).click();
    await expectDialogInViewport(page);

    await page.getByLabel(/tiêu đề công việc/i).fill(taskTitle);
    await page
      .getByRole('button', { name: /giao việc/i })
      .last()
      .click();

    // Xác nhận task xuất hiện trên Kanban hoặc bảng
    await expect(page.getByText(taskTitle)).toBeVisible();

    // 4. Sửa chấm công trên lưới tuần
    await page.goto('/admin/hr/attendance');
    await expect(page.getByRole('heading', { name: /lưới chấm công tuần/i })).toBeVisible();

    // Tìm dòng của nhân viên vừa tạo
    await page.getByPlaceholder(/tìm theo tên hoặc mã/i).fill(empName);
    await expect(page.getByText(empName)).toBeVisible();

    // Bấm vào ô ngày làm việc để mở dialog sửa chấm công
    const row = page.getByText(empName).locator('xpath=ancestor::tr');
    // Click vào một ô ngày (cell thứ 2 trong hàng)
    await row.locator('td').nth(1).click();
    await expectDialogInViewport(page);

    // Điền số giờ công = 8
    await page.getByLabel(/số giờ công/i).fill('8');
    await page.getByRole('button', { name: /lưu chấm công/i }).click();

    // Xác nhận giờ công được cập nhật trên ô và tổng giờ
    await expect(row.getByText('8h').first()).toBeVisible();
    await expect(row.getByText('8h')).toHaveCount(2);

    // 5. Tính lương và thấy đúng số tiền
    await page.goto('/admin/hr/payroll');
    await expect(page.getByRole('heading', { name: /bảng lương nhân sự/i })).toBeVisible();

    // Bấm "Tính lương"
    await page.getByRole('button', { name: /tính lương/i }).click();
    await expect(page.getByText(/tính toán bảng lương thành công/i)).toBeVisible();

    // Kiểm tra nhân viên xuất hiện và thấy đúng số tiền lương (ít nhất 1 ngày 8h = 300.000 ₫)
    await page.getByPlaceholder(/tìm theo mã nv hoặc tên/i).fill(empName);
    const payrollRow = page.getByText(empName).locator('xpath=ancestor::tr');
    await expect(payrollRow).toBeVisible();
    await expect(payrollRow.getByText(/300.000/)).toBeVisible();

    // Xem chi tiết bảng lương
    await payrollRow.getByRole('button', { name: /chi tiết/i }).click();
    await expectDialogInViewport(page);
    await expect(page.getByText(/chi tiết từng ngày/i)).toBeVisible();
    await page.getByRole('button', { name: /đóng/i }).first().click();

    // Duyệt bảng lương
    await payrollRow.getByRole('button', { name: /duyệt/i }).click();
    await expect(page.getByText(/đã duyệt/i)).toBeVisible();

    // Đã trả (thanh toán)
    await payrollRow.getByRole('button', { name: /đã trả/i }).click();
    await expect(page.getByText(/đã thanh toán/i)).toBeVisible();

    errors.assertClean();
  });
});
