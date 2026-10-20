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

    const loadAllItems = async () => {
      const pageSize = 100;
      const allItems: ItemRecord[] = [];
      let page = 1;
      let total = Number.POSITIVE_INFINITY;
      while (allItems.length < total) {
        const res = await apiFetch<{ data: ItemRecord[]; total?: number } | ItemRecord[]>(
          `/items?page=${page}&pageSize=${pageSize}`,
        );
        const pageItems = Array.isArray(res) ? res : res?.data || [];
        allItems.push(...pageItems);
        total = Array.isArray(res) ? allItems.length : (res.total ?? allItems.length);
        if (pageItems.length < pageSize) break;
        page += 1;
      }
      if (active) setItems(allItems);
    };
    loadAllItems().catch(() => {});

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
          className="font-mono text-xs font-semibold text-accent hover:underline"
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
              <span className="text-fg">{doc.fromWarehouseName}</span>
              <span className="text-muted mx-1">➔</span>
              <span className="text-fg">{doc.toWarehouseName}</span>
            </div>
          );
        }
        return (
          <span className="text-xs text-fg-2">
            {doc.warehouseName || doc.toWarehouseName || doc.fromWarehouseName || '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'movedAt',
      header: 'Ngày lập / Ngày chuyển',
      cell: ({ row }) => (
        <span className="text-xs font-mono text-muted">
          {formatDateTime(row.original.movedAt)}
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
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => (
        <Link
          href={`/admin/inventory/documents/${encodeURIComponent(row.original.code)}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/80"
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
              className="bg-accent hover:bg-accent/90 text-white text-xs sm:text-sm"
            >
              <ArrowDownLeft className="h-4 w-4 mr-1.5" />
              Phiếu nhập
            </Button>

            <Button
              onClick={() => setIssueOpen(true)}
              variant="outline"
              className="text-xs sm:text-sm border-line text-fg hover:bg-surface-2"
            >
              <ArrowUpRight className="h-4 w-4 mr-1.5 text-accent" />
              Phiếu xuất
            </Button>

            <Button
              onClick={() => setTransferOpen(true)}
              variant="outline"
              className="text-xs sm:text-sm border-line text-fg hover:bg-surface-2"
            >
              <ArrowLeftRight className="h-4 w-4 mr-1.5 text-accent" />
              Điều chuyển
            </Button>

            <Button
              onClick={() => setCountOpen(true)}
              variant="outline"
              className="text-xs sm:text-sm border-line text-fg hover:bg-surface-2"
            >
              <ClipboardCheck className="h-4 w-4 mr-1.5 text-warn" />
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
