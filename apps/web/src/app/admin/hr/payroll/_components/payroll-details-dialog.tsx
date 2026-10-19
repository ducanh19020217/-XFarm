'use client';

import * as React from 'react';
import { FormDialog, Button, StatusBadge } from '@xfarm/ui';
import { formatCurrency, formatDate, getPayTypeLabel } from '../../common/format';
import type { PayrollItem } from '../../common/types';

interface PayrollDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payroll: PayrollItem | null;
}

interface BreakdownItem {
  date?: string | Date;
  cycle?: string;
  cycleName?: string;
  cycleId?: string;
  hours?: number;
  pieceQty?: number;
  amount?: number;
  total?: number;
}

export function PayrollDetailsDialog({ open, onOpenChange, payroll }: PayrollDetailsDialogProps) {
  if (!payroll) return null;

  const emp = payroll.employee;
  const rawDetails = payroll.details as unknown;
  const breakdown: BreakdownItem[] = Array.isArray(rawDetails)
    ? (rawDetails as BreakdownItem[])
    : (rawDetails as { dailyBreakdown?: BreakdownItem[]; lines?: BreakdownItem[] })
        ?.dailyBreakdown ||
      (rawDetails as { dailyBreakdown?: BreakdownItem[]; lines?: BreakdownItem[] })?.lines ||
      [];
  const details = (Array.isArray(rawDetails) ? {} : rawDetails || {}) as Record<
    string,
    number | string | undefined
  >;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Chi tiết bảng lương: ${emp?.fullName || ''}`}
      description={`Kỳ lương: ${formatDate(payroll.periodStart)} – ${formatDate(payroll.periodEnd)}`}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Info summary */}
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900 sm:grid-cols-4">
          <div>
            <span className="text-xs text-slate-500">Mã NV:</span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{emp?.code}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Hình thức:</span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {getPayTypeLabel(emp?.payType || '')}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Lương cơ sở:</span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {formatCurrency(emp?.baseRate)}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Trạng thái:</span>
            <div>
              <StatusBadge status={payroll.status} />
            </div>
          </div>
        </div>

        {/* Calculation summary */}
        <div className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
          <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
            Công thức & Tổng hợp kỳ:
          </h4>
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
            {details.days !== undefined && (
              <div>
                <span className="text-slate-500">Số ngày công: </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {details.days} ngày
                </span>
              </div>
            )}
            {details.actualDays !== undefined && (
              <div>
                <span className="text-slate-500">Ngày công thực tế: </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {details.actualDays} / {details.standardDays || 26} ngày chuẩn
                </span>
              </div>
            )}
            {details.hours !== undefined && (
              <div>
                <span className="text-slate-500">Tổng số giờ làm: </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {details.hours} giờ
                </span>
              </div>
            )}
            {details.pieceQty !== undefined && (
              <div>
                <span className="text-slate-500">Số lượng sản phẩm: </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {details.pieceQty} SP
                </span>
              </div>
            )}
            <div>
              <span className="text-slate-500">Tổng thành tiền: </span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                {formatCurrency(payroll.amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown table */}
        <div>
          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-2">
            Chi tiết từng ngày ({breakdown.length} ngày ghi nhận):
          </h4>

          {breakdown.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              Không có dữ liệu chi tiết từng ngày hoặc bảng lương được tính gộp.
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-2 font-semibold">Ngày</th>
                    <th className="p-2 font-semibold">Mùa vụ</th>
                    <th className="p-2 text-center font-semibold">Giờ</th>
                    <th className="p-2 text-center font-semibold">Số lượng SP</th>
                    <th className="p-2 text-right font-semibold">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {breakdown.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                      <td className="p-2 font-medium">{formatDate(row.date)}</td>
                      <td className="p-2 text-slate-500">
                        {row.cycle || row.cycleName || row.cycleId || '-'}
                      </td>
                      <td className="p-2 text-center">
                        {row.hours !== undefined ? `${row.hours}h` : '-'}
                      </td>
                      <td className="p-2 text-center">
                        {row.pieceQty !== undefined ? row.pieceQty : '-'}
                      </td>
                      <td className="p-2 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
