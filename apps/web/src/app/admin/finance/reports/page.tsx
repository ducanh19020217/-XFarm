'use client';

import * as React from 'react';
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import {
  Calendar,
  ChevronRight,
  DollarSign,
  Eye,
  FileSpreadsheet,
  Layers,
  Loader2,
  Package,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  PageHeader,
  Select,
  StatusBadge,
  Toast,
  useToast,
  type ColumnDef,
} from '@xfarm/ui';
import { useAdminUser } from '../../admin-user-context';
import { apiFetch, ApiError } from '@/lib/api';

interface MonthlyCashflowItem {
  month: number;
  income: string;
  expense: string;
  net: string;
}

interface CostDetailItem {
  type: 'MATERIAL' | 'TRANSACTION';
  activityId?: string;
  transactionId?: string;
  date: string;
  itemId?: string;
  description: string;
  quantity?: string;
  unit?: string;
  unitCost?: string;
  amount: string;
}

interface RevenueDetailItem {
  type: 'SALE';
  salesOrderId: string;
  salesOrderCode: string;
  stockLotId?: string;
  harvestLotId?: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  amount: string;
}

interface CycleReportItem {
  id: string;
  code: string;
  name: string;
  status: string;
  area?: { id: string; code: string; name: string };
  outputQuantity: string;
  materialCost: string;
  expenseCost: string;
  laborCost: string;
  totalCost: string;
  revenue: string;
  profit: string;
  costPerUnit: string;
  costDetails: CostDetailItem[];
  revenueDetails: RevenueDetailItem[];
}

interface ProductReportItem {
  productId: string | null;
  productName: string;
  slug: string | null;
  itemId: string;
  unit: string;
  quantity: string;
  revenue: string;
}

function formatVND(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0 ₫';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (Number.isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

export default function FinanceReportsPage() {
  const user = useAdminUser();
  const { message, showToast, closeToast } = useToast();

  const [activeTab, setActiveTab] = React.useState<'cashflow' | 'cycles' | 'products'>('cashflow');

  // Tab 1: Cashflow state
  const currentYear = new Date().getFullYear();
  const [cashflowYear, setCashflowYear] = React.useState<number>(currentYear);
  const [cashflowData, setCashflowData] = React.useState<MonthlyCashflowItem[]>([]);
  const [cashflowLoading, setCashflowLoading] = React.useState(false);

  // Tab 2: Cycles cost state
  const [cyclesStatus, setCyclesStatus] = React.useState<string>('ALL');
  const [cyclesData, setCyclesData] = React.useState<CycleReportItem[]>([]);
  const [cyclesLoading, setCyclesLoading] = React.useState(false);
  const [selectedCycle, setSelectedCycle] = React.useState<CycleReportItem | null>(null);

  // Tab 3: Top products state
  const [productFrom, setProductFrom] = React.useState<string>('');
  const [productTo, setProductTo] = React.useState<string>('');
  const [productsData, setProductsData] = React.useState<ProductReportItem[]>([]);
  const [productsLoading, setProductsLoading] = React.useState(false);

  // SALES and WORKER cannot view reports
  const isDenied = user?.role === 'SALES' || user?.role === 'WORKER';

  // 1. Fetch Cashflow
  const fetchCashflow = React.useCallback(async (year: number) => {
    setCashflowLoading(true);
    try {
      const res = await apiFetch<{ data: MonthlyCashflowItem[]; year: number }>(
        `/reports/cashflow?year=${year}`,
      );
      setCashflowData(res.data || []);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tải báo cáo thu chi');
    } finally {
      setCashflowLoading(false);
    }
  }, [showToast]);

  // 2. Fetch Cycles
  const fetchCycles = React.useCallback(async (status: string) => {
    setCyclesLoading(true);
    try {
      const query = status !== 'ALL' ? `?status=${status}` : '';
      const res = await apiFetch<{ data: CycleReportItem[]; total: number }>(
        `/reports/cycles${query}`,
      );
      setCyclesData(res.data || []);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tải báo cáo mùa vụ');
    } finally {
      setCyclesLoading(false);
    }
  }, [showToast]);

  // 3. Fetch Top Products
  const fetchProducts = React.useCallback(async (from?: string, to?: string) => {
    setProductsLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await apiFetch<{ data: ProductReportItem[]; total: number; limit: number }>(
        `/reports/products?${params.toString()}`,
      );
      setProductsData(res.data || []);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tải báo cáo sản phẩm');
    } finally {
      setProductsLoading(false);
    }
  }, [showToast]);

  React.useEffect(() => {
    if (isDenied) return;
    if (activeTab === 'cashflow') {
      void fetchCashflow(cashflowYear);
    } else if (activeTab === 'cycles') {
      void fetchCycles(cyclesStatus);
    } else if (activeTab === 'products') {
      void fetchProducts(productFrom, productTo);
    }
  }, [activeTab, cashflowYear, cyclesStatus, productFrom, productTo, isDenied, fetchCashflow, fetchCycles, fetchProducts]);

  if (isDenied) {
    return (
      <div className="space-y-6">
        <PageHeader title="Báo cáo tài chính" description="Phân hệ báo cáo tài chính" />
        <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-12 text-center dark:border-rose-900 dark:bg-rose-950/20">
          <ShieldAlert className="mx-auto h-12 w-12 text-rose-600 dark:text-rose-400 mb-3" />
          <h2 className="text-lg font-bold text-rose-800 dark:text-rose-300">
            Không có quyền truy cập
          </h2>
          <p className="mt-1 text-sm text-rose-600 dark:text-rose-400 max-w-md mx-auto">
            Báo cáo tài chính, giá thành và lãi lỗ mùa vụ bị ẩn đối với nhân viên bán hàng (SALES) và công nhân (WORKER).
          </p>
        </div>
      </div>
    );
  }

  // Transform Cashflow for Chart
  const chartData = cashflowData.map((item) => ({
    name: `T${item.month}`,
    month: item.month,
    income: Number(item.income) || 0,
    expense: Number(item.expense) || 0,
    net: Number(item.net) || 0,
  }));

  const totalYearIncome = chartData.reduce((sum, d) => sum + d.income, 0);
  const totalYearExpense = chartData.reduce((sum, d) => sum + d.expense, 0);
  const totalYearNet = totalYearIncome - totalYearExpense;

  const cycleColumns: ColumnDef<CycleReportItem>[] = [
    {
      header: 'Mùa vụ',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div>
          <button
            type="button"
            onClick={() => setSelectedCycle(row.original)}
            className="font-medium text-emerald-600 hover:underline dark:text-emerald-400 text-left"
          >
            {row.original.name}
          </button>
          <div className="font-mono text-xs text-slate-400">{row.original.code}</div>
        </div>
      ),
    },
    {
      header: 'Khu/lô',
      accessorKey: 'area',
      cell: ({ row }) => (
        <span className="text-slate-700 dark:text-slate-300">
          {row.original.area?.name || '-'}
        </span>
      ),
    },
    {
      header: 'Trạng thái',
      accessorKey: 'status',
      cell: ({ row }) => <StatusBadge status={row.original.status as any} />,
    },
    {
      header: 'Sản lượng',
      accessorKey: 'outputQuantity',
      cell: ({ row }) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {row.original.outputQuantity}
        </span>
      ),
    },
    {
      header: 'Chi phí vật tư',
      accessorKey: 'materialCost',
      cell: ({ row }) => (
        <span className="text-slate-700 dark:text-slate-300">
          {formatVND(row.original.materialCost)}
        </span>
      ),
    },
    {
      header: 'Chi phí khác',
      accessorKey: 'expenseCost',
      cell: ({ row }) => (
        <span className="text-slate-700 dark:text-slate-300">
          {formatVND(row.original.expenseCost)}
        </span>
      ),
    },
    {
      header: 'Tổng chi phí',
      accessorKey: 'totalCost',
      cell: ({ row }) => (
        <span className="font-bold text-rose-700 dark:text-rose-400">
          {formatVND(row.original.totalCost)}
        </span>
      ),
    },
    {
      header: 'Doanh thu',
      accessorKey: 'revenue',
      cell: ({ row }) => (
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
          {formatVND(row.original.revenue)}
        </span>
      ),
    },
    {
      header: 'Lãi / Lỗ',
      accessorKey: 'profit',
      cell: ({ row }) => {
        const val = Number(row.original.profit) || 0;
        return (
          <span
            className={`font-bold ${
              val >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {val >= 0 ? '+' : ''}
            {formatVND(val)}
          </span>
        );
      },
    },
    {
      header: 'Giá thành/ĐV',
      accessorKey: 'costPerUnit',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400 text-xs font-mono">
          {formatVND(row.original.costPerUnit)}
        </span>
      ),
    },
    {
      header: 'Thao tác',
      id: 'actions',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSelectedCycle(row.original)}
          className="text-xs h-7 px-2"
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          Chi tiết
        </Button>
      ),
    },
  ];

  const totalProductRevenue = productsData.reduce(
    (sum, p) => sum + (Number(p.revenue) || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} />

      <PageHeader
        title="Báo cáo tài chính"
        description="Báo cáo dòng tiền thu chi 12 tháng, giá thành & lãi lỗ mùa vụ và top doanh thu sản phẩm"
      />

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('cashflow')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === 'cashflow'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Thu chi 12 tháng
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cycles')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === 'cycles'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          Giá thành &amp; Lãi lỗ mùa vụ
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === 'products'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Trophy className="h-4 w-4" />
          Doanh thu sản phẩm (Top 10)
        </button>
      </div>

      {/* TAB 1: THU CHI 12 THÁNG */}
      {activeTab === 'cashflow' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
              Biểu đồ dòng tiền thu chi năm {cashflowYear}
            </h3>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Chọn năm:</span>
              <select
                aria-label="Chọn năm báo cáo"
                value={cashflowYear}
                onChange={(e) => setCashflowYear(Number(e.target.value))}
                className="flex h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-slate-800"
              >
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((yr) => (
                  <option key={yr} value={yr}>
                    Năm {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Yearly summary KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border bg-white p-4 shadow-sm border-emerald-200 bg-emerald-50/20 dark:border-emerald-900 dark:bg-emerald-950/20">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Tổng thu cả năm
              </span>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-2">
                {formatVND(totalYearIncome)}
              </p>
            </div>

            <div className="rounded-lg border bg-white p-4 shadow-sm border-rose-200 bg-rose-50/20 dark:border-rose-900 dark:bg-rose-950/20">
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                Tổng chi cả năm
              </span>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-2">
                {formatVND(totalYearExpense)}
              </p>
            </div>

            <div className="rounded-lg border bg-white p-4 shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Lãi thuần năm {cashflowYear}
              </span>
              <p
                className={`text-2xl font-bold mt-2 ${
                  totalYearNet >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatVND(totalYearNet)}
              </p>
            </div>
          </div>

          {/* Recharts BarChart thu/chi + line chênh lệch */}
          <div className="rounded-lg border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
              Biểu đồ so sánh Thu - Chi và Chênh lệch theo tháng
            </h4>
            {cashflowLoading ? (
              <div className="flex h-72 items-center justify-center text-slate-400">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Đang tải dữ liệu biểu đồ...
              </div>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickFormatter={(val) => {
                        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                        if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                        return `${val}`;
                      }}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        formatVND(value),
                        name === 'income' ? 'Khoản thu' : name === 'expense' ? 'Khoản chi' : 'Chênh lệch',
                      ]}
                      labelFormatter={(label) => `Tháng ${label.replace('T', '')} năm ${cashflowYear}`}
                    />
                    <Legend
                      formatter={(val) =>
                        val === 'income' ? 'Khoản thu' : val === 'expense' ? 'Khoản chi' : 'Chênh lệch'
                      }
                    />
                    <Bar dataKey="income" name="income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="expense" name="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Line
                      type="monotone"
                      dataKey="net"
                      name="net"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#6366f1' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Bảng kê 12 tháng */}
          <div className="rounded-lg border bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <div className="px-4 py-3 border-b bg-slate-50 font-semibold text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
              Bảng chi tiết 12 tháng
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50/50 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/30">
                  <tr>
                    <th className="py-2.5 px-3">Tháng</th>
                    <th className="py-2.5 px-3 text-right">Tổng thu</th>
                    <th className="py-2.5 px-3 text-right">Tổng chi</th>
                    <th className="py-2.5 px-3 text-right">Chênh lệch thuần</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cashflowData.map((row) => {
                    const netVal = Number(row.net) || 0;
                    return (
                      <tr key={row.month} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          Tháng {row.month}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatVND(row.income)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-rose-700 dark:text-rose-400">
                          {formatVND(row.expense)}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold ${
                            netVal >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {netVal >= 0 ? '+' : ''}
                          {formatVND(netVal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GIÁ THÀNH & LÃI LỖ THEO MÙA VỤ */}
      {activeTab === 'cycles' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                Báo cáo giá thành &amp; Lãi lỗ theo mùa vụ
              </h3>
              <p className="text-xs text-slate-500">
                Nhấp vào từng dòng để xem chi tiết chi phí vật tư, chi phí giao dịch và doanh thu
              </p>
            </div>

            <div className="w-48">
              <select
                aria-label="Lọc trạng thái mùa vụ"
                value={cyclesStatus}
                onChange={(e) => setCyclesStatus(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-slate-800"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PLANNING">Kế hoạch</option>
                <option value="IN_PROGRESS">Đang trồng/nuôi</option>
                <option value="HARVESTING">Đang thu hoạch</option>
                <option value="COMPLETED">Đã hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <DataTable
              columns={cycleColumns}
              data={cyclesData}
              loading={cyclesLoading}
              emptyText="Không có mùa vụ nào phù hợp"
            />
          </div>
        </div>
      )}

      {/* TAB 3: TOP 10 SẢN PHẨM DOANH THU */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Top 10 sản phẩm đạt doanh thu cao nhất
              </h3>
              <p className="text-xs text-slate-500">
                Thống kê các sản phẩm nông sản và hàng hóa đóng góp nhiều nhất vào doanh thu
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                aria-label="Từ ngày"
                value={productFrom}
                onChange={(e) => setProductFrom(e.target.value)}
                className="w-36"
              />
              <span className="text-xs text-slate-400">đến</span>
              <Input
                type="date"
                aria-label="Đến ngày"
                value={productTo}
                onChange={(e) => setProductTo(e.target.value)}
                className="w-36"
              />
            </div>
          </div>

          {productsLoading ? (
            <div className="flex h-44 items-center justify-center text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Đang tính toán doanh thu sản phẩm...
            </div>
          ) : productsData.length === 0 ? (
            <div className="rounded-lg border p-12 text-center text-slate-400">
              Chưa có dữ liệu bán hàng cho khoảng thời gian này
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productsData.map((prod, index) => {
                const rev = Number(prod.revenue) || 0;
                const percent =
                  totalProductRevenue > 0
                    ? ((rev / totalProductRevenue) * 100).toFixed(1)
                    : '0';

                return (
                  <div
                    key={`${prod.itemId}-${index}`}
                    className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-sm ${
                          index === 0
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                            : index === 1
                              ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              : index === 2
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        #{index + 1}
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                          {prod.productName}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Đã bán: <span className="font-semibold text-slate-700 dark:text-slate-300">{prod.quantity} {prod.unit}</span> · Chiếm {percent}%
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 block">
                        {formatVND(prod.revenue)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Dialog Chi tiết Giá thành & Doanh thu mùa vụ */}
      <Dialog
        open={Boolean(selectedCycle)}
        onOpenChange={(open) => !open && setSelectedCycle(null)}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Chi tiết giá thành &amp; Lãi lỗ mùa vụ: {selectedCycle?.name}
            </DialogTitle>
            <DialogDescription>
              Mã vụ: {selectedCycle?.code} · Khu vực: {selectedCycle?.area?.name || '-'}
            </DialogDescription>
          </DialogHeader>

          {selectedCycle && (
            <div className="space-y-6">
              {/* Summary 4 boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                  <span className="text-xs text-slate-500 block">Sản lượng</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {selectedCycle.outputQuantity}
                  </p>
                </div>

                <div className="rounded-lg bg-rose-50 p-3 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900">
                  <span className="text-xs text-rose-700 dark:text-rose-400 block">Tổng chi phí</span>
                  <p className="font-bold text-rose-700 dark:text-rose-400 mt-1">
                    {formatVND(selectedCycle.totalCost)}
                  </p>
                </div>

                <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900">
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 block">Doanh thu</span>
                  <p className="font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                    {formatVND(selectedCycle.revenue)}
                  </p>
                </div>

                <div className="rounded-lg bg-indigo-50 p-3 border border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900">
                  <span className="text-xs text-indigo-700 dark:text-indigo-400 block">Lãi thuần</span>
                  <p className="font-bold text-indigo-700 dark:text-indigo-400 mt-1">
                    {formatVND(selectedCycle.profit)}
                  </p>
                </div>
              </div>

              {/* Chi tiết từng khoản chi phí */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Chi tiết chi phí ({selectedCycle.costDetails?.length || 0} khoản)</span>
                  <span className="text-xs text-rose-600 font-bold">
                    Tổng: {formatVND(selectedCycle.totalCost)}
                  </span>
                </h4>

                {!selectedCycle.costDetails || selectedCycle.costDetails.length === 0 ? (
                  <div className="rounded border p-4 text-center text-xs text-slate-400">
                    Chưa ghi nhận chi phí nào cho mùa vụ này
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded border dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b bg-slate-50 text-slate-500 dark:bg-slate-800 dark:border-slate-800">
                        <tr>
                          <th className="py-2 px-2.5">Ngày</th>
                          <th className="py-2 px-2.5">Loại</th>
                          <th className="py-2 px-2.5">Diễn giải/Mặt hàng</th>
                          <th className="py-2 px-2.5 text-right">Số lượng</th>
                          <th className="py-2 px-2.5 text-right">Đơn giá</th>
                          <th className="py-2 px-2.5 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedCycle.costDetails.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-2.5 text-slate-500">{formatDate(item.date)}</td>
                            <td className="py-2 px-2.5">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                  item.type === 'MATERIAL'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                }`}
                              >
                                {item.type === 'MATERIAL' ? 'Vật tư' : 'Giao dịch'}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 font-medium text-slate-800 dark:text-slate-200">
                              {item.description}
                            </td>
                            <td className="py-2 px-2.5 text-right text-slate-600 dark:text-slate-400">
                              {item.quantity ? `${item.quantity} ${item.unit || ''}` : '-'}
                            </td>
                            <td className="py-2 px-2.5 text-right text-slate-600 dark:text-slate-400">
                              {item.unitCost ? formatVND(item.unitCost) : '-'}
                            </td>
                            <td className="py-2 px-2.5 text-right font-bold text-rose-700 dark:text-rose-400">
                              {formatVND(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Chi tiết từng khoản doanh thu */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Chi tiết doanh thu từ đơn bán ({selectedCycle.revenueDetails?.length || 0} khoản)</span>
                  <span className="text-xs text-emerald-600 font-bold">
                    Tổng: {formatVND(selectedCycle.revenue)}
                  </span>
                </h4>

                {!selectedCycle.revenueDetails || selectedCycle.revenueDetails.length === 0 ? (
                  <div className="rounded border p-4 text-center text-xs text-slate-400">
                    Chưa có doanh thu bán hàng từ lô thu hoạch của mùa vụ này
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded border dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b bg-slate-50 text-slate-500 dark:bg-slate-800 dark:border-slate-800">
                        <tr>
                          <th className="py-2 px-2.5">Đơn bán hàng</th>
                          <th className="py-2 px-2.5 text-right">Số lượng xuất</th>
                          <th className="py-2 px-2.5 text-right">Đơn giá bán</th>
                          <th className="py-2 px-2.5 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedCycle.revenueDetails.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-2.5 font-medium text-emerald-600 dark:text-emerald-400">
                              {item.salesOrderCode}
                            </td>
                            <td className="py-2 px-2.5 text-right text-slate-600 dark:text-slate-400">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="py-2 px-2.5 text-right text-slate-600 dark:text-slate-400">
                              {formatVND(item.unitPrice)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-bold text-emerald-700 dark:text-emerald-400">
                              {formatVND(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
