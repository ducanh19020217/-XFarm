import { test, expect } from './fixtures';

test.describe('SEO: Metadata, Canonical & JSON-LD', () => {
  test('trang chủ có <title>, meta description, link canonical và JSON-LD Organization', async ({
    page,
    errors,
  }) => {
    await page.goto('/');

    // 1. Kiểm tra <title>
    const title = await page.title();
    expect(title).toMatch(/Trang chủ \| .+/);

    // 2. Kiểm tra meta[name="description"]
    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveCount(1);
    const descContent = await desc.getAttribute('content');
    expect(descContent).toBeTruthy();
    expect(descContent?.length).toBeGreaterThan(10);

    // 3. Kiểm tra link[rel="canonical"]
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    const canonicalHref = await canonical.getAttribute('href');
    expect(canonicalHref).toBeTruthy();
    expect(canonicalHref).toMatch(/https?:\/\/.+/);

    // 4. Kiểm tra JSON-LD Organization
    const jsonLdLocator = page.locator('script[type="application/ld+json"]').first();
    await expect(jsonLdLocator).toBeAttached();
    const jsonLdContent = await jsonLdLocator.textContent();
    expect(jsonLdContent).toBeTruthy();
    const parsed = JSON.parse(jsonLdContent!);
    expect(parsed['@type']).toBe('Organization');
    expect(parsed.name).toBeTruthy();
    expect(parsed.url).toBeTruthy();

    errors.assertClean();
  });

  test('trang chi tiết sản phẩm có <title>, meta description, link canonical và JSON-LD Product', async ({
    page,
    errors,
  }) => {
    await page.goto('/san-pham/cai-ngot-huu-co');

    // 1. Kiểm tra <title> chứa tên sản phẩm và tên nông trại
    const title = await page.title();
    expect(title).toMatch(/Cải ngọt hữu cơ \| .+/);

    // 2. Kiểm tra meta[name="description"]
    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveCount(1);
    const descContent = await desc.getAttribute('content');
    expect(descContent).toContain('Cải ngọt hữu cơ');

    // 3. Kiểm tra link[rel="canonical"]
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    const canonicalHref = await canonical.getAttribute('href');
    expect(canonicalHref).toBeTruthy();
    expect(canonicalHref).toMatch(/\/san-pham\/cai-ngot-huu-co/);

    // 4. Kiểm tra JSON-LD Product
    const jsonLdLocator = page.locator('script[type="application/ld+json"]').first();
    await expect(jsonLdLocator).toBeAttached();
    const jsonLdContent = await jsonLdLocator.textContent();
    expect(jsonLdContent).toBeTruthy();
    const parsed = JSON.parse(jsonLdContent!);
    expect(parsed['@type']).toBe('Product');
    expect(parsed.name).toBe('Cải ngọt hữu cơ');
    expect(parsed.offers).toBeTruthy();
    expect(parsed.offers.price).toBe(25000);

    errors.assertClean();
  });
});
