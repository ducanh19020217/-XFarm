import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ChevronRight, ArrowLeft, Calendar, User } from 'lucide-react';
import { getPublicPostBySlug, getPublicPosts, formatDate, getSiteSettings } from '@/lib/public-api';
import { getSiteUrl, getAssetPath } from '@/lib/site-url';
import { sanitizeHtml } from '@/lib/sanitize';

export async function generateStaticParams() {
  const result = await getPublicPosts({ page: 1, pageSize: 100 });
  return (result.data || []).map((p) => ({ slug: p.slug }));
}

interface BlogPostDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BlogPostDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicPostBySlug(slug);
  const siteUrl = getSiteUrl();

  if (!post) {
    return {
      title: 'Không tìm thấy bài viết',
      description: 'Bài viết không tồn tại hoặc đã được gỡ bỏ.',
    };
  }

  const title = post.title;
  const description = post.excerpt;
  const canonicalUrl = `${siteUrl}/blog/${post.slug}`;
  const images = post.coverMediaId ? [post.coverMediaId] : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'article',
      publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
  };
}

export default async function BlogPostDetailPage({ params }: BlogPostDetailPageProps) {
  const { slug } = await params;
  const post = await getPublicPostBySlug(slug);

  if (!post || post.status !== 'PUBLISHED') {
    notFound();
  }

  const siteUrl = getSiteUrl();
  const settings = await getSiteSettings();
  const farmName = settings['farm.name'] || 'XFarm – Nông trại sinh thái';

  const coverSrc = post.coverMediaId || null;
  const sanitizedContent = sanitizeHtml(post.content);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: coverSrc ? [coverSrc] : undefined,
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    author: {
      '@type': 'Organization',
      name: farmName,
    },
    publisher: {
      '@type': 'Organization',
      name: farmName,
      url: siteUrl,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/blog/${post.slug}`,
    },
  };

  return (
    <div className="py-10 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 text-fg">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs sm:text-sm text-muted"
        >
          <Link href="/" className="hover:text-accent transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
          <Link href="/blog" className="hover:text-accent transition-colors">
            Tin tức & Cẩm nang
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
          <span className="text-fg font-semibold truncate max-w-xs" aria-current="page">
            {post.title}
          </span>
        </nav>

        {/* Back Link */}
        <div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-accent hover:text-accent-hover transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Quay lại chuyên mục tin tức</span>
          </Link>
        </div>

        {/* Post Header */}
        <header className="space-y-4 border-b border-line pb-8">
          <div className="flex items-center gap-3 text-xs sm:text-sm text-muted">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 text-accent" aria-hidden="true" />
              <time
                dateTime={post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined}
              >
                {formatDate(post.publishedAt)}
              </time>
            </span>
            <span aria-hidden="true">•</span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <User className="w-4 h-4 text-accent" aria-hidden="true" />
              <span>Ban Biên Tập XFarm</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-fg tracking-tight leading-tight">
            {post.title}
          </h1>

          <p className="text-base sm:text-lg text-fg-2 font-medium leading-relaxed italic border-l-4 border-accent pl-4 py-1">
            {post.excerpt}
          </p>
        </header>

        {/* Cover Image */}
        {coverSrc &&
          (coverSrc.startsWith('http://') ||
            coverSrc.startsWith('https://') ||
            coverSrc.startsWith('/')) && (
            <div className="relative aspect-16/9 w-full rounded-3xl overflow-hidden bg-surface-2 shadow-xs border border-line">
              <Image
                src={getAssetPath(coverSrc)}
                alt={post.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 896px"
                className="object-cover"
              />
            </div>
          )}

        {/* Sanitized HTML Content */}
        <div
          className="prose prose-slate dark:prose-invert sm:prose-lg max-w-none bg-surface p-8 sm:p-12 rounded-3xl border border-line shadow-xs leading-relaxed text-fg"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />

        {/* Footer info of post */}
        <div className="pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-muted">
          <p>Chủ đề: Nông nghiệp sinh thái tuần hoàn & Sống xanh</p>
          <Link
            href="/blog"
            className="font-semibold text-accent hover:text-accent-hover transition-colors"
          >
            ← Khám phá thêm bài viết khác
          </Link>
        </div>
      </article>
    </div>
  );
}
