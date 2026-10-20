import * as React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  DEFAULT_SITE_SETTINGS,
  formatTimeline,
  normalizePhotos,
  PublicSiteSettings,
  PublicTraceData,
} from './trace-utils';
import { getSiteUrl } from '@/lib/site-url';
import { TraceHeader } from './_components/trace-header';
import { TraceLotCard } from './_components/trace-lot-card';
import { TraceTimelineView } from './_components/trace-timeline-view';
import { TraceLightbox } from './_components/trace-lightbox';
import { TraceFooter } from './_components/trace-footer';
import { API_BASE_URL } from '@/lib/public-api';

export const dynamic = 'force-dynamic';

async function getTraceData(code: string): Promise<PublicTraceData | null> {
  const url = `${API_BASE_URL}/public/trace/${encodeURIComponent(code)}`;
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.status === 404 || !res.ok) {
      return null;
    }

    const json = await res.json();
    const data = (json.data ?? json) as PublicTraceData;
    if (!data || !data.lot) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

async function getSiteSettings(): Promise<PublicSiteSettings> {
  const url = `${API_BASE_URL}/public/site-settings`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 300 },
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      const json = await res.json();
      const data = json.data ?? json;
      if (typeof data === 'object' && data !== null) {
        return {
          farmName: data['farm.name'] || data.farmName || DEFAULT_SITE_SETTINGS.farmName,
          slogan: data['farm.slogan'] || data.slogan || DEFAULT_SITE_SETTINGS.slogan,
          phone: data['contact.phone'] || data.phone || DEFAULT_SITE_SETTINGS.phone,
          email: data['contact.email'] || data.email || DEFAULT_SITE_SETTINGS.email,
          address: data['contact.address'] || data.address || DEFAULT_SITE_SETTINGS.address,
        };
      }
    }
  } catch {
    // Graceful fallback to default site settings
  }

  return DEFAULT_SITE_SETTINGS;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const trace = await getTraceData(code);
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/trace/${encodeURIComponent(code)}`;

  if (!trace || !trace.lot) {
    return {
      title: 'Không tìm thấy thông tin truy xuất | XFarm',
      description: 'Mã truy xuất nguồn gốc nông sản không tồn tại hoặc chưa được công khai.',
      alternates: {
        canonical: canonicalUrl,
      },
    };
  }

  const productName = trace.product?.name || 'Sản phẩm nông sản';
  const lotCode = trace.lot.code || code;
  const title = `Truy xuất ${productName} – lô ${lotCode}`;
  const description = `Thông tin truy xuất nguồn gốc chính hãng cho ${productName}, lô ${lotCode} từ Nông trại sinh thái XFarm.`;

  const photos = normalizePhotos(trace.photos);
  const ogImage = photos.length > 0 ? photos[0].url : undefined;

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
      type: 'website',
      images: ogImage ? [{ url: ogImage }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function TracePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const trace = await getTraceData(code);

  if (!trace || !trace.lot) {
    notFound();
  }

  const siteSettings = await getSiteSettings();
  const formattedTimeline = formatTimeline(trace.timeline);
  const normalizedPhotos = normalizePhotos(trace.photos);

  return (
    <div className="min-h-screen bg-app text-fg py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header: tên sản phẩm & badge chứng nhận */}
        <TraceHeader product={trace.product} lot={trace.lot} />

        {/* Thẻ thông tin lô: mã, ngày thu hoạch, khu/lô, giống, phân loại */}
        <TraceLotCard lot={trace.lot} area={trace.area} cycle={trace.cycle} />

        {/* Timeline các bước canh tác: icon theo loại, ngày, tóm tắt */}
        <TraceTimelineView timeline={formattedTimeline} />

        {/* Lưới ảnh có lightbox đơn giản */}
        <TraceLightbox photos={normalizedPhotos} />

        {/* Footer: tên trại, liên hệ (site-settings) và link về trang chủ */}
        <TraceFooter settings={siteSettings} />
      </div>
    </div>
  );
}
