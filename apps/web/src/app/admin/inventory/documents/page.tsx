'use client';

import * as React from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Badge, Button, DataTable, FormDialog, PageHeader, useToast, Toast } from '@xfarm/ui';
import { apiFetch } from '@/lib/api';
import { useAdminUser } from '../../admin-user-context';
import { InventoryNav } from '../inventory-nav';
import { formatDateTime, getDocumentTypeInfo } from '../format';
import type {
  ItemRecord,
  StockDocumentItem,
  StockDocumentsResponse,
  WarehouseItem,
} from '../types';
import { ReceiptForm } from './_components/receipt-form';
import { IssueForm } from './_components/issue-form';
import { TransferForm } from './_components/transfer-form';
import { CountForm } from './_components/count-form';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ClipboardCheck, Eye } from 'lucide-react';

export default function StockDocumentsPage() {
  const user = useAdminUser();
  const canWrite = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const { message, showToast, closeToast } = useToast();

  const [documents, setDocuments] = React.useState<StockDocumentItem[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseItem[]>([]);
  const [items, setItems] = React.useState<ItemRecord[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(20);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  // Dialog states
  const [receiptOpen, setReceiptOpen] = React.useState(false);
  const [issueOpen, setIssueOpen] = React.useState(false);
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [countOpen, setCountOpen] = React.useState(false);

  // Load warehouses & items
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

  const fetchDocuments = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (search.trim()) params.set('search', search.trim());

      const res = await apiFetch<
        StockDocumentsResponse | { data: StockDocumentItem[]; total: number }
      >(`/stock/documents?${params.toString()}`);

      const list = res?.data || [];
      setDocuments(list);
      setTotal(res?.total ?? list.length);
    } catch {
      setDocuments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  React.useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleCreated = (type: string, code?: string) => {
    showToast(code ? `Đã tạo ${type} thành công: ${code}` : `Đã tạo ${type} thành công!`);
    setReceiptOpen(false);
    setIssueOpen(false);
    setTransferOpen(false);
    setCountOpen(false);
    fetchDocuments();
  };

  const columns: ColumnDef<StockDocumentItem>[] = [
    {
      accessorKey: 'code',
      header: 'Mã phiếu',
      cell: ({ row }) => (
        <Link
          href={`/admin/inventory/documents/${encodeURIComponent(row.original.code)}`}
          className="font-mono text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
        >
          {row.original.code}
        </Link>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Loại phiếu',
      cell: ({ row }) => {
        const info = getDocumentTypeInfo(row.original.code, row.original.type);
        return <Badge variant={info.badgeVariant}>{info.label}</Badge>;
      },
    },
    {
      accessorKey: 'warehouseName',
      header: 'Kho liên quan',
      cell: ({ row }) => {
        const doc = row.original;
        if (doc.fromWarehouseName && doc.toWarehouseName) {
          return (
            <div className="text-xs">
              <span>{doc.fromWarehouseName}</span>
              <span className="text-slate-400 mx-1">➔</span>
              <span>{doc.toWarehouseName}</span>
            </div>
          );
        }
        return (
          <span className="text-xs text-slate-800 dark:text-slate-200">
            {doc.warehouseName || doc.toWarehouseName || doc.fromWarehouseName || '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'movedAt',
      header: 'Ngày lập / Ngày chuyển',
      cell: ({ row }) => (
        <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
          {formatDateTime(row.original.movedAt)}
        </span>
      ),
    },
    {
      accessorKey: 'notes',
      header: 'Ghi chú',
      cell: ({ row }) => (
        <span
          className="text-xs text-slate-500 italic max-w-xs truncate block"
          title={row.original.notes || ''}
        >
          {row.original.notes || '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => (
        <Link
          href={`/admin/inventory/documents/${encodeURIComponent(row.original.code)}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Chi tiết</span>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Phiếu kho"
          description="Quản lý và lập các chứng từ nhập kho, xuất kho, điều chuyển nội bộ và kiểm kê vật tư."
        />

        {/* 4 Action Buttons - Hidden for read-only roles (ACCOUNTANT, SALES, WORKER) */}
        {canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setReceiptOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm"
            >
              <ArrowDownLeft className="h-4 w-4 mr-1.5" />
              Phiếu nhập
            </Button>

            <Button
              onClick={() => setIssueOpen(true)}
              variant="outline"
              className="text-xs sm:text-sm border-slate-300 text-slate-800 hover:bg-slate-100"
            >
              <ArrowUpRight className="h-4 w-4 mr-1.5 text-blue-600" />
              Phiếu xuất
            </Button>

            <Button
              onClick={() => setTransferOpen(true)}
              variant="outline"
              className="text-xs sm:text-sm border-slate-300 text-slate-800 hover:bg-slate-100"
            >
              <ArrowLeftRight className="h-4 w-4 mr-1.5 text-purple-600" />
              Điều chuyển
            </Button>

            <Button
              onClick={() => setCountOpen(true)}
              variant="outline"
              className="text-xs sm:text-sm border-slate-300 text-slate-800 hover:bg-slate-100"
            >
              <ClipboardCheck className="h-4 w-4 mr-1.5 text-amber-600" />
              Kiểm kê
            </Button>
          </div>
        )}
      </div>

      <InventoryNav />

      {/* Table */}
      <DataTable
        columns={columns}
        data={documents}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Tìm kiếm theo mã chứng từ hoặc ghi chú..."
        isLoading={loading}
      />

      {/* Dialog 1: Phiếu nhập */}
      {canWrite && (
        <FormDialog
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          title="Tạo phiếu nhập kho"
          description="Nhập thông tin kho hàng và danh sách vật tư cần nhập."
          className="max-w-4xl"
        >
          <ReceiptForm
            warehouses={warehouses}
            items={items}
            onSuccess={(code) => handleCreated('phiếu nhập', code)}
            onCancel={() => setReceiptOpen(false)}
          />
        </FormDialog>
      )}

      {/* Dialog 2: Phiếu xuất */}
      {canWrite && (
        <FormDialog
          open={issueOpen}
          onOpenChange={setIssueOpen}
          title="Tạo phiếu xuất kho"
          description="Xuất kho vật tư theo nguyên tắc FIFO từ các lô cũ nhất."
          className="max-w-3xl"
        >
          <IssueForm
            warehouses={warehouses}
            items={items}
            onSuccess={(code) => handleCreated('phiếu xuất', code)}
            onCancel={() => setIssueOpen(false)}
          />
        </FormDialog>
      )}

      {/* Dialog 3: Điều chuyển */}
      {canWrite && (
        <FormDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          title="Tạo phiếu điều chuyển kho"
          description="Chuyển vật tư giữa hai kho hàng trong nông trại."
          className="max-w-3xl"
        >
          <TransferForm
            warehouses={warehouses}
            items={items}
            onSuccess={(code) => handleCreated('phiếu điều chuyển', code)}
            onCancel={() => setTransferOpen(false)}
          />
        </FormDialog>
      )}

      {/* Dialog 4: Kiểm kê */}
      {canWrite && (
        <FormDialog
          open={countOpen}
          onOpenChange={setCountOpen}
          title="Tạo phiếu kiểm kê kho"
          description="Đối chiếu số đếm thực tế với số tồn sổ sách và ghi nhận chênh lệch."
          className="max-w-4xl"
        >
          <CountForm
            warehouses={warehouses}
            items={items}
            onSuccess={(code) => handleCreated('phiếu kiểm kê', code)}
            onCancel={() => setCountOpen(false)}
          />
        </FormDialog>
      )}

      {message && <Toast message={message} onClose={closeToast} />}
    </div>
  );
}
