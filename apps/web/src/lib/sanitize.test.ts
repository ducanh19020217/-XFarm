import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
  it('preserves safe HTML tags and text', () => {
    const safeHtml = '<p>Rau <strong>hữu cơ</strong> tươi ngon!</p>';
    expect(sanitizeHtml(safeHtml)).toBe(safeHtml);
  });

  it('removes script tags and script contents', () => {
    const dirty = '<p>Chào bạn</p><script>alert("hacked")</script><p>XFarm</p>';
    expect(sanitizeHtml(dirty)).toBe('<p>Chào bạn</p><p>XFarm</p>');
  });

  it('removes inline event handlers like onerror and onclick', () => {
    const dirty = '<img src="x" onerror="alert(1)" /><button onclick="evil()">Click</button>';
    const cleaned = sanitizeHtml(dirty);
    expect(cleaned).not.toContain('onerror');
    expect(cleaned).not.toContain('onclick');
    expect(cleaned).not.toContain('evil()');
  });

  it('removes javascript: links', () => {
    const dirty = '<a href="javascript:stealCookie()">Xem thêm</a>';
    const cleaned = sanitizeHtml(dirty);
    expect(cleaned).not.toContain('javascript:');
    expect(cleaned).toContain('href="#"');
  });

  it('handles null, undefined or empty input gracefully', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml('')).toBe('');
  });
});
