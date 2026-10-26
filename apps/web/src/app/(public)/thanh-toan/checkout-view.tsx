'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard, Truck, ArrowLeft, AlertCircle, ShoppingBag, Loader2 } from 'lucide-react';
import { webshopCheckoutSchema, type WebshopCheckoutInput, PaymentMethod } from '@xfarm/shared';
import { useCart } from '@/lib/cart';
import {
  formatCurrency,
  type PublicProduct,
  FALLBACK_PRODUCTS,
  getPublicProducts,
  API_BASE_URL,
} from '@/lib/public-api';

export function CheckoutView() {
  const router = useRouter();
  const { items, clearCart, isLoaded } = useCart();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch current products to show live prices and validate
  useEffect(() => {
    let cancelled = false;
    async function loadProducts() {
      try {
        const list = await getPublicProducts();
        if (!cancelled && list.length > 0) {
          setProducts(list);
          setLoadingProducts(false);
          return;
        }
      } catch {
        // Fallback
      }
      if (!cancelled) {
        setProducts(FALLBACK_PRODUCTS);
        setLoadingProducts(false);
      }
    }
    loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  const productMap = useMemo(() => {
    return new Map(products.map((p) => [p.id, p]));
  }, [products]);

  const cartLines = useMemo(() => {
    return items.map((item) => {
      const product = productMap.get(item.productId);
      return {
        productId: item.productId,
        quantity: item.quantity,
        product,
        price: product ? product.price : 0,
        subtotal: product ? product.price * item.quantity : 0,
      };
    });
  }, [items, productMap]);

  const subtotal = useMemo(() => {
    return cartLines.reduce((sum, line) => sum + line.subtotal, 0);
  }, [cartLines]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WebshopCheckoutInput>({
    resolver: zodResolver(webshopCheckoutSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      address: '',
      notes: '',
      paymentMethod: PaymentMethod.COD,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    },
  });

  // Keep form's items aligned with cart state
  useEffect(() => {
    setValue(
      'items',
      items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      { shouldValidate: true },
    );
  }, [items, setValue]);

  const selectedPaymentMethod = watch('paymentMethod');

  const onSubmit = async (data: WebshopCheckoutInput) => {
    setApiError(null);
    setIsSubmitting(true);

    if (process.env.NEXT_PUBLIC_DEMO === '1') {
      setApiError('Đây là bản demo, thao tác không được gửi đi.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/public/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.message || `Đặt hàng thất bại (mã lỗi ${res.status})`);
      }

      // Save order info to sessionStorage
      try {
        sessionStorage.setItem(`xfarm.order.${body.code}`, JSON.stringify(body));
        sessionStorage.setItem('xfarm.last_order', JSON.stringify(body));
      } catch {
        // Storage quota / restrictions
      }

      // Clear cart
      clearCart();

      // Navigate to success page
      router.push(`/dat-hang-thanh-cong/${body.code}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError('Có lỗi xảy ra khi xử lý đơn hàng. Vui lòng thử lại.');
      }
      setIsSubmitting(false);
    }
  };

  if (!isLoaded || loadingProducts) {
    return (
      <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-accent border-t-transparent" />
        <p className="mt-3 text-muted text-sm">Đang tải thông tin thanh toán...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-16 sm:py-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-surface rounded-3xl p-8 sm:p-14 text-center border border-line shadow-xs">
          <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4 text-muted">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-fg">Giỏ hàng trống</h1>
          <p className="mt-2 text-muted text-sm">
            Bạn chưa chọn sản phẩm nào để thanh toán. Vui lòng thêm sản phẩm vào giỏ hàng trước.
          </p>
          <div className="mt-6">
            <Link
              href="/san-pham"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-accent-contrast font-bold text-sm hover:bg-accent-hover transition-colors"
            >
              <span>Xem danh mục sản phẩm</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/gio-hang"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-accent hover:underline transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại giỏ hàng</span>
        </Link>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-fg tracking-tight">
          Thông tin thanh toán
        </h1>
        <p className="mt-1 text-muted text-sm">
          Vui lòng nhập thông tin nhận hàng để hoàn tất đặt hàng.
        </p>
      </div>

      {apiError && (
        <div
          role="alert"
          className="mb-8 p-4 rounded-xl bg-crit-bg border border-crit/20 text-crit flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-crit shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{apiError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Details Box */}
            <div className="bg-surface rounded-2xl border border-line p-6 sm:p-8 shadow-xs space-y-5">
              <h2 className="text-lg font-bold text-fg border-b border-line pb-3">
                1. Thông tin người nhận
              </h2>

              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-semibold text-fg-2 mb-1.5">
                  Họ và tên <span className="text-crit">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn An"
                  {...register('fullName')}
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors bg-surface text-fg focus:outline-hidden focus:ring-2 ${
                    errors.fullName
                      ? 'border-crit/50 focus:border-crit focus:ring-crit/20 bg-crit-bg/20'
                      : 'border-line focus:border-accent focus:ring-accent/20'
                  }`}
                />
                {errors.fullName && (
                  <p id="fullName-error" className="text-crit text-xs mt-1.5 font-medium">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-fg-2 mb-1.5">
                  Số điện thoại <span className="text-crit">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="Ví dụ: 0912345678"
                  {...register('phone')}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? 'phone-error' : undefined}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors bg-surface text-fg focus:outline-hidden focus:ring-2 ${
                    errors.phone
                      ? 'border-crit/50 focus:border-crit focus:ring-crit/20 bg-crit-bg/20'
                      : 'border-line focus:border-accent focus:ring-accent/20'
                  }`}
                />
                {errors.phone && (
                  <p id="phone-error" className="text-crit text-xs mt-1.5 font-medium">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              {/* Address */}
              <div>
                <label htmlFor="address" className="block text-sm font-semibold text-fg-2 mb-1.5">
                  Địa chỉ nhận hàng <span className="text-crit">*</span>
                </label>
                <input
                  id="address"
                  type="text"
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                  {...register('address')}
                  aria-invalid={Boolean(errors.address)}
                  aria-describedby={errors.address ? 'address-error' : undefined}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors bg-surface text-fg focus:outline-hidden focus:ring-2 ${
                    errors.address
                      ? 'border-crit/50 focus:border-crit focus:ring-crit/20 bg-crit-bg/20'
                      : 'border-line focus:border-accent focus:ring-accent/20'
                  }`}
                />
                {errors.address && (
                  <p id="address-error" className="text-crit text-xs mt-1.5 font-medium">
                    {errors.address.message}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-semibold text-fg-2 mb-1.5">
                  Ghi chú đơn hàng (tùy chọn)
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  placeholder="Ghi chú về thời gian giao hàng hoặc chỉ dẫn địa chỉ..."
                  {...register('notes')}
                  aria-invalid={Boolean(errors.notes)}
                  aria-describedby={errors.notes ? 'notes-error' : undefined}
                  className="w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-fg text-sm transition-colors focus:outline-hidden focus:ring-2 focus:border-accent focus:ring-accent/20"
                />
                {errors.notes && (
                  <p id="notes-error" className="text-crit text-xs mt-1.5 font-medium">
                    {errors.notes.message}
                  </p>
                )}
              </div>
            </div>

            {/* Payment Method Box */}
            <div className="bg-surface rounded-2xl border border-line p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="text-lg font-bold text-fg border-b border-line pb-3">
                2. Hình thức thanh toán
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* COD Option */}
                <label
                  className={`relative flex items-start p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedPaymentMethod === PaymentMethod.COD
                      ? 'border-accent bg-accent-bg/40 shadow-xs'
                      : 'border-line hover:border-line-strong bg-surface'
                  }`}
                >
                  <input
                    type="radio"
                    value={PaymentMethod.COD}
                    {...register('paymentMethod')}
                    className="mt-1 h-4 w-4 text-accent focus:ring-accent border-line"
                  />
                  <div className="ml-3 flex flex-col">
                    <span className="flex items-center gap-1.5 font-bold text-sm text-fg">
                      <Truck className="w-4 h-4 text-accent" />
                      Thanh toán khi nhận hàng (COD)
                    </span>
                    <span className="text-xs text-muted mt-1">
                      Trả tiền mặt trực tiếp cho nhân viên giao hàng khi nhận được nông sản.
                    </span>
                  </div>
                </label>

                {/* Bank Transfer Option */}
                <label
                  className={`relative flex items-start p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedPaymentMethod === PaymentMethod.BANK_TRANSFER
                      ? 'border-accent bg-accent-bg/40 shadow-xs'
                      : 'border-line hover:border-line-strong bg-surface'
                  }`}
                >
                  <input
                    type="radio"
                    value={PaymentMethod.BANK_TRANSFER}
                    {...register('paymentMethod')}
                    className="mt-1 h-4 w-4 text-accent focus:ring-accent border-line"
                  />
                  <div className="ml-3 flex flex-col">
                    <span className="flex items-center gap-1.5 font-bold text-sm text-fg">
                      <CreditCard className="w-4 h-4 text-accent" />
                      Chuyển khoản (VietQR)
                    </span>
                    <span className="text-xs text-muted mt-1">
                      Quét mã QR qua app ngân hàng tiện lợi với thông tin tự động điền sẵn.
                    </span>
                  </div>
                </label>
              </div>

              {errors.paymentMethod && (
                <p className="text-crit text-xs mt-1.5 font-medium">
                  {errors.paymentMethod.message}
                </p>
              )}
            </div>
          </div>

          {/* Sidebar: Order Summary */}
          <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-6">
            <h2 className="text-lg font-bold text-fg border-b border-line pb-3">
              Đơn hàng của bạn ({items.length} món)
            </h2>

            {/* List items */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-sm divide-y divide-line">
              {cartLines.map((line) => (
                <div
                  key={line.productId}
                  className="pt-3 first:pt-0 flex justify-between items-start gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-fg truncate">
                      {line.product?.name ?? `SP: ${line.productId}`}
                    </p>
                    <p className="text-xs text-muted">
                      Số lượng: {line.quantity} × {formatCurrency(line.price)}
                    </p>
                  </div>
                  <span className="font-bold text-fg shrink-0">
                    {formatCurrency(line.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {errors.items && (
              <p className="text-crit text-xs font-medium">{errors.items.message}</p>
            )}

            {/* Total calculation */}
            <div className="border-t border-line pt-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-muted">
                <span>Tạm tính</span>
                <span className="font-semibold text-fg">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Phí vận chuyển</span>
                <span className="text-accent font-medium">Miễn phí giao hàng</span>
              </div>
              <div className="border-t border-line pt-3 flex justify-between items-baseline">
                <span className="text-base font-bold text-fg">Tổng thanh toán</span>
                <span className="text-2xl font-extrabold text-accent">
                  {formatCurrency(subtotal)}
                </span>
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                data-testid="submit-checkout"
                className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-accent text-accent-contrast font-bold text-base hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Đang xử lý đặt hàng...</span>
                  </>
                ) : (
                  <span>Đặt hàng ngay</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
