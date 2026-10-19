'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { ArrowLeft, Printer, CheckCircle } from 'lucide-react';
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
      apiFetch<
        | { key: string; value: BankVietQR }
        | { data: { key: string; value: BankVietQR } }
      >('/site-settings/bank.vietqr').catch(() => null),
    ])
      .then(([printRes, bankRes]) => {
        if (!active) return;
        const resData = (
          printRes && 'data' in printRes ? printRes.data : printRes
        ) as PrintData;
        setData(resData);

        if (bankRes) {
          const rawBank = (
            'data' in bankRes ? bankRes.data?.value : bankRes.value
          ) as BankVietQR | undefined;
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
    return <div className="py-12 text-center text-sm text-slate-500">Đang chuẩn bị trang in...</div>;
  }

  if (error || !data?.order) {
    return (
      <div className="space-y-4 p-6">
        <Link href={`/admin/sales/orders/${params.id}`}>
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại đơn hàng
          </Button>
        </Link>
        <div className="p-4 text-center text-rose-500 bg-rose-50 rounded dark:bg-rose-950/30">
          {error || 'Không tìm thấy dữ liệu in'}
        </div>
      </div>
    );
  }

  const { order, site } = data;
  const isInvoice = printType === 'invoice';
  const showVietQr =
    order.paymentStatus !== 'PAID' && order.paymentMethod === 'BANK_TRANSFER';

  return (
    <div className="space-y-6 print:space-y-0">
      {/* Thanh điều khiển (ẩn khi in) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <Link href={`/admin/sales/orders/${order.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Quay lại đơn
            </Button>
          </Link>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md dark:bg-slate-800">
            <button
              type="button"
              onClick={() => handleSwitchType('invoice')}
              className={`px-3 py-1 text-xs font-medium rounded ${
                isInvoice
                  ? 'bg-white shadow text-slate-900 dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Hóa đơn bán hàng
            </button>
            <button
              type="button"
              onClick={() => handleSwitchType('delivery')}
              className={`px-3 py-1 text-xs font-medium rounded ${
                !isInvoice
                  ? 'bg-white shadow text-slate-900 dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
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

      {/* Bản in khổ A4 (210mm) */}
      <div className="mx-auto bg-white text-slate-900 p-8 sm:p-12 shadow-md print:shadow-none print:p-0 max-w-[210mm] min-h-[297mm] text-[13px] leading-normal font-sans border border-slate-200 print:border-none">
        {/* Header trang trại */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-950 uppercase">
              {site['farm.name'] || 'XFarm – Nông trại sinh thái'}
            </h1>
            <p className="text-xs italic text-slate-600">
              {site['farm.slogan'] || 'Tươi lành từ đất, an tâm đến bàn ăn'}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Địa chỉ: {site['contact.address'] || 'XFarm, Hà Nội'}
            </p>
            <p className="text-xs text-slate-600">
              Điện thoại: {site['contact.phone'] || '0901 234 567'} | Email:{' '}
              {site['contact.email'] || 'hello@xfarm.local'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold font-mono">{order.code}</div>
            <div className="text-xs text-slate-500">{formatDate(order.createdAt)}</div>
          </div>
        </div>

        {/* Tiêu đề chứng từ */}
        <div className="text-center my-6">
          <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">
            {isInvoice ? 'HÓA ĐƠN BÁN HÀNG' : 'PHIẾU GIAO HÀNG / XUẤT KHO'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Mã đơn: {order.code}</p>
        </div>

        {/* Thông tin khách hàng và giao nhận */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
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
              <tr className="border-y border-slate-900 bg-slate-50 print:bg-transparent">
                <th className="py-2 px-2 text-center w-8">STT</th>
                <th className="py-2 px-2">Tên sản phẩm / Quy cách</th>
                <th className="py-2 px-2 text-center w-16">ĐVT</th>
                <th className="py-2 px-2 text-right w-16">Số lượng</th>
                <th className="py-2 px-2 text-right w-24">Đơn giá</th>
                <th className="py-2 px-2 text-right w-28">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {order.lines.map((line, idx) => {
                const qty = Number(line.quantity);
                const price = Number(line.unitPrice);
                return (
                  <tr key={line.id}>
                    <td className="py-2 px-2 text-center text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-2 font-medium">
                      {line.product?.name || line.item?.name || 'Sản phẩm'}
                    </td>
                    <td className="py-2 px-2 text-center text-slate-600">
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
        <div className="flex justify-end mb-6 text-xs">
          <div className="w-64 space-y-1.5 border-t border-slate-300 pt-2">
            <div className="flex justify-between">
              <span>Tạm tính tiền hàng:</span>
              <span className="font-medium">{formatCurrency(order.subtotal)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Chiết khấu:</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            {Number(order.shippingFee) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Phí vận chuyển:</span>
                <span>+{formatCurrency(order.shippingFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-slate-900 pt-1.5">
              <span>Tổng thanh toán:</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Khối VietQR nếu chưa thanh toán và chọn BANK_TRANSFER */}
        {showVietQr && (
          <div
            data-testid="vietqr-block"
            className="my-6 p-4 rounded border border-slate-300 flex items-center justify-between gap-4 bg-slate-50/50 print:bg-transparent"
          >
            <div className="space-y-1 text-xs">
              <div className="font-bold text-sm text-slate-900">
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
                <span className="font-bold text-emerald-800">{formatCurrency(order.total)}</span>
              </p>
              <p>
                <span className="font-semibold">Nội dung chuyển khoản:</span>{' '}
                <span className="font-mono font-bold bg-slate-200 px-1 py-0.5 rounded">
                  {order.code}
                </span>
              </p>
            </div>

            <div className="text-center shrink-0">
              {qrCodeDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrCodeDataUrl}
                  alt={`VietQR thanh toan ${order.code}`}
                  className="w-28 h-28 border border-slate-300 rounded p-1 bg-white"
                />
              ) : (
                <div className="w-28 h-28 border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
                  Mã VietQR
                </div>
              )}
              <div className="text-[10px] font-semibold text-slate-600 mt-1">Quét mã để thanh toán</div>
            </div>
          </div>
        )}

        {/* Chữ ký */}
        <div className="grid grid-cols-3 gap-4 text-center text-xs mt-12 pt-6">
          <div className="space-y-14">
            <p className="font-semibold">Người lập phiếu</p>
            <p className="italic text-[11px] text-slate-500">(Ký, ghi rõ họ tên)</p>
          </div>
          <div className="space-y-14">
            <p className="font-semibold">Người giao hàng</p>
            <p className="italic text-[11px] text-slate-500">(Ký, ghi rõ họ tên)</p>
          </div>
          <div className="space-y-14">
            <p className="font-semibold">Khách hàng nhận</p>
            <p className="italic text-[11px] text-slate-500">(Ký, ghi rõ họ tên)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
