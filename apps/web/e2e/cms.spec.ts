import { expect, expectDialogInViewport, loginAs, test } from './fixtures';

test.describe('CMS Admin & Content Workflow', () => {
  test.beforeEach(async ({ errors }) => {
    errors.expectError('/products');
    errors.expectError('/posts');
    errors.expectError('/pages');
    errors.expectError('/site-settings');
  });

  test('OWNER mở được trang Sản phẩm (/admin/cms/products) và dialog thêm mới', async ({
    page,
    errors,
  }) => {
    test.setTimeout(120_000);
    await loginAs(page);
    await page.goto('/admin/cms/products');
    await expect(page.locator('main')).toBeVisible();

    const btn = page.getByRole('button', { name: /Thêm sản phẩm mới/i }).first();
    await expect(btn).toBeVisible();
    await btn.click();
    await expectDialogInViewport(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    errors.assertClean();
  });

  test('OWNER mở được trang Bài viết (/admin/cms/posts) và dialog thêm mới', async ({
    page,
    errors,
  }) => {
    test.setTimeout(60_000);
    await loginAs(page);
    await page.goto('/admin/cms/posts');
    await expect(page.locator('main')).toBeVisible();

    const btn = page.getByRole('button', { name: /Viết bài mới/i }).first();
    await expect(btn).toBeVisible();
    await btn.click();
    await expectDialogInViewport(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    errors.assertClean();
  });

  test('OWNER mở được trang Trang Tĩnh (/admin/cms/pages) và dialog thêm mới', async ({
    page,
    errors,
  }) => {
    test.setTimeout(60_000);
    await loginAs(page);
    await page.goto('/admin/cms/pages');
    await expect(page.locator('main')).toBeVisible();

    const btn = page.getByRole('button', { name: /Thêm trang mới/i }).first();
    await expect(btn).toBeVisible();
    await btn.click();
    await expectDialogInViewport(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    errors.assertClean();
  });

  test('OWNER mở được trang Cài đặt (/admin/cms/settings)', async ({ page, errors }) => {
    test.setTimeout(60_000);
    await loginAs(page);
    await page.goto('/admin/cms/settings');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Cài đặt Website/i })).toBeVisible();

    errors.assertClean();
  });

  test.fixme('Tạo bài viết mới, xuất bản và kiểm tra hiển thị trên /blog/<slug>', async ({
    page,
    errors,
  }) => {
    // Lưu ý: Task p3-api-cms (API /posts) và p3-web-public-site (trang /blog/<slug>)
    // đang chạy song song và chưa merge vào nhánh này.
    // Khi hai task trên merge, bỏ đánh dấu test.fixme để chạy e2e hoàn chỉnh.
    await loginAs(page);

    await page.goto('/admin/cms/posts');
    await page.getByRole('button', { name: /Viết bài mới/i }).click();
    await expectDialogInViewport(page);

    const testTitle = `Bài viết thử nghiệm ${Date.now()}`;
    await page.getByLabel(/Tiêu đề bài viết \*/i).fill(testTitle);

    // Slug tự sinh
    const slugInput = page.getByLabel(/Đường dẫn tĩnh \(Slug\)/i);
    const generatedSlug = await slugInput.inputValue();
    expect(generatedSlug).not.toBe('');

    // Điền tóm tắt
    await page
      .getByLabel(/Tóm tắt ngắn \*/i)
      .fill('Đây là đoạn tóm tắt bài viết phục vụ kiểm thử tự động e2e.');

    // Chọn trạng thái PUBLISHED
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /Xuất bản công khai/i }).click();

    // Submit form
    await page.getByRole('button', { name: /Đăng bài viết/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    // Kiểm tra thấy trong danh sách admin
    await expect(page.getByText(testTitle)).toBeVisible();

    // Kiểm tra thấy trên trang public /blog/<slug>
    await page.goto(`/blog/${generatedSlug}`);
    await expect(page.locator('h1')).toContainText(testTitle);

    errors.assertClean();
  });
});
