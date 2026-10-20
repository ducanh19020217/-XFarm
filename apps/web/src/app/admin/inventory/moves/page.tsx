'use client';

import * as React from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Badge, DataTable, PageHeader, useToast, Toast } from '@xfarm/ui';
import { StockMoveType } from '@xfarm/shared';
import { apiFetch } from '@/lib/api';
import { InventoryNav } from '../inventory-nav';
import { formatCurrency, formatDateTime, formatNumber, moveTypeLabels } from '../format';
import type { ItemRecord, StockMoveItem, StockMovesResponse, WarehouseItem } from '../types';

export default function StockMovesPage() {
  const { message, closeToast } = useToast();

  const [moves, setMoves] = React.useState<StockMoveItem[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseItem[]>([]);
  const [items, setItems] = React.useState<ItemRecord[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(20);
  const [loading, setLoading] = React.useState(true);

  // Filters
  const [itemId, setItemId] = React.useState('');
  const [warehouseId, setWarehouseId] = React.useState('');
  const [moveType, setMoveType] = React.useState('');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [search, setSearch] = React.useState('');

  // Fetch warehouses
  React.useEffect(() => {
    let active = true;
    apiFetch<{ data: WarehouseItem[] } | WarehouseItem[]>('/warehouses?page=1&pageSize=100')
      .then((res) => {
        if (!active) return;
        setWarehouses(Array.isArray(res) ? res : res?.data || []);
      })
      .catch(() => {});

    apiFetch<{ data: ItemRecord[] } | ItemRecord[]>('/items?page=1&pageSize=200')
      .then((res) => {
        if (!active) return;
        setItems(Array.isArray(res) ? res : res?.data || []);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const fetchMoves = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (itemId) params.set('itemId', itemId);
      if (warehouseId) params.set('warehouseId', warehouseId);
      if (moveType) params.set('type', moveType);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (search.trim()) params.set('search', search.trim());

      const res = await apiFetch<StockMovesResponse | { data: StockMoveItem[]; total: number }>(
        `/stock/moves?${params.toString()}`,
      );

      const list = res?.data || [];
      setMoves(list);
      setTotal(res?.total ?? list.length);
    } catch {
      setMoves([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, itemId, warehouseId, moveType, fromDate, toDate, search]);

  React.useEffect(() => {
    fetchMoves();
  }, [fetchMoves]);

  const columns: ColumnDef<StockMoveItem>[] = [
    {
      accessorKey: 'movedAt',
      header: 'Thời gian',
      cell: ({ row }) => (
        <span className="text-xs text-muted font-mono">
          {formatDateTime(row.original.movedAt || row.original.createdAt)}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Loại biến động',
      cell: ({ row }) => {
        const type = row.original.type;
        const variant =
          type === 'IN'
            ? 'default'
            : type === 'OUT'
              ? 'destructive'
              : type === 'TRANSFER'
                ? 'info'
                : 'warning';

        return <Badge variant={variant}>{moveTypeLabels[type] || type}</Badge>;
      },
    },
    {
      accessorKey: 'refId',
      header: 'Mã phiếu / Tham chiếu',
      cell: ({ row }) => {
        const refId = row.original.refId;
        if (!refId) return <span className="text-muted text-xs">—</span>;

        // If it looks like a stock document code (NK-, XK-, DC-, KK-), make it a link
        const isStockDoc = row.original.refType === 'STOCK_DOC' || /^(NK|XK|DC|KK)-/i.test(refId);

        if (isStockDoc) {
          return (
            <Link
              href={`/admin/inventory/documents/${encodeURIComponent(refId)}`}
              className="font-mono text-xs font-semibold text-accent hover:underline"
            >
              {refId}
            </Link>
          );
        }

        return (
          <span className="font-mono text-xs text-fg">{refId}</span>
        );
      },
    },
    {
      accessorKey: 'itemName',
      header: 'Vật tư',
      cell: ({ row }) => (
        <div>
          <span className="font-medium text-fg">
            {row.original.itemName || row.original.itemId}
          </span>
          {row.original.itemSku && (
            <span className="block text-xs font-mono text-muted">
              SKU: {row.original.itemSku}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'lotCode',
      header: 'Mã lô',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted">
          {row.original.lotCode || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'fromWarehouseName',
      header: 'Kho đi / Kho đến',
      cell: ({ row }) => {
        const from = row.original.fromWarehouseName || row.original.fromWarehouseId;
        const to = row.original.toWarehouseName || row.original.toWarehouseId;

        if (row.original.type === 'TRANSFER') {
          return (
            <div className="text-xs">
              <span className="text-muted">Từ: </span>
              <span className="font-medium text-fg">{from || '—'}</span>
              <span className="text-muted mx-1">➔</span>
              <span className="text-muted">Đến: </span>
              <span className="font-medium text-fg">{to || '—'}</span>
            </div>
          );
        }

        return (
          <span className="text-xs text-fg-2">{to || from || '—'}</span>
        );
      },
    },
    {
      accessorKey: 'quantity',
      header: 'Số lượng',
      cell: ({ row }) => {
        const qty = Number(row.original.quantity || 0);
        const direction = row.original.direction;
        const type = row.original.type;

        const isPositive =
          direction === 'IN' ||
          type === 'IN' ||
          (type === 'TRANSFER' && row.original.toWarehouseId);

        const isNegative =
          direction === 'OUT' ||
          type === 'OUT' ||
          (type === 'TRANSFER' && row.original.fromWarehouseId);

        return (
          <span
            className={`font-semibold ${
              isNegative
                ? 'text-crit'
                : isPositive
                  ? 'text-ok'
                  : 'text-fg'
            }`}
          >
            {isNegative ? `-${formatNumber(qty)}` : `+${formatNumber(qty)}`}{' '}
            {row.original.unit || ''}
          </span>
        );
      },
    },
    {
      accessorKey: 'unitCost',
      header: 'Đơn giá vốn',
      cell: ({ row }) => (
        <span className="text-xs text-fg-2">
          {formatCurrency(row.original.unitCost)}
        </span>
      ),
    },
    {
      accessorKey: 'notes',
      header: 'Ghi chú',
      cell: ({ row }) => (
        <span
          className="text-xs text-muted italic max-w-xs truncate block"
          title={row.original.notes || ''}
        >
          {row.original.notes || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thẻ kho (Lịch sử biến động)"
        description="Tra cứu chi tiết toàn bộ lịch sử nhập, xuất, điều chuyển và điều chỉnh kiểm kê vật tư theo thời gian."
      />

      <InventoryNav />

      {/* Filter Bar */}
      <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 items-end">
          {/* Item Filter */}
          <div className="space-y-1">
            <label
              htmlFor="filter-item"
              className="text-xs font-medium text-fg"
            >
              Vật tư
            </label>
            <select
              id="filter-item"
              value={itemId}
              onChange={(e) => {
                setItemId(e.target.value);
                setPage(1);
              }}
              className="flex h-9 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm text-fg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="">Tất cả vật tư</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse Filter */}
          <div className="space-y-1">
            <label
              htmlFor="filter-warehouse"
              className="text-xs font-medium text-fg"
            >
              Kho hàng
            </label>
            <select
              id="filter-warehouse"
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                setPage(1);
              }}
              className="flex h-9 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm text-fg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="">Tất cả kho</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="space-y-1">
            <label
              htmlFor="filter-type"
              className="text-xs font-medium text-fg"
            >
              Loại biến động
            </label>
            <select
              id="filter-type"
              value={moveType}
              onChange={(e) => {
                setMoveType(e.target.value);
                setPage(1);
              }}
              className="flex h-9 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm text-fg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="">Tất cả loại</option>
              <option value={StockMoveType.IN}>Nhập kho</option>
              <option value={StockMoveType.OUT}>Xuất kho</option>
              <option value={StockMoveType.TRANSFER}>Điều chuyển</option>
              <option value={StockMoveType.ADJUST}>Kiểm kê</option>
            </select>
          </div>

          {/* From Date */}
          <div className="space-y-1">
            <label
              htmlFor="filter-from"
              className="text-xs font-medium text-fg"
            >
              Từ ngày
            </label>
            <input
              id="filter-from"
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="flex h-9 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm text-fg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {/* To Date */}
          <div className="space-y-1">
            <label
              htmlFor="filter-to"
              className="text-xs font-medium text-fg"
            >
              Đến ngày
            </label>
            <input
              id="filter-to"
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="flex h-9 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm text-fg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>

        {/* Reset Filter Button */}
        {(itemId || warehouseId || moveType || fromDate || toDate || search) && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setItemId('');
                setWarehouseId('');
                setMoveType('');
                setFromDate('');
                setToDate('');
                setSearch('');
                setPage(1);
              }}
              className="text-xs text-muted hover:text-fg underline"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={moves}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Tìm theo mã phiếu, tên vật tư, mã lô..."
        isLoading={loading}
      />

      {message && <Toast message={message} onClose={closeToast} />}
    </div>
  );
}
