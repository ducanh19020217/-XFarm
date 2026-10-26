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
  getPublicProducts,
} from '@/lib/public-api';
import { getAssetPath } from '@/lib/site-url';

export function CartView() {
  const { items, updateQuantity, removeFromCart, isLoaded } = useCart();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    async function loadProducts() {
      try {
        const list = await getPublicProducts();
        if (!isCancelled && list.length > 0) {
          setProducts(list);
          setLoadingProducts(false);
          return;
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
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-accent border-t-transparent" />
        <p className="mt-3 text-muted text-sm">Đang tải giỏ hàng...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-16 sm:py-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-surface rounded-3xl p-8 sm:p-14 text-center border border-line shadow-xs">
          <div className="w-20 h-20 bg-accent-bg rounded-full flex items-center justify-center mx-auto mb-5 text-accent">
            <ShoppingBag className="w-10 h-10" aria-hidden="true" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
            Giỏ hàng của bạn đang trống
          </h1>
          <p className="mt-3 text-muted text-sm sm:text-base max-w-md mx-auto">
            Chưa có sản phẩm nào trong giỏ hàng. Hãy khám phá nguồn nông sản sạch tươi ngon tại
            XFarm!
          </p>
          <div className="mt-8">
            <Link
              href="/san-pham"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-accent text-accent-contrast font-bold text-sm sm:text-base hover:bg-accent-hover shadow-xs transition-all"
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
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-accent hover:underline transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tiếp tục mua hàng</span>
        </Link>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-fg tracking-tight">
          Giỏ hàng của bạn
        </h1>
        <p className="mt-1 text-muted text-sm">
          Có <span className="font-bold text-fg">{items.length}</span> loại sản phẩm trong giỏ
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
                className="bg-surface rounded-2xl border border-line p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
              >
                {/* Product thumbnail + Title */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-surface-2 overflow-hidden shrink-0 border border-line">
                    {imageSrc &&
                    (imageSrc.startsWith('http://') ||
                      imageSrc.startsWith('https://') ||
                      imageSrc.startsWith('/')) ? (
                      <Image
                        src={getAssetPath(imageSrc)}
                        alt={product?.name ?? 'Sản phẩm'}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-accent bg-accent-bg">
                        <ShoppingBag className="w-7 h-7" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-fg text-sm sm:text-base truncate hover:text-accent">
                      {product ? (
                        <Link href={`/san-pham/${product.slug}`}>{product.name}</Link>
                      ) : (
                        <span>Mã SP: {line.productId}</span>
                      )}
                    </h3>
                    <div className="mt-1 text-xs sm:text-sm text-muted">
                      Đơn giá:{' '}
                      <span className="font-semibold text-accent">
                        {formatCurrency(line.price)}
                      </span>
                      {product?.unit ? ` / ${product.unit}` : ''}
                    </div>
                  </div>
                </div>

                {/* Controls: Quantity + Subtotal + Remove */}
                <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-line">
                  {/* Quantity selector */}
                  <div className="flex items-center border border-line rounded-lg bg-surface-2 h-9 w-28 overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                      disabled={line.quantity <= 1}
                      aria-label="Giảm số lượng"
                      className="w-8 h-full flex items-center justify-center text-muted hover:text-accent hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                      className="flex-1 w-12 text-center text-xs sm:text-sm font-bold text-fg bg-transparent border-none outline-hidden p-0 focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                      disabled={line.quantity >= 99}
                      aria-label="Tăng số lượng"
                      className="w-8 h-full flex items-center justify-center text-muted hover:text-accent hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right min-w-24">
                    <span className="block text-sm sm:text-base font-extrabold text-fg">
                      {formatCurrency(line.subtotal)}
                    </span>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeFromCart(line.productId)}
                    aria-label={`Xóa ${product?.name ?? 'sản phẩm'} khỏi giỏ`}
                    data-testid={`remove-cart-${line.productId}`}
                    className="p-2 text-muted hover:text-crit hover:bg-crit-bg rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary Card */}
        <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-fg border-b border-line pb-3">Tóm tắt đơn hàng</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-muted">
              <span>Tạm tính</span>
              <span data-testid="cart-subtotal" className="font-bold text-fg">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Phí vận chuyển</span>
              <span className="text-accent font-medium">Tính khi thanh toán</span>
            </div>
            <div className="border-t border-line pt-3 flex justify-between items-baseline">
              <span className="text-base font-bold text-fg">Tổng cộng</span>
              <span
                data-testid="cart-total"
                className="text-xl sm:text-2xl font-extrabold text-accent"
              >
                {formatCurrency(subtotal)}
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              href="/thanh-toan"
              data-testid="proceed-to-checkout"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-accent text-accent-contrast font-bold text-base hover:bg-accent-hover shadow-xs transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span>Tiến hành thanh toán</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/san-pham"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-fg-2 font-semibold text-sm hover:bg-hover transition-colors"
            >
              <span>Mua thêm sản phẩm khác</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
