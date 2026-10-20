'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, ConfirmDialog, Toast, useToast } from '@xfarm/ui';
import {
  ArrowLeft,
  Printer,
  Check,
  Package,
  Truck,
  CheckCheck,
  XCircle,
  User,
  MapPin,
  Clock,
  Layers,
} from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { useAdminUser } from '../../../admin-user-context';
import type { SalesOrderRecord } from '../../_components/types';
import { formatCurrency, formatDate, paymentMethodLabels } from '../../_components/constants';
import {
  ChannelBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from '../../_components/order-status-badge';
import { ConfirmOrderDialog } from '../_components/confirm-order-dialog';
import { PaymentRecordCard } from '../_components/payment-record-card';

export default function SalesOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const user = useAdminUser();
  const { message: toastMessage, showToast, closeToast } = useToast();

  const [order, setOrder] = React.useState<SalesOrderRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialogs
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);

  const fetchOrder = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<SalesOrderRecord | { data: SalesOrderRecord }>(
        `/sales-orders/${params.id}`,
      );
      const data = (res && 'data' in res ? res.data : res) as SalesOrderRecord;
      setOrder(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Không tìm thấy đơn hàng');
      } else {
        setError('Đã có lỗi xảy ra khi tải đơn hàng');
      }
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  React.useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleStatusTransition = async (nextStatus: string) => {
    setIsTransitioning(true);
    try {
      await apiFetch(`/sales-orders/${params.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      showToast(`Chuyển trạng thái sang "${nextStatus}" thành công`);
      fetchOrder();
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message);
      } else {
        showToast('Có lỗi xảy ra khi chuyển trạng thái');
      }
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    try {
      const res = await apiFetch<SalesOrderRecord | { data: SalesOrderRecord }>(
        `/sales-orders/${params.id}/cancel`,
        { method: 'POST' },
      );
      const data = (res && 'data' in res ? res.data : res) as SalesOrderRecord & {
        warning?: string;
      };
      if (data.warning) {
        showToast(`Đã hủy đơn: ${data.warning}`);
      } else {
        showToast('Hủy đơn hàng thành công, tồn kho đã được hoàn lại');
      }
      setCancelDialogOpen(false);
      fetchOrder();
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message);
      } else {
        showToast('Có lỗi xảy ra khi hủy đơn hàng');
      }
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-sm text-slate-500">Đang tải đơn hàng...</div>;
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link href="/admin/sales/orders">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại danh sách
          </Button>
        </Link>
        <div className="p-6 text-center text-rose-500 bg-rose-50 rounded-lg dark:bg-rose-950/30">
          {error || 'Không tìm thấy đơn hàng'}
        </div>
      </div>
    );
  }

  const canAction = user?.role === 'OWNER' || user?.role === 'MANAGER' || user?.role === 'SALES';

  return (
    <div className="space-y-6">
      {toastMessage && <Toast message={toastMessage} onClose={closeToast} />}

      {/* Header điều hướng và thao tác */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/sales/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Danh sách
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-fg">{order.code}</h1>
            <ChannelBadge channel={order.channel} status={order.status} />
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút in */}
          <Link href={`/admin/sales/orders/${order.id}/print?type=invoice`}>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 border-line text-fg"
            >
              <Printer className="h-4 w-4" />
              <span>In hóa đơn</span>
            </Button>
          </Link>
          <Link href={`/admin/sales/orders/${order.id}/print?type=delivery`}>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 border-line text-fg"
            >
              <Printer className="h-4 w-4" />
              <span>Phiếu giao hàng</span>
            </Button>
          </Link>

          {/* Nút theo trạng thái */}
          {canAction && (
            <>
              {order.status === 'PENDING' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setConfirmDialogOpen(true)}
                    className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white"
                  >
                    <Check className="h-4 w-4" />
                    <span>Xác nhận đơn</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelDialogOpen(true)}
                    className="text-crit hover:bg-crit-bg hover:text-crit border-crit/30"
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Hủy đơn
                  </Button>
                </>
              )}

              {order.status === 'CONFIRMED' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleStatusTransition('PACKING')}
                    disabled={isTransitioning}
                    className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white"
                  >
                    <Package className="h-4 w-4" />
                    <span>Đóng gói</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelDialogOpen(true)}
                    className="text-crit hover:bg-crit-bg hover:text-crit border-crit/30"
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Hủy đơn
                  </Button>
                </>
              )}

              {order.status === 'PACKING' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleStatusTransition('SHIPPING')}
                    disabled={isTransitioning}
                    className="flex items-center gap-1.5 bg-info text-white hover:bg-info/90"
                  >
                    <Truck className="h-4 w-4" />
                    <span>Giao hàng</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelDialogOpen(true)}
                    className="text-crit hover:bg-crit-bg hover:text-crit border-crit/30"
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Hủy đơn
                  </Button>
                </>
              )}

              {order.status === 'SHIPPING' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusTransition('COMPLETED')}
                  disabled={isTransitioning}
                  className="flex items-center gap-1.5 bg-ok hover:bg-ok-fill text-white"
                >
                  <CheckCheck className="h-4 w-4" />
                  <span>Hoàn tất</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Thông tin đơn hàng và khách hàng */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-lg border border-line bg-surface p-5 shadow-xs text-fg space-y-3">
          <div className="flex items-center gap-2 border-b border-line pb-2 font-semibold text-sm text-fg">
            <User className="h-4 w-4 text-accent" />
            <span>Khách hàng</span>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="font-semibold text-fg">
              <Link
                href={`/admin/sales/customers/${order.customer.id}`}
                className="hover:underline text-accent"
              >
                {order.customer.name}
              </Link>
            </div>
            <div className="text-muted">
              Số điện thoại: <span className="font-medium text-fg">{order.customer.phone}</span>
            </div>
            {order.customer.email && (
              <div className="text-muted">
                Email: <span className="text-fg">{order.customer.email}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface p-5 shadow-xs text-fg space-y-3">
          <div className="flex items-center gap-2 border-b border-line pb-2 font-semibold text-sm text-fg">
            <MapPin className="h-4 w-4 text-accent" />
            <span>Giao nhận & Xuất kho</span>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="text-muted">
              Địa chỉ: <span className="font-medium text-fg">{order.shippingAddress}</span>
            </div>
            <div className="text-muted">
              Kho xuất:{' '}
              {order.warehouse ? (
                <span className="font-semibold text-fg">
                  {order.warehouse.name} ({order.warehouse.code})
                </span>
              ) : (
                <span className="text-muted italic">Chưa chọn kho xuất</span>
              )}
            </div>
            {order.notes && (
              <div className="text-muted">
                Ghi chú: <span className="italic text-fg">{order.notes}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface p-5 shadow-xs text-fg space-y-3">
          <div className="flex items-center gap-2 border-b border-line pb-2 font-semibold text-sm text-fg">
            <Clock className="h-4 w-4 text-accent" />
            <span>Thời gian & Thanh toán</span>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="text-muted">
              Ngày tạo: <span className="font-medium text-fg">{formatDate(order.createdAt)}</span>
            </div>
            {order.confirmedAt && (
              <div className="text-muted">
                Ngày xác nhận: <span className="text-fg">{formatDate(order.confirmedAt)}</span>
              </div>
            )}
            <div className="text-muted">
              Phương thức:{' '}
              <span className="font-medium text-fg">
                {paymentMethodLabels[order.paymentMethod] || order.paymentMethod}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bảng các dòng hàng */}
      <div className="rounded-lg border border-line bg-surface p-5 shadow-xs text-fg space-y-4">
        <h2 className="text-base font-semibold text-fg border-b border-line pb-3">
          Danh sách mặt hàng ({order.lines.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 font-semibold text-muted border-b border-line">
              <tr>
                <th className="py-3 px-4">STT</th>
                <th className="py-3 px-4">Tên sản phẩm / Hàng hóa</th>
                <th className="py-3 px-4">Mã SKU</th>
                <th className="py-3 px-4 text-center">ĐVT</th>
                <th className="py-3 px-4 text-right">Số lượng</th>
                <th className="py-3 px-4 text-right">Đơn giá</th>
                <th className="py-3 px-4 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {order.lines.map((line, idx) => {
                const qty = Number(line.quantity);
                const price = Number(line.unitPrice);
                const lineTotal = qty * price;
                return (
                  <tr key={line.id} className="hover:bg-hover">
                    <td className="py-3 px-4 text-muted">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium text-fg">
                      {line.product?.name || line.item?.name || 'Sản phẩm'}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-muted">
                      {line.item?.sku || '—'}
                    </td>
                    <td className="py-3 px-4 text-center text-muted">
                      {line.item?.unit || line.product?.unit || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-fg">{qty}</td>
                    <td className="py-3 px-4 text-right text-muted">{formatCurrency(price)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-fg">
                      {formatCurrency(lineTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tổng kết tiền */}
        <div className="pt-4 border-t border-line flex justify-end">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between text-muted">
              <span>Tạm tính:</span>
              <span className="font-medium text-fg">{formatCurrency(order.subtotal)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-muted">
                <span>Chiết khấu:</span>
                <span className="font-medium text-crit">-{formatCurrency(order.discount)}</span>
              </div>
            )}
            {Number(order.shippingFee) > 0 && (
              <div className="flex justify-between text-muted">
                <span>Phí vận chuyển:</span>
                <span className="font-medium text-fg">+{formatCurrency(order.shippingFee)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-line flex justify-between text-base font-bold">
              <span className="text-fg">Tổng thanh toán:</span>
              <span className="text-accent">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lô đã xuất kho (stockMoves) */}
      <div className="rounded-lg border border-line bg-surface p-5 shadow-xs text-fg space-y-4">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <Layers className="h-5 w-5 text-accent" />
          <h2 className="text-base font-semibold text-fg">
            Lô hàng đã xuất kho theo FIFO ({order.stockMoves?.length || 0})
          </h2>
        </div>

        {!order.stockMoves || order.stockMoves.length === 0 ? (
          <div className="rounded-md border border-dashed border-line p-6 text-center text-sm text-muted">
            {order.status === 'PENDING'
              ? 'Chưa xuất kho (đơn hàng đang chờ xác nhận)'
              : order.status === 'CANCELLED'
                ? 'Đơn hàng đã hủy (lô xuất đã được hoàn lại kho)'
                : 'Chưa có thông tin xuất lô'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 font-semibold text-muted border-b border-line">
                <tr>
                  <th className="py-2.5 px-3">Mã lô xuất</th>
                  <th className="py-2.5 px-3 text-right">Số lượng xuất</th>
                  <th className="py-2.5 px-3 text-right">Giá vốn xuất (₫)</th>
                  <th className="py-2.5 px-3">Thời gian xuất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {order.stockMoves.map((move) => (
                  <tr key={move.id} className="hover:bg-hover">
                    <td className="py-2.5 px-3 font-mono font-medium text-accent">
                      {move.stockLot?.lotCode || 'Lô mặc định'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-fg">
                      {move.quantity.toString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted">
                      {formatCurrency(move.unitCost)}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-muted">
                      {formatDate(move.movedAt || move.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Khu thanh toán và lịch sử thanh toán */}
      <PaymentRecordCard order={order} onPaymentSuccess={fetchOrder} userRole={user?.role} />

      {/* Dialog chọn kho khi Xác nhận đơn */}
      <ConfirmOrderDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        orderId={order.id}
        orderCode={order.code}
        onSuccess={() => {
          showToast('Xác nhận đơn hàng và xuất kho thành công');
          fetchOrder();
        }}
      />

      {/* Dialog xác nhận Hủy đơn */}
      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title={`Hủy đơn hàng ${order.code}`}
        description="Bạn có chắc chắn muốn hủy đơn hàng này không? Mọi lô hàng đã xuất kho sẽ được tự động hoàn lại vào kho."
        confirmText="Hủy đơn hàng"
        cancelText="Đóng"
        isDanger
        isLoading={isCancelling}
        onConfirm={handleCancelOrder}
      />
    </div>
  );
}
