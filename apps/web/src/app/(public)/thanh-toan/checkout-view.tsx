'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard, Truck, ArrowLeft, AlertCircle, ShoppingBag, Loader2 } from 'lucide-react';
import { webshopCheckoutSchema, type WebshopCheckoutInput, PaymentMethod } from '@xfarm/shared';
import { useCart } from '@/lib/cart';
import { formatCurrency, type PublicProduct, FALLBACK_PRODUCTS } from '@/lib/public-api';

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
        const res = await fetch('/api/v1/public/products');
        if (res.ok) {
          const body = await res.json();
          const list = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : [];
          if (!cancelled && list.length > 0) {
            setProducts(list);
            setLoadingProducts(false);
            return;
          }
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

    try {
      const res = await fetch('/api/v1/public/orders', {
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
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" />
        <p className="mt-3 text-slate-600 text-sm">Đang tải thông tin thanh toán...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-16 sm:py-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 sm:p-14 text-center border border-slate-200/80 shadow-xs">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Giỏ hàng trống</h1>
          <p className="mt-2 text-slate-600 text-sm">
            Bạn chưa chọn sản phẩm nào để thanh toán. Vui lòng thêm sản phẩm vào giỏ hàng trước.
          </p>
          <div className="mt-6">
            <Link
              href="/san-pham"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors"
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
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại giỏ hàng</span>
        </Link>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Thông tin thanh toán
        </h1>
        <p className="mt-1 text-slate-600 text-sm">
          Vui lòng nhập thông tin nhận hàng để hoàn tất đặt hàng.
        </p>
      </div>

      {apiError && (
        <div
          role="alert"
          className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{apiError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Details Box */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-5">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                1. Thông tin người nhận
              </h2>

              {/* Full Name */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-semibold text-slate-800 mb-1.5"
                >
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn An"
                  {...register('fullName')}
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-hidden focus:ring-2 ${
                    errors.fullName
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/30'
                      : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-100'
                  }`}
                />
                {errors.fullName && (
                  <p id="fullName-error" className="text-red-600 text-xs mt-1.5 font-medium">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-semibold text-slate-800 mb-1.5"
                >
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="Ví dụ: 0912345678"
                  {...register('phone')}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? 'phone-error' : undefined}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-hidden focus:ring-2 ${
                    errors.phone
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/30'
                      : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-100'
                  }`}
                />
                {errors.phone && (
                  <p id="phone-error" className="text-red-600 text-xs mt-1.5 font-medium">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              {/* Address */}
              <div>
                <label
                  htmlFor="address"
                  className="block text-sm font-semibold text-slate-800 mb-1.5"
                >
                  Địa chỉ nhận hàng <span className="text-red-500">*</span>
                </label>
                <input
                  id="address"
                  type="text"
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                  {...register('address')}
                  aria-invalid={Boolean(errors.address)}
                  aria-describedby={errors.address ? 'address-error' : undefined}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-hidden focus:ring-2 ${
                    errors.address
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/30'
                      : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-100'
                  }`}
                />
                {errors.address && (
                  <p id="address-error" className="text-red-600 text-xs mt-1.5 font-medium">
                    {errors.address.message}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-semibold text-slate-800 mb-1.5"
                >
                  Ghi chú đơn hàng (tùy chọn)
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  placeholder="Ghi chú về thời gian giao hàng hoặc chỉ dẫn địa chỉ..."
                  {...register('notes')}
                  aria-invalid={Boolean(errors.notes)}
                  aria-describedby={errors.notes ? 'notes-error' : undefined}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm transition-colors focus:outline-hidden focus:ring-2 focus:border-emerald-500 focus:ring-emerald-100"
                />
                {errors.notes && (
                  <p id="notes-error" className="text-red-600 text-xs mt-1.5 font-medium">
                    {errors.notes.message}
                  </p>
                )}
              </div>
            </div>

            {/* Payment Method Box */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                2. Hình thức thanh toán
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* COD Option */}
                <label
                  className={`relative flex items-start p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedPaymentMethod === PaymentMethod.COD
                      ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    value={PaymentMethod.COD}
                    {...register('paymentMethod')}
                    className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <div className="ml-3 flex flex-col">
                    <span className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      Thanh toán khi nhận hàng (COD)
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      Trả tiền mặt trực tiếp cho nhân viên giao hàng khi nhận được nông sản.
                    </span>
                  </div>
                </label>

                {/* Bank Transfer Option */}
                <label
                  className={`relative flex items-start p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedPaymentMethod === PaymentMethod.BANK_TRANSFER
                      ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    value={PaymentMethod.BANK_TRANSFER}
                    {...register('paymentMethod')}
                    className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <div className="ml-3 flex flex-col">
                    <span className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      Chuyển khoản (VietQR)
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      Quét mã QR qua app ngân hàng tiện lợi với thông tin tự động điền sẵn.
                    </span>
                  </div>
                </label>
              </div>

              {errors.paymentMethod && (
                <p className="text-red-600 text-xs mt-1.5 font-medium">
                  {errors.paymentMethod.message}
                </p>
              )}
            </div>
          </div>

          {/* Sidebar: Order Summary */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              Đơn hàng của bạn ({items.length} món)
            </h2>

            {/* List items */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-sm divide-y divide-slate-100">
              {cartLines.map((line) => (
                <div
                  key={line.productId}
                  className="pt-3 first:pt-0 flex justify-between items-start gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">
                      {line.product?.name ?? `SP: ${line.productId}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      Số lượng: {line.quantity} × {formatCurrency(line.price)}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0">
                    {formatCurrency(line.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {errors.items && (
              <p className="text-red-600 text-xs font-medium">{errors.items.message}</p>
            )}

            {/* Total calculation */}
            <div className="border-t border-slate-100 pt-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Tạm tính</span>
                <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Phí vận chuyển</span>
                <span className="text-emerald-700 font-medium">Miễn phí giao hàng</span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                <span className="text-base font-bold text-slate-900">Tổng thanh toán</span>
                <span className="text-2xl font-extrabold text-emerald-700">
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
                className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-emerald-600 text-white font-bold text-base hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed shadow-sm transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
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
