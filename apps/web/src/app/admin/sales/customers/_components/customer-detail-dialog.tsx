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
        <div className="py-12 text-center text-sm text-muted">Đang tải thông tin...</div>
      ) : error ? (
        <div className="p-4 text-center text-sm text-crit bg-crit-bg border border-crit/20 rounded-lg">{error}</div>
      ) : customer ? (
        <div className="space-y-6 text-fg">
          {/* Thông tin cơ bản */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-line p-4 bg-surface-2 text-fg">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-fg">
                  {customer.name}
                </span>
                <CustomerTypeBadge type={customer.type} />
                <StatusBadge status={customer.isActive} />
              </div>
              <div className="flex items-center gap-2 text-muted">
                <Phone className="h-4 w-4 text-muted" />
                <span className="text-fg">{customer.phone}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-2 text-muted">
                  <Mail className="h-4 w-4 text-muted" />
                  <span className="text-fg">{customer.email}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-2 text-muted">
                  <MapPin className="h-4 w-4 text-muted" />
                  <span className="text-fg">{customer.address}</span>
                </div>
              )}
            </div>

            {/* Chỉ số công nợ và tổng mua */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-line bg-surface p-3 text-fg shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
                  <ShoppingBag className="h-3.5 w-3.5 text-accent" />
                  <span>Tổng tiền đã mua</span>
                </div>
                <div className="text-base font-bold text-fg">
                  {formatCurrency(customer.totalPurchase)}
                </div>
              </div>

              <div className="rounded-lg border border-line bg-surface p-3 text-fg shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
                  <CreditCard className="h-3.5 w-3.5 text-crit" />
                  <span>Công nợ hiện tại</span>
                </div>
                <div
                  className={`text-base font-bold ${
                    Number(customer.debt) > 0
                      ? 'text-crit'
                      : 'text-fg'
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
              <h3 className="text-sm font-semibold text-fg">
                Lịch sử đơn hàng ({orders.length})
              </h3>
            </div>

            {orders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
                Khách hàng chưa có đơn hàng nào
              </div>
            ) : (
              <div className="rounded-md border border-line overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-2 text-xs font-semibold text-muted border-b border-line">
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
                  <tbody className="divide-y divide-line">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-hover"
                      >
                        <td className="py-2.5 px-3 font-medium text-fg">
                          {order.code}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-muted">
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
                        <td className="py-2.5 px-3 text-right font-medium text-fg">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Link
                            href={`/admin/sales/orders/${order.id}`}
                            className="inline-flex items-center text-xs text-accent hover:underline gap-1"
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

          <div className="flex justify-end pt-4 border-t border-line">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-line text-fg">
              Đóng
            </Button>
          </div>
        </div>
      ) : null}
    </FormDialog>
  );
}
