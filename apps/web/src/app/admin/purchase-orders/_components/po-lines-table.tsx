'use client';

import * as React from 'react';
import { formatCurrency } from './constants';
import type { PurchaseOrderLineItem } from './types';

interface POLinesTableProps {
  lines: PurchaseOrderLineItem[];
}

export function POLinesTable({ lines }: POLinesTableProps) {
  const lineDetails = lines.map((line) => {
    const qty = Number(line.quantity) || 0;
    const received = Number(line.receivedQty) || 0;
    const remaining = Math.max(0, qty - received);
    const price = Number(line.unitPrice) || 0;
    const lineTotal = qty * price;
    return {
      ...line,
      qty,
      received,
      remaining,
      price,
      lineTotal,
    };
  });

  const grandTotal = lineDetails.reduce((sum, item) => sum + item.lineTotal, 0);

  return (
    <div className="rounded-lg border border-line bg-surface p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <h3 className="font-semibold text-fg">Chi tiết các dòng hàng</h3>
        <span className="text-xs text-muted">{lines.length} mặt hàng</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium text-muted">
              <th className="p-2 min-w-[180px]">Vật tư</th>
              <th className="p-2 text-center w-24">Đã đặt</th>
              <th className="p-2 text-center w-24">Đã nhận</th>
              <th className="p-2 text-center w-24 font-semibold text-ok">Còn lại</th>
              <th className="p-2 text-right w-32">Đơn giá</th>
              <th className="p-2 text-right w-36">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lineDetails.map((line) => (
              <tr key={line.id} className="hover:bg-hover">
                <td className="p-2">
                  <div className="font-medium text-fg">{line.item?.name || 'Vật tư'}</div>
                  <div className="text-xs text-muted">
                    Mã: {line.item?.sku || '-'} · ĐVT: {line.item?.unit || '-'}
                  </div>
                </td>
                <td className="p-2 text-center font-medium text-fg-2">{line.qty}</td>
                <td className="p-2 text-center font-medium text-fg-2">{line.received}</td>
                <td className="p-2 text-center font-bold text-ok">{line.remaining}</td>
                <td className="p-2 text-right text-fg-2">{formatCurrency(line.price)}</td>
                <td className="p-2 text-right font-medium text-fg">
                  {formatCurrency(line.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line font-semibold text-fg bg-surface-2">
              <td colSpan={5} className="p-3 text-right">
                Tổng tiền:
              </td>
              <td className="p-3 text-right text-base text-ok font-bold">
                {formatCurrency(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
