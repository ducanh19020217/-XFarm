'use client';

import { useState } from 'react';
import { ShoppingCart, Info } from 'lucide-react';

export function OrderButton() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block w-full sm:w-auto">
      <div
        className="w-full"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
      >
        <button
          type="button"
          disabled
          aria-describedby="order-button-tooltip"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-slate-200 text-slate-400 font-bold text-base cursor-not-allowed border border-slate-300 select-none transition-all shadow-xs"
          title="Sắp có cửa hàng online"
        >
          <ShoppingCart className="w-5 h-5 text-slate-400" aria-hidden="true" />
          <span>Đặt hàng</span>
        </button>
      </div>

      {/* Accessible Tooltip */}
      {showTooltip && (
        <div
          id="order-button-tooltip"
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-20 w-max max-w-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium shadow-lg pointer-events-none flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150"
        >
          <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
          <span>Sắp có cửa hàng online (GĐ 4)</span>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}
