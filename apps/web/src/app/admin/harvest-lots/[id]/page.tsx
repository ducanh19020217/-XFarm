'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Copy,
  ExternalLink,
  EyeOff,
  Globe,
  Loader2,
  Package,
  Printer,
  QrCode as QrIcon,
  ShieldCheck,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { Badge, Button, ConfirmDialog, PageHeader, Toast, useToast } from '@xfarm/ui';
import { apiFetch, isAbortError } from '@/lib/api';
import { buildTraceUrl } from '@/lib/trace-url';
import { useAdminUser } from '../../admin-user-context';
import type { HarvestLotRecord } from '../types';

export default function HarvestLotDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAdminUser();
  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const { message, variant, showToast, closeToast } = useToast();

  const [lot, setLot] = React.useState<HarvestLotRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [updatingPublic, setUpdatingPublic] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const loadLot = React.useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const res = await apiFetch<HarvestLotRecord | { data: HarvestLotRecord }>(
          `/harvest-lots/${params.id}`,
          { signal },
        );
        const data = (res && 'data' in res ? res.data : res) as HarvestLotRecord;
        setLot(data);
      } catch (error) {
        if (!isAbortError(error)) {
          showToast('Không thể tải thông tin lô thu hoạch', 'error');
        }
      } finally {
        setLoading(false);
      }
    },
    [params.id, showToast],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void loadLot(controller.signal);
    return () => controller.abort();
  }, [loadLot]);

  const traceUrl = React.useMemo(() => {
    if (!lot) return '';
    return buildTraceUrl(lot.traceCode);
  }, [lot]);

  React.useEffect(() => {
    if (!traceUrl) return;
    QRCode.toDataURL(traceUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [traceUrl]);

  const handleTogglePublic = async () => {
    if (!lot) return;
    setUpdatingPublic(true);
    try {
      const nextPublic = !lot.isPublic;
      await apiFetch(`/harvest-lots/${lot.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublic: nextPublic }),
      });
      setLot({ ...lot, isPublic: nextPublic });
      setConfirmOpen(false);
      showToast(
        nextPublic
          ? 'Đã bật công khai lô thu hoạch cho trang truy xuất'
          : 'Đã ẩn lô thu hoạch khỏi trang truy xuất',
        'success',
      );
    } catch {
      showToast('Không thể cập nhật trạng thái công khai', 'error');
    } finally {
      setUpdatingPublic(false);
    }
  };

  const copyUrl = async () => {
    if (!traceUrl) return;
    try {
      await navigator.clipboard.writeText(traceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Đã sao chép liên kết truy xuất', 'success');
    } catch {
      showToast('Không thể sao chép liên kết', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="space-y-4">
        <Toast message={message} onClose={closeToast} variant={variant} />
        <Button variant="outline" onClick={() => router.push('/admin/harvest-lots')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Danh sách lô thu hoạch
        </Button>
        <p className="text-muted">Không tìm thấy lô thu hoạch yêu cầu.</p>
      </div>
    );
  }

  const remainingQty = lot.remainingQuantity ?? lot.stockLot?.remainingQuantity ?? lot.quantity;

  return (
    <div className="space-y-6">
      <Toast message={message} onClose={closeToast} variant={variant} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="outline" onClick={() => router.push('/admin/harvest-lots')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Danh sách lô thu hoạch
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <Button
              variant={lot.isPublic ? 'outline' : 'default'}
              onClick={() => setConfirmOpen(true)}
              className={
                lot.isPublic
                  ? 'border-warn/40 text-warn hover:bg-warn-bg'
                  : ''
              }
            >
              {lot.isPublic ? (
                <>
                  <EyeOff className="mr-1.5 h-4 w-4" />
                  Ẩn công khai
                </>
              ) : (
                <>
                  <Globe className="mr-1.5 h-4 w-4" />
                  Bật công khai
                </>
              )}
            </Button>
          )}

          <Button asChild variant="outline">
            <Link href={`/admin/harvest-lots/${lot.id}/print`}>
              <Printer className="mr-1.5 h-4 w-4" />
              In tem nhãn QR
            </Link>
          </Button>

          <Button asChild variant="secondary">
            <Link href={`/trace/${lot.traceCode}`} target="_blank">
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Xem trang truy xuất
            </Link>
          </Button>
        </div>
      </div>

      <PageHeader
        title={`Lô thu hoạch ${lot.code}`}
        description={`Mã truy xuất: ${lot.traceCode} · Sản phẩm: ${lot.item?.name || '—'}`}
      >
        <div className="flex items-center gap-2">
          <Badge variant={lot.isPublic ? 'default' : 'secondary'}>
            {lot.isPublic ? 'Đang công khai' : 'Lưu trữ nội bộ'}
          </Badge>
          {lot.qualityGrade && (
            <Badge variant="outline" className="border-accent/30 bg-accent-bg text-accent">
              {lot.qualityGrade}
            </Badge>
          )}
          {lot.certification && (
            <Badge variant="outline" className="border-info/30 bg-info-bg text-info">
              {lot.certification}
            </Badge>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Thông tin lô */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-fg">
              <Package className="h-5 w-5 text-accent" />
              Thông tin lô nông sản
            </h2>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted">Mã lô thu hoạch</dt>
                <dd className="mt-1 font-semibold text-fg">
                  {lot.code}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-muted">Mã truy xuất nguồn gốc</dt>
                <dd className="mt-1">
                  <code className="rounded border border-line bg-surface-2 px-2 py-0.5 font-mono text-sm font-semibold text-fg">
                    {lot.traceCode}
                  </code>
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-muted">Tên sản phẩm</dt>
                <dd className="mt-1 font-medium text-fg">
                  {lot.item?.name || '—'}
                  {lot.item?.sku && (
                    <span className="ml-2 text-xs text-muted">({lot.item.sku})</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-muted">Mùa vụ sản xuất</dt>
                <dd className="mt-1 text-fg">
                  {lot.cycle ? (
                    <Link
                      href={`/admin/cycles/${lot.cycle.id}`}
                      className="text-accent hover:underline"
                    >
                      {lot.cycle.code} · {lot.cycle.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-muted">Khu vực / Lô canh tác</dt>
                <dd className="mt-1 text-fg">
                  {lot.activity?.area
                    ? `${lot.activity.area.code} - ${lot.activity.area.name}`
                    : '—'}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-muted">Thời điểm thu hoạch</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-fg">
                  <Calendar className="h-4 w-4 text-muted" />
                  {new Date(lot.harvestedAt).toLocaleString('vi-VN')}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-muted">Số lượng thu hoạch</dt>
                <dd className="mt-1 text-base font-bold text-fg">
                  {lot.quantity} {lot.unit}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-muted">Tồn kho hiện tại</dt>
                <dd className="mt-1 text-base font-bold text-accent">
                  {remainingQty} {lot.unit}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-muted">Kho lưu trữ nhập hàng</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-fg">
                  <WarehouseIcon className="h-4 w-4 text-muted" />
                  {lot.warehouse ? `${lot.warehouse.code} - ${lot.warehouse.name}` : '—'}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-muted">Người ghi nhận</dt>
                <dd className="mt-1 text-fg">
                  {lot.createdBy?.fullName || '—'}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-muted">Phân loại chất lượng</dt>
                <dd className="mt-1 text-fg">
                  {lot.qualityGrade || 'Chưa phân loại'}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-muted">Tiêu chuẩn / Chứng nhận</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-fg">
                  <ShieldCheck className="h-4 w-4 text-info" />
                  {lot.certification || 'Chưa có chứng nhận'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Mã QR & Truy xuất Card */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-fg">
              <QrIcon className="h-5 w-5 text-accent" />
              Mã QR Truy xuất nguồn gốc
            </h2>

            <div className="flex flex-col items-center justify-center p-4">
              {qrDataUrl ? (
                <div className="rounded-xl border border-line bg-white p-3 shadow-inner">
                  <img
                    id="harvest-lot-qr"
                    data-testid="harvest-lot-qr"
                    data-trace-url={traceUrl}
                    src={qrDataUrl}
                    alt={`Mã QR truy xuất ${lot.traceCode}`}
                    className="h-52 w-52"
                  />
                </div>
              ) : (
                <div className="flex h-52 w-52 items-center justify-center rounded-xl border border-dashed border-line">
                  <Loader2 className="h-6 w-6 animate-spin text-muted" />
                </div>
              )}

              <div className="mt-4 text-center">
                <span className="text-xs font-medium text-muted">Mã truy xuất</span>
                <p className="font-mono text-lg font-bold text-fg">
                  {lot.traceCode}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 border-t border-line pt-4">
              <div className="rounded-md border border-line bg-surface-2 p-2.5">
                <span className="block text-xs font-medium text-muted">
                  Đường dẫn truy xuất
                </span>
                <p className="truncate font-mono text-xs text-fg">
                  {traceUrl}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={copyUrl} className="w-full">
                  {copied ? (
                    <>
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-ok" />
                      Đã chép
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Sao chép
                    </>
                  )}
                </Button>

                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/trace/${lot.traceCode}`} target="_blank">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Xem trang
                  </Link>
                </Button>
              </div>

              <Button asChild className="w-full">
                <Link href={`/admin/harvest-lots/${lot.id}/print`}>
                  <Printer className="mr-1.5 h-4 w-4" />
                  In tem nhãn lô
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          lot.isPublic
            ? 'Xác nhận ẩn công khai lô thu hoạch?'
            : 'Xác nhận bật công khai lô thu hoạch?'
        }
        description={
          lot.isPublic
            ? 'Khi tắt công khai, khách hàng và đối tác quét mã QR sẽ nhận được thông báo lô nội bộ và không xem được dữ liệu nhật ký canh tác.'
            : 'Khi bật công khai, người quét mã QR trên bao bì sản phẩm có thể xem toàn bộ hành trình nhật ký và nguồn gốc của lô nông sản.'
        }
        confirmText={lot.isPublic ? 'Ẩn công khai' : 'Bật công khai'}
        isDanger={lot.isPublic}
        isLoading={updatingPublic}
        onConfirm={handleTogglePublic}
      />
    </div>
  );
}
