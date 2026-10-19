import { expect, test } from './fixtures';

test.describe('Public Traceability (/trace/[code])', () => {
  test('chạy được không cần đăng nhập và hiển thị đúng thông tin lô DEMO000001', async ({
    page,
    errors,
  }) => {
    // Truy cập trực tiếp không cần đăng nhập
    await page.goto('/trace/DEMO000001');

    // Kiểm tra hiển thị sản phẩm và lô
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText(/rau cải ngọt|sản phẩm/i);

    // Kiểm tra thẻ thông tin lô
    await expect(page.getByText(/thông tin lô thu hoạch/i)).toBeVisible();
    await expect(page.getByText(/DEMO000001/).first()).toBeVisible();

    // Kiểm tra chứng nhận
    await expect(page.getByText(/VietGAP/i).first()).toBeVisible();

    // Kiểm tra timeline các bước canh tác
    await expect(page.getByText(/nhật ký quy trình canh tác/i)).toBeVisible();

    // TUYỆT ĐỐI KHÔNG chứa thông tin nhân viên, email, hay chi phí
    const pageContent = await page.content();
    expect(pageContent).not.toContain('admin@xfarm.local');
    expect(pageContent).not.toContain('worker@xfarm.local');
    expect(pageContent).not.toContain('unitCost');
    expect(pageContent).not.toContain('createdById');

    // Kiểm tra footer
    await expect(
      page.getByRole('contentinfo').getByText('XFarm – Nông trại sinh thái', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /về trang chủ xfarm/i })).toBeVisible();

    errors.assertClean();
  });

  test('mã không tồn tại thì hiện trang 404 thân thiện', async ({ page }) => {
    // Truy cập mã không tồn tại - Server Component fetch sẽ trả 404 và kích hoạt notFound()
    await page.goto('/trace/KHONG_TON_TAI_999999');

    // Kỳ vọng trang 404 thân thiện
    await expect(
      page.getByRole('heading', { name: /không tìm thấy thông tin truy xuất/i }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /về trang chủ xfarm/i })).toBeVisible();
  });
});
