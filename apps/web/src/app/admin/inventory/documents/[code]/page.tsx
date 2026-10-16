'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Badge, Button, useToast, Toast } from '@xfarm/ui';
import { apiFetch } from '@/lib/api';
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  getDocumentTypeInfo,
  getExpiryStatus,
} from '../../format';
import type { StockDocumentItem } from '../../types';
import { ArrowLeft, Calendar, Building, Info, Package, DollarSign } from 'lucide-react';

export default function StockDocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { message, closeToast } = useToast();

  const code = (params?.code as string) || '';
  const [document, setDocument] = React.useState<StockDocumentItem | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!code) return;
    let active = true;
    setLoading(true);

    apiFetch<{ data?: StockDocumentItem } | StockDocumentItem>(
      `/stock/documents/${encodeURIComponent(code)}`,
    )
      .then((res) => {
        if (!active) return;
        const doc = 'data' in res && res.data ? res.data : (res as StockDocumentItem);
        setDocument(doc);
      })
      .catch(() => {
        if (!active) return;
        setDocument(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [code]);

  const typeInfo = getDocumentTypeInfo(code, document?.type);
  const isCount =
    code.startsWith('KK-') || document?.type === 'ADJUST' || document?.type === 'COUNT';

  // Calculate totals
  const totalQuantity = React.useMemo(() => {
    if (!document?.lines) return 0;
    return document.lines.reduce(
      (sum, line) => sum + (Number(line.quantity || line.actualQuantity) || 0),
      0,
    );
  }, [document?.lines]);

  const totalAmount = React.useMemo(() => {
    if (!document?.lines) return 0;
    return document.lines.reduce((sum, line) => {
      const lineAmt =
        line.amount != null
          ? Number(line.amount)
          : (Number(line.quantity) || 0) * (Number(line.unitCost) || 0);
      return sum + (Number.isNaN(lineAmt) ? 0 : lineAmt);
    }, 0);
  }, [document?.lines]);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/admin/inventory/documents"
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Quay lại danh sách phiếu kho
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Chi tiết phiếu: <span className="font-mono text-emerald-600">{code}</span>
            </h1>
            <Badge variant={typeInfo.badgeVariant}>{typeInfo.label}</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Xem thông tin chứng từ và danh sách các mặt hàng phát sinh biến động kho.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-950">
          Đang tải dữ liệu phiếu kho...
        </div>
      ) : !document ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-950">
          <p className="text-slate-600 dark:text-slate-400">
            Không tìm thấy thông tin cho mã phiếu <strong>{code}</strong> hoặc chứng từ chưa được
            tạo.
          </p>
          <Button
            onClick={() => router.push('/admin/inventory/documents')}
            variant="outline"
            className="mt-4"
          >
            Quay về danh sách
          </Button>
        </div>
      ) : (
        <>
          {/* Document metadata cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                <Calendar className="h-4 w-4" />
                <span>Thời gian ghi nhận</span>
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono">
                {formatDateTime(document.movedAt)}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                <Building className="h-4 w-4" />
                <span>Kho liên quan</span>
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {document.fromWarehouseName && document.toWarehouseName ? (
                  <span>
                    {document.fromWarehouseName} ➔ {document.toWarehouseName}
                  </span>
                ) : (
                  document.warehouseName ||
                  document.toWarehouseName ||
                  document.fromWarehouseName ||
                  '—'
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                <Package className="h-4 w-4" />
                <span>Tổng số dòng / Số lượng</span>
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {document.lines?.length || 0} dòng • {formatNumber(totalQuantity)} SP
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span>Tổng giá trị</span>
              </div>
              <div className="mt-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {isCount ? '—' : formatCurrency(totalAmount)}
              </div>
            </div>
          </div>

          {/* Notes banner if present */}
          {document.notes && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-900 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300 flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
              <div>
                <span className="font-semibold">Ghi chú phiếu:</span> {document.notes}
              </div>
            </div>
          )}

          {/* Lines Table */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Chi tiết các dòng hàng
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 w-12">STT</th>
                    <th className="px-4 py-3">Vật tư</th>
                    <th className="px-4 py-3">Đơn vị</th>
                    <th className="px-4 py-3">Mã lô</th>
                    <th className="px-4 py-3">Hạn dùng</th>
                    {isCount ? (
                      <>
                        <th className="px-4 py-3 text-right">Tồn sổ sách</th>
                        <th className="px-4 py-3 text-right">Số đếm thực tế</th>
                        <th className="px-4 py-3 text-right">Chênh lệch</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 text-right">Số lượng</th>
                        <th className="px-4 py-3 text-right">Đơn giá</th>
                        <th className="px-4 py-3 text-right">Thành tiền</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {!document.lines || document.lines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                        Chưa có dữ liệu dòng hàng cho phiếu này.
                      </td>
                    </tr>
                  ) : (
                    document.lines.map((line, idx) => {
                      const expiry = getExpiryStatus(line.expiryDate);
                      const qty = Number(line.quantity || 0);
                      const cost = Number(line.unitCost || 0);
                      const lineTotal = line.amount != null ? Number(line.amount) : qty * cost;

                      const bookQty = Number(line.bookQuantity || 0);
                      const actualQty = Number(line.actualQuantity || 0);
                      const diff = actualQty - bookQty;

                      return (
                        <tr
                          key={line.id || idx}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
                        >
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {line.itemName || line.itemId}
                            </span>
                            {line.itemSku && (
                              <span className="block text-xs font-mono text-slate-500">
                                SKU: {line.itemSku}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            {line.unit || '—'}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                            {line.lotCode || '—'}
                          </td>
                          <td className="px-4 py-3">
                            {expiry ? (
                              <Badge variant={expiry.variant}>
                                {expiry.isExpired
                                  ? 'Hết hạn'
                                  : expiry.isExpiringSoon
                                    ? expiry.label
                                    : expiry.formattedDate}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          {isCount ? (
                            <>
                              <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                                {formatNumber(bookQty)}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                                {formatNumber(actualQty)}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold">
                                <span
                                  className={
                                    diff === 0
                                      ? 'text-slate-500'
                                      : diff > 0
                                        ? 'text-emerald-600'
                                        : 'text-red-600'
                                  }
                                >
                                  {diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff)}
                                </span>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                                {formatNumber(qty)}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                                {formatCurrency(cost)}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(lineTotal)}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Total footer */}
            {!isCount && document.lines && document.lines.length > 0 && (
              <div className="flex items-center justify-end gap-6 bg-slate-50/50 px-6 py-4 border-t border-slate-200 dark:border-slate-800 dark:bg-slate-900/50">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Tổng thành tiền phiếu:
                </span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {message && <Toast message={message} onClose={closeToast} />}
    </div>
  );
}
