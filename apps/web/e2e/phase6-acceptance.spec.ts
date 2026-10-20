import { api, expect, expectDialogInViewport, loginAs, test } from './fixtures';
import { PrismaClient } from '@prisma/client';

for (const envFile of ['../../.env', '../.env', '.env']) {
  try {
    process.loadEnvFile?.(envFile);
  } catch {}
}
const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api/v1';

test.describe('Nghiệm thu GĐ 6 (Phase 6 Acceptance Criteria)', () => {
  test('(a) WORKER trên PWA: offline, ghi 2 nhật ký, bật mạng thì đồng bộ, không trùng (đếm qua API)', async ({
    page,
    context,
  }) => {
    test.setTimeout(60_000);

    // 1. Kiểm tra endpoint đồng bộ batch
    const apiCheck = await fetch(`${apiBase}/sync/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    });
    expect(apiCheck.status).not.toBe(404);

    // 2. Đăng nhập WORKER trên PWA viewport mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, 'WORKER');
    await page.waitForFunction(
      () => 'serviceWorker' in navigator && !!navigator.serviceWorker.controller,
    );

    await page.goto('/admin/m/quick-log');
    await expect(page.getByRole('heading', { name: /ghi nhanh nhật ký/i })).toBeVisible();

    const areaSelect = page.locator('button[role="combobox"]').first();
    await expect(areaSelect).toBeEnabled();

    // Đếm số lượng hoạt động ban đầu qua API
    const initialActivitiesRes = await api<{ total: number; data: Array<{ id: string; notes?: string }> }>(
      page,
      '/activities?pageSize=10',
    );
    const initialCount = initialActivitiesRes?.total ?? 0;

    // 3. Ngắt mạng (Offline)
    await context.setOffline(true);

    const runId = Date.now();
    const note1 = `Nhật ký acceptance offline 1 - Tưới nước ${runId}`;
    const note2 = `Nhật ký acceptance offline 2 - Bón phân ${runId}`;

    // Ghi nhật ký nhanh lần 1 khi offline (Tưới nước: durationMin bắt buộc = 20)
    await expect(areaSelect).toBeEnabled();
    await areaSelect.click();
    const firstAreaOption = page.locator('div[role="option"]').first();
    await expect(firstAreaOption).toBeVisible();
    await firstAreaOption.click();

    await page.locator('input[name="durationMin"]').fill('20');
    await page.locator('textarea').fill(note1);
    await page.getByRole('button', { name: /lưu nhật ký/i }).click();

    await expect(page).toHaveURL(/\/admin\/m/);
    await expect(page.getByText(/1 thao tác chờ/i)).toBeVisible();

    // Ghi nhật ký nhanh lần 2 khi offline (Bón phân)
    await page.goto('/admin/m/quick-log');
    await expect(page.getByRole('heading', { name: /ghi nhanh nhật ký/i })).toBeVisible();

    await expect(areaSelect).toBeEnabled();
    await areaSelect.click();
    const secondAreaOption = page.locator('div[role="option"]').first();
    await expect(secondAreaOption).toBeVisible();
    await secondAreaOption.click();

    await page.getByRole('button', { name: /bón phân/i }).click();
    await page.locator('textarea').fill(note2);
    await page.getByRole('button', { name: /lưu nhật ký/i }).click();

    await expect(page).toHaveURL(/\/admin\/m/);
    await expect(page.getByText(/2 thao tác chờ/i)).toBeVisible();

    // Kiểm tra hàng đợi outbox có đủ 2 thao tác
    await page.goto('/admin/m/outbox');
    await expect(page.getByText(/2 thao tác trong hàng đợi/i)).toBeVisible();

    // 4. Bật lại mạng (Online)
    await context.setOffline(false);

    await expect(page.getByText(/đã đồng bộ/i)).toBeVisible({ timeout: 15_000 });

    // Hàng đợi outbox đã trống
    await page.goto('/admin/m/outbox');
    await expect(page.getByText(/hàng đợi trống/i)).toBeVisible();

    // 5. Kiểm tra qua API: đúng 2 hoạt động mới được tạo, không bị trùng
    const afterSyncRes = await api<{ total: number; data: Array<{ id: string; notes?: string }> }>(
      page,
      '/activities?pageSize=10',
    );
    expect(afterSyncRes?.total).toBe(initialCount + 2);
    const prisma = new PrismaClient();
    try {
      const synced = await prisma.activity.findMany({
        where: { notes: { in: [note1, note2] } },
      });
      expect(synced).toHaveLength(2);
    } finally {
      await prisma.$disconnect();
    }

    // 6. Reload trang và xác nhận idempotent (không tạo trùng lần nữa)
    await page.reload();
    await expect(page.getByText(/hàng đợi trống/i)).toBeVisible();

    const afterReloadRes = await api<{ total: number; data: Array<{ id: string; notes?: string }> }>(
      page,
      '/activities?pageSize=10',
    );
    expect(afterReloadRes?.total).toBe(initialCount + 2);
  });

  test('(b) & (c) Chấm công 3 ngày gắn cycle, tính lương khớp giờ công và chi phí công cycle (/cycles/:id/labor-cost) bằng tổng chấm công gắn cycle', async ({
    page,
    errors,
  }) => {
    test.setTimeout(90_000);

    // 1. Đăng nhập vai trò OWNER
    await loginAs(page, 'OWNER');

    // 2. Tạo nhân viên mới trả lương theo ngày (DAILY)
    await page.goto('/admin/hr/employees');
    await expect(page.getByRole('heading', { name: /quản lý nhân viên/i })).toBeVisible();

    const runId = Date.now();
    const empName = `Công nhân P6 Acceptance ${runId}`;
    await page.getByRole('button', { name: /thêm nhân viên/i }).click();
    await expectDialogInViewport(page);

    await page.getByLabel(/họ và tên/i).fill(empName);
    await page.getByLabel(/vị trí công việc/i).fill('Chăm sóc cây trồng');
    await page.getByLabel(/mức lương cơ bản/i).fill('300000'); // 300.000 ₫ / ngày
    await page
      .getByRole('button', { name: /thêm nhân viên/i })
      .last()
      .click();

    // Xác nhận nhân viên mới xuất hiện trong bảng
    await page.getByPlaceholder(/tìm theo mã hoặc họ tên/i).fill(empName);
    const empRow = page.getByText(empName).locator('xpath=ancestor::tr');
    await expect(empRow).toBeVisible();

    // Lấy thông tin chi tiết nhân viên và mùa vụ mục tiêu qua API
    const empRes = await api<{ data: Array<{ id: string; code: string; fullName: string }> }>(
      page,
      `/employees?search=${encodeURIComponent(empName)}`,
    );
    const createdEmp = empRes.data.find((e) => e.fullName === empName);
    expect(createdEmp).toBeDefined();
    const empId = createdEmp!.id;

    const cyclesRes = await api<{ data: Array<{ id: string; code: string; name: string }> }>(
      page,
      '/cycles?pageSize=10',
    );
    expect(cyclesRes.data.length).toBeGreaterThan(0);
    const targetCycle = cyclesRes.data[0];
    const cycleId = targetCycle.id;

    // 3. Chấm công 3 ngày gắn cycle trên lưới chấm công tuần (/admin/hr/attendance)
    await page.goto('/admin/hr/attendance');
    await expect(page.getByRole('heading', { name: /lưới chấm công tuần/i })).toBeVisible();

    await page
      .getByPlaceholder(/tìm theo tên hoặc mã/i)
      .first()
      .fill(empName);
    await expect(page.getByText(empName)).toBeVisible();

    const attRow = page.getByText(empName).locator('xpath=ancestor::tr');

    // Chấm 3 ngày (cột 1 = Thứ 2, cột 2 = Thứ 3, cột 3 = Thứ 4), mỗi ngày 8h gắn targetCycle
    for (let dayCol = 1; dayCol <= 3; dayCol++) {
      await attRow.locator('td').nth(dayCol).click();
      await expectDialogInViewport(page);

      await page.getByLabel(/số giờ công/i).fill('8');

      // Chọn gắn mùa vụ targetCycle
      await page.locator('#cycle').click();
      await page.locator('div[role="option"]').filter({ hasText: targetCycle.name }).click();

      await page.getByRole('button', { name: /lưu chấm công/i }).click();
      await expect(page.getByRole('dialog')).toBeHidden();
    }

    // Xác nhận trên lưới xuất hiện đủ 3 ngày có 8h và tổng giờ là 24h
    await expect(attRow.getByText('8h')).toHaveCount(3);
    await expect(attRow.locator('td').nth(8)).toHaveText(/24h/);

    // 4. Tiêu chí (b): Tính lương và kiểm tra bảng lương khớp giờ công
    await page.goto('/admin/hr/payroll');
    await expect(page.getByRole('heading', { name: /bảng lương nhân sự/i })).toBeVisible();

    // Bấm Tính lương
    await page.getByRole('button', { name: /tính lương/i }).click();
    await expect(page.getByText(/tính toán bảng lương thành công/i)).toBeVisible();

    // Tìm dòng bảng lương của nhân viên
    await page.getByPlaceholder(/tìm theo mã nv hoặc tên/i).fill(empName);
    const payrollRow = page.getByText(empName).locator('xpath=ancestor::tr');
    await expect(payrollRow).toBeVisible();

    // 3 ngày công × 300.000 ₫ = 900.000 ₫
    await expect(payrollRow.getByText(/900.000/)).toBeVisible();

    // Mở xem chi tiết bảng lương để xác nhận chi tiết từng ngày khớp giờ công
    await payrollRow.getByRole('button', { name: /chi tiết/i }).click();
    await expectDialogInViewport(page);
    const detailDialog = page.getByRole('dialog');
    await expect(detailDialog.getByText(/chi tiết từng ngày/i)).toBeVisible();
    await expect(detailDialog.getByText(/3 ngày ghi nhận/i)).toBeVisible();
    await expect(detailDialog.getByText(/900.000/).first()).toBeVisible();
    await detailDialog.getByRole('button', { name: /đóng/i }).first().click();

    // 5. Tiêu chí (c): Chi phí công của cycle (/cycles/:id/labor-cost) bằng tổng chấm công gắn cycle
    const laborCostRes = await api<{
      totalLaborCost?: number;
      total?: number;
      amount?: number;
      employees?: Array<{
        employeeId: string;
        fullName?: string;
        totalHours?: number;
        totalDays?: number;
        totalCost?: number;
      }>;
    }>(page, `/cycles/${cycleId}/labor-cost`);

    expect(laborCostRes).toBeDefined();
    const cycleEmployees = laborCostRes.employees || [];

    // Tìm nhân viên vừa chấm công trong danh sách chi phí công của cycle
    const empLabor = cycleEmployees.find((e) => e.employeeId === empId);
    expect(empLabor).toBeDefined();
    expect(empLabor?.totalHours).toBe(24);
    expect(empLabor?.totalDays).toBe(3);
    expect(empLabor?.totalCost).toBe(900_000);

    // Tổng chi phí công của cycle bằng tổng chi phí chấm công gắn cycle của tất cả nhân viên
    const sumEmployeesCost = cycleEmployees.reduce((sum, e) => sum + (e.totalCost || 0), 0);
    const totalLaborCost =
      laborCostRes.totalLaborCost ?? laborCostRes.total ?? laborCostRes.amount ?? 0;
    expect(totalLaborCost).toBe(sumEmployeesCost);

    errors.assertClean();
  });
});
