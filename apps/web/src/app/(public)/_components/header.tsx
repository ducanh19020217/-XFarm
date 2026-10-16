'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Sprout } from 'lucide-react';
import type { PublicSiteSettings } from '@/lib/public-api';

interface HeaderProps {
  settings?: PublicSiteSettings;
}

const NAV_ITEMS = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Giới thiệu', href: '/gioi-thieu' },
  { label: 'Sản phẩm', href: '/san-pham' },
  { label: 'Tin tức', href: '/blog' },
  { label: 'Liên hệ', href: '/lien-he' },
];

export function Header({ settings }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const farmName = settings?.['farm.name'] || 'XFarm – Nông trại sinh thái';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-emerald-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Farm Name */}
          <Link
            href="/"
            className="flex items-center gap-2.5 text-emerald-800 hover:text-emerald-700 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-md"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Sprout className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-900 leading-tight">
                {farmName}
              </span>
              <span className="text-xs text-emerald-700 font-medium hidden sm:inline-block">
                Nông nghiệp sinh thái tuần hoàn
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav aria-label="Menu chính" className="hidden md:flex items-center gap-1 lg:gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-700 hover:text-emerald-700 hover:bg-slate-100/80'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="p-2 rounded-lg text-slate-700 hover:text-emerald-700 hover:bg-slate-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-emerald-100 bg-white px-4 pt-3 pb-5 space-y-1 shadow-lg">
          <nav aria-label="Menu di động" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-700 hover:text-emerald-700 hover:bg-slate-50'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
