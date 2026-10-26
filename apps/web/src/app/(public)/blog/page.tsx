import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, ChevronLeft, BookOpen } from 'lucide-react';
import { getPublicPosts, getSiteSettings } from '@/lib/public-api';
import { getSiteUrl } from '@/lib/site-url';
import { PostCard } from '../_components/post-card';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const farmName = settings['farm.name'] || 'XFarm – Nông trại sinh thái';
  const siteUrl = getSiteUrl();
  const title = 'Tin tức & Cẩm nang';
  const description =
    'Cập nhật tin tức hoạt động nông trại, cẩm nang canh tác hữu cơ và lối sống xanh tại XFarm.';

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/blog`,
    },
    openGraph: {
      title: `${title} | ${farmName}`,
      description,
      url: `${siteUrl}/blog`,
      siteName: farmName,
      locale: 'vi_VN',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${farmName}`,
      description,
    },
  };
}

interface BlogPageProps {
  searchParams?: Promise<{ page?: string }>;
}

export default async function BlogPage(props: BlogPageProps) {
  let currentPage = 1;
  if (process.env.NEXT_PUBLIC_DEMO !== '1' && props.searchParams) {
    const { page: pageParam } = await props.searchParams;
    currentPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);
  }
  const pageSize = 6;

  const {
    data: posts,
    total,
    page,
  } = await getPublicPosts({
    page: currentPage,
    pageSize,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs sm:text-sm text-muted"
        >
          <Link href="/" className="hover:text-accent transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
          <span className="text-fg font-semibold" aria-current="page">
            Tin tức & Cẩm nang
          </span>
        </nav>

        {/* Page Header */}
        <div className="border-b border-line pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-accent bg-accent-bg px-3 py-1.5 rounded-full border border-accent/20">
              Kiến thức nông nghiệp
            </span>
            <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold text-fg tracking-tight">
              Tin Tức & Cẩm Nang
            </h1>
            <p className="mt-2 text-muted text-base max-w-2xl">
              Khám phá các câu chuyện nông nghiệp hữu cơ, cẩm nang dinh dưỡng và các hoạt động bảo
              vệ môi trường cùng XFarm.
            </p>
          </div>

          <div className="text-xs sm:text-sm text-muted font-medium">
            Tổng cộng <span className="font-bold text-fg">{total}</span> bài viết
          </div>
        </div>

        {/* Posts Grid */}
        {posts.length === 0 ? (
          <div className="bg-surface rounded-3xl p-12 text-center border border-line shadow-xs max-w-xl mx-auto text-fg">
            <BookOpen className="w-10 h-10 text-muted mx-auto mb-3" aria-hidden="true" />
            <p className="text-muted text-base">Hiện chưa có bài viết nào được đăng tải.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {posts.map((post) => (
              <PostCard key={post.id || post.slug} post={post} />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <nav
            aria-label="Điều hướng phân trang"
            className="flex items-center justify-center gap-3 pt-6 border-t border-line"
          >
            {page > 1 ? (
              <Link
                href={`/blog?page=${page - 1}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-line text-fg-2 hover:text-accent hover:bg-hover text-sm font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent shadow-xs"
                aria-label="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                <span>Trang trước</span>
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-2 border border-line text-muted text-sm font-semibold cursor-not-allowed shadow-xs select-none"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                <span>Trang trước</span>
              </span>
            )}

            <span className="text-sm font-medium text-muted px-3">
              Trang <span className="font-bold text-fg">{page}</span> / {totalPages}
            </span>

            {page < totalPages ? (
              <Link
                href={`/blog?page=${page + 1}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-line text-fg-2 hover:text-accent hover:bg-hover text-sm font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent shadow-xs"
                aria-label="Trang tiếp theo"
              >
                <span>Trang sau</span>
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-2 border border-line text-muted text-sm font-semibold cursor-not-allowed shadow-xs select-none"
              >
                <span>Trang sau</span>
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </span>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
