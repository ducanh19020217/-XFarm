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

function KpiCard({
  href,
  label,
  value,
  icon: Icon,
  tone,
}: {
  href: string;
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        <span className={`rounded-lg p-2.5 ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-xs font-medium text-emerald-600 opacity-0 transition group-hover:opacity-100">
        Xem chi tiết →
      </p>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const user = useAdminUser();
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
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-20 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Đang tải dashboard...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {!isSales && (
              <KpiCard
                href="/admin/cycles"
                label="Mùa vụ đang chạy"
                value={summary.activeCycles}
                icon={Sprout}
                tone="bg-emerald-100 text-emerald-600"
              />
            )}
            <KpiCard
              href="/admin/finance/transactions"
              label="Doanh thu tháng này"
              value={`${money.format(Number(summary.revenueThisMonth))} ₫`}
              icon={CircleDollarSign}
              tone="bg-blue-100 text-blue-600"
            />
            <KpiCard
              href="/admin/tours/bookings"
              label="Booking 7 ngày tới"
              value={summary.upcomingBookings}
              icon={CalendarDays}
              tone="bg-violet-100 text-violet-600"
            />
            {!isSales && (
              <KpiCard
                href="/admin/inventory"
                label="Mặt hàng dưới minStock"
                value={summary.lowStockItems}
                icon={PackageSearch}
                tone="bg-amber-100 text-amber-600"
              />
            )}
            {!isSales && (
              <KpiCard
                href="/admin/inventory"
                label="Lô sắp hết hạn"
                value={summary.expiringLots}
                icon={Clock3}
                tone="bg-orange-100 text-orange-600"
              />
            )}
            {!isSales && (
              <KpiCard
                href="/admin/hr/tasks"
                label="Task quá hạn"
                value={summary.overdueTasks}
                icon={CheckSquare}
                tone="bg-red-100 text-red-600"
              />
            )}
            <KpiCard
              href="/admin/alerts"
              label="Cảnh báo chưa đọc"
              value={summary.unreadAlerts}
              icon={AlertTriangle}
              tone="bg-pink-100 text-pink-600"
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <section
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              data-testid="revenue-chart"
            >
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                Doanh thu và chi phí
              </h2>
              <p className="mb-4 text-sm text-slate-500">12 tháng gần nhất</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData} margin={{ left: 8, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${Math.round(value / 1000000)}tr`}
                    />
                    <Tooltip formatter={(value) => `${money.format(Number(value))} ₫`} />
                    <Legend />
                    <Line
                      name="Doanh thu"
                      type="monotone"
                      dataKey="revenueValue"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      name="Chi phí"
                      type="monotone"
                      dataKey="expenseValue"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
            {!isSales && (
              <section
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                data-testid="production-chart"
              >
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                  Sản lượng theo mùa vụ
                </h2>
                <p className="mb-4 text-sm text-slate-500">
                  Tổng sản lượng thu hoạch trong 12 tháng
                </p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productionData} margin={{ left: 8, right: 8, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="cycleCode" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => quantity.format(Number(value))}
                      />
                      <Tooltip formatter={(value) => quantity.format(Number(value))} />
                      <Bar
                        name="Sản lượng"
                        dataKey="quantityValue"
                        fill="#10b981"
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
