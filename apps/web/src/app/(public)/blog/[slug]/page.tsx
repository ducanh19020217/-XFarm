import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ChevronRight, ArrowLeft, Calendar, User } from 'lucide-react';
import { getPublicPostBySlug, formatDate, getSiteSettings } from '@/lib/public-api';
import { getSiteUrl } from '@/lib/site-url';
import { sanitizeHtml } from '@/lib/sanitize';

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
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs sm:text-sm text-slate-700"
        >
          <Link href="/" className="hover:text-emerald-700 transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <Link href="/blog" className="hover:text-emerald-700 transition-colors">
            Tin tức & Cẩm nang
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <span className="text-slate-900 font-semibold truncate max-w-xs" aria-current="page">
            {post.title}
          </span>
        </nav>

        {/* Back Link */}
        <div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Quay lại chuyên mục tin tức</span>
          </Link>
        </div>

        {/* Post Header */}
        <header className="space-y-4 border-b border-slate-200 pb-8">
          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-700">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <time
                dateTime={post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined}
              >
                {formatDate(post.publishedAt)}
              </time>
            </span>
            <span aria-hidden="true">•</span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <User className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>Ban Biên Tập XFarm</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {post.title}
          </h1>

          <p className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed italic border-l-4 border-emerald-500 pl-4 py-1">
            {post.excerpt}
          </p>
        </header>

        {/* Cover Image */}
        {coverSrc &&
          (coverSrc.startsWith('http://') ||
            coverSrc.startsWith('https://') ||
            coverSrc.startsWith('/')) && (
            <div className="relative aspect-16/9 w-full rounded-3xl overflow-hidden bg-slate-100 shadow-xs border border-slate-200">
              <Image
                src={coverSrc}
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
          className="prose prose-slate prose-emerald sm:prose-lg max-w-none bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/80 shadow-xs leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />

        {/* Footer info of post */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-slate-700">
          <p>Chủ đề: Nông nghiệp sinh thái tuần hoàn & Sống xanh</p>
          <Link
            href="/blog"
            className="font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            ← Khám phá thêm bài viết khác
          </Link>
        </div>
      </article>
    </div>
  );
}
