import { describe, it, expect } from 'vitest';
import sitemap from './sitemap';

describe('sitemap()', () => {
  it('tạo sitemap chứa trang tĩnh, sản phẩm và bài viết, không chứa admin/login/api', async () => {
    const items = await sitemap();

    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);

    const urls = items.map((item) => item.url);

    // Có trang tĩnh
    expect(urls.some((u) => u.endsWith('/san-pham'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/tour'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/blog'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/gioi-thieu'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/lien-he'))).toBe(true);

    // Có sản phẩm
    const productUrls = urls.filter((u) => u.includes('/san-pham/'));
    expect(productUrls.length).toBeGreaterThan(0);

    // Có tour
    const tourUrls = urls.filter((u) => u.includes('/tour/'));
    expect(tourUrls.length).toBeGreaterThan(0);

    // Có bài viết
    const blogUrls = urls.filter((u) => u.includes('/blog/'));
    expect(blogUrls.length).toBeGreaterThan(0);

    // Tuyệt đối không chứa admin, login, api hoặc trang không index (thành công, tra cứu)
    expect(urls.some((u) => u.includes('/admin'))).toBe(false);
    expect(urls.some((u) => u.includes('/login'))).toBe(false);
    expect(urls.some((u) => u.includes('/api'))).toBe(false);
    expect(urls.some((u) => u.includes('/tour/dat-cho-thanh-cong'))).toBe(false);
    expect(urls.some((u) => u.includes('/tour/tra-cuu'))).toBe(false);
  });
});
