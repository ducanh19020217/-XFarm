import Link from 'next/link';
import Image from 'next/image';
import { Compass, Clock, Users, ArrowRight } from 'lucide-react';
import { formatCurrency, type PublicTour } from '@/lib/public-api';
import { getAssetPath } from '@/lib/site-url';

interface TourCardProps {
  tour: PublicTour;
}

export function TourCard({ tour }: TourCardProps) {
  const imageSrc = tour.mediaIds && tour.mediaIds.length > 0 ? tour.mediaIds[0] : null;

  // Strip simple html tags for card excerpt
  const plainDescription = tour.description
    ? tour.description.replace(/<[^>]*>?/gm, '').trim()
    : '';

  return (
    <article
      data-testid="tour-card"
      className="group relative flex flex-col bg-surface rounded-2xl border border-line hover:border-accent shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden text-fg"
    >
      {/* Tour Image / Visual Header */}
      <div className="relative aspect-16/10 w-full bg-surface-2 overflow-hidden">
        {imageSrc &&
        (imageSrc.startsWith('http://') ||
          imageSrc.startsWith('https://') ||
          imageSrc.startsWith('/')) ? (
          <Image
            src={getAssetPath(imageSrc)}
            alt={tour.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-surface-2 text-accent p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center mb-2 text-accent shadow-xs">
              <Compass className="w-6 h-6" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">
              Du lịch trải nghiệm
            </span>
          </div>
        )}

        {/* Duration badge */}
        <div className="absolute top-3 left-3 z-10">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface/90 border border-line backdrop-blur-xs text-fg shadow-xs">
            <Clock className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
            <span>{tour.durationMinutes} phút</span>
          </span>
        </div>

        {/* Capacity badge */}
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent text-surface shadow-xs">
            <Users className="w-3.5 h-3.5 text-surface" aria-hidden="true" />
            <span>Tối đa {tour.capacity} khách</span>
          </span>
        </div>
      </div>

      {/* Tour Content */}
      <div className="flex-1 flex flex-col p-5">
        <h3 className="font-bold text-fg text-base sm:text-lg group-hover:text-accent transition-colors line-clamp-2 mb-2">
          <Link
            href={`/tour/${tour.slug}`}
            className="focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
          >
            {tour.name}
          </Link>
        </h3>

        {plainDescription && (
          <p className="text-sm text-muted line-clamp-2 mb-4 leading-relaxed">{plainDescription}</p>
        )}

        {/* Pricing & CTA */}
        <div className="mt-auto pt-3 border-t border-line flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-muted">Người lớn:</span>
              <span className="text-base sm:text-lg font-extrabold text-accent">
                {formatCurrency(tour.priceAdult)}
              </span>
            </div>
            <div className="flex items-baseline gap-1 text-xs text-muted">
              <span>Trẻ em:</span>
              <span className="font-bold text-fg-2">{formatCurrency(tour.priceChild)}</span>
            </div>
          </div>

          <Link
            href={`/tour/${tour.slug}`}
            className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-accent hover:bg-accent-hover text-surface shadow-xs hover:shadow transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span>Đặt chỗ</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </article>
  );
}
