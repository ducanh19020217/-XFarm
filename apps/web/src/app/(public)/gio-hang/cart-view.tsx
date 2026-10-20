'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';
import { useCart } from '@/lib/cart';
import {
  formatCurrency,
  type PublicProduct,
  FALLBACK_PRODUCTS,
  API_BASE_URL,
} from '@/lib/public-api';

export function CartView() {
  const { items, updateQuantity, removeFromCart, isLoaded } = useCart();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    async function loadProducts() {
      try {
        const res = await fetch(`${API_BASE_URL}/public/products`);
        if (res.ok) {
          const body = await res.json();
          const list = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : [];
          if (!isCancelled && list.length > 0) {
            setProducts(list);
            setLoadingProducts(false);
            return;
          }
        }
      } catch {
        // Fallback
      }
      if (!isCancelled) {
        setProducts(FALLBACK_PRODUCTS);
        setLoadingProducts(false);
      }
    }

    loadProducts();
    return () => {
      isCancelled = true;
    };
  }, []);

  const productMap = useMemo(() => {
    return new Map(products.map((p) => [p.id, p]));
  }, [products]);

  // Merge cart items with live product prices from API
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

  if (!isLoaded || loadingProducts) {
    return (
      <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" />
        <p className="mt-3 text-slate-600 text-sm">Đang tải giỏ hàng...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-16 sm:py-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 sm:p-14 text-center border border-slate-200/80 shadow-xs">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 text-emerald-600">
            <ShoppingBag className="w-10 h-10" aria-hidden="true" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Giỏ hàng của bạn đang trống
          </h1>
          <p className="mt-3 text-slate-600 text-sm sm:text-base max-w-md mx-auto">
            Chưa có sản phẩm nào trong giỏ hàng. Hãy khám phá nguồn nông sản sạch tươi ngon tại
            XFarm!
          </p>
          <div className="mt-8">
            <Link
              href="/san-pham"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 text-white font-bold text-sm sm:text-base hover:bg-emerald-700 shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Khám phá sản phẩm</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb / Title */}
      <div className="mb-8">
        <Link
          href="/san-pham"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tiếp tục mua hàng</span>
        </Link>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Giỏ hàng của bạn
        </h1>
        <p className="mt-1 text-slate-600 text-sm">
          Có <span className="font-bold text-slate-900">{items.length}</span> loại sản phẩm trong
          giỏ
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Cart Item List */}
        <div className="lg:col-span-2 space-y-4">
          {cartLines.map((line) => {
            const product = line.product;
            const imageSrc =
              product?.mediaIds && product.mediaIds.length > 0 ? product.mediaIds[0] : null;

            return (
              <div
                key={line.productId}
                data-testid={`cart-row-${line.productId}`}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
              >
                {/* Product thumbnail + Title */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                    {imageSrc &&
                    (imageSrc.startsWith('http://') ||
                      imageSrc.startsWith('https://') ||
                      imageSrc.startsWith('/')) ? (
                      <Image
                        src={imageSrc}
                        alt={product?.name ?? 'Sản phẩm'}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-emerald-700 bg-emerald-50">
                        <ShoppingBag className="w-7 h-7" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate hover:text-emerald-700">
                      {product ? (
                        <Link href={`/san-pham/${product.slug}`}>{product.name}</Link>
                      ) : (
                        <span>Mã SP: {line.productId}</span>
                      )}
                    </h3>
                    <div className="mt-1 text-xs sm:text-sm text-slate-500">
                      Đơn giá:{' '}
                      <span className="font-semibold text-emerald-700">
                        {formatCurrency(line.price)}
                      </span>
                      {product?.unit ? ` / ${product.unit}` : ''}
                    </div>
                  </div>
                </div>

                {/* Controls: Quantity + Subtotal + Remove */}
                <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Quantity selector */}
                  <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 h-9 w-28 overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                      disabled={line.quantity <= 1}
                      aria-label="Giảm số lượng"
                      className="w-8 h-full flex items-center justify-center text-slate-600 hover:text-emerald-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={line.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1) {
                          updateQuantity(line.productId, val);
                        }
                      }}
                      aria-label="Số lượng"
                      className="flex-1 w-12 text-center text-xs sm:text-sm font-bold text-slate-900 border-none outline-hidden p-0 focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                      disabled={line.quantity >= 99}
                      aria-label="Tăng số lượng"
                      className="w-8 h-full flex items-center justify-center text-slate-600 hover:text-emerald-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right min-w-24">
                    <span className="block text-sm sm:text-base font-extrabold text-slate-900">
                      {formatCurrency(line.subtotal)}
                    </span>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeFromCart(line.productId)}
                    aria-label={`Xóa ${product?.name ?? 'sản phẩm'} khỏi giỏ`}
                    data-testid={`remove-cart-${line.productId}`}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
            Tóm tắt đơn hàng
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Tạm tính</span>
              <span data-testid="cart-subtotal" className="font-bold text-slate-900">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Phí vận chuyển</span>
              <span className="text-emerald-700 font-medium">Tính khi thanh toán</span>
            </div>
            <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
              <span className="text-base font-bold text-slate-900">Tổng cộng</span>
              <span
                data-testid="cart-total"
                className="text-xl sm:text-2xl font-extrabold text-emerald-700"
              >
                {formatCurrency(subtotal)}
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              href="/thanh-toan"
              data-testid="proceed-to-checkout"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-emerald-600 text-white font-bold text-base hover:bg-emerald-700 shadow-sm transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span>Tiến hành thanh toán</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/san-pham"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors"
            >
              <span>Mua thêm sản phẩm khác</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
