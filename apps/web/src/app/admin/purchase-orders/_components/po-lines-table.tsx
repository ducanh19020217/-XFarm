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
    <div className="rounded-lg border bg-white p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="font-semibold text-slate-900">Chi tiết các dòng hàng</h3>
        <span className="text-xs text-slate-500">{lines.length} mặt hàng</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium text-slate-500">
              <th className="p-2 min-w-[180px]">Vật tư</th>
              <th className="p-2 text-center w-24">Đã đặt</th>
              <th className="p-2 text-center w-24">Đã nhận</th>
              <th className="p-2 text-center w-24 font-semibold text-emerald-700">Còn lại</th>
              <th className="p-2 text-right w-32">Đơn giá</th>
              <th className="p-2 text-right w-36">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lineDetails.map((line) => (
              <tr key={line.id} className="hover:bg-slate-50/50">
                <td className="p-2">
                  <div className="font-medium text-slate-800">{line.item?.name || 'Vật tư'}</div>
                  <div className="text-xs text-slate-400">
                    Mã: {line.item?.sku || '-'} · ĐVT: {line.item?.unit || '-'}
                  </div>
                </td>
                <td className="p-2 text-center font-medium text-slate-700">{line.qty}</td>
                <td className="p-2 text-center font-medium text-slate-700">{line.received}</td>
                <td className="p-2 text-center font-bold text-emerald-700">{line.remaining}</td>
                <td className="p-2 text-right text-slate-700">{formatCurrency(line.price)}</td>
                <td className="p-2 text-right font-medium text-slate-900">
                  {formatCurrency(line.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-semibold text-slate-800 bg-slate-50/80">
              <td colSpan={5} className="p-3 text-right">
                Tổng tiền:
              </td>
              <td className="p-3 text-right text-base text-emerald-700 font-bold">
                {formatCurrency(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
