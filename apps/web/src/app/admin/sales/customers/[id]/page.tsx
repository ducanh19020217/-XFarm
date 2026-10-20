'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button, PageHeader, StatusBadge } from '@xfarm/ui';
import { ArrowLeft, Phone, Mail, MapPin, ShoppingBag, CreditCard } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { CustomerDetailRecord, SalesOrderRecord } from '../../_components/types';
import { formatCurrency, formatDate } from '../../_components/constants';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  ChannelBadge,
  CustomerTypeBadge,
} from '../../_components/order-status-badge';

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [customer, setCustomer] = React.useState<CustomerDetailRecord | null>(null);
  const [orders, setOrders] = React.useState<SalesOrderRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<{ data: CustomerDetailRecord } | CustomerDetailRecord>(`/customers/${params.id}`),
      apiFetch<{ data: SalesOrderRecord[] } | SalesOrderRecord[]>(
        `/sales-orders?customerId=${params.id}&pageSize=50`,
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
        setError(err.message || 'Không tìm thấy khách hàng');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading) {
    return <div className="py-12 text-center text-sm text-muted">Đang tải thông tin...</div>;
  }

  if (error || !customer) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push('/admin/sales/customers')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại
        </Button>
        <div className="p-6 text-center text-crit bg-crit-bg border border-crit/20 rounded-lg">
          {error || 'Không tìm thấy thông tin khách hàng'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.push('/admin/sales/customers')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại danh sách
        </Button>
      </div>

      <PageHeader
        title={`Khách hàng: ${customer.name}`}
        description={`Mã khách hàng: ${customer.code}`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-line p-5 bg-surface shadow-xs text-fg">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-fg">
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

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-line bg-surface-2 p-4 text-fg">
            <div className="flex items-center gap-2 text-xs text-muted mb-1">
              <ShoppingBag className="h-4 w-4 text-accent" />
              <span>Tổng tiền đã mua</span>
            </div>
            <div className="text-xl font-bold text-fg">
              {formatCurrency(customer.totalPurchase)}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-surface-2 p-4 text-fg">
            <div className="flex items-center gap-2 text-xs text-muted mb-1">
              <CreditCard className="h-4 w-4 text-crit" />
              <span>Công nợ hiện tại</span>
            </div>
            <div
              className={`text-xl font-bold ${
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

      <div className="space-y-4">
        <h3 className="text-base font-semibold text-fg">
          Lịch sử đơn hàng ({orders.length})
        </h3>

        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-muted">
            Khách hàng chưa có đơn hàng nào
          </div>
        ) : (
          <div className="rounded-lg border border-line bg-surface overflow-hidden shadow-xs text-fg">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-xs font-semibold text-muted border-b border-line">
                <tr>
                  <th className="py-3 px-4">Mã đơn</th>
                  <th className="py-3 px-4">Ngày đặt</th>
                  <th className="py-3 px-4">Kênh</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Thanh toán</th>
                  <th className="py-3 px-4 text-right">Tổng tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-hover">
                    <td className="py-3 px-4 font-medium">
                      <Link
                        href={`/admin/sales/orders/${order.id}`}
                        className="text-accent hover:underline"
                      >
                        {order.code}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <ChannelBadge channel={order.channel} status={order.status} />
                    </td>
                    <td className="py-3 px-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-3 px-4">
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-fg">
                      {formatCurrency(order.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
