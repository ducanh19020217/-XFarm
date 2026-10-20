import * as React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getSiteSettings } from '@/lib/public-api';
import { LookupClient } from './_components/lookup-client';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const farmName = settings['farm.name'] || 'XFarm – Nông trại sinh thái';

  return {
    title: `Tra cứu đặt chỗ | ${farmName}`,
    description: 'Tra cứu thông tin vé đặt tour trải nghiệm nông trại sinh thái XFarm.',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function TourLookupPage() {
  return (
    <div className="py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs sm:text-sm text-muted max-w-4xl mx-auto"
        >
          <Link href="/" className="hover:text-accent transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
          <Link href="/tour" className="hover:text-accent transition-colors">
            Tour trải nghiệm
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
          <span className="text-fg font-semibold" aria-current="page">
            Tra cứu đặt chỗ
          </span>
        </nav>

        {/* Client form wrapped in Suspense for useSearchParams */}
        <React.Suspense
          fallback={
            <div className="max-w-4xl mx-auto p-12 bg-surface rounded-3xl border border-line text-center text-muted">
              Đang tải biểu mẫu tra cứu...
            </div>
          }
        >
          <LookupClient />
        </React.Suspense>
      </div>
    </div>
  );
}
