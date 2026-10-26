'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ArrowRight, ShieldCheck } from 'lucide-react';
import { getAssetPath } from '@/lib/site-url';

interface BannerItem {
  title?: string;
  subtitle?: string;
  image?: string;
}

interface BannerSliderProps {
  banners?: Array<BannerItem | string>;
}

const DEFAULT_SLIDES: BannerItem[] = [
  {
    title: 'Nông nghiệp sinh thái tuần hoàn bền vững',
    subtitle:
      'Canh tác 100% không hóa chất độc hại, ứng dụng vi sinh hữu cơ tuần hoàn để bảo vệ sức khỏe gia đình bạn.',
    image: getAssetPath('/demo/banner-1.svg'),
  },
  {
    title: 'Nông sản tươi ngon từ đất mẹ',
    subtitle:
      'Thu hoạch từ sáng sớm tinh sương, đóng gói đạt chuẩn VietGAP và giao ngay đến tận bếp nhà bạn.',
    image: getAssetPath('/demo/banner-2.svg'),
  },
  {
    title: 'Du lịch trải nghiệm sinh thái cuối tuần',
    subtitle:
      'Không gian xanh mát, không khí trong lành với các hoạt động trải nghiệm bổ ích cho gia đình và trẻ nhỏ.',
    image: getAssetPath('/demo/banner-3.svg'),
  },
];

export function BannerSlider({ banners }: BannerSliderProps) {
  const slides: BannerItem[] =
    banners && banners.length > 0
      ? banners.map((b, idx) => {
          if (typeof b === 'string') {
            return {
              title: DEFAULT_SLIDES[idx % DEFAULT_SLIDES.length].title,
              subtitle: DEFAULT_SLIDES[idx % DEFAULT_SLIDES.length].subtitle,
              image: b,
            };
          }
          return {
            title: b.title || DEFAULT_SLIDES[idx % DEFAULT_SLIDES.length].title,
            subtitle: b.subtitle || DEFAULT_SLIDES[idx % DEFAULT_SLIDES.length].subtitle,
            image: b.image || DEFAULT_SLIDES[idx % DEFAULT_SLIDES.length].image,
          };
        })
      : DEFAULT_SLIDES;

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const currentSlide = slides[currentIndex];

  return (
    <section
      aria-label="Banner quảng bá trang trại"
      className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 text-white min-h-[440px] sm:min-h-[500px] flex items-center"
    >
      {/* Background visual image */}
      {currentSlide.image &&
        (currentSlide.image.startsWith('http://') ||
          currentSlide.image.startsWith('https://') ||
          currentSlide.image.startsWith('/')) && (
          <div className="absolute inset-0 opacity-25 pointer-events-none">
            <Image
              src={getAssetPath(currentSlide.image)}
              alt={currentSlide.title || 'Banner'}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        )}

      {/* Background Decorative patterns */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-400 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-teal-300 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 z-10 w-full">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-700/60 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm font-medium backdrop-blur-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-300" aria-hidden="true" />
            <span>Tiêu chuẩn VietGAP & Hữu cơ vi sinh 100%</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            {currentSlide.title}
          </h1>

          <p className="text-base sm:text-lg text-emerald-100/90 leading-relaxed max-w-2xl">
            {currentSlide.subtitle}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/san-pham"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm sm:text-base shadow-lg hover:shadow-emerald-500/25 transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
            >
              <span>Khám phá sản phẩm</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>

            <Link
              href="/gioi-thieu"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm sm:text-base border border-white/20 backdrop-blur-xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
            >
              <span>Về nông trại XFarm</span>
            </Link>
          </div>
        </div>

        {/* Carousel controls */}
        {slides.length > 1 && (
          <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrev}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Slide trước đó"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Indicators */}
            <div className="flex items-center gap-1.5 px-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2.5 rounded-full transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white ${
                    idx === currentIndex
                      ? 'w-8 bg-emerald-400'
                      : 'w-2.5 bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Chuyển đến slide ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Slide tiếp theo"
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
