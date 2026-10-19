import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/login',
        '/api',
        '/gio-hang',
        '/thanh-toan',
        '/dat-hang-thanh-cong',
        '/tra-cuu-don',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
