import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  ChevronRight,
  Clock,
  Users,
  Compass,
  CheckCircle2,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import { getPublicTourBySlug, getSiteSettings, formatCurrency } from '@/lib/public-api';
import { getSiteUrl } from '@/lib/site-url';
import { sanitizeHtml } from '@/lib/sanitize';
import { BookingSection } from './_components/booking-section';

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getPublicTourBySlug(slug);
  const settings = await getSiteSettings();
  const farmName = settings['farm.name'] || 'XFarm – Nông trại sinh thái';
  const siteUrl = getSiteUrl();

  if (!tour) {
    return {
      title: 'Không tìm thấy tour',
    };
  }

  const plainDesc = tour.description
    ? tour.description.replace(/<[^>]*>?/gm, '').slice(0, 160)
    : `Tour trải nghiệm nông trại sinh thái ${tour.name} tại XFarm.`;

  const coverImage =
    tour.mediaIds && tour.mediaIds.length > 0 && tour.mediaIds[0].startsWith('http')
      ? tour.mediaIds[0]
      : `${siteUrl}/tour/${slug}/opengraph-image`;

  return {
    title: `${tour.name} | ${farmName}`,
    description: plainDesc,
    alternates: {
      canonical: `${siteUrl}/tour/${slug}`,
    },
    openGraph: {
      title: `${tour.name} | ${farmName}`,
      description: plainDesc,
      url: `${siteUrl}/tour/${slug}`,
      siteName: farmName,
      locale: 'vi_VN',
      type: 'article',
      images: [
        {
          url: coverImage,
          width: 1200,
          height: 630,
          alt: tour.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${tour.name} | ${farmName}`,
      description: plainDesc,
      images: [coverImage],
    },
  };
}

export default async function TourDetailPage({ params }: Props) {
  const { slug } = await params;
  const tour = await getPublicTourBySlug(slug);

  if (!tour) {
    notFound();
  }

  const settings = await getSiteSettings();
  const farmName = settings['farm.name'] || 'XFarm – Nông trại sinh thái';
  const siteUrl = getSiteUrl();
  const address = settings['contact.address'] || 'Khu nông nghiệp sinh thái XFarm, Hòa Lạc, Hà Nội';

  const coverImage = tour.mediaIds && tour.mediaIds.length > 0 ? tour.mediaIds[0] : null;
  const sanitizedContent = sanitizeHtml(tour.description);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: tour.name,
    description: tour.description.replace(/<[^>]*>?/gm, '').slice(0, 200),
    url: `${siteUrl}/tour/${slug}`,
    image: coverImage || `${siteUrl}/tour/${slug}/opengraph-image`,
    touristType: ['Family', 'Students', 'Children'],
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'VND',
      lowPrice: tour.priceChild || tour.priceAdult,
      highPrice: tour.priceAdult,
      offerCount: tour.capacity,
    },
    provider: {
      '@type': 'Organization',
      name: farmName,
      url: siteUrl,
    },
  };

  return (
    <div className="py-8 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12 text-fg">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs sm:text-sm text-muted overflow-x-auto whitespace-nowrap"
        >
          <Link href="/" className="hover:text-accent transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" aria-hidden="true" />
          <Link href="/tour" className="hover:text-accent transition-colors">
            Tour trải nghiệm
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" aria-hidden="true" />
          <span className="text-fg font-semibold truncate" aria-current="page">
            {tour.name}
          </span>
        </nav>

        {/* Hero Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-accent-bg text-accent border border-accent/20">
              <Compass className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Tour sinh thái</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-2 text-muted border border-line">
              <Clock className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
              <span>Thời lượng: {tour.durationMinutes} phút</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-2 text-muted border border-line">
              <Users className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
              <span>Sức chứa: {tour.capacity} khách / suất</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-fg tracking-tight leading-tight">
            {tour.name}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
              <span>{address}</span>
            </span>
            <span className="text-muted">•</span>
            <span className="flex items-center gap-1 text-accent font-semibold">
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Bảo hiểm trải nghiệm đầy đủ</span>
            </span>
          </div>
        </div>

        {/* Tour Visual & Gallery */}
        <div className="relative aspect-16/9 sm:aspect-21/9 w-full rounded-3xl bg-surface-2 overflow-hidden shadow-lg border border-line">
          {coverImage &&
          (coverImage.startsWith('http://') ||
            coverImage.startsWith('https://') ||
            coverImage.startsWith('/')) ? (
            <Image
              src={coverImage}
              alt={tour.name}
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-surface-2 text-accent p-6 text-center">
              <Compass className="w-16 h-16 text-accent mb-3" aria-hidden="true" />
              <span className="text-xl sm:text-2xl font-black text-fg">{tour.name}</span>
              <span className="text-sm text-accent mt-1">
                Trải nghiệm xanh giữa lòng thiên nhiên
              </span>
            </div>
          )}
        </div>

        {/* Content Layout: 2 Columns on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Main Info Column */}
          <div className="lg:col-span-7 space-y-8">
            {/* Price Cards Overview */}
            <div className="grid grid-cols-2 gap-4 bg-surface-2 rounded-2xl p-5 border border-line">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Vé người lớn
                </span>
                <div className="text-xl sm:text-2xl font-black text-accent">
                  {formatCurrency(tour.priceAdult)}
                </div>
                <p className="text-[11px] text-muted">Bao gồm toàn bộ hoạt động</p>
              </div>

              <div className="space-y-1 border-l border-line pl-4">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Vé trẻ em (dưới 12 tuổi)
                </span>
                <div className="text-xl sm:text-2xl font-black text-accent">
                  {formatCurrency(tour.priceChild)}
                </div>
                <p className="text-[11px] text-muted">Ưu đãi cho học sinh & trẻ nhỏ</p>
              </div>
            </div>

            {/* Description & Detailed content */}
            <div className="bg-surface rounded-3xl border border-line p-6 sm:p-8 space-y-6 shadow-xs text-fg">
              <h2 className="text-xl sm:text-2xl font-extrabold text-fg border-b border-line pb-4">
                Giới Thiệu Chuyến Đi
              </h2>

              <div
                className="prose prose-emerald dark:prose-invert max-w-none text-fg-2 leading-relaxed space-y-4"
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
              />
            </div>

            {/* What's included & Important notes */}
            <div className="bg-surface rounded-3xl border border-line p-6 sm:p-8 space-y-6 shadow-xs text-fg">
              <h3 className="text-lg sm:text-xl font-bold text-fg">
                Lợi Ích & Trải Nghiệm Đáng Nhớ
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="w-5 h-5 text-accent shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-fg-2">
                    Hướng dẫn viên nông dân bản địa nhiệt tình
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="w-5 h-5 text-accent shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-fg-2">
                    Trải nghiệm tự tay thu hoạch nông sản tươi
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="w-5 h-5 text-accent shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-fg-2">
                    Dụng cụ bảo hộ, nón lá, ủng lội nước đầy đủ
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="w-5 h-5 text-accent shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-fg-2">
                    Nước giải khát thảo mộc hữu cơ phục vụ suốt chuyến
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Column (Sticky on desktop) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <BookingSection tour={tour} initialSlots={tour.slots || []} />
          </div>
        </div>
      </div>
    </div>
  );
}
