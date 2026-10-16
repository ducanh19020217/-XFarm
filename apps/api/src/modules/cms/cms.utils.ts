import slugify from 'slugify';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';
import { BadRequestException } from '@nestjs/common';
import { prisma } from '@xfarm/db';

export function toSlug(text: string): string {
  const clean = text.trim();
  const slug = slugify(clean, { lower: true, strict: true, locale: 'vi' });
  return slug || 'item';
}

export async function generateUniqueSlug(
  model: 'product' | 'post' | 'page',
  titleOrName: string,
  excludeId?: string,
): Promise<string> {
  const baseSlug = toSlug(titleOrName);
  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    let existing: { id: string } | null = null;
    if (model === 'product') {
      existing = await prisma.product.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
    } else if (model === 'post') {
      existing = await prisma.post.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
    } else if (model === 'page') {
      existing = await prisma.page.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
    }

    if (!existing || (excludeId && existing.id === excludeId)) {
      return candidate;
    }

    counter++;
    candidate = `${baseSlug}-${counter}`;
  }
}

export function sanitizeHtmlContent(html: string): string {
  if (!html) return '';
  return sanitizeHtml(html, {
    allowedTags: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'blockquote',
      'pre',
      'code',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'strong',
      'em',
      'b',
      'i',
      'u',
      's',
      'strike',
      'del',
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'th',
      'td',
      'hr',
      'br',
      'span',
      'div',
      'sub',
      'sup',
      'mark',
      'figure',
      'figcaption',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
      '*': ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    disallowedTagsMode: 'discard',
  });
}

const vietQrSchema = z.object({
  bank: z.string().min(1, 'Tên ngân hàng không được để trống'),
  accountNumber: z.string().min(1, 'Số tài khoản không được để trống'),
  accountName: z.string().min(1, 'Tên chủ tài khoản không được để trống'),
});

const settingValidators: Record<string, z.ZodTypeAny> = {
  'farm.name': z.string().min(1, 'Tên trang trại không được để trống'),
  'farm.slogan': z.string(),
  'farm.about': z.string(),
  'contact.phone': z.string().min(1, 'Số điện thoại không được để trống'),
  'contact.email': z.string().email('Email không đúng định dạng'),
  'contact.address': z.string().min(1, 'Địa chỉ không được để trống'),
  'social.facebook': z.string(),
  'social.zalo': z.string(),
  'social.youtube': z.string(),
  'home.banners': z.array(z.string()),
  'bank.vietqr': vietQrSchema,
};

export function validateSettingValue(key: string, value: unknown): unknown {
  const validator = settingValidators[key];
  if (validator) {
    const parseResult = validator.safeParse(value);
    if (!parseResult.success) {
      const messages = parseResult.error.issues.map((i) => i.message).join('; ');
      throw new BadRequestException(`Giá trị cho cấu hình '${key}' không hợp lệ: ${messages}`);
    }
    return parseResult.data;
  }
  return value;
}
