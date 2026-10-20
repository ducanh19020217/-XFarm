import * as React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { PublicLot, PublicProduct } from '../trace-utils';

interface TraceHeaderProps {
  product?: PublicProduct | null;
  lot: PublicLot;
}

export function TraceHeader({ product, lot }: TraceHeaderProps) {
  const productName = product?.name || 'Sản phẩm nông sản';
  const certification = lot.certification || 'VietGAP';

  return (
    <header className="space-y-3 mb-4">
      {/* Top micro badge */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ok-bg text-ok text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Nguồn gốc xác thực</span>
        </div>
        <span className="text-xs font-mono font-medium text-muted">
          Mã: {lot.traceCode || lot.code}
        </span>
      </div>

      {/* Main Product Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
          {productName}
        </h1>
        {product?.unit && (
          <p className="text-xs text-muted mt-0.5">
            Đơn vị tính: <span className="font-medium text-fg-2">{product.unit}</span>
          </p>
        )}
      </div>

      {/* Certification Badge */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-accent text-accent-contrast text-xs font-bold shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {certification}
        </span>

        {lot.qualityGrade && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-warn-bg text-warn text-xs font-bold">
            Chất lượng: {lot.qualityGrade}
          </span>
        )}
      </div>
    </header>
  );
}
