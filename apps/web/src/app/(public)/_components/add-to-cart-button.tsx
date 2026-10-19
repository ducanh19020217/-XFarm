'use client';

import { useState } from 'react';
import { ShoppingCart, Check, Minus, Plus } from 'lucide-react';
import { useCart } from '@/lib/cart';

interface AddToCartButtonProps {
  productId: string;
  productName?: string;
  inStock?: boolean;
  variant?: 'card' | 'detail';
}

export function AddToCartButton({
  productId,
  productName,
  inStock = true,
  variant = 'card',
}: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addToCart } = useCart();

  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuantity((prev) => Math.min(99, prev + 1));
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1) {
      setQuantity(Math.min(99, val));
    } else if (e.target.value === '') {
      setQuantity(1);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock || !productId) return;

    addToCart(productId, quantity);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
    }, 2000);
  };

  if (!inStock) {
    return (
      <div className={variant === 'detail' ? 'w-full sm:w-auto' : 'w-full mt-3'}>
        <button
          type="button"
          disabled
          aria-label={productName ? `${productName} tạm hết hàng` : 'Tạm hết hàng'}
          className={
            variant === 'detail'
              ? 'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-slate-200 text-slate-500 font-semibold text-sm sm:text-base cursor-not-allowed border border-slate-300'
              : 'w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-400 font-medium text-xs cursor-not-allowed border border-slate-200'
          }
        >
          <span>Tạm hết hàng</span>
        </button>
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        {/* Quantity selector */}
        <div className="flex items-center border border-slate-300 rounded-xl bg-white shadow-xs overflow-hidden h-12 w-36 self-start">
          <button
            type="button"
            onClick={handleDecrease}
            disabled={quantity <= 1}
            aria-label="Giảm số lượng"
            className="w-10 h-full flex items-center justify-center text-slate-600 hover:text-emerald-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="w-4 h-4" aria-hidden="true" />
          </button>
          <input
            type="number"
            min={1}
            max={99}
            value={quantity}
            onChange={handleQuantityChange}
            aria-label="Số lượng sản phẩm"
            className="flex-1 w-12 text-center text-sm sm:text-base font-bold text-slate-900 border-none outline-hidden p-0 focus:ring-0"
          />
          <button
            type="button"
            onClick={handleIncrease}
            disabled={quantity >= 99}
            aria-label="Tăng số lượng"
            className="w-10 h-full flex items-center justify-center text-slate-600 hover:text-emerald-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Add to cart button */}
        <button
          type="button"
          onClick={handleAddToCart}
          data-testid="add-to-cart-button"
          className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-sm sm:text-base shadow-sm transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            added
              ? 'bg-emerald-700 text-white shadow-emerald-200'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md active:scale-98'
          }`}
        >
          {added ? (
            <>
              <Check className="w-5 h-5 text-white" aria-hidden="true" />
              <span>Đã thêm vào giỏ!</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-5 h-5" aria-hidden="true" />
              <span>Thêm vào giỏ</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // Card variant
  return (
    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 h-8 w-24 overflow-hidden shrink-0">
        <button
          type="button"
          onClick={handleDecrease}
          disabled={quantity <= 1}
          aria-label="Giảm số lượng"
          className="w-7 h-full flex items-center justify-center text-slate-600 hover:text-emerald-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Minus className="w-3 h-3" aria-hidden="true" />
        </button>
        <span className="flex-1 text-center text-xs font-semibold text-slate-800 select-none">
          {quantity}
        </span>
        <button
          type="button"
          onClick={handleIncrease}
          disabled={quantity >= 99}
          aria-label="Tăng số lượng"
          className="w-7 h-full flex items-center justify-center text-slate-600 hover:text-emerald-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="w-3 h-3" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        data-testid={`add-to-cart-${productId}`}
        aria-label={productName ? `Thêm ${productName} vào giỏ` : 'Thêm vào giỏ'}
        className={`flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-2 rounded-lg text-xs font-semibold transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 ${
          added
            ? 'bg-emerald-700 text-white'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
        }`}
      >
        {added ? (
          <>
            <Check className="w-3.5 h-3.5 text-white" aria-hidden="true" />
            <span>Đã thêm</span>
          </>
        ) : (
          <>
            <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Thêm vào giỏ</span>
          </>
        )}
      </button>
    </div>
  );
}
