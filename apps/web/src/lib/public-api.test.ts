import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  formatCurrency,
  formatDate,
  getPublicProducts,
  getPublicProductBySlug,
  getPublicPosts,
  getPublicPostBySlug,
  getPublicPageBySlug,
  getSiteSettings,
  getPublicTours,
  getPublicTourBySlug,
} from './public-api';

describe('public-api helpers', () => {
  it('formats currency in vi-VN', () => {
    expect(formatCurrency(25000)).toContain('25.000');
    expect(formatCurrency(0)).toContain('0');
  });

  it('formats dates in vi-VN', () => {
    const formatted = formatDate('2026-03-20T08:00:00Z');
    expect(formatted).toMatch(/20\/03\/2026/);
  });
});

describe('public-api fetch functions (with fallback)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns fallback products if fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    const products = await getPublicProducts();
    expect(products.length).toBeGreaterThanOrEqual(3);
    expect(products[0].slug).toBe('cai-ngot-huu-co');
  });

  it('returns products from API when fetch succeeds', async () => {
    const mockProducts = [
      {
        id: '1',
        slug: 'dua-hau',
        name: 'Dưa hấu',
        price: 15000,
        unit: 'kg',
        isPublished: true,
        sortOrder: 1,
      },
    ];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockProducts }),
    } as Response);

    const products = await getPublicProducts();
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Dưa hấu');
  });

  it('queries product by slug and uses fallback on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    const product = await getPublicProductBySlug('cai-ngot-huu-co');
    expect(product).not.toBeNull();
    expect(product?.name).toBe('Cải ngọt hữu cơ');
  });

  it('filters out draft posts', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { slug: 'published-post', title: 'Bài đã đăng', status: 'PUBLISHED' },
          { slug: 'draft-post', title: 'Bài nháp', status: 'DRAFT' },
        ],
        total: 2,
      }),
    } as Response);

    const postsResult = await getPublicPosts();
    expect(postsResult.data).toHaveLength(1);
    expect(postsResult.data[0].slug).toBe('published-post');
  });

  it('returns null when querying draft post by slug', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ slug: 'draft', status: 'DRAFT' }),
    } as Response);

    const post = await getPublicPostBySlug('draft');
    expect(post).toBeNull();
  });

  it('queries public page by slug', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    const page = await getPublicPageBySlug('gioi-thieu');
    expect(page).not.toBeNull();
    expect(page?.slug).toBe('gioi-thieu');
  });

  it('returns site settings with fallback merge', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        'farm.name': 'XFarm Sinh Thái Mới',
      }),
    } as Response);

    const settings = await getSiteSettings();
    expect(settings['farm.name']).toBe('XFarm Sinh Thái Mới');
    expect(settings['contact.phone']).toBe('0901 234 567');
  });

  it('returns fallback tours when API fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    const tours = await getPublicTours();
    expect(tours.length).toBeGreaterThanOrEqual(1);
    expect(tours[0].slug).toBe('mot-ngay-lam-nong-dan');
  });

  it('queries public tour by slug with fallback', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    const tour = await getPublicTourBySlug('mot-ngay-lam-nong-dan');
    expect(tour).not.toBeNull();
    expect(tour?.name).toBe('Một ngày làm nông dân nhí & gia đình');
  });
});
