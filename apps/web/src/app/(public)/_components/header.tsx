'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Sprout, ShoppingCart } from 'lucide-react';
import { ThemeToggle } from '@xfarm/ui';
import type { PublicSiteSettings } from '@/lib/public-api';
import { useCart } from '@/lib/cart';

interface HeaderProps {
  settings?: PublicSiteSettings;
}

const NAV_ITEMS = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Giới thiệu', href: '/gioi-thieu' },
  { label: 'Sản phẩm', href: '/san-pham' },
  { label: 'Tour trải nghiệm', href: '/tour' },
  { label: 'Tin tức', href: '/blog' },
  { label: 'Liên hệ', href: '/lien-he' },
];

export function Header({ settings }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { totalCount, isLoaded } = useCart();

  const farmName = settings?.['farm.name'] || 'XFarm – Nông trại sinh thái';

  return (
    <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur border-b border-line shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Farm Name */}
          <Link
            href="/"
            className="flex items-center gap-2.5 text-accent hover:opacity-90 transition-opacity focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent rounded-md"
          >
            <div className="w-10 h-10 rounded-xl bg-accent text-surface flex items-center justify-center shadow-xs">
              <Sprout className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg sm:text-xl tracking-tight text-fg leading-tight">
                {farmName}
              </span>
              <span className="text-xs text-accent font-medium hidden sm:inline-block">
                Nông nghiệp sinh thái tuần hoàn
              </span>
            </div>
          </Link>

          {/* Desktop Navigation & Cart */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            <nav aria-label="Menu chính" className="flex items-center gap-1 lg:gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent ${
                      isActive
                        ? 'bg-selected text-accent font-semibold'
                        : 'text-fg-2 hover:text-fg hover:bg-hover'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <ThemeToggle align="right" />

            <Link
              href="/gio-hang"
              data-testid="cart-header-btn"
              className="relative p-2 ml-1 rounded-lg text-fg-2 hover:text-fg hover:bg-hover transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent flex items-center justify-center"
              aria-label={`Giỏ hàng${totalCount > 0 ? ` (${totalCount} sản phẩm)` : ''}`}
            >
              <ShoppingCart
                className="w-5 h-5 sm:w-6 sm:h-6 text-fg-2 hover:text-fg"
                aria-hidden="true"
              />
              {isLoaded && totalCount > 0 && (
                <span
                  data-testid="cart-badge-count"
                  className="absolute -top-1 -right-1 bg-accent text-surface text-[11px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center shadow-xs"
                >
                  {totalCount > 99 ? '99+' : totalCount}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile Cart & menu toggle */}
          <div className="flex md:hidden items-center gap-1.5">
            <ThemeToggle align="right" />

            <Link
              href="/gio-hang"
              data-testid="cart-header-mobile-btn"
              className="relative p-2 rounded-lg text-fg-2 hover:text-fg hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent flex items-center justify-center"
              aria-label={`Giỏ hàng${totalCount > 0 ? ` (${totalCount} sản phẩm)` : ''}`}
            >
              <ShoppingCart className="w-6 h-6 text-fg-2" aria-hidden="true" />
              {isLoaded && totalCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-surface text-[10px] font-bold rounded-full min-w-4.5 h-4.5 px-1 flex items-center justify-center shadow-xs">
                  {totalCount > 99 ? '99+' : totalCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="p-2 rounded-lg text-fg-2 hover:text-fg hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
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
        <div className="md:hidden border-t border-line bg-surface px-4 pt-3 pb-5 space-y-1 shadow-lg">
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
                      ? 'bg-selected text-accent font-semibold'
                      : 'text-fg-2 hover:text-fg hover:bg-hover'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/gio-hang"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                pathname === '/gio-hang'
                  ? 'bg-selected text-accent font-semibold'
                  : 'text-fg-2 hover:text-fg hover:bg-hover'
              }`}
            >
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-fg-2" aria-hidden="true" />
                <span>Giỏ hàng</span>
              </span>
              {isLoaded && totalCount > 0 && (
                <span className="bg-accent text-surface text-xs font-bold rounded-full px-2 py-0.5">
                  {totalCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
