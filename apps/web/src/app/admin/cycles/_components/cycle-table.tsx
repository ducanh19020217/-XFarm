'use client';

import { ColumnDef } from '@tanstack/react-table';
import { CycleKind } from '@xfarm/shared';
import { DataTable, StatusBadge } from '@xfarm/ui';
import { Fish, Leaf, PawPrint } from 'lucide-react';
import Link from 'next/link';
import { kindLabels } from './constants';
import type { AreaItem, CycleItem } from './types';

function KindIcon({ kind }: { kind: CycleKind }) {
  const Icon = kind === CycleKind.CROP ? Leaf : kind === CycleKind.LIVESTOCK ? PawPrint : Fish;
  return <Icon className="mr-1 inline-block h-4 w-4" aria-hidden="true" />;
}

export function CycleTable({
  cycles,
  areas,
  total,
  page,
  pageSize,
  onPageChange,
  search,
  onSearchChange,
  isLoading,
}: {
  cycles: CycleItem[];
  areas: AreaItem[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
}) {
  const columns: ColumnDef<CycleItem>[] = [
    {
      accessorKey: 'code',
      header: 'Mã',
      cell: ({ row }) => (
        <Link
          className="font-medium text-emerald-700 hover:underline"
          href={`/admin/cycles/${row.original.id}`}
        >
          {row.original.code}
        </Link>
      ),
    },
    { accessorKey: 'name', header: 'Tên mùa vụ' },
    {
      accessorKey: 'kind',
      header: 'Loại',
      cell: ({ row }) => (
        <span>
          <KindIcon kind={row.original.kind} />
          {kindLabels[row.original.kind]}
        </span>
      ),
    },
    {
      id: 'area',
      header: 'Khu/lô',
      cell: ({ row }) =>
        row.original.area?.name ||
        areas.find((area) => area.id === row.original.areaId)?.name ||
        '—',
    },
    {
      id: 'species',
      header: 'Giống/loài',
      cell: ({ row }) =>
        row.original.variety
          ? `${row.original.species} (${row.original.variety})`
          : row.original.species,
    },
    {
      accessorKey: 'startDate',
      header: 'Ngày bắt đầu',
      cell: ({ row }) => new Date(row.original.startDate).toLocaleDateString('vi-VN'),
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={cycles}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      searchValue={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Tìm theo mã, tên, giống/loài..."
      isLoading={isLoading}
    />
  );
}
