'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sprout,
  Users,
  LayoutDashboard,
  MapPin,
  ClipboardList,
  PawPrint,
  Calendar,
  Boxes,
  QrCode,
  ShoppingCart,
  DollarSign,
  Compass,
  Briefcase,
  Cpu,
  LogOut,
  Menu,
  X,
  Bell,
  Smartphone,
} from 'lucide-react';
import { Button, StatusBadge, Badge } from '@xfarm/ui';
import { apiFetch, isAbortError } from '@/lib/api';
import { NotificationBell } from '@/components/alerts/notification-bell';
import { AdminUserProvider, type AdminUser } from './admin-user-context';
import { RegisterServiceWorker } from './m/_components/register-sw';

type UserProfile = AdminUser;

interface SubNavItem {
  title: string;
  href: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  isReady?: boolean;
  children?: SubNavItem[];
}

const navItems: NavItem[] = [
  {
    title: 'Tổng quan',
    href: '/admin',
    icon: LayoutDashboard,
    isReady: true,
  },
  {
    title: 'Người dùng & Phân quyền',
    href: '/admin/users',
    icon: Users,
    isReady: true,
  },
  {
    title: 'Khu/lô',
    href: '/admin/areas',
    icon: MapPin,
    isReady: true,
  },
  {
    title: 'Mùa vụ',
    href: '/admin/cycles',
    icon: Sprout,
    isReady: true,
  },
  {
    title: 'Nhật ký',
    href: '/admin/activities',
    icon: ClipboardList,
    isReady: true,
  },
  {
    title: 'Vật nuôi',
    href: '/admin/animals',
    icon: PawPrint,
    isReady: true,
  },
  {
    title: 'Lịch',
    href: '/admin/calendar',
    icon: Calendar,
    isReady: true,
  },
  { title: 'Kho', href: '/admin/inventory', icon: Boxes, isReady: true },
  { title: 'Mua hàng', href: '/admin/purchase-orders', icon: ShoppingCart, isReady: true },
  { title: 'Cảnh báo', href: '/admin/alerts', icon: Bell, isReady: true },
  {
    title: 'Thu hoạch & Truy xuất',
    href: '/admin/harvest-lots',
    icon: QrCode,
    isReady: true,
  },
  { title: 'Website · Sản phẩm', href: '/admin/cms/products', icon: Compass, isReady: true },
  { title: 'Website · Bài viết', href: '/admin/cms/posts', icon: ClipboardList, isReady: true },
  { title: 'Website · Trang', href: '/admin/cms/pages', icon: ClipboardList, isReady: true },
  { title: 'Website · Cài đặt', href: '/admin/cms/settings', icon: ClipboardList, isReady: true },
  {
    title: 'Bán hàng & CRM',
    href: '/admin/sales',
    icon: ShoppingCart,
    isReady: false,
  },
  {
    title: 'Tài chính & Thu chi',
    href: '/admin/finance',
    icon: DollarSign,
    isReady: false,
  },
  {
    title: 'Du lịch trải nghiệm',
    href: '/admin/tours',
    icon: Compass,
    isReady: false,
  },
  {
    title: 'Nhân sự & Chấm công',
    href: '/admin/hr/employees',
    icon: Briefcase,
    isReady: true,
    children: [
      { title: 'Nhân viên', href: '/admin/hr/employees' },
      { title: 'Giao việc', href: '/admin/hr/tasks' },
      { title: 'Chấm công', href: '/admin/hr/attendance' },
      { title: 'Bảng lương', href: '/admin/hr/payroll' },
    ],
  },
  {
    title: 'Ứng dụng công nhân',
    href: '/admin/m',
    icon: Smartphone,
    isReady: true,
  },
  {
    title: 'Thiết bị & IoT',
    href: '/admin/iot',
    icon: Cpu,
    isReady: false,
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      try {
        const raw = localStorage.getItem('xfarm_cached_user');
        if (raw && isMounted) {
          setUser(JSON.parse(raw));
          return;
        }
      } catch {
        /* ignore */
      }
      if (pathname?.startsWith('/admin/m')) {
        return;
      }
    }

    apiFetch<{ data: UserProfile }>('/auth/me', { signal: controller.signal })
      .then((res) => {
        if (isMounted) {
          setUser(res.data);
          try {
            localStorage.setItem('xfarm_cached_user', JSON.stringify(res.data));
          } catch {
            /* ignore */
          }
        }
      })
      .catch((error) => {
        if (isAbortError(error)) return;
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          try {
            const raw = localStorage.getItem('xfarm_cached_user');
            if (raw && isMounted) {
              setUser(JSON.parse(raw));
              return;
            }
          } catch {
            /* ignore */
          }
          if (pathname?.startsWith('/admin/m')) {
            return;
          }
        }
        // If auth/me fails, redirect to login
        router.push('/login');
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [router, pathname]);

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

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between py-4">
      <div className="space-y-6 px-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
            <Sprout className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              XFarm ERP
            </span>
            <span className="block text-xs text-slate-400">Nông trại sinh thái</span>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isChildActive = item.children?.some(
              (c) => pathname === c.href || pathname?.startsWith(`${c.href}/`),
            );
            const isActive =
              pathname === item.href ||
              pathname?.startsWith(`${item.href}/`) ||
              Boolean(isChildActive);

            if (!item.isReady) {
              return (
                <div
                  key={item.href}
                  className="flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-400 cursor-not-allowed opacity-60 rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Sắp có
                  </Badge>
                </div>
              );
            }

            return (
              <div key={item.href} className="space-y-1">
                <Link
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-semibold dark:bg-emerald-950/50 dark:text-emerald-400'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                  <span>{item.title}</span>
                </Link>
                {item.children && (
                  <div className="ml-7 space-y-0.5 border-l border-slate-200 pl-2 dark:border-slate-800">
                    {item.children.map((sub) => {
                      const isSubActive =
                        pathname === sub.href || pathname?.startsWith(`${sub.href}/`);
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`block px-2 py-1 text-xs font-medium rounded transition-colors ${
                            isSubActive
                              ? 'text-emerald-700 font-semibold bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                          }`}
                        >
                          {sub.title}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {user && (
        <div className="border-t border-slate-200 px-4 pt-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {user.fullName}
              </p>
              <div className="mt-1">
                <StatusBadge status={user.role} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const isMobileApp = pathname?.startsWith('/admin/m');

  if (isMobileApp) {
    return (
      <AdminUserProvider user={user}>
        <RegisterServiceWorker />
        {children}
      </AdminUserProvider>
    );
  }

  return (
    <AdminUserProvider user={user}>
      <RegisterServiceWorker />
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 border-r border-slate-200 bg-white md:block dark:border-slate-800 dark:bg-slate-950 print:hidden">
          <SidebarContent />
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden print:hidden">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-50 w-72 bg-white dark:bg-slate-950">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute right-4 top-4 rounded-md p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
          {/* Top Header */}
          <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6 dark:border-slate-800 dark:bg-slate-950 print:hidden">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />
              {user && (
                <div className="hidden sm:flex sm:items-center sm:gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span>
                    Xin chào,{' '}
                    <strong className="text-slate-900 dark:text-slate-100">{user.fullName}</strong>
                  </span>
                  <StatusBadge status={user.role} />
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                Đăng xuất
              </Button>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 print:p-0 print:overflow-visible">
            <div className="mx-auto max-w-7xl print:max-w-none">{children}</div>
          </main>
        </div>
      </div>
    </AdminUserProvider>
  );
}
