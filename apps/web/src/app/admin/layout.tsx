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
  Wrench,
  LineChart,
  LogOut,
  Menu,
  X,
  Bell,
  Smartphone,
  Ticket,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button, StatusBadge, Badge, ThemeToggle } from '@xfarm/ui';
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
  exact?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Tổng quan',
    items: [
      {
        title: 'Tổng quan',
        href: '/admin',
        icon: LayoutDashboard,
        isReady: true,
        exact: true,
      },
    ],
  },
  {
    title: 'Quản lý nông trại',
    items: [
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
      {
        title: 'Thu hoạch & Truy xuất',
        href: '/admin/harvest-lots',
        icon: QrCode,
        isReady: true,
      },
    ],
  },
  {
    title: 'Kho & Mua hàng',
    items: [
      { title: 'Kho', href: '/admin/inventory', icon: Boxes, isReady: true },
      { title: 'Mua hàng', href: '/admin/purchase-orders', icon: ShoppingCart, isReady: true },
      { title: 'Cảnh báo', href: '/admin/alerts', icon: Bell, isReady: true },
    ],
  },
  {
    title: 'Bán hàng & Website',
    items: [
      {
        title: 'Bán hàng',
        href: '/admin/sales/orders',
        icon: ShoppingCart,
        isReady: true,
      },
      {
        title: 'Khách hàng',
        href: '/admin/sales/customers',
        icon: Users,
        isReady: true,
      },
      { title: 'Website · Sản phẩm', href: '/admin/cms/products', icon: Compass, isReady: true },
      { title: 'Website · Bài viết', href: '/admin/cms/posts', icon: ClipboardList, isReady: true },
      { title: 'Website · Trang', href: '/admin/cms/pages', icon: ClipboardList, isReady: true },
      {
        title: 'Website · Cài đặt',
        href: '/admin/cms/settings',
        icon: ClipboardList,
        isReady: true,
      },
    ],
  },
  {
    title: 'Tài chính & Du lịch',
    items: [
      {
        title: 'Tài chính',
        href: '/admin/finance/transactions',
        icon: DollarSign,
        isReady: true,
      },
      {
        title: 'Danh mục tài chính',
        href: '/admin/finance/categories',
        icon: DollarSign,
        isReady: true,
      },
      {
        title: 'Công nợ',
        href: '/admin/finance/receivables',
        icon: DollarSign,
        isReady: true,
      },
      {
        title: 'Báo cáo tài chính',
        href: '/admin/finance/reports',
        icon: DollarSign,
        isReady: true,
      },
      {
        title: 'Du lịch',
        href: '/admin/tours',
        icon: Compass,
        isReady: true,
        exact: true,
      },
      {
        title: 'Đặt chỗ tour',
        href: '/admin/tours/bookings',
        icon: Ticket,
        isReady: true,
      },
    ],
  },
  {
    title: 'Nhân sự & Thiết bị',
    items: [
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
        title: 'Thiết bị',
        href: '/admin/equipment',
        icon: Wrench,
        isReady: true,
      },
      {
        title: 'IoT & Cảm biến',
        href: '/admin/iot/sensors',
        icon: Cpu,
        isReady: true,
      },
      {
        title: 'Biểu đồ IoT',
        href: '/admin/iot/charts',
        icon: LineChart,
        isReady: true,
      },
      {
        title: 'Người dùng & Phân quyền',
        href: '/admin/users',
        icon: Users,
        isReady: true,
      },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('xfarm_sidebar_collapsed');
      if (stored === 'true') {
        setCollapsed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('xfarm_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

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

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const isCollapsed = !isMobile && collapsed;

    return (
      <div className="flex h-full flex-col justify-between py-3">
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Brand header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-line pb-3">
            <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-surface shadow-xs">
                <Sprout className="h-5 w-5" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <span className="text-base font-bold tracking-tight text-fg truncate block">
                    XFarm ERP
                  </span>
                  <span className="block text-xs text-muted truncate">Nông trại sinh thái</span>
                </div>
              )}
            </Link>
            {!isMobile && (
              <button
                type="button"
                onClick={handleToggleCollapse}
                title={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
                className="hidden md:flex h-7 w-7 items-center justify-center rounded-md text-muted hover:text-fg hover:bg-hover transition-colors"
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 space-y-4 px-2 py-3 overflow-y-auto">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                {!isCollapsed ? (
                  <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-muted uppercase tracking-wider">
                    {group.title}
                  </div>
                ) : (
                  <div className="my-1.5 h-px bg-line mx-2" />
                )}

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isChildActive = item.children?.some(
                      (c) => pathname === c.href || pathname?.startsWith(`${c.href}/`),
                    );
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname === item.href ||
                        pathname?.startsWith(`${item.href}/`) ||
                        Boolean(isChildActive);

                    if (!item.isReady) {
                      return (
                        <div
                          key={item.href}
                          title={item.title}
                          className="flex items-center justify-between px-2.5 py-1.5 text-xs font-medium text-muted cursor-not-allowed opacity-50 rounded-lg"
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4 shrink-0" />
                            {!isCollapsed && <span>{item.title}</span>}
                          </div>
                          {!isCollapsed && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              Sắp có
                            </Badge>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div key={item.href} className="space-y-0.5">
                        <Link
                          href={item.href}
                          title={isCollapsed ? item.title : undefined}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`group relative flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            isActive
                              ? 'bg-selected text-accent font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r before:bg-accent'
                              : 'text-fg-2 hover:bg-hover hover:text-fg'
                          } ${isCollapsed ? 'justify-center px-0' : ''}`}
                        >
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              isActive ? 'text-accent' : 'text-muted group-hover:text-fg'
                            }`}
                          />
                          {!isCollapsed && <span className="truncate">{item.title}</span>}
                        </Link>

                        {!isCollapsed && item.children && (
                          <div className="ml-6 space-y-0.5 border-l border-line pl-2">
                            {item.children.map((sub) => {
                              const isSubActive =
                                pathname === sub.href || pathname?.startsWith(`${sub.href}/`);
                              return (
                                <Link
                                  key={sub.href}
                                  href={sub.href}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className={`block px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                                    isSubActive
                                      ? 'text-accent font-semibold bg-selected'
                                      : 'text-muted hover:text-fg hover:bg-hover'
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
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* User footer */}
        {user && (
          <div className="border-t border-line px-3 pt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                {!isCollapsed ? (
                  <>
                    <p className="truncate text-xs font-semibold text-fg">{user.fullName}</p>
                    <div className="mt-1">
                      <StatusBadge status={user.role} />
                    </div>
                  </>
                ) : (
                  <div className="flex justify-center" title={`${user.fullName} (${user.role})`}>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-bg text-accent text-xs font-bold">
                      {user.fullName?.charAt(0) || 'U'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

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
      <div className="flex min-h-screen bg-app text-fg">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden md:block shrink-0 border-r border-line bg-surface transition-all duration-200 print:hidden ${
            collapsed ? 'w-16' : 'w-64'
          }`}
        >
          <SidebarContent />
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden print:hidden">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-50 w-72 bg-surface text-fg shadow-xl">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Đóng menu"
                className="absolute right-3 top-3 rounded-lg p-1.5 text-muted hover:bg-hover hover:text-fg"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent isMobile />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
          {/* Top Header */}
          <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-4 md:px-6 print:hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Mở menu"
                className="rounded-lg p-2 text-fg hover:bg-hover md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Search placeholder */}
              <div className="relative max-w-xs w-64 hidden sm:block">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm kiếm nhanh..."
                  disabled
                  aria-label="Tìm kiếm"
                  className="h-9 w-full rounded-lg border border-line bg-surface-2 pl-8 pr-3 text-xs text-fg placeholder:text-muted cursor-not-allowed opacity-80"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <NotificationBell />
              <ThemeToggle align="right" />
              {user && (
                <div className="hidden sm:flex sm:items-center sm:gap-2 text-xs text-muted">
                  <span>
                    Xin chào, <strong className="text-fg">{user.fullName}</strong>
                  </span>
                  <StatusBadge status={user.role} />
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-crit hover:bg-crit-bg hover:text-crit border-line"
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                Đăng xuất
              </Button>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-app text-fg print:p-0 print:overflow-visible">
            <div className="mx-auto max-w-7xl print:max-w-none">{children}</div>
          </main>
        </div>
      </div>
    </AdminUserProvider>
  );
}
