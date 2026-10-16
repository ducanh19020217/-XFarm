'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Badge, DataTable, PageHeader, useToast, Toast } from '@xfarm/ui';
import { ItemCategory } from '@xfarm/shared';
import { apiFetch } from '@/lib/api';
import { InventoryNav } from './inventory-nav';
import { categoryLabels, formatCurrency, formatNumber, getExpiryStatus } from './format';
import type { StockBalanceItem, StockBalancesResponse, WarehouseItem } from './types';
import { DollarSign, AlertTriangle, Package } from 'lucide-react';

export default function InventoryBalancesPage() {
  const { message, closeToast } = useToast();

  const [balances, setBalances] = React.useState<StockBalanceItem[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(20);
  const [loading, setLoading] = React.useState(true);

  // Filters
  const [warehouseId, setWarehouseId] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [lotCode, setLotCode] = React.useState('');
  const [includeZero, setIncludeZero] = React.useState(false);
  const [search, setSearch] = React.useState('');

  // Fetch warehouses for dropdown filter
  React.useEffect(() => {
    let active = true;
    apiFetch<{ data: WarehouseItem[] } | WarehouseItem[]>('/warehouses?page=1&pageSize=100')
      .then((res) => {
        if (!active) return;
        const items = Array.isArray(res) ? res : res?.data || [];
        setWarehouses(items);
      })
      .catch(() => {
        // Fallback: warehouses API might not be available yet
      });
    return () => {
      active = false;
    };
  }, []);

  // Aggregated totals across all filtered items (for multi-page datasets)
  const [aggregatedTotalAmount, setAggregatedTotalAmount] = React.useState<number | null>(null);
  const [aggregatedExpiringCount, setAggregatedExpiringCount] = React.useState<number | null>(null);
  const [aggregationFailed, setAggregationFailed] = React.useState(false);
  const [isAggregating, setIsAggregating] = React.useState(false);
  const aggregationSeq = React.useRef(0);

  // Helper to query all filtered records across pages (respecting schema max pageSize=100)
  // when API doesn't provide aggregated totalAmount
  const fetchAggregatedTotals = React.useCallback(
    async (totalCount: number) => {
      const currentSeq = ++aggregationSeq.current;
      setIsAggregating(true);
      setAggregationFailed(false);
      try {
        const MAX_PAGE_SIZE = 100;
        const totalPages = Math.ceil(totalCount / MAX_PAGE_SIZE);

        const pageRequests: Promise<StockBalancesResponse>[] = [];
        for (let p = 1; p <= totalPages; p++) {
          const summaryParams = new URLSearchParams();
          summaryParams.set('page', String(p));
          summaryParams.set('pageSize', String(MAX_PAGE_SIZE));
          if (warehouseId) summaryParams.set('warehouseId', warehouseId);
          if (category) summaryParams.set('category', category);
          if (lotCode.trim()) summaryParams.set('lotCode', lotCode.trim());
          summaryParams.set('includeZero', includeZero ? 'true' : 'false');
          if (search.trim()) summaryParams.set('search', search.trim());

          pageRequests.push(
            apiFetch<StockBalancesResponse>(`/stock/balances?${summaryParams.toString()}`),
          );
        }

        const responses = await Promise.all(pageRequests);
        if (currentSeq !== aggregationSeq.current) return;

        // 1. If any response provided totalAmount directly, use it
        const firstWithTotal = responses.find((r) => typeof r?.totalAmount === 'number');
        if (firstWithTotal && typeof firstWithTotal.totalAmount === 'number') {
          setAggregatedTotalAmount(firstWithTotal.totalAmount);
          if (typeof firstWithTotal.totalExpiring === 'number') {
            setAggregatedExpiringCount(firstWithTotal.totalExpiring);
          }
        } else {
          const allItems = responses.flatMap((r) => r?.data || []);
          const fullSum = allItems.reduce((acc, item) => {
            const lineVal =
              item.totalValue != null
                ? Number(item.totalValue)
                : item.totalCost != null
                  ? Number(item.totalCost)
                  : Number(item.quantity) * Number(item.unitCost || 0);
            return acc + (Number.isNaN(lineVal) ? 0 : lineVal);
          }, 0);
          setAggregatedTotalAmount(fullSum);

          const fullExpiring = allItems.filter((b) => {
            const st = getExpiryStatus(b.expiryDate);
            return st?.isExpired || st?.isExpiringSoon;
          }).length;
          setAggregatedExpiringCount(fullExpiring);
        }
        setAggregationFailed(false);
      } catch {
        if (currentSeq !== aggregationSeq.current) return;
        setAggregationFailed(true);
        setAggregatedTotalAmount(null);
        setAggregatedExpiringCount(null);
      } finally {
        if (currentSeq === aggregationSeq.current) {
          setIsAggregating(false);
        }
      }
    },
    [warehouseId, category, lotCode, includeZero, search],
  );

  // Fetch balances
  const fetchBalances = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (warehouseId) params.set('warehouseId', warehouseId);
      if (category) params.set('category', category);
      if (lotCode.trim()) params.set('lotCode', lotCode.trim());
      params.set('includeZero', includeZero ? 'true' : 'false');
      if (search.trim()) params.set('search', search.trim());

      const res = await apiFetch<StockBalancesResponse>(`/stock/balances?${params.toString()}`);

      const items = res?.data || [];
      const totalCount = res?.total ?? items.length;
      setBalances(items);
      setTotal(totalCount);

      // 1. If API provides totalAmount directly, use it
      if (res && typeof res.totalAmount === 'number') {
        setAggregatedTotalAmount(res.totalAmount);
        if (typeof res.totalExpiring === 'number') {
          setAggregatedExpiringCount(res.totalExpiring);
        } else if (totalCount <= items.length) {
          const expCount = items.filter((b) => {
            const st = getExpiryStatus(b.expiryDate);
            return st?.isExpired || st?.isExpiringSoon;
          }).length;
          setAggregatedExpiringCount(expCount);
        }
        setAggregationFailed(false);
        setIsAggregating(false);
      } else if (totalCount <= items.length) {
        // All items fit within the current single page
        const sum = items.reduce((acc, item) => {
          const lineVal =
            item.totalValue != null
              ? Number(item.totalValue)
              : item.totalCost != null
                ? Number(item.totalCost)
                : Number(item.quantity) * Number(item.unitCost || 0);
          return acc + (Number.isNaN(lineVal) ? 0 : lineVal);
        }, 0);
        setAggregatedTotalAmount(sum);

        const expCount = items.filter((b) => {
          const st = getExpiryStatus(b.expiryDate);
          return st?.isExpired || st?.isExpiringSoon;
        }).length;
        setAggregatedExpiringCount(expCount);
        setAggregationFailed(false);
        setIsAggregating(false);
      } else {
        // Multi-page results and API did not return totalAmount: fetch full dataset for summary
        fetchAggregatedTotals(totalCount);
      }
    } catch {
      // API may not yet be implemented in this parallel phase
      setBalances([]);
      setTotal(0);
      setAggregatedTotalAmount(0);
      setAggregatedExpiringCount(0);
      setAggregationFailed(false);
      setIsAggregating(false);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, warehouseId, category, lotCode, includeZero, search, fetchAggregatedTotals]);

  React.useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // Reset aggregated totals when filter criteria change (so new totals are computed)
  const resetFiltersState = React.useCallback(() => {
    aggregationSeq.current++;
    setAggregatedTotalAmount(null);
    setAggregatedExpiringCount(null);
    setAggregationFailed(false);
    setIsAggregating(false);
    setPage(1);
  }, []);

  // Calculate page-level totals (only accurate as grand totals when dataset fits on single page)
  const pageTotalValue = React.useMemo(() => {
    return balances.reduce((sum, item) => {
      const lineVal =
        item.totalValue != null
          ? Number(item.totalValue)
          : item.totalCost != null
            ? Number(item.totalCost)
            : Number(item.quantity) * Number(item.unitCost || 0);
      return sum + (Number.isNaN(lineVal) ? 0 : lineVal);
    }, 0);
  }, [balances]);

  const pageExpiringCount = React.useMemo(() => {
    return balances.filter((b) => {
      const st = getExpiryStatus(b.expiryDate);
      return st?.isExpired || st?.isExpiringSoon;
    }).length;
  }, [balances]);

  const columns: ColumnDef<StockBalanceItem>[] = [
    {
      accessorKey: 'itemSku',
      header: 'Mã SKU',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
          {row.original.itemSku || row.original.itemId || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'itemName',
      header: 'Tên vật tư',
      cell: ({ row }) => (
        <div>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.itemName}
          </span>
          <span className="block text-xs text-slate-500">ĐVT: {row.original.unit}</span>
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Nhóm hàng',
      cell: ({ row }) => (
        <Badge variant="secondary">
          {categoryLabels[row.original.category] || row.original.category}
        </Badge>
      ),
    },
    {
      accessorKey: 'warehouseName',
      header: 'Kho',
      cell: ({ row }) => (
        <span className="text-slate-800 dark:text-slate-200">
          {row.original.warehouseName || row.original.warehouseId}
        </span>
      ),
    },
    {
      accessorKey: 'lotCode',
      header: 'Mã lô',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
          {row.original.lotCode || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'expiryDate',
      header: 'Hạn dùng',
      cell: ({ row }) => {
        const expiry = getExpiryStatus(row.original.expiryDate);
        if (!expiry) {
          return <span className="text-slate-400 text-xs">—</span>;
        }

        return (
          <div className="flex items-center gap-1.5">
            <Badge variant={expiry.variant}>
              {expiry.isExpired
                ? 'Hết hạn'
                : expiry.isExpiringSoon
                  ? expiry.label
                  : expiry.formattedDate}
            </Badge>
            {(expiry.isExpired || expiry.isExpiringSoon) && (
              <span className="text-xs text-slate-500">{expiry.formattedDate}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'quantity',
      header: 'Số lượng tồn',
      cell: ({ row }) => {
        const qty = Number(row.original.quantity || 0);
        return (
          <span
            className={`font-semibold ${
              qty <= 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {formatNumber(qty)} {row.original.unit}
          </span>
        );
      },
    },
    {
      accessorKey: 'unitCost',
      header: 'Giá vốn',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-300">
          {formatCurrency(row.original.unitCost)}
        </span>
      ),
    },
    {
      accessorKey: 'totalValue',
      header: 'Thành tiền',
      cell: ({ row }) => {
        const val =
          row.original.totalValue != null
            ? Number(row.original.totalValue)
            : row.original.totalCost != null
              ? Number(row.original.totalCost)
              : Number(row.original.quantity || 0) * Number(row.original.unitCost || 0);
        return (
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            {formatCurrency(val)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý tồn kho"
        description="Theo dõi chi tiết số lượng tồn, giá trị vốn và hạn sử dụng theo từng vật tư, lô và kho hàng."
      />

      <InventoryNav />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Tổng số mặt hàng / lô tồn
            </span>
            <Package className="h-5 w-5 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatNumber(total, 0)}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Tổng giá trị thành tiền
            </span>
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </div>
          <div
            data-testid="summary-total-value"
            className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400"
          >
            {aggregatedTotalAmount != null ? (
              formatCurrency(aggregatedTotalAmount)
            ) : total <= balances.length ? (
              formatCurrency(pageTotalValue)
            ) : isAggregating ? (
              <span className="text-base font-normal text-slate-400">Đang tính...</span>
            ) : aggregationFailed ? (
              <span
                className="text-base font-normal text-slate-400"
                title="Không thể tổng hợp toàn bộ các trang"
              >
                —
              </span>
            ) : (
              <span className="text-base font-normal text-slate-400">—</span>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Cảnh báo hạn dùng (≤ 30 ngày)
            </span>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div
            data-testid="summary-expiring-count"
            className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400"
          >
            {aggregatedExpiringCount != null ? (
              formatNumber(aggregatedExpiringCount, 0)
            ) : total <= balances.length ? (
              formatNumber(pageExpiringCount, 0)
            ) : isAggregating ? (
              <span className="text-base font-normal text-slate-400">...</span>
            ) : aggregationFailed ? (
              <span
                className="text-base font-normal text-slate-400"
                title="Không thể tổng hợp toàn bộ các trang"
              >
                —
              </span>
            ) : (
              <span className="text-base font-normal text-slate-400">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 items-end">
          {/* Warehouse Filter */}
          <div className="space-y-1">
            <label
              htmlFor="filter-warehouse"
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Kho hàng
            </label>
            <select
              id="filter-warehouse"
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                resetFiltersState();
              }}
              className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Tất cả kho</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1">
            <label
              htmlFor="filter-category"
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Nhóm hàng
            </label>
            <select
              id="filter-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                resetFiltersState();
              }}
              className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Tất cả nhóm</option>
              {Object.values(ItemCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabels[cat] || cat}
                </option>
              ))}
            </select>
          </div>

          {/* Lot Code Filter */}
          <div className="space-y-1">
            <label
              htmlFor="filter-lot"
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Mã lô
            </label>
            <input
              id="filter-lot"
              type="text"
              placeholder="Nhập mã lô..."
              value={lotCode}
              onChange={(e) => {
                setLotCode(e.target.value);
                resetFiltersState();
              }}
              className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
            />
          </div>

          {/* Include Zero checkbox */}
          <div className="flex items-center gap-2 h-9 pb-1">
            <input
              id="filter-include-zero"
              type="checkbox"
              checked={includeZero}
              onChange={(e) => {
                setIncludeZero(e.target.checked);
                resetFiltersState();
              }}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label
              htmlFor="filter-include-zero"
              className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
            >
              Hiện cả tồn 0
            </label>
          </div>

          {/* Reset button */}
          <div className="flex justify-end">
            {(warehouseId || category || lotCode || includeZero || search) && (
              <button
                type="button"
                onClick={() => {
                  setWarehouseId('');
                  setCategory('');
                  setLotCode('');
                  setIncludeZero(false);
                  setSearch('');
                  resetFiltersState();
                }}
                className="text-xs text-slate-500 hover:text-slate-800 underline pb-2"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={balances}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          resetFiltersState();
        }}
        searchPlaceholder="Tìm kiếm theo mã SKU hoặc tên vật tư..."
        isLoading={loading}
      />

      {message && <Toast message={message} onClose={closeToast} />}
    </div>
  );
}
