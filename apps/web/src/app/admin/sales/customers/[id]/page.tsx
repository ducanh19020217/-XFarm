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
    return <div className="py-12 text-center text-sm text-slate-500">Đang tải thông tin...</div>;
  }

  if (error || !customer) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push('/admin/sales/customers')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại
        </Button>
        <div className="p-6 text-center text-rose-500 bg-rose-50 rounded-lg dark:bg-rose-950/30">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-slate-200 p-5 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
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

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <ShoppingBag className="h-4 w-4 text-emerald-600" />
              <span>Tổng tiền đã mua</span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(customer.totalPurchase)}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <CreditCard className="h-4 w-4 text-rose-600" />
              <span>Công nợ hiện tại</span>
            </div>
            <div
              className={`text-xl font-bold ${
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

      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Lịch sử đơn hàng ({orders.length})
        </h3>

        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-800">
            Khách hàng chưa có đơn hàng nào
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Mã đơn</th>
                  <th className="py-3 px-4">Ngày đặt</th>
                  <th className="py-3 px-4">Kênh</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Thanh toán</th>
                  <th className="py-3 px-4 text-right">Tổng tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-medium">
                      <Link
                        href={`/admin/sales/orders/${order.id}`}
                        className="text-emerald-700 hover:text-emerald-900 hover:underline dark:text-emerald-400"
                      >
                        {order.code}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">{formatDate(order.createdAt)}</td>
                    <td className="py-3 px-4">
                      <ChannelBadge channel={order.channel} status={order.status} />
                    </td>
                    <td className="py-3 px-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-3 px-4">
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
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
