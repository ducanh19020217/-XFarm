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
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-surface-2 p-3 text-sm text-fg border border-line sm:grid-cols-4">
          <div>
            <span className="text-xs text-muted">Mã NV:</span>
            <p className="font-semibold text-fg">{emp?.code}</p>
          </div>
          <div>
            <span className="text-xs text-muted">Hình thức:</span>
            <p className="font-semibold text-fg">
              {getPayTypeLabel(emp?.payType || '')}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted">Lương cơ sở:</span>
            <p className="font-semibold text-fg">
              {formatCurrency(emp?.baseRate)}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted">Trạng thái:</span>
            <div>
              <StatusBadge status={payroll.status} />
            </div>
          </div>
        </div>

        {/* Calculation summary */}
        <div className="rounded-lg border border-line p-3 text-sm text-fg bg-surface">
          <h4 className="font-semibold text-fg mb-2">
            Công thức & Tổng hợp kỳ:
          </h4>
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
            {details.days !== undefined && (
              <div>
                <span className="text-muted">Số ngày công: </span>
                <span className="font-semibold text-fg">
                  {details.days} ngày
                </span>
              </div>
            )}
            {details.actualDays !== undefined && (
              <div>
                <span className="text-muted">Ngày công thực tế: </span>
                <span className="font-semibold text-fg">
                  {details.actualDays} / {details.standardDays || 26} ngày chuẩn
                </span>
              </div>
            )}
            {details.hours !== undefined && (
              <div>
                <span className="text-muted">Tổng số giờ làm: </span>
                <span className="font-semibold text-fg">
                  {details.hours} giờ
                </span>
              </div>
            )}
            {details.pieceQty !== undefined && (
              <div>
                <span className="text-muted">Số lượng sản phẩm: </span>
                <span className="font-semibold text-fg">
                  {details.pieceQty} SP
                </span>
              </div>
            )}
            <div>
              <span className="text-muted">Tổng thành tiền: </span>
              <span className="font-bold text-accent text-sm">
                {formatCurrency(payroll.amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown table */}
        <div>
          <h4 className="font-semibold text-sm text-fg mb-2">
            Chi tiết từng ngày ({breakdown.length} ngày ghi nhận):
          </h4>

          {breakdown.length === 0 ? (
            <p className="text-xs text-muted italic py-2">
              Không có dữ liệu chi tiết từng ngày hoặc bảng lương được tính gộp.
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto rounded-lg border border-line bg-surface">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2 text-fg-2 border-b border-line sticky top-0">
                  <tr>
                    <th className="p-2 font-semibold">Ngày</th>
                    <th className="p-2 font-semibold">Mùa vụ</th>
                    <th className="p-2 text-center font-semibold">Giờ</th>
                    <th className="p-2 text-center font-semibold">Số lượng SP</th>
                    <th className="p-2 text-right font-semibold">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {breakdown.map((row, idx) => (
                    <tr key={idx} className="hover:bg-hover/30">
                      <td className="p-2 font-medium text-fg">{formatDate(row.date)}</td>
                      <td className="p-2 text-muted">
                        {row.cycle || row.cycleName || row.cycleId || '-'}
                      </td>
                      <td className="p-2 text-center text-fg">
                        {row.hours !== undefined ? `${row.hours}h` : '-'}
                      </td>
                      <td className="p-2 text-center text-fg">
                        {row.pieceQty !== undefined ? row.pieceQty : '-'}
                      </td>
                      <td className="p-2 text-right font-semibold text-accent">
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
