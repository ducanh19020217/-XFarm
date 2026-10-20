'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ClipboardCheck, Edit3, Clock, QrCode, LogOut, Sprout, Wifi, WifiOff } from 'lucide-react';
import { Button, StatusBadge, ThemeToggle } from '@xfarm/ui';
import { apiFetch } from '@/lib/api';
import { useAdminUser } from '../admin-user-context';
import { RegisterServiceWorker } from './_components/register-sw';
import { SyncStatusBar } from './_components/sync-status-bar';

interface MobileTabItem {
  title: string;
  href: string;
  icon: React.ElementType;
  isActive: (pathname: string | null) => boolean;
}

const mobileTabs: MobileTabItem[] = [
  {
    title: 'Hôm nay',
    href: '/admin/m',
    icon: ClipboardCheck,
    isActive: (p) => p === '/admin/m' || p === '/admin/m/today',
  },
  {
    title: 'Ghi nhanh',
    href: '/admin/m/quick-log',
    icon: Edit3,
    isActive: (p) => Boolean(p?.startsWith('/admin/m/quick-log')),
  },
  {
    title: 'Chấm công',
    href: '/admin/m/attendance',
    icon: Clock,
    isActive: (p) => Boolean(p?.startsWith('/admin/m/attendance')),
  },
  {
    title: 'Quét QR',
    href: '/admin/m/scan',
    icon: QrCode,
    isActive: (p) => Boolean(p?.startsWith('/admin/m/scan')),
  },
];

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAdminUser();

  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-app text-fg flex flex-col justify-between">
      <RegisterServiceWorker />

      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-30 bg-surface border-b border-line shadow-xs">
        <div className="px-4 py-3">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-surface shadow-xs">
                <Sprout className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold text-fg">XFarm Công nhân</span>
                  {isOnline ? (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-ok-bg text-ok"
                      title="Đang có kết nối mạng"
                    >
                      <Wifi className="h-2.5 w-2.5" />
                      Online
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-warn-bg text-warn"
                      title="Chế độ ngoại tuyến"
                    >
                      <WifiOff className="h-2.5 w-2.5" />
                      Offline
                    </span>
                  )}
                </div>
                {user && (
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="font-medium truncate max-w-[140px]">{user.fullName}</span>
                    <span>•</span>
                    <StatusBadge status={user.role} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <ThemeToggle align="right" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-9 w-9 p-0 text-muted hover:text-crit hover:bg-crit-bg"
                title="Đăng xuất"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="max-w-md mx-auto">
          <SyncStatusBar />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 pb-24 overflow-y-auto">{children}</main>

      {/* Bottom Navigation Bar */}
      <nav
        aria-label="Thanh điều hướng PWA"
        className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-line shadow-lg"
      >
        <div className="max-w-md mx-auto grid grid-cols-4 h-16">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.isActive(pathname);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-1 transition-colors touch-manipulation select-none ${
                  active ? 'text-accent font-bold' : 'text-muted hover:text-fg font-medium'
                }`}
              >
                <div
                  className={`flex items-center justify-center h-8 w-12 rounded-full transition-colors ${
                    active ? 'bg-selected' : ''
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[11px] leading-none tracking-tight">{tab.title}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
