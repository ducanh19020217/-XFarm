/**
 * Lightweight and safe HTML sanitizer for rendering rich text on the public site.
 * Removes dangerous tags, on* event handlers, and javascript: URIs.
 */

const DANGEROUS_TAGS = [
  'script',
  'style',
  'iframe',
  'frame',
  'object',
  'embed',
  'applet',
  'link',
  'meta',
  'base',
  'form',
  'input',
  'button',
  'textarea',
  'select',
];

export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';

  let sanitized = dirty;

  // 1. Remove dangerous tags and their contents
  for (const tag of DANGEROUS_TAGS) {
    const tagRegex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(tagRegex, '');
    const selfClosingRegex = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
    sanitized = sanitized.replace(selfClosingRegex, '');
  }

  // 2. Remove all "on*" inline event handlers (e.g. onerror=, onclick=, onload=)
  sanitized = sanitized.replace(/\s+on[a-zA-Z]+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, '');

  // 3. Remove "javascript:" pseudo-protocols from attributes
  sanitized = sanitized.replace(/(href|src)\s*=\s*['"]\s*javascript:[^'"]*['"]/gi, '$1="#"');
  sanitized = sanitized.replace(/(href|src)\s*=\s*javascript:[^\s>]+/gi, '$1="#"');

  // 4. Remove data: URIs for scripts
  sanitized = sanitized.replace(/(href|src)\s*=\s*['"]\s*data:text\/html[^'"]*['"]/gi, '$1="#"');

  return sanitized;
}
