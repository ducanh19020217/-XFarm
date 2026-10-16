import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';
import { getPublicProducts, getPublicPosts } from '@/lib/public-api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/gioi-thieu`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/san-pham`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/lien-he`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await getPublicProducts();
    productRoutes = (products || [])
      .filter((p) => p.isPublished !== false)
      .map((p) => ({
        url: `${siteUrl}/san-pham/${p.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      }));
  } catch {
    // fallback or empty
  }

  let postRoutes: MetadataRoute.Sitemap = [];
  try {
    const postsResult = await getPublicPosts({ page: 1, pageSize: 100 });
    postRoutes = (postsResult.data || [])
      .filter((post) => post.status !== 'DRAFT')
      .map((post) => ({
        url: `${siteUrl}/blog/${post.slug}`,
        lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
  } catch {
    // fallback or empty
  }

  return [...staticRoutes, ...productRoutes, ...postRoutes];
}
