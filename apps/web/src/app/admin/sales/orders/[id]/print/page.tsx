'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@xfarm/ui';
import { apiFetch } from '@/lib/api';
import type { SalesOrderRecord } from '../../../_components/types';
import { formatCurrency, formatDate, paymentMethodLabels } from '../../../_components/constants';

interface PrintData {
  type: 'invoice' | 'delivery';
  site: Record<string, string>;
  order: SalesOrderRecord;
}

interface BankVietQR {
  bank: string;
  accountNumber: string;
  accountName: string;
}

export default function SalesOrderPrintPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const printType = (searchParams.get('type') as 'invoice' | 'delivery') || 'invoice';

  const [data, setData] = React.useState<PrintData | null>(null);
  const [bankInfo, setBankInfo] = React.useState<BankVietQR>({
    bank: 'VCB',
    accountNumber: '0123456789',
    accountName: 'XFARM',
  });
  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Load print order data & site settings
  React.useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<PrintData | { data: PrintData }>(
        `/sales-orders/${params.id}/print?type=${printType}`,
      ),
      apiFetch<{ key: string; value: BankVietQR } | { data: { key: string; value: BankVietQR } }>(
        '/site-settings/bank.vietqr',
      ).catch(() => null),
    ])
      .then(([printRes, bankRes]) => {
        if (!active) return;
        const resData = (printRes && 'data' in printRes ? printRes.data : printRes) as PrintData;
        setData(resData);

        if (bankRes) {
          const rawBank = ('data' in bankRes ? bankRes.data?.value : bankRes.value) as
            BankVietQR | undefined;
          if (rawBank && rawBank.accountNumber) {
            setBankInfo(rawBank);
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Không thể tải dữ liệu in');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.id, printType]);

  // Generate offline QR code data URL using qrcode library for reliability
  React.useEffect(() => {
    if (!data?.order) return;
    const isUnpaid = data.order.paymentStatus !== 'PAID';
    const isBank = data.order.paymentMethod === 'BANK_TRANSFER';

    if (isUnpaid && isBank) {
      // Build VietQR payload format: standard or bank link
      const vietQrPayload = `00020101021238540010A00000072701240006${bankInfo.bank}0110${bankInfo.accountNumber}520400005303704540${String(data.order.total).length}${data.order.total}5802VN62${data.order.code.length + 4}08${data.order.code.length}${data.order.code}6304`;

      // Generate QR
      QRCode.toDataURL(
        vietQrPayload,
        { width: 140, margin: 1, errorCorrectionLevel: 'M' },
        (err, url) => {
          if (!err && url) {
            setQrCodeDataUrl(url);
          }
        },
      );
    }
  }, [data, bankInfo]);

  const handlePrint = () => {
    window.print();
  };

  const handleSwitchType = (newType: 'invoice' | 'delivery') => {
    const url = new URL(window.location.href);
    url.searchParams.set('type', newType);
    router.replace(url.pathname + url.search);
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted">Đang chuẩn bị trang in...</div>
    );
  }

  if (error || !data?.order) {
    return (
      <div className="space-y-4 p-6">
        <Link href={`/admin/sales/orders/${params.id}`}>
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại đơn hàng
          </Button>
        </Link>
        <div className="p-4 text-center text-crit bg-crit-bg border border-crit/20 rounded-lg">
          {error || 'Không tìm thấy dữ liệu in'}
        </div>
      </div>
    );
  }

  const { order, site } = data;
  const isInvoice = printType === 'invoice';
  const showVietQr = order.paymentStatus !== 'PAID' && order.paymentMethod === 'BANK_TRANSFER';

  return (
    <div className="space-y-6 print:space-y-0">
      {/* Thanh điều khiển (ẩn khi in) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border border-line bg-surface shadow-xs text-fg">
        <div className="flex items-center gap-3">
          <Link href={`/admin/sales/orders/${order.id}`}>
            <Button variant="outline" size="sm" className="border-line text-fg">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Quay lại đơn
            </Button>
          </Link>
          <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-md border border-line">
            <button
              type="button"
              onClick={() => handleSwitchType('invoice')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                isInvoice
                  ? 'bg-surface shadow-xs text-fg font-semibold'
                  : 'text-muted hover:text-fg'
              }`}
            >
              Hóa đơn bán hàng
            </button>
            <button
              type="button"
              onClick={() => handleSwitchType('delivery')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                !isInvoice
                  ? 'bg-surface shadow-xs text-fg font-semibold'
                  : 'text-muted hover:text-fg'
              }`}
            >
              Phiếu giao hàng
            </button>
          </div>
        </div>

        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          <span>In tài liệu</span>
        </Button>
      </div>

      {/* Bản in khổ A4 (210mm) - Luôn giữ nền trắng khi in */}
      <div className="mx-auto bg-surface text-fg p-8 sm:p-12 shadow-md print:bg-white print:text-black print:shadow-none print:p-0 max-w-[210mm] min-h-[297mm] text-[13px] leading-normal font-sans border border-line print:border-none">
        {/* Header trang trại */}
        <div className="flex justify-between items-start border-b-2 border-line print:border-black pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-fg print:text-black uppercase">
              {site['farm.name'] || 'XFarm – Nông trại sinh thái'}
            </h1>
            <p className="text-xs italic text-muted print:text-black">
              {site['farm.slogan'] || 'Tươi lành từ đất, an tâm đến bàn ăn'}
            </p>
            <p className="text-xs text-muted print:text-black mt-1">
              Địa chỉ: {site['contact.address'] || 'XFarm, Hà Nội'}
            </p>
            <p className="text-xs text-muted print:text-black">
              Điện thoại: {site['contact.phone'] || '0901 234 567'} | Email:{' '}
              {site['contact.email'] || 'hello@xfarm.local'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold font-mono text-fg print:text-black">{order.code}</div>
            <div className="text-xs text-muted print:text-black">{formatDate(order.createdAt)}</div>
          </div>
        </div>

        {/* Tiêu đề chứng từ */}
        <div className="text-center my-6">
          <h2 className="text-xl font-bold uppercase tracking-wider text-fg print:text-black">
            {isInvoice ? 'HÓA ĐƠN BÁN HÀNG' : 'PHIẾU GIAO HÀNG / XUẤT KHO'}
          </h2>
          <p className="text-xs text-muted print:text-black mt-0.5">Mã đơn: {order.code}</p>
        </div>

        {/* Thông tin khách hàng và giao nhận */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-xs text-fg print:text-black">
          <div className="space-y-1">
            <p>
              <span className="font-semibold">Khách hàng:</span> {order.customer.name}
            </p>
            <p>
              <span className="font-semibold">Số điện thoại:</span> {order.customer.phone}
            </p>
            <p>
              <span className="font-semibold">Địa chỉ nhận hàng:</span> {order.shippingAddress}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p>
              <span className="font-semibold">Phương thức TT:</span>{' '}
              {paymentMethodLabels[order.paymentMethod] || order.paymentMethod}
            </p>
            <p>
              <span className="font-semibold">Trạng thái TT:</span>{' '}
              {order.paymentStatus === 'PAID'
                ? 'Đã thanh toán đủ'
                : order.paymentStatus === 'PARTIAL'
                  ? 'Thanh toán một phần'
                  : 'Chưa thanh toán'}
            </p>
            {order.warehouse && (
              <p>
                <span className="font-semibold">Kho xuất:</span> {order.warehouse.name}
              </p>
            )}
          </div>
        </div>

        {/* Bảng chi tiết mặt hàng */}
        <div className="mb-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-y border-line print:border-black bg-surface-2 print:bg-transparent">
                <th className="py-2 px-2 text-center w-8">STT</th>
                <th className="py-2 px-2">Tên sản phẩm / Quy cách</th>
                <th className="py-2 px-2 text-center w-16">ĐVT</th>
                <th className="py-2 px-2 text-right w-16">Số lượng</th>
                <th className="py-2 px-2 text-right w-24">Đơn giá</th>
                <th className="py-2 px-2 text-right w-28">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line print:divide-black">
              {order.lines.map((line, idx) => {
                const qty = Number(line.quantity);
                const price = Number(line.unitPrice);
                return (
                  <tr key={line.id}>
                    <td className="py-2 px-2 text-center text-muted print:text-black">{idx + 1}</td>
                    <td className="py-2 px-2 font-medium">
                      {line.product?.name || line.item?.name || 'Sản phẩm'}
                    </td>
                    <td className="py-2 px-2 text-center text-muted print:text-black">
                      {line.item?.unit || line.product?.unit || '—'}
                    </td>
                    <td className="py-2 px-2 text-right font-medium">{qty}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(price)}</td>
                    <td className="py-2 px-2 text-right font-semibold">
                      {formatCurrency(qty * price)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tổng kết tiền */}
        <div className="flex justify-end mb-6 text-xs text-fg print:text-black">
          <div className="w-64 space-y-1.5 border-t border-line print:border-black pt-2">
            <div className="flex justify-between">
              <span>Tạm tính tiền hàng:</span>
              <span className="font-medium">{formatCurrency(order.subtotal)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-muted print:text-black">
                <span>Chiết khấu:</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            {Number(order.shippingFee) > 0 && (
              <div className="flex justify-between text-muted print:text-black">
                <span>Phí vận chuyển:</span>
                <span>+{formatCurrency(order.shippingFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-line print:border-black pt-1.5">
              <span>Tổng thanh toán:</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Khối VietQR nếu chưa thanh toán và chọn BANK_TRANSFER */}
        {showVietQr && (
          <div
            data-testid="vietqr-block"
            className="my-6 p-4 rounded border border-line print:border-black flex items-center justify-between gap-4 bg-surface-2/50 print:bg-transparent"
          >
            <div className="space-y-1 text-xs text-fg print:text-black">
              <div className="font-bold text-sm text-fg print:text-black">
                THANH TOÁN CHUYỂN KHOẢN QUA VIETQR
              </div>
              <p>
                <span className="font-semibold">Ngân hàng:</span> {bankInfo.bank}
              </p>
              <p>
                <span className="font-semibold">Số tài khoản:</span> {bankInfo.accountNumber}
              </p>
              <p>
                <span className="font-semibold">Chủ tài khoản:</span> {bankInfo.accountName}
              </p>
              <p>
                <span className="font-semibold">Số tiền:</span>{' '}
                <span className="font-bold text-accent print:text-black">{formatCurrency(order.total)}</span>
              </p>
              <p>
                <span className="font-semibold">Nội dung chuyển khoản:</span>{' '}
                <span className="font-mono font-bold bg-surface-2 print:bg-transparent border border-line print:border-none px-1.5 py-0.5 rounded text-fg print:text-black">
                  {order.code}
                </span>
              </p>
            </div>

            <div className="text-center shrink-0">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt={`VietQR thanh toan ${order.code}`}
                  className="w-28 h-28 border border-line print:border-black rounded p-1 bg-white"
                />
              ) : (
                <div className="w-28 h-28 border border-dashed border-line print:border-black flex items-center justify-center text-[10px] text-muted print:text-black">
                  Mã VietQR
                </div>
              )}
              <div className="text-[10px] font-semibold text-muted print:text-black mt-1">
                Quét mã để thanh toán
              </div>
            </div>
          </div>
        )}

        {/* Chữ ký */}
        <div className="grid grid-cols-3 gap-4 text-center text-xs mt-12 pt-6 text-fg print:text-black">
          <div className="space-y-14">
            <p className="font-semibold">Người lập phiếu</p>
            <p className="italic text-[11px] text-muted print:text-black">(Ký, ghi rõ họ tên)</p>
          </div>
          <div className="space-y-14">
            <p className="font-semibold">Người giao hàng</p>
            <p className="italic text-[11px] text-muted print:text-black">(Ký, ghi rõ họ tên)</p>
          </div>
          <div className="space-y-14">
            <p className="font-semibold">Khách hàng nhận</p>
            <p className="italic text-[11px] text-muted print:text-black">(Ký, ghi rõ họ tên)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
