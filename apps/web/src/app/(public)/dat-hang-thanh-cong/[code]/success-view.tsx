'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Copy,
  Check,
  Search,
  ArrowRight,
  CreditCard,
  Truck,
  Building,
} from 'lucide-react';
import { useCart } from '@/lib/cart';
import { formatCurrency, FALLBACK_SITE_SETTINGS } from '@/lib/public-api';

interface OrderSuccessData {
  code: string;
  total: number;
  paymentMethod: string;
  bankTransfer?: {
    bank: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    content: string;
    qrUrl: string;
  };
}

export function SuccessView({ code }: { code: string }) {
  const { clearCart } = useCart();
  const [order, setOrder] = useState<OrderSuccessData | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Clear cart upon reaching success page
  useEffect(() => {
    clearCart();
  }, [clearCart]);

  // Load order data from sessionStorage or fallback
  useEffect(() => {
    try {
      const stored =
        sessionStorage.getItem(`xfarm.order.${code}`) || sessionStorage.getItem('xfarm.last_order');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.code === code || !code)) {
          setOrder(parsed);
          return;
        }
      }
    } catch {
      // Storage access error
    }

    // Fallback if accessed directly: synthesize with default bank settings
    const bankConfig = FALLBACK_SITE_SETTINGS['bank.vietqr'] || {
      bank: 'VCB',
      accountNumber: '0123456789',
      accountName: 'XFARM',
    };
    const defaultAmount = 0;
    const query = new URLSearchParams({
      amount: String(defaultAmount),
      addInfo: code,
      accountName: bankConfig.accountName,
    });

    setOrder({
      code,
      total: defaultAmount,
      paymentMethod: 'BANK_TRANSFER',
      bankTransfer: {
        bank: bankConfig.bank,
        accountNumber: bankConfig.accountNumber,
        accountName: bankConfig.accountName,
        amount: defaultAmount,
        content: code,
        qrUrl: `https://img.vietqr.io/image/${bankConfig.bank}-${bankConfig.accountNumber}-compact2.png?${query.toString()}`,
      },
    });
  }, [code]);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  const isBankTransfer = order?.paymentMethod === 'BANK_TRANSFER' || Boolean(order?.bankTransfer);

  return (
    <div className="py-8 sm:py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Success Banner */}
      <div className="bg-surface rounded-3xl p-6 sm:p-10 border border-line shadow-xs text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-ok-bg rounded-full flex items-center justify-center mx-auto mb-4 text-ok shadow-xs">
          <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" aria-hidden="true" />
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-fg tracking-tight">
          Đặt hàng thành công!
        </h1>
        <p className="mt-2 text-muted text-sm sm:text-base max-w-xl mx-auto">
          Cảm ơn bạn đã tin tưởng chọn mua nông sản tại XFarm. Đơn hàng của bạn đã được tiếp nhận và
          đang được xử lý.
        </p>

        {/* Order Details Badge */}
        <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-4 sm:gap-8 bg-surface-2 border border-line px-6 py-4 rounded-2xl text-left">
          <div>
            <span className="block text-xs uppercase tracking-wider text-muted font-semibold">
              Mã đơn hàng
            </span>
            <span
              data-testid="order-code-text"
              className="font-mono text-base sm:text-lg font-bold text-fg"
            >
              {code}
            </span>
          </div>

          <div className="h-8 w-px bg-line hidden sm:block" />

          <div>
            <span className="block text-xs uppercase tracking-wider text-muted font-semibold">
              Tổng thanh toán
            </span>
            <span
              data-testid="order-total-text"
              className="text-base sm:text-lg font-extrabold text-accent"
            >
              {formatCurrency(order?.total ?? 0)}
            </span>
          </div>

          <div className="h-8 w-px bg-line hidden sm:block" />

          <div>
            <span className="block text-xs uppercase tracking-wider text-muted font-semibold">
              Hình thức
            </span>
            <span className="text-sm sm:text-base font-semibold text-fg-2 flex items-center gap-1.5">
              {isBankTransfer ? (
                <>
                  <CreditCard className="w-4 h-4 text-accent" />
                  Chuyển khoản VietQR
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4 text-accent" />
                  COD khi nhận hàng
                </>
              )}
            </span>
          </div>
        </div>

        {/* Bank Transfer QR section */}
        {isBankTransfer && order?.bankTransfer && (
          <div className="mt-10 border-t border-line pt-8 text-left max-w-2xl mx-auto">
            <div className="bg-accent-bg/40 rounded-2xl p-6 sm:p-8 border border-accent/20">
              <h2 className="text-lg sm:text-xl font-bold text-fg mb-2 flex items-center gap-2">
                <Building className="w-5 h-5 text-accent" />
                Thông tin thanh toán chuyển khoản
              </h2>
              <p className="text-xs sm:text-sm text-muted mb-6">
                Vui lòng quét mã QR qua ứng dụng ngân hàng hoặc chuyển khoản chính xác thông tin bên
                dưới để đơn hàng được duyệt tự động.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* QR Code Image - keeps white bg for scanner contrast */}
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-line shadow-xs">
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                    <img
                      src={order.bankTransfer.qrUrl}
                      alt={`VietQR thanh toán đơn hàng ${code}`}
                      data-testid="vietqr-image"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <span className="mt-2 text-[11px] text-slate-600 text-center font-medium">
                    Quét mã QR bằng ứng dụng ngân hàng bất kỳ
                  </span>
                </div>

                {/* Account Details & Copy buttons */}
                <div className="space-y-3.5 text-xs sm:text-sm">
                  {/* Bank Name */}
                  <div className="bg-surface p-3 rounded-xl border border-line">
                    <span className="text-muted block text-[11px]">Ngân hàng</span>
                    <span className="font-bold text-fg">{order.bankTransfer.bank}</span>
                  </div>

                  {/* Account Number */}
                  <div className="bg-surface p-3 rounded-xl border border-line flex items-center justify-between gap-2">
                    <div>
                      <span className="text-muted block text-[11px]">Số tài khoản</span>
                      <span
                        data-testid="bank-account-number"
                        className="font-mono font-bold text-fg text-sm sm:text-base"
                      >
                        {order.bankTransfer.accountNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(order.bankTransfer!.accountNumber, 'accountNumber')
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-accent bg-accent-bg hover:bg-hover transition-colors"
                      title="Sao chép số tài khoản"
                    >
                      {copiedKey === 'accountNumber' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Account Name */}
                  <div className="bg-surface p-3 rounded-xl border border-line">
                    <span className="text-muted block text-[11px]">Chủ tài khoản</span>
                    <span className="font-bold text-fg uppercase">
                      {order.bankTransfer.accountName}
                    </span>
                  </div>

                  {/* Content / Note */}
                  <div className="bg-surface p-3 rounded-xl border border-line flex items-center justify-between gap-2">
                    <div>
                      <span className="text-muted block text-[11px]">Nội dung chuyển khoản</span>
                      <span
                        data-testid="transfer-content"
                        className="font-mono font-bold text-accent text-sm sm:text-base"
                      >
                        {order.bankTransfer.content}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(order.bankTransfer!.content, 'content')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-accent bg-accent-bg hover:bg-hover transition-colors"
                      title="Sao chép nội dung chuyển khoản"
                    >
                      {copiedKey === 'content' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-10 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={`/tra-cuu-don?code=${encodeURIComponent(code)}`}
            data-testid="view-order-lookup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-accent text-accent-contrast font-bold text-sm sm:text-base hover:bg-accent-hover shadow-xs transition-all"
          >
            <Search className="w-4 h-4" />
            <span>Tra cứu đơn hàng</span>
          </Link>

          <Link
            href="/san-pham"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-fg-2 bg-surface-2 hover:bg-hover font-bold text-sm sm:text-base border border-line transition-colors"
          >
            <span>Tiếp tục mua hàng</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
