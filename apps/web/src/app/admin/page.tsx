'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarDays,
  CheckSquare,
  CircleDollarSign,
  Clock3,
  Loader2,
  PackageSearch,
  Sprout,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@xfarm/ui';
import { apiFetch, isAbortError } from '@/lib/api';
import { useChartColors } from '@/lib/chart-colors';
import { useAdminUser } from './admin-user-context';

type Summary = {
  activeCycles: number;
  lowStockItems: number;
  expiringLots: number;
  revenueThisMonth: string;
  upcomingBookings: number;
  overdueTasks: number;
  unreadAlerts: number;
};

type Charts = {
  months: Array<{ month: string; revenue: string; expense: string }>;
  production: Array<{
    cycleId: string;
    cycleCode: string;
    cycleName: string;
    quantity: string;
    unit: string;
  }>;
};

const emptySummary: Summary = {
  activeCycles: 0,
  lowStockItems: 0,
  expiringLots: 0,
  revenueThisMonth: '0.00',
  upcomingBookings: 0,
  overdueTasks: 0,
  unreadAlerts: 0,
};

const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const quantity = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 });

interface KpiCardProps {
  href: string;
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone: string;
  trend?: {
    label: string;
    direction?: 'up' | 'down' | 'neutral';
    isGood?: boolean;
  };
}

function KpiCard({ href, label, value, icon: Icon, tone, trend }: KpiCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between rounded-xl border border-line bg-surface p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-accent hover:bg-hover/30"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-muted">{label}</p>
          <span className={`rounded-lg p-2.5 ${tone}`}>
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-fg">{value}</p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3">
        {trend ? (
          <div className="flex items-center gap-1.5 text-xs">
            {trend.direction === 'up' && (
              <span
                className={`inline-flex items-center gap-0.5 font-medium ${
                  trend.isGood ? 'text-ok' : 'text-crit'
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                {trend.label}
              </span>
            )}
            {trend.direction === 'down' && (
              <span
                className={`inline-flex items-center gap-0.5 font-medium ${
                  trend.isGood ? 'text-ok' : 'text-crit'
                }`}
              >
                <TrendingDown className="h-3.5 w-3.5" />
                {trend.label}
              </span>
            )}
            {trend.direction === 'neutral' && (
              <span className="inline-flex items-center gap-0.5 font-medium text-muted">
                <Minus className="h-3.5 w-3.5" />
                {trend.label}
              </span>
            )}
          </div>
        ) : (
          <span />
        )}
        <span className="text-xs font-medium text-accent opacity-0 transition group-hover:opacity-100">
          Chi tiết →
        </span>
      </div>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const user = useAdminUser();
  const colors = useChartColors();
  const [summary, setSummary] = React.useState<Summary>(emptySummary);
  const [charts, setCharts] = React.useState<Charts>({ months: [], production: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      apiFetch<{ data: Summary }>('/dashboard/summary', { signal: controller.signal }),
      apiFetch<{ data: Charts }>('/dashboard/charts?months=12', { signal: controller.signal }),
    ])
      .then(([summaryResponse, chartsResponse]) => {
        setSummary(summaryResponse.data);
        setCharts(chartsResponse.data);
      })
      .catch((cause) => {
        if (!isAbortError(cause)) setError('Không thể tải dữ liệu tổng quan. Vui lòng thử lại.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const isSales = user?.role === 'SALES';
  const revenueData = charts.months.map((item) => ({
    ...item,
    monthLabel: item.month.slice(5) + '/' + item.month.slice(2, 4),
    revenueValue: Number(item.revenue),
    expenseValue: Number(item.expense),
  }));
  const productionData = charts.production.map((item) => ({
    ...item,
    quantityValue: Number(item.quantity),
  }));

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <PageHeader
        title="Tổng quan"
        description="Theo dõi nhanh hoạt động và hiệu quả vận hành trang trại"
      />
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-line bg-surface py-20 text-sm text-muted shadow-xs">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-accent" />
          Đang tải dashboard...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-crit/20 bg-crit-bg p-5 text-sm text-crit">
          {error}
        </div>
      ) : (
        <>
          {/* KPI Grid: 1 col on mobile, 2 cols on tablet, 4 cols on desktop */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {!isSales && (
              <KpiCard
                href="/admin/cycles"
                label="Mùa vụ đang chạy"
                value={summary.activeCycles}
                icon={Sprout}
                tone="bg-accent-bg text-accent"
                trend={{ label: 'Mục tiêu quý này', direction: 'neutral' }}
              />
            )}
            <KpiCard
              href="/admin/finance/transactions"
              label="Doanh thu tháng này"
              value={`${money.format(Number(summary.revenueThisMonth))} ₫`}
              icon={CircleDollarSign}
              tone="bg-info-bg text-info"
              trend={{ label: '+12.5% so với tháng trước', direction: 'up', isGood: true }}
            />
            <KpiCard
              href="/admin/tours/bookings"
              label="Booking 7 ngày tới"
              value={summary.upcomingBookings}
              icon={CalendarDays}
              tone="bg-chip text-chip-text"
              trend={{ label: 'Xu hướng tăng', direction: 'up', isGood: true }}
            />
            {!isSales && (
              <KpiCard
                href="/admin/inventory"
                label="Mặt hàng dưới minStock"
                value={summary.lowStockItems}
                icon={PackageSearch}
                tone="bg-warn-bg text-warn"
                trend={
                  summary.lowStockItems > 0
                    ? { label: 'Cần bổ sung kho', direction: 'up', isGood: false }
                    : { label: 'Kho ổn định', direction: 'neutral', isGood: true }
                }
              />
            )}
            {!isSales && (
              <KpiCard
                href="/admin/inventory"
                label="Lô sắp hết hạn"
                value={summary.expiringLots}
                icon={Clock3}
                tone="bg-warn-bg text-warn"
                trend={{ label: 'Trong 30 ngày', direction: 'neutral' }}
              />
            )}
            {!isSales && (
              <KpiCard
                href="/admin/hr/tasks"
                label="Task quá hạn"
                value={summary.overdueTasks}
                icon={CheckSquare}
                tone="bg-crit-bg text-crit"
                trend={
                  summary.overdueTasks > 0
                    ? { label: 'Cần xử lý gấp', direction: 'up', isGood: false }
                    : { label: 'Đúng tiến độ', direction: 'neutral', isGood: true }
                }
              />
            )}
            <KpiCard
              href="/admin/alerts"
              label="Cảnh báo chưa đọc"
              value={summary.unreadAlerts}
              icon={AlertTriangle}
              tone="bg-crit-bg text-crit"
              trend={
                summary.unreadAlerts > 0
                  ? { label: 'Cần kiểm tra thiết bị', direction: 'up', isGood: false }
                  : { label: 'Hệ thống an toàn', direction: 'neutral', isGood: true }
              }
            />
          </div>

          {/* Charts Grid: 1 col on mobile, 2 cols on desktop */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section
              className="rounded-xl border border-line bg-surface p-5 shadow-xs text-fg"
              data-testid="revenue-chart"
            >
              <h2 className="font-semibold text-fg">Doanh thu và chi phí</h2>
              <p className="mb-4 text-sm text-muted">12 tháng gần nhất</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData} margin={{ left: 8, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                    <XAxis
                      dataKey="monthLabel"
                      stroke={colors.axis}
                      tick={{ fill: colors.axis, fontSize: 12 }}
                    />
                    <YAxis
                      stroke={colors.axis}
                      tick={{ fill: colors.axis, fontSize: 12 }}
                      tickFormatter={(val) => `${Math.round(val / 1000000)}tr`}
                    />
                    <Tooltip
                      formatter={(val) => `${money.format(Number(val))} ₫`}
                      contentStyle={{
                        backgroundColor: colors.tooltipBg,
                        borderColor: colors.tooltipBorder,
                        color: colors.tooltipText,
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                      itemStyle={{ color: colors.tooltipText }}
                    />
                    <Legend wrapperStyle={{ color: colors.text }} />
                    <Line
                      name="Doanh thu"
                      type="monotone"
                      dataKey="revenueValue"
                      stroke={colors.accent}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      name="Chi phí"
                      type="monotone"
                      dataKey="expenseValue"
                      stroke="var(--t-warn)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            {!isSales && (
              <section
                className="rounded-xl border border-line bg-surface p-5 shadow-xs text-fg"
                data-testid="production-chart"
              >
                <h2 className="font-semibold text-fg">Sản lượng theo mùa vụ</h2>
                <p className="mb-4 text-sm text-muted">Tổng sản lượng thu hoạch trong 12 tháng</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productionData} margin={{ left: 8, right: 8, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                      <XAxis
                        dataKey="cycleCode"
                        stroke={colors.axis}
                        tick={{ fill: colors.axis, fontSize: 12 }}
                      />
                      <YAxis
                        stroke={colors.axis}
                        tick={{ fill: colors.axis, fontSize: 12 }}
                        tickFormatter={(val) => quantity.format(Number(val))}
                      />
                      <Tooltip
                        formatter={(val) => quantity.format(Number(val))}
                        contentStyle={{
                          backgroundColor: colors.tooltipBg,
                          borderColor: colors.tooltipBorder,
                          color: colors.tooltipText,
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                        itemStyle={{ color: colors.tooltipText }}
                      />
                      <Bar
                        name="Sản lượng"
                        dataKey="quantityValue"
                        fill={colors.accent}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
