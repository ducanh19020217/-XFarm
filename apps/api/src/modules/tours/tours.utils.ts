import slugify from 'slugify';
import { prisma } from '@xfarm/db';

export function toSlug(text: string): string {
  const clean = text.trim();
  const slug = slugify(clean, { lower: true, strict: true, locale: 'vi' });
  return slug || 'tour';
}

export async function generateUniqueTourSlug(
  titleOrName: string,
  excludeId?: string,
): Promise<string> {
  const baseSlug = toSlug(titleOrName);
  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.tour.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || (excludeId && existing.id === excludeId)) {
      return candidate;
    }

    candidate = `${baseSlug}-${counter}`;
    counter++;
  }
}
