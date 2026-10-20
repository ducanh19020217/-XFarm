'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button, FormDialog, StatusBadge } from '@xfarm/ui';
import { ShoppingBag, CreditCard, Phone, Mail, MapPin, ExternalLink } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { CustomerDetailRecord, SalesOrderRecord } from '../../_components/types';
import { formatCurrency, formatDate } from '../../_components/constants';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  ChannelBadge,
  CustomerTypeBadge,
} from '../../_components/order-status-badge';

interface CustomerDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string | null;
}

export function CustomerDetailDialog({
  open,
  onOpenChange,
  customerId,
}: CustomerDetailDialogProps) {
  const [customer, setCustomer] = React.useState<CustomerDetailRecord | null>(null);
  const [orders, setOrders] = React.useState<SalesOrderRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !customerId) {
      setCustomer(null);
      setOrders([]);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      apiFetch<{ data: CustomerDetailRecord } | CustomerDetailRecord>(`/customers/${customerId}`),
      apiFetch<{ data: SalesOrderRecord[] } | SalesOrderRecord[]>(
        `/sales-orders?customerId=${customerId}&pageSize=50`,
      ),
    ])
      .then(([customerRes, ordersRes]) => {
        if (!active) return;
        const custData = (
          customerRes && 'data' in customerRes ? customerRes.data : customerRes
        ) as CustomerDetailRecord;
        const ordersData = (
          ordersRes && 'data' in ordersRes ? ordersRes.data : ordersRes
        ) as SalesOrderRecord[];

        setCustomer(custData);
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Lỗi khi tải chi tiết khách hàng:', err);
        setError('Không thể tải thông tin khách hàng');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, customerId]);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={customer ? `Khách hàng: ${customer.name}` : 'Chi tiết khách hàng'}
      description={customer ? `Mã khách hàng: ${customer.code}` : undefined}
      className="sm:max-w-[750px] max-h-[85vh] overflow-y-auto"
    >
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Đang tải thông tin...</div>
      ) : error ? (
        <div className="p-4 text-center text-sm text-rose-500">{error}</div>
      ) : customer ? (
        <div className="space-y-6">
          {/* Thông tin cơ bản */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-slate-100 p-4 bg-slate-50 dark:bg-slate-900/50 dark:border-slate-800">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {customer.name}
                </span>
                <CustomerTypeBadge type={customer.type} />
                <StatusBadge status={customer.isActive} />
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{customer.phone}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>{customer.address}</span>
                </div>
              )}
            </div>

            {/* Chỉ số công nợ và tổng mua */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Tổng tiền đã mua</span>
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(customer.totalPurchase)}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <CreditCard className="h-3.5 w-3.5 text-rose-600" />
                  <span>Công nợ hiện tại</span>
                </div>
                <div
                  className={`text-base font-bold ${
                    Number(customer.debt) > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {formatCurrency(customer.debt)}
                </div>
              </div>
            </div>
          </div>

          {/* Đơn hàng đã mua */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Lịch sử đơn hàng ({orders.length})
              </h3>
            </div>

            {orders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800">
                Khách hàng chưa có đơn hàng nào
              </div>
            ) : (
              <div className="rounded-md border border-slate-200 overflow-hidden dark:border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Mã đơn</th>
                      <th className="py-2.5 px-3">Ngày đặt</th>
                      <th className="py-2.5 px-3">Kênh</th>
                      <th className="py-2.5 px-3">Trạng thái</th>
                      <th className="py-2.5 px-3">Thanh toán</th>
                      <th className="py-2.5 px-3 text-right">Tổng tiền</th>
                      <th className="py-2.5 px-3 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
                      >
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                          {order.code}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-slate-500">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="py-2.5 px-3">
                          <ChannelBadge channel={order.channel} status={order.status} />
                        </td>
                        <td className="py-2.5 px-3">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="py-2.5 px-3">
                          <PaymentStatusBadge status={order.paymentStatus} />
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Link
                            href={`/admin/sales/orders/${order.id}`}
                            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline gap-1 dark:text-blue-400"
                          >
                            Chi tiết
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </div>
        </div>
      ) : null}
    </FormDialog>
  );
}
