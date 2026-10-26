/**
 * Helper to retrieve base website URL from NEXT_PUBLIC_SITE_URL or WEB_URL.
 */
export function getSiteUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_DEMO === '1' ? 'https://ducanh19020217.github.io/-XFarm' : '') ||
    process.env.WEB_URL ||
    'http://localhost:3000';
  return url.replace(/\/+$/, '');
}

/**
 * Prepend basePath to relative asset paths when running in demo/export mode.
 */
export function getAssetPath(path: string): string {
  if (
    !path ||
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:')
  ) {
    return path;
  }
  const isDemo =
    typeof process !== 'undefined' &&
    (process.env.NEXT_PUBLIC_DEMO === '1' || Boolean(process.env.DEMO_BASE_PATH));
  const basePath = isDemo
    ? process.env.DEMO_BASE_PATH || process.env.NEXT_PUBLIC_BASE_PATH || '/-XFarm'
    : '';
  if (basePath && path.startsWith('/') && !path.startsWith(basePath)) {
    return `${basePath}${path}`;
  }
  return path;
}
