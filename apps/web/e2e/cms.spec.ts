import { expect, expectDialogInViewport, loginAs, test } from './fixtures';

test.describe('CMS Admin & Content Workflow', () => {
  test('OWNER mở được các trang quản trị CMS và dialog thêm mới nằm trong viewport', async ({
    page,
    errors,
  }) => {
    await loginAs(page, 'OWNER');

    // Các trang quản trị CMS
    const cmsRoutes = [
      { path: '/admin/cms/products', buttonLabel: /Thêm sản phẩm mới/i },
      { path: '/admin/cms/posts', buttonLabel: /Viết bài mới/i },
      { path: '/admin/cms/pages', buttonLabel: /Thêm trang mới/i },
      { path: '/admin/cms/settings' },
    ];

    for (const item of cmsRoutes) {
      await page.goto(item.path);
      await expect(page.locator('main')).toBeVisible();

      if (item.buttonLabel) {
        const btn = page.getByRole('button', { name: item.buttonLabel }).first();
        if (await btn.isVisible().catch(() => false)) {
          await btn.click();
          await expectDialogInViewport(page);
          await page.keyboard.press('Escape');
          await expect(page.getByRole('dialog')).toBeHidden();
        }
      }
    }

    errors.assertClean();
  });

  test.fixme('Tạo bài viết mới, xuất bản và kiểm tra hiển thị trên /blog/<slug>', async ({
    page,
    errors,
  }) => {
    // Lưu ý: Task p3-api-cms (API /posts) và p3-web-public-site (trang /blog/<slug>)
    // đang chạy song song và chưa merge vào nhánh này.
    // Khi hai task trên merge, bỏ đánh dấu test.fixme để chạy e2e hoàn chỉnh.
    await loginAs(page, 'OWNER');

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
