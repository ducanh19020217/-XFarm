import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Compass, Search } from 'lucide-react';
import { getPublicTours, getSiteSettings } from '@/lib/public-api';
import { getSiteUrl } from '@/lib/site-url';
import { TourCard } from '../_components/tour-card';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const farmName = settings['farm.name'] || 'XFarm – Nông trại sinh thái';
  const siteUrl = getSiteUrl();
  const title = 'Tour trải nghiệm';
  const description =
    'Khám phá các tour du lịch sinh thái nông trại XFarm: một ngày làm nông dân, bắt cá, gieo trồng và thưởng thức nông sản sạch.';

  return {
    title: `${title} | ${farmName}`,
    description,
    alternates: {
      canonical: `${siteUrl}/tour`,
    },
    openGraph: {
      title: `${title} | ${farmName}`,
      description,
      url: `${siteUrl}/tour`,
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

export default async function TourListPage() {
  const tours = await getPublicTours();

  return (
    <div className="py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs sm:text-sm text-slate-700"
        >
          <Link href="/" className="hover:text-emerald-700 transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <span className="text-slate-900 font-semibold" aria-current="page">
            Tour trải nghiệm
          </span>
        </nav>

        {/* Page Header */}
        <div className="border-b border-slate-200 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <Compass className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>Du lịch sinh thái tuần hoàn</span>
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
              Tour Trải Nghiệm Nông Trại
            </h1>
            <p className="text-slate-700 text-sm sm:text-base max-w-2xl leading-relaxed">
              Trải nghiệm thực tế cùng người nông dân XFarm: tự tay chăm sóc vườn rau hữu cơ, cho
              gia súc gia cầm ăn, bắt cá và tận hưởng không khí trong lành giữa thiên nhiên.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/tour/tra-cuu"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100/80 text-sm font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Search className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>Tra cứu đặt chỗ</span>
            </Link>
            <div className="text-xs sm:text-sm text-slate-700 font-medium self-center sm:self-auto">
              Hiển thị <span className="font-bold text-slate-900">{tours.length}</span> tour
            </div>
          </div>
        </div>

        {/* Tours Grid */}
        {tours.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs max-w-xl mx-auto space-y-4">
            <Compass className="w-12 h-12 text-slate-400 mx-auto" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-800">Chưa có tour nào mở đăng ký</h2>
            <p className="text-slate-600 text-sm">
              Các tour trải nghiệm mới sẽ sớm được cập nhật. Vui lòng quay lại sau!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {tours.map((tour) => (
              <TourCard key={tour.id || tour.slug} tour={tour} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
