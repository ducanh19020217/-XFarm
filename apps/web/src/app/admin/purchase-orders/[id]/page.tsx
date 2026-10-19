'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button, ConfirmDialog, PageHeader, Toast, useToast } from '@xfarm/ui';
import { apiFetch, ApiError } from '@/lib/api';
import { useAdminUser } from '../../admin-user-context';
import { POActions } from '../_components/po-actions';
import { POInfoCard } from '../_components/po-info-card';
import { POLinesTable } from '../_components/po-lines-table';
import { POReceiveDialog, type ReceiveSubmitPayload } from '../_components/po-receive-dialog';
import { POPayDialog, type POPayPayload } from '../_components/po-pay-dialog';
import type { PurchaseOrderDetail, WarehouseOption } from '../_components/types';

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAdminUser();
  const { message, showToast, closeToast } = useToast();

  const [po, setPo] = React.useState<PurchaseOrderDetail | null>(null);
  const [warehouses, setWarehouses] = React.useState<WarehouseOption[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Dialog states
  const [orderConfirmOpen, setOrderConfirmOpen] = React.useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = React.useState(false);
  const [receiveOpen, setReceiveOpen] = React.useState(false);
  const [payOpen, setPayOpen] = React.useState(false);
  const [actionSubmitting, setActionSubmitting] = React.useState(false);

  const fetchPO = React.useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ data: PurchaseOrderDetail } | PurchaseOrderDetail>(
        `/purchase-orders/${params.id}`,
      );
      const data = 'data' in res ? res.data : res;
      setPo(data);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tải thông tin đơn mua hàng');
    } finally {
      setLoading(false);
    }
  }, [params.id, showToast]);

  const fetchWarehouses = React.useCallback(async () => {
    try {
      const res = await apiFetch<{ data: WarehouseOption[] } | WarehouseOption[]>(
        '/warehouses?page=1&pageSize=100',
      );
      setWarehouses(Array.isArray(res) ? res : res.data || []);
    } catch {
      setWarehouses([]);
    }
  }, []);

  React.useEffect(() => {
    void fetchPO();
    void fetchWarehouses();
  }, [fetchPO, fetchWarehouses]);

  const handleOrder = async () => {
    if (!po) return;
    setActionSubmitting(true);
    try {
      await apiFetch(`/purchase-orders/${po.id}/order`, { method: 'POST' });
      setOrderConfirmOpen(false);
      showToast('Đặt hàng thành công');
      await fetchPO();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể đặt hàng');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!po) return;
    setActionSubmitting(true);
    try {
      await apiFetch(`/purchase-orders/${po.id}/cancel`, { method: 'POST' });
      setCancelConfirmOpen(false);
      showToast('Hủy đơn mua hàng thành công');
      await fetchPO();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể hủy đơn hàng');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleReceive = async (payload: ReceiveSubmitPayload) => {
    if (!po) return;
    setActionSubmitting(true);
    try {
      await apiFetch(`/purchase-orders/${po.id}/receive`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setReceiveOpen(false);
      showToast('Nhận hàng thành công');
      await fetchPO();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể nhận hàng');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handlePay = async (payload: POPayPayload) => {
    if (!po) return;
    setActionSubmitting(true);
    try {
      await apiFetch(`/purchase-orders/${po.id}/pay`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setPayOpen(false);
      showToast('Trả tiền thành công');
      await fetchPO();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể trả tiền cho đơn mua hàng');
    } finally {
      setActionSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Đang tải...
      </div>
    );
  }

  if (!po) {
    return (
      <div className="space-y-4">
        <Toast message={message || 'Không tìm thấy đơn mua hàng'} onClose={closeToast} />
        <Button variant="outline" onClick={() => router.push('/admin/purchase-orders')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} />

      <Button variant="outline" size="sm" onClick={() => router.push('/admin/purchase-orders')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Danh sách đơn mua
      </Button>

      <PageHeader
        title={po.code}
        description={`${po.supplier?.name || 'Nhà cung cấp'} · Ngày đặt: ${new Date(po.orderDate).toLocaleDateString('vi-VN')}`}
      >
        <POActions
          status={po.status}
          role={user?.role}
          onOrder={() => setOrderConfirmOpen(true)}
          onCancel={() => setCancelConfirmOpen(true)}
          onReceive={() => setReceiveOpen(true)}
          onPay={() => setPayOpen(true)}
        />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <POInfoCard po={po} />
        </div>
        <div className="lg:col-span-2">
          <POLinesTable lines={po.lines || []} />
        </div>
      </div>

      <ConfirmDialog
        open={orderConfirmOpen}
        onOpenChange={setOrderConfirmOpen}
        title="Xác nhận đặt hàng"
        description="Bạn có chắc chắn muốn chuyển đơn hàng này sang trạng thái Đã đặt không?"
        confirmText="Đặt hàng"
        isLoading={actionSubmitting}
        onConfirm={handleOrder}
      />

      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title="Xác nhận hủy đơn mua hàng"
        description="Bạn có chắc chắn muốn hủy đơn mua hàng này không? Thao tác này không thể hoàn tác."
        confirmText="Hủy đơn"
        isDanger={true}
        isLoading={actionSubmitting}
        onConfirm={handleCancel}
      />

      <POReceiveDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        purchaseOrder={po}
        warehouses={warehouses}
        onSubmit={handleReceive}
        isSubmitting={actionSubmitting}
      />

      <POPayDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        purchaseOrder={po}
        onSubmit={handlePay}
        isSubmitting={actionSubmitting}
      />
    </div>
  );
}
