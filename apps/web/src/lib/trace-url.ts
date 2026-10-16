/**
 * Dựng URL truy xuất cho lô thu hoạch.
 * Ưu tiên:
 * 1. baseUrl truyền vào
 * 2. NEXT_PUBLIC_SITE_URL
 * 3. WEB_URL
 * 4. window.location.origin (trên client)
 */
export function buildTraceUrl(traceCode: string, baseUrl?: string): string {
  const base =
    baseUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.WEB_URL ||
    (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '');
  const cleanBase = (base || '').replace(/\/+$/, '');
  return `${cleanBase}/trace/${encodeURIComponent(traceCode)}`;
}
