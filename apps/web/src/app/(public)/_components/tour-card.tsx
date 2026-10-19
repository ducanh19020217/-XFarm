import Link from 'next/link';
import Image from 'next/image';
import { Compass, Clock, Users, ArrowRight } from 'lucide-react';
import { formatCurrency, type PublicTour } from '@/lib/public-api';

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
      className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      {/* Tour Image / Visual Header */}
      <div className="relative aspect-16/10 w-full bg-slate-100 overflow-hidden">
        {imageSrc && (imageSrc.startsWith('http://') || imageSrc.startsWith('https://') || imageSrc.startsWith('/')) ? (
          <Image
            src={imageSrc}
            alt={tour.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-teal-700 via-emerald-800 to-slate-900 text-white p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xs flex items-center justify-center mb-2 text-emerald-300 shadow-xs">
              <Compass className="w-6 h-6" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
              Du lịch trải nghiệm
            </span>
          </div>
        )}

        {/* Duration badge */}
        <div className="absolute top-3 left-3 z-10">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900/80 backdrop-blur-xs text-white shadow-xs">
            <Clock className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <span>{tour.durationMinutes} phút</span>
          </span>
        </div>

        {/* Capacity badge */}
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-600/90 backdrop-blur-xs text-white shadow-xs">
            <Users className="w-3.5 h-3.5 text-emerald-100" aria-hidden="true" />
            <span>Tối đa {tour.capacity} khách</span>
          </span>
        </div>
      </div>

      {/* Tour Content */}
      <div className="flex-1 flex flex-col p-5">
        <h3 className="font-bold text-slate-900 text-base sm:text-lg group-hover:text-emerald-700 transition-colors line-clamp-2 mb-2">
          <Link
            href={`/tour/${tour.slug}`}
            className="focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm"
          >
            {tour.name}
          </Link>
        </h3>

        {plainDescription && (
          <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">
            {plainDescription}
          </p>
        )}

        {/* Pricing & CTA */}
        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-slate-700">Người lớn:</span>
              <span className="text-base sm:text-lg font-extrabold text-emerald-700">
                {formatCurrency(tour.priceAdult)}
              </span>
            </div>
            <div className="flex items-baseline gap-1 text-xs text-slate-700">
              <span>Trẻ em:</span>
              <span className="font-bold text-slate-700">{formatCurrency(tour.priceChild)}</span>
            </div>
          </div>

          <Link
            href={`/tour/${tour.slug}`}
            className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs hover:shadow transition-all group-hover:bg-emerald-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <span>Đặt chỗ</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </article>
  );
}
