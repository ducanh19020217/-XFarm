import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getPublicProducts, getSiteSettings } from '@/lib/public-api';
import { getSiteUrl } from '@/lib/site-url';
import { ProductCard } from '../_components/product-card';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const farmName = settings['farm.name'] || 'XFarm – Nông trại sinh thái';
  const siteUrl = getSiteUrl();
  const title = 'Sản phẩm';
  const description =
    'Danh mục nông sản tươi sạch, đạt tiêu chuẩn VietGAP thu hoạch mỗi ngày tại XFarm.';

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/san-pham`,
    },
    openGraph: {
      title: `${title} | ${farmName}`,
      description,
      url: `${siteUrl}/san-pham`,
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

export default async function ProductsPage() {
  const products = await getPublicProducts();

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
            Sản phẩm
          </span>
        </nav>

        {/* Page Header */}
        <div className="border-b border-slate-200 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              Nông sản sạch
            </span>
            <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
              Sản Phẩm Trang Trại
            </h1>
            <p className="mt-2 text-slate-700 text-base max-w-2xl">
              Tất cả sản phẩm đều được thu hoạch trực tiếp tại các khu trồng trọt, chuồng trại và ao
              nuôi sinh thái của XFarm.
            </p>
          </div>

          <div className="text-xs sm:text-sm text-slate-700 font-medium">
            Hiển thị <span className="font-bold text-slate-900">{products.length}</span> sản phẩm
          </div>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs max-w-xl mx-auto">
            <p className="text-slate-700 text-base">Hiện chưa có sản phẩm nào được bày bán.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {products.map((product) => (
              <ProductCard key={product.id || product.slug} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
