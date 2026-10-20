import Link from 'next/link';
import Image from 'next/image';
import { Calendar, ArrowRight, BookOpen } from 'lucide-react';
import { formatDate, type PublicPost } from '@/lib/public-api';

interface PostCardProps {
  post: PublicPost;
}

export function PostCard({ post }: PostCardProps) {
  const coverSrc = post.coverMediaId || null;

  return (
    <article className="group flex flex-col bg-surface rounded-2xl border border-line hover:border-accent shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden text-fg">
      {/* Cover visual */}
      <div className="relative aspect-16/9 w-full bg-surface-2 overflow-hidden">
        {coverSrc &&
        (coverSrc.startsWith('http://') ||
          coverSrc.startsWith('https://') ||
          coverSrc.startsWith('/')) ? (
          <Image
            src={coverSrc}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-surface-2 text-accent p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-accent-bg flex items-center justify-center mb-1.5 text-accent shadow-xs">
              <BookOpen className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">
              Cẩm nang XFarm
            </span>
          </div>
        )}
      </div>

      {/* Post body */}
      <div className="flex-1 flex flex-col p-5">
        <div className="flex items-center gap-1.5 text-xs text-muted mb-2.5">
          <Calendar className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
          <time dateTime={post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined}>
            {formatDate(post.publishedAt)}
          </time>
        </div>

        <h3 className="font-bold text-fg text-base sm:text-lg group-hover:text-accent transition-colors line-clamp-2 mb-2 leading-snug">
          <Link
            href={`/blog/${post.slug}`}
            className="focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
          >
            {post.title}
          </Link>
        </h3>

        <p className="text-muted text-sm line-clamp-3 leading-relaxed mb-4">{post.excerpt}</p>

        <div className="mt-auto pt-3 border-t border-line">
          <Link
            href={`/blog/${post.slug}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
            aria-label={`Đọc tiếp: ${post.title}`}
          >
            <span>Đọc tiếp</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </article>
  );
}
