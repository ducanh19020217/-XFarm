'use client';

import * as React from 'react';
import {
  PageHeader,
  Button,
  Toast,
  useToast,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Label,
} from '@xfarm/ui';
import { Calculator, Download, DollarSign, Users, CheckCircle2, Loader2 } from 'lucide-react';
import { PayrollStatus } from '@xfarm/shared';
import { apiFetch, ApiError, isAbortError } from '@/lib/api';
import { useAdminUser } from '../../admin-user-context';
import { canManagePayroll, canPayPayroll, formatCurrency } from '../common/format';
import type { PayrollItem } from '../common/types';
import { PayrollTable } from './_components/payroll-table';
import { PayrollDetailsDialog } from './_components/payroll-details-dialog';
import { exportPayrollToCSV } from './_components/payroll-export';

export default function PayrollPage() {
  const user = useAdminUser();
  const canManage = canManagePayroll(user?.role);
  const canPay = canPayPayroll(user?.role);
  const { message, showToast, closeToast } = useToast();

  // Current month default period (1st to last day)
  const defaultDates = React.useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const end = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(lastDay)}`;
    return { start, end };
  }, []);

  const [periodStart, setPeriodStart] = React.useState(defaultDates.start);
  const [periodEnd, setPeriodEnd] = React.useState(defaultDates.end);
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');

  const [payrolls, setPayrolls] = React.useState<PayrollItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);

  // Selected item for details modal
  const [detailsItem, setDetailsItem] = React.useState<PayrollItem | null>(null);

  const pageSize = 20;

  const fetchPayrolls = React.useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        periodStart,
        periodEnd,
      });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      try {
        const res = await apiFetch<{ data: PayrollItem[]; total?: number }>(`/payrolls?${params}`, {
          signal,
        });
        setPayrolls(res.data || []);
        setTotal(res.total ?? (res.data?.length || 0));
      } catch (err) {
        if (!isAbortError(err)) {
          if (err instanceof ApiError && err.statusCode === 404) {
            setPayrolls([]);
            setTotal(0);
          } else {
            showToast(err instanceof ApiError ? err.message : 'Không thể tải bảng lương');
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, periodEnd, periodStart, search, showToast, statusFilter],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchPayrolls(controller.signal);
    return () => controller.abort();
  }, [fetchPayrolls]);

  // Các thao tác async (tính lương, duyệt, trả) tải lại theo bộ lọc hiện tại, không theo closure cũ
  const fetchPayrollsRef = React.useRef(fetchPayrolls);
  fetchPayrollsRef.current = fetchPayrolls;

  // Handle "Tính lương"
  const handleGeneratePayroll = async () => {
    setGenerating(true);
    try {
      await apiFetch('/payrolls/generate', {
        method: 'POST',
        body: JSON.stringify({
          periodStart,
          periodEnd,
        }),
      });
      showToast('Tính toán bảng lương thành công');
      await fetchPayrollsRef.current();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không thể tạo bảng lương');
    } finally {
      setGenerating(false);
    }
  };

  // Handle Approve
  const handleApprove = async (item: PayrollItem) => {
    try {
      await apiFetch(`/payrolls/${item.id}/approve`, {
        method: 'POST',
      });
      showToast(`Đã duyệt bảng lương cho ${item.employee?.fullName}`);
      await fetchPayrollsRef.current();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không thể duyệt bảng lương');
    }
  };

  // Handle Pay
  const handlePay = async (item: PayrollItem) => {
    try {
      await apiFetch(`/payrolls/${item.id}/pay`, {
        method: 'POST',
      });
      showToast(`Đã xác nhận thanh toán lương cho ${item.employee?.fullName}`);
      await fetchPayrollsRef.current();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không thể cập nhật thanh toán lương');
    }
  };

  // Handle CSV export
  const handleExportCSV = () => {
    if (payrolls.length === 0) {
      showToast('Không có dữ liệu bảng lương để xuất CSV');
      return;
    }
    exportPayrollToCSV(payrolls, periodStart, periodEnd);
    showToast('Đã tải xuống file CSV bảng lương');
  };

  // Summary stats
  const stats = React.useMemo(() => {
    let totalAmount = 0;
    let approvedCount = 0;
    let paidCount = 0;

    payrolls.forEach((p) => {
      totalAmount += Number(p.amount) || 0;
      if (p.status === PayrollStatus.APPROVED) approvedCount++;
      if (p.status === PayrollStatus.PAID) paidCount++;
    });

    return {
      totalAmount,
      totalCount: payrolls.length,
      approvedCount,
      paidCount,
    };
  }, [payrolls]);

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} />

      <PageHeader
        title="Bảng lương nhân sự"
        description="Tính lương theo ngày, theo tháng và theo sản phẩm, duyệt và thanh toán kỳ lương"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={payrolls.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Xuất CSV
          </Button>

          {canManage && (
            <Button onClick={handleGeneratePayroll} disabled={generating}>
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="mr-2 h-4 w-4" />
              )}
              Tính lương
            </Button>
          )}
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổng quỹ lương kỳ này</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(stats.totalAmount)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Số nhân viên trong kỳ</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {stats.totalCount} người
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Đã duyệt / Đã thanh toán</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {stats.approvedCount} duyệt • {stats.paidCount} đã trả
            </p>
          </div>
        </div>
      </div>

      {/* Period Selection & Filter Bar */}
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="periodStart" className="text-xs">
              Từ ngày
            </Label>
            <Input
              id="periodStart"
              type="date"
              value={periodStart}
              onChange={(e) => {
                setPeriodStart(e.target.value);
                setPage(1);
              }}
              className="h-8 text-xs w-36"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="periodEnd" className="text-xs">
              Đến ngày
            </Label>
            <Input
              id="periodEnd"
              type="date"
              value={periodEnd}
              onChange={(e) => {
                setPeriodEnd(e.target.value);
                setPage(1);
              }}
              className="h-8 text-xs w-36"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="statusSelect" className="text-xs">
              Trạng thái
            </Label>
            <div className="w-40">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger id="statusSelect" className="h-8 text-xs">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value={PayrollStatus.DRAFT}>Bản nháp</SelectItem>
                  <SelectItem value={PayrollStatus.APPROVED}>Đã duyệt</SelectItem>
                  <SelectItem value={PayrollStatus.PAID}>Đã thanh toán</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <PayrollTable
        items={payrolls}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        isLoading={loading}
        canApprove={canManage}
        canPay={canPay}
        onViewDetails={(item) => setDetailsItem(item)}
        onApprove={handleApprove}
        onPay={handlePay}
      />

      {/* Details Dialog */}
      <PayrollDetailsDialog
        open={Boolean(detailsItem)}
        onOpenChange={(open) => {
          if (!open) setDetailsItem(null);
        }}
        payroll={detailsItem}
      />
    </div>
  );
}
