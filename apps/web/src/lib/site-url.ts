/**
 * Helper to retrieve base website URL from NEXT_PUBLIC_SITE_URL or WEB_URL.
 */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || process.env.WEB_URL || 'http://localhost:3000';
  return url.replace(/\/+$/, '');
}
