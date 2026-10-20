import { test, expect } from './fixtures';

test.describe('Website Quảng Bá Public (không cần đăng nhập)', () => {
  test('trang chủ có đủ 5 khu vực, hiển thị banner và footer có nút đăng nhập', async ({
    page,
    errors,
  }) => {
    await page.goto('/');

    // 1. Header có logo và menu
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Menu chính' })).toBeVisible();

    // 2. KHU VỰC 1: Banner slider
    const banner = page.getByRole('region', { name: /banner/i }).first();
    await expect(banner).toBeVisible();
    await expect(banner.getByRole('heading', { level: 1 })).toBeVisible();

    // 3. KHU VỰC 2: 4 mảng hoạt động (Trồng trọt, Chăn nuôi, Thủy sản, Du lịch trải nghiệm)
    await expect(page.getByRole('heading', { name: /4 lĩnh vực canh tác cốt lõi/i })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Trồng trọt hữu cơ', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Chăn nuôi sinh thái', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Thủy sản bền vững', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Du lịch trải nghiệm', exact: true }),
    ).toBeVisible();

    // 4. KHU VỰC 3: Sản phẩm nổi bật (tối đa 6 sản phẩm đầu)
    await expect(page.getByRole('heading', { name: /sản phẩm nổi bật/i })).toBeVisible();
    const productArticles = page.locator('article');
    expect(await productArticles.count()).toBeGreaterThanOrEqual(1);

    // 5. KHU VỰC 4: Tour trải nghiệm (placeholder Sắp ra mắt - Giai đoạn 5)
    await expect(
      page.getByRole('heading', { name: /tour du lịch trải nghiệm sinh thái/i }),
    ).toBeVisible();
    await expect(page.getByText(/sắp ra mắt \(giai đoạn 5\)/i)).toBeVisible();

    // 6. KHU VỰC 5: Bài viết mới
    await expect(
      page.getByRole('heading', { name: /tin tức & cẩm nang nông nghiệp/i }),
    ).toBeVisible();

    // Footer có nút Đăng nhập
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    const loginLink = footer.getByRole('link', { name: /đăng nhập/i });
    await expect(loginLink).toBeVisible();

    // Không có lỗi console
    errors.assertClean();
  });

  test('mở được danh sách sản phẩm và xem chi tiết sản phẩm có nút Đặt hàng disabled kèm tooltip', async ({
    page,
    errors,
  }) => {
    // 1. Mở trang danh sách sản phẩm
    await page.goto('/san-pham', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /sản phẩm trang trại/i })).toBeVisible();

    // Kiểm tra có sản phẩm và click xem chi tiết
    const firstArticle = page.locator('article').first();
    await expect(firstArticle).toBeVisible();
    const detailLink = firstArticle.getByRole('link', { name: /chi tiết/i });
    await expect(detailLink).toBeVisible();
    const href = await detailLink.getAttribute('href');
    if (href) {
      await page.goto(href);
    } else {
      await detailLink.click();
    }

    // 2. Trang chi tiết sản phẩm
    await page.waitForURL(/\/san-pham\/[\w-]+/);
    await expect(page.getByText(/mô tả sản phẩm/i)).toBeVisible();

    // Webshop đã có (GĐ 4): nút "Thêm vào giỏ" hiển thị, không còn nút "Sắp có cửa hàng online"
    await expect(
      page.getByRole('button', { name: /thêm .* vào giỏ|thêm vào giỏ/i }).first(),
    ).toBeVisible();
    await expect(page.getByText(/sắp có cửa hàng online/i)).toHaveCount(0);

    // Không có lỗi console
    errors.assertClean();
  });

  test('mở được trang blog và chi tiết bài viết, bài viết draft không hiển thị', async ({
    page,
    errors,
  }) => {
    // 1. Mở trang danh sách blog
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /tin tức & cẩm nang/i })).toBeVisible();

    // Bài viết draft (ví dụ 'Lịch tham quan XFarm' có status DRAFT) TUYỆT ĐỐI KHÔNG xuất hiện
    await expect(page.getByText('Lịch tham quan XFarm')).toBeHidden();

    // 2. Mở bài viết published đầu tiên
    const readMoreLink = page.getByRole('link', { name: /đọc (tiếp|bài viết)/i }).first();
    await expect(readMoreLink).toBeVisible();
    const articleHref = await readMoreLink.getAttribute('href');
    expect(articleHref).toMatch(/\/blog\/[^/]+/);
    await page.goto(articleHref!, { waitUntil: 'domcontentloaded' });

    // 3. Trang chi tiết bài viết
    await page.waitForURL('**/blog/*');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/ban biên tập xfarm/i)).toBeVisible();

    // Không có lỗi console
    errors.assertClean();
  });

  test('mở được trang liên hệ có thông tin, bản đồ OpenStreetMap và form mailto', async ({
    page,
    errors,
  }) => {
    await page.goto('/lien-he', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /liên hệ & bản đồ/i })).toBeVisible();

    // Thông tin trang trại
    await expect(page.getByText(/thông tin trang trại/i)).toBeVisible();
    await expect(page.getByText(/hotline tư vấn/i)).toBeVisible();

    // Bản đồ OpenStreetMap iframe
    const mapIframe = page.locator('iframe[title*="OpenStreetMap"]');
    await expect(mapIframe).toBeVisible();

    // Form gửi liên hệ với nút mailto
    const mailtoButton = page.getByRole('link', { name: /gửi liên hệ/i });
    await expect(mailtoButton).toBeVisible();
    await expect(mailtoButton).toHaveAttribute('href', /mailto:/);

    // Không có lỗi console
    errors.assertClean();
  });

  test('mở được trang giới thiệu với nội dung và giá trị cốt lõi', async ({ page, errors }) => {
    await page.goto('/gioi-thieu');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/tự nhiên & nguyên bản/i)).toBeVisible();
    await expect(page.getByText(/minh bạch xuất xứ/i)).toBeVisible();

    // Không có lỗi console
    errors.assertClean();
  });
});
