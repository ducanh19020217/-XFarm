import * as React from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { ExternalLink, Printer, QrCode } from 'lucide-react';
import { Badge } from '@xfarm/ui';
import type { HarvestLotRecord } from '../types';

export function getHarvestLotColumns(): ColumnDef<HarvestLotRecord>[] {
  return [
    {
      accessorKey: 'code',
      header: 'Mã lô',
      cell: ({ row }) => (
        <Link
          href={`/admin/harvest-lots/${row.original.id}`}
          className="font-semibold text-emerald-700 hover:underline"
        >
          {row.original.code}
        </Link>
      ),
    },
    {
      accessorKey: 'traceCode',
      header: 'Mã truy xuất',
      cell: ({ row }) => (
        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200">
          {row.original.traceCode}
        </code>
      ),
    },
    {
      accessorKey: 'item',
      header: 'Sản phẩm',
      cell: ({ row }) => {
        const item = row.original.item;
        return (
          <div>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {item?.name || '—'}
            </span>
            {item?.sku && <span className="block text-xs text-slate-400">{item.sku}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'cycle',
      header: 'Mùa vụ',
      cell: ({ row }) => {
        const cycle = row.original.cycle;
        if (!cycle) return <span className="text-slate-400">—</span>;
        return (
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {cycle.code} · {cycle.name}
          </span>
        );
      },
    },
    {
      accessorKey: 'harvestedAt',
      header: 'Ngày thu',
      cell: ({ row }) => {
        const date = new Date(row.original.harvestedAt);
        return (
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN')}
          </span>
        );
      },
    },
    {
      accessorKey: 'quantity',
      header: 'Số lượng',
      cell: ({ row }) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {row.original.quantity} {row.original.unit}
        </span>
      ),
    },
    {
      accessorKey: 'remainingQuantity',
      header: 'Tồn còn',
      cell: ({ row }) => {
        const remaining =
          row.original.remainingQuantity ??
          row.original.stockLot?.remainingQuantity ??
          row.original.quantity;
        return (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {remaining} {row.original.unit}
          </span>
        );
      },
    },
    {
      accessorKey: 'isPublic',
      header: 'Công khai',
      cell: ({ row }) => (
        <Badge variant={row.original.isPublic ? 'default' : 'secondary'}>
          {row.original.isPublic ? 'Công khai' : 'Nội bộ'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => {
        const lot = row.original;
        return (
          <div className="flex items-center gap-1">
            <Link
              href={`/admin/harvest-lots/${lot.id}`}
              title="Chi tiết & QR"
              aria-label={`Chi tiết lô ${lot.code}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <QrCode className="h-4 w-4" />
            </Link>
            <Link
              href={`/admin/harvest-lots/${lot.id}/print`}
              title="In tem"
              aria-label={`In tem lô ${lot.code}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <Printer className="h-4 w-4" />
            </Link>
            <Link
              href={`/trace/${lot.traceCode}`}
              target="_blank"
              title="Xem trang truy xuất"
              aria-label={`Xem trang truy xuất mã ${lot.traceCode}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        );
      },
    },
  ];
}
