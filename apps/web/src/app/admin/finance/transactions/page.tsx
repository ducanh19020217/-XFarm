'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Edit2,
  ExternalLink,
  Image as ImageIcon,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  PageHeader,
  Toast,
  useToast,
} from '@xfarm/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { PaymentMethod, TransactionType } from '@xfarm/shared';
import { apiFetch, ApiError } from '@/lib/api';
import MoneyInput from '@/components/ui/money-input';
import { MultiImageUpload } from '@/components/ui/image-upload';

interface CategoryOption {
  id: string;
  name: string;
  type: TransactionType;
}

interface CycleOption {
  id: string;
  code: string;
  name: string;
}

export interface TransactionItem {
  id: string;
  code: string;
  type: TransactionType;
  categoryId: string;
  amount: number | string;
  date: string;
  cycleId: string | null;
  refType: string | null;
  refId: string | null;
  orderId?: string | null;
  orderCode?: string | null;
  poId?: string | null;
  poCode?: string | null;
  method: PaymentMethod;
  notes: string | null;
  mediaIds: string[];
  createdAt: string;
  category?: {
    id: string;
    name: string;
    type: TransactionType;
    systemKey?: string | null;
  };
  cycle?: {
    id: string;
    code: string;
    name: string;
  } | null;
  createdBy?: {
    id: string;
    fullName: string;
    role: string;
  } | null;
}

interface TransactionListResponse {
  data: TransactionItem[];
  total: number;
  page: number;
  pageSize: number;
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

const methodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.BANK_TRANSFER]: 'Chuyển khoản',
  [PaymentMethod.CASH]: 'Tiền mặt',
  [PaymentMethod.COD]: 'COD',
  [PaymentMethod.VNPAY]: 'VNPay',
};

export default function TransactionsPage() {
  const { message, showToast, closeToast } = useToast();

  const [transactions, setTransactions] = React.useState<TransactionItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  // Options
  const [categories, setCategories] = React.useState<CategoryOption[]>([]);
  const [cycles, setCycles] = React.useState<CycleOption[]>([]);

  // Filters
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('ALL');
  const [cycleFilter, setCycleFilter] = React.useState<string>('ALL');
  const [fromDate, setFromDate] = React.useState<string>('');
  const [toDate, setToDate] = React.useState<string>('');
  const [page, setPage] = React.useState(1);
  const pageSize = 50;

  // Dialog Form (Create / Edit)
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTx, setEditingTx] = React.useState<TransactionItem | null>(null);
  const [formType, setFormType] = React.useState<TransactionType>(TransactionType.EXPENSE);
  const [formCategoryId, setFormCategoryId] = React.useState<string>('');
  const [formAmount, setFormAmount] = React.useState<number>(0);
  const [formDate, setFormDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [formCycleId, setFormCycleId] = React.useState<string>('');
  const [formMethod, setFormMethod] = React.useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [formNotes, setFormNotes] = React.useState<string>('');
  const [formMediaIds, setFormMediaIds] = React.useState<string[]>([]);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Delete Dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [txToDelete, setTxToDelete] = React.useState<TransactionItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Preview Media Dialog
  const [previewMediaIds, setPreviewMediaIds] = React.useState<string[] | null>(null);

  // Fetch Category options & Cycle options
  React.useEffect(() => {
    async function loadOptions() {
      try {
        const [catRes, cycleRes] = await Promise.all([
          apiFetch<{ data: CategoryOption[] } | CategoryOption[]>(
            '/finance-categories?page=1&pageSize=100',
          ),
          apiFetch<{ data: CycleOption[] } | CycleOption[]>('/cycles?page=1&pageSize=100'),
        ]);
        const catData = 'data' in catRes ? catRes.data : catRes;
        const cycleData = 'data' in cycleRes ? cycleRes.data : cycleRes;
        setCategories(Array.isArray(catData) ? catData : []);
        setCycles(Array.isArray(cycleData) ? cycleData : []);
      } catch (err) {
        console.error('Không thể tải danh mục/mùa vụ:', err);
      }
    }
    void loadOptions();
  }, []);

  const fetchTransactions = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());
      if (search.trim()) params.set('search', search.trim());
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (categoryFilter !== 'ALL') params.set('categoryId', categoryFilter);
      if (cycleFilter !== 'ALL') params.set('cycleId', cycleFilter);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      const res = await apiFetch<TransactionListResponse>(`/transactions?${params.toString()}`);
      setTransactions(res.data || []);
      setTotal(res.total || 0);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tải danh sách giao dịch');
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, categoryFilter, cycleFilter, fromDate, toDate, showToast]);

  React.useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  // Calculate totals of current filtered list
  const totalIncome = React.useMemo(() => {
    return transactions
      .filter((t) => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [transactions]);

  const totalExpense = React.useMemo(() => {
    return transactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [transactions]);

  const netBalance = totalIncome - totalExpense;

  const openCreateDialog = () => {
    setEditingTx(null);
    setFormType(
      typeFilter === TransactionType.INCOME ? TransactionType.INCOME : TransactionType.EXPENSE,
    );
    setFormCategoryId('');
    setFormAmount(0);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCycleId(cycleFilter !== 'ALL' ? cycleFilter : '');
    setFormMethod(PaymentMethod.BANK_TRANSFER);
    setFormNotes('');
    setFormMediaIds([]);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (tx: TransactionItem) => {
    setEditingTx(tx);
    setFormType(tx.type);
    setFormCategoryId(tx.categoryId);
    setFormAmount(Number(tx.amount) || 0);
    setFormDate(tx.date ? new Date(tx.date).toISOString().split('T')[0] : '');
    setFormCycleId(tx.cycleId || '');
    setFormMethod(tx.method);
    setFormNotes(tx.notes || '');
    setFormMediaIds(tx.mediaIds || []);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formCategoryId) {
      setFormError('Vui lòng chọn danh mục thu chi');
      return;
    }
    if (formAmount <= 0) {
      setFormError('Số tiền phải lớn hơn 0');
      return;
    }
    if (!formDate) {
      setFormError('Vui lòng chọn ngày giao dịch');
      return;
    }

    setSubmitting(true);
    try {
      if (editingTx) {
        await apiFetch(`/transactions/${editingTx.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            type: formType,
            categoryId: formCategoryId,
            amount: formAmount,
            date: formDate,
            cycleId: formCycleId || undefined,
            method: formMethod,
            notes: formNotes.trim() || undefined,
            mediaIds: formMediaIds,
          }),
        });
        showToast('Cập nhật giao dịch thành công');
      } else {
        await apiFetch('/transactions', {
          method: 'POST',
          body: JSON.stringify({
            type: formType,
            categoryId: formCategoryId,
            amount: formAmount,
            date: formDate,
            cycleId: formCycleId || undefined,
            method: formMethod,
            notes: formNotes.trim() || undefined,
            mediaIds: formMediaIds,
          }),
        });
        showToast('Tạo giao dịch thành công');
      }
      setDialogOpen(false);
      await fetchTransactions();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Có lỗi khi lưu giao dịch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!txToDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/transactions/${txToDelete.id}`, {
        method: 'DELETE',
      });
      showToast('Xóa giao dịch thành công');
      setDeleteConfirmOpen(false);
      setTxToDelete(null);
      await fetchTransactions();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể xóa giao dịch');
    } finally {
      setDeleting(false);
    }
  };

  const filteredCategoriesForForm = categories.filter((c) => c.type === formType);

  const columns: ColumnDef<TransactionItem>[] = [
    {
      header: 'Mã GD',
      accessorKey: 'code',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-fg">{row.original.code}</span>
      ),
    },
    {
      header: 'Ngày',
      accessorKey: 'date',
      cell: ({ row }) => (
        <span className="text-xs text-muted">{formatDate(row.original.date)}</span>
      ),
    },
    {
      header: 'Loại',
      accessorKey: 'type',
      cell: ({ row }) => {
        const isIncome = row.original.type === TransactionType.INCOME;
        return (
          <span
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${
              isIncome ? 'bg-ok-bg text-ok' : 'bg-crit-bg text-crit'
            }`}
          >
            {isIncome ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : (
              <ArrowUpRight className="h-3 w-3" />
            )}
            {isIncome ? 'Thu' : 'Chi'}
          </span>
        );
      },
    },
    {
      header: 'Danh mục',
      accessorKey: 'category',
      cell: ({ row }) => (
        <span className="font-medium text-fg">{row.original.category?.name || '-'}</span>
      ),
    },
    {
      header: 'Mùa vụ',
      accessorKey: 'cycle',
      cell: ({ row }) => {
        const cycle = row.original.cycle;
        if (!cycle) return <span className="text-muted text-xs">-</span>;
        return (
          <span className="text-xs text-fg">
            {cycle.name} <span className="text-muted">({cycle.code})</span>
          </span>
        );
      },
    },
    {
      header: 'Số tiền',
      accessorKey: 'amount',
      cell: ({ row }) => {
        const isIncome = row.original.type === TransactionType.INCOME;
        return (
          <span className={`font-semibold ${isIncome ? 'text-ok' : 'text-crit'}`}>
            {isIncome ? '+' : '-'}
            {formatVND(row.original.amount)}
          </span>
        );
      },
    },
    {
      header: 'Hình thức',
      accessorKey: 'method',
      cell: ({ row }) => (
        <span className="rounded bg-surface-2 border border-line px-2 py-0.5 text-xs text-fg">
          {methodLabels[row.original.method] || row.original.method}
        </span>
      ),
    },
    {
      header: 'Nguồn chứng từ',
      accessorKey: 'refType',
      cell: ({ row }) => {
        const { refType, refId, orderId, orderCode, poId, poCode } = row.original;
        if (orderId || refType === 'SalesOrder' || refType === 'Payment') {
          const targetId = orderId || (refType === 'SalesOrder' ? refId : undefined);
          return (
            <Link
              href={targetId ? `/admin/sales/orders/${targetId}` : '/admin/sales/orders'}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              Đơn bán {orderCode ? `(${orderCode})` : ''} <ExternalLink className="h-3 w-3" />
            </Link>
          );
        }
        if (poId || refType === 'PurchaseOrder' || refType === 'PO') {
          const targetId =
            poId || (refType === 'PurchaseOrder' || refType === 'PO' ? refId : undefined);
          return (
            <Link
              href={targetId ? `/admin/purchase-orders/${targetId}` : '/admin/purchase-orders'}
              className="inline-flex items-center gap-1 text-xs font-medium text-info hover:underline"
            >
              Đơn mua PO {poCode ? `(${poCode})` : ''} <ExternalLink className="h-3 w-3" />
            </Link>
          );
        }
        return <span className="text-xs text-muted">Thủ công</span>;
      },
    },
    {
      header: 'Chứng từ',
      accessorKey: 'mediaIds',
      cell: ({ row }) => {
        const count = row.original.mediaIds?.length || 0;
        if (count === 0) return <span className="text-muted text-xs">-</span>;
        return (
          <button
            type="button"
            onClick={() => setPreviewMediaIds(row.original.mediaIds)}
            className="inline-flex items-center gap-1 rounded bg-surface-2 border border-line px-2 py-0.5 text-xs text-fg hover:bg-hover"
          >
            <ImageIcon className="h-3 w-3" />
            {count} ảnh
          </button>
        );
      },
    },
    {
      header: 'Ghi chú',
      accessorKey: 'notes',
      cell: ({ row }) => (
        <span
          className="text-xs text-muted max-w-[150px] truncate block"
          title={row.original.notes || ''}
        >
          {row.original.notes || '-'}
        </span>
      ),
    },
    {
      header: 'Thao tác',
      id: 'actions',
      cell: ({ row }) => {
        const isAutomatic = Boolean(row.original.refType);
        // Giao dịch tự động không có nút sửa / xóa
        if (isAutomatic) {
          return <span className="text-xs text-muted italic">Tự động</span>;
        }

        return (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEditDialog(row.original)}
              className="h-7 px-2 text-xs border-line text-muted hover:text-fg"
              title="Sửa giao dịch"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTxToDelete(row.original);
                setDeleteConfirmOpen(true);
              }}
              className="h-7 px-2 text-xs text-crit hover:bg-crit-bg border-crit/30"
              title="Xóa giao dịch"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} />

      <PageHeader
        title="Giao dịch tài chính"
        description="Sổ thu chi, theo dõi dòng tiền trang trại và ghi nhận các khoản chi phí phát sinh"
      >
        <Button
          onClick={openCreateDialog}
          className="bg-accent hover:bg-accent-hover text-on-accent font-medium"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Tạo giao dịch
        </Button>
      </PageHeader>

      {/* Tổng thu - Tổng chi - Chênh lệch của bộ lọc */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-ok/30 bg-ok-bg/20 p-4 shadow-xs text-ok">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Tổng thu (Bộ lọc)
            </span>
            <ArrowDownRight className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold mt-2">{formatVND(totalIncome)}</p>
        </div>

        <div className="rounded-lg border border-crit/30 bg-crit-bg/20 p-4 shadow-xs text-crit">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Tổng chi (Bộ lọc)
            </span>
            <ArrowUpRight className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold mt-2">{formatVND(totalExpense)}</p>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4 shadow-xs text-fg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Chênh lệch (Thu - Chi)
            </span>
            <DollarSign className="h-4 w-4 text-muted" />
          </div>
          <p className={`text-2xl font-bold mt-2 ${netBalance >= 0 ? 'text-ok' : 'text-crit'}`}>
            {formatVND(netBalance)}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3 sm:p-4 text-fg shadow-xs">
        <div className="min-w-[180px] flex-1">
          <Input
            placeholder="Tìm theo mã giao dịch, ghi chú..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="bg-surface border-line text-fg"
          />
        </div>

        <div className="w-36">
          <select
            aria-label="Loại giao dịch"
            className="flex h-9 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm shadow-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả loại</option>
            <option value={TransactionType.INCOME}>Khoản thu</option>
            <option value={TransactionType.EXPENSE}>Khoản chi</option>
          </select>
        </div>

        <div className="w-44">
          <select
            aria-label="Danh mục thu chi"
            className="flex h-9 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm shadow-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type === TransactionType.INCOME ? 'Thu' : 'Chi'})
              </option>
            ))}
          </select>
        </div>

        <div className="w-44">
          <select
            aria-label="Mùa vụ"
            className="flex h-9 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm shadow-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
            value={cycleFilter}
            onChange={(e) => {
              setCycleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả mùa vụ</option>
            {cycles.map((cy) => (
              <option key={cy.id} value={cy.id}>
                {cy.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="Từ ngày"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="w-36 bg-surface border-line text-fg"
          />
          <span className="text-muted text-xs">đến</span>
          <Input
            type="date"
            aria-label="Đến ngày"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="w-36 bg-surface border-line text-fg"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-lg border border-line bg-surface shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={transactions}
          total={total}
          page={page}
          pageSize={20}
          onPageChange={setPage}
          isLoading={loading}
        />
      </div>

      {/* Form Dialog Tạo/Sửa giao dịch thủ công */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-surface border-line text-fg">
          <DialogHeader>
            <DialogTitle className="text-fg">
              {editingTx ? 'Chỉnh sửa giao dịch' : 'Tạo giao dịch thu / chi mới'}
            </DialogTitle>
            <DialogDescription className="text-muted">
              Nhập các thông tin chứng từ thu/chi và đính kèm hóa đơn chứng từ.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tx-type" className="text-fg">
                  Loại giao dịch *
                </Label>
                <select
                  id="tx-type"
                  className="flex h-9 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm shadow-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                  value={formType}
                  onChange={(e) => {
                    const nextType = e.target.value as TransactionType;
                    setFormType(nextType);
                    setFormCategoryId('');
                  }}
                >
                  <option value={TransactionType.EXPENSE}>Chi tiền (EXPENSE)</option>
                  <option value={TransactionType.INCOME}>Thu tiền (INCOME)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tx-category" className="text-fg">
                  Danh mục thu/chi *
                </Label>
                <select
                  id="tx-category"
                  className="flex h-9 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm shadow-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                >
                  <option value="">-- Chọn danh mục --</option>
                  {filteredCategoriesForForm.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tx-amount" className="text-fg">
                  Số tiền (₫) *
                </Label>
                <MoneyInput
                  id="tx-amount"
                  value={formAmount}
                  onChange={(val) => setFormAmount(val)}
                  placeholder="0"
                  className="bg-surface border-line text-fg"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tx-date" className="text-fg">
                  Ngày giao dịch *
                </Label>
                <Input
                  id="tx-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="bg-surface border-line text-fg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tx-cycle" className="text-fg">
                  Mùa vụ (tùy chọn)
                </Label>
                <select
                  id="tx-cycle"
                  className="flex h-9 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm shadow-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                  value={formCycleId}
                  onChange={(e) => setFormCycleId(e.target.value)}
                >
                  <option value="">-- Không gắn mùa vụ --</option>
                  {cycles.map((cy) => (
                    <option key={cy.id} value={cy.id}>
                      {cy.name} ({cy.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tx-method" className="text-fg">
                  Phương thức *
                </Label>
                <select
                  id="tx-method"
                  className="flex h-9 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm shadow-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                  value={formMethod}
                  onChange={(e) => setFormMethod(e.target.value as PaymentMethod)}
                >
                  <option value={PaymentMethod.BANK_TRANSFER}>Chuyển khoản</option>
                  <option value={PaymentMethod.CASH}>Tiền mặt</option>
                  <option value={PaymentMethod.COD}>COD</option>
                  <option value={PaymentMethod.VNPAY}>VNPay</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-notes" className="text-fg">
                Ghi chú diễn giải
              </Label>
              <Input
                id="tx-notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="VD: Mua phân bón đợt 2, tiền điện tưới tiêu..."
                className="bg-surface border-line text-fg"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-fg">Ảnh chứng từ (Hóa đơn / Biên lai)</Label>
              <MultiImageUpload value={formMediaIds} onChange={(ids) => setFormMediaIds(ids)} />
            </div>

            {formError && <p className="text-xs text-crit">{formError}</p>}

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setDialogOpen(false)}
                className="border-line text-fg hover:bg-hover"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-accent hover:bg-accent-hover text-on-accent font-medium"
              >
                {submitting ? 'Đang lưu...' : editingTx ? 'Cập nhật' : 'Tạo giao dịch'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Xác nhận xóa giao dịch"
        description={`Bạn có chắc chắn muốn xóa giao dịch ${txToDelete?.code} không? Thao tác này không thể hoàn tác.`}
        confirmText="Xóa giao dịch"
        isDanger={true}
        isLoading={deleting}
        onConfirm={handleDelete}
      />

      {/* Preview Media Dialog */}
      <Dialog
        open={Boolean(previewMediaIds)}
        onOpenChange={(open) => !open && setPreviewMediaIds(null)}
      >
        <DialogContent className="max-w-2xl bg-surface border-line text-fg">
          <DialogHeader>
            <DialogTitle className="text-fg">Ảnh chứng từ đính kèm</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-2 max-h-[60vh] overflow-y-auto">
            {previewMediaIds?.map((id, idx) => (
              <div
                key={id || idx}
                className="h-44 rounded-lg overflow-hidden border border-line bg-surface-2"
              >
                <img
                  src={`/api/v1/media/${id}`}
                  alt={`Chứng từ ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
