import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { formatCurrency, type PublicProduct } from '@/lib/public-api';
import { AddToCartButton } from './add-to-cart-button';

interface ProductCardProps {
  product: PublicProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const inStock = product.inStock !== false;
  const imageSrc = product.mediaIds && product.mediaIds.length > 0 ? product.mediaIds[0] : null;

  return (
    <article className="group relative flex flex-col bg-surface rounded-2xl border border-line hover:border-accent shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden text-fg">
      {/* Product Image / Visual header */}
      <div className="relative aspect-4/3 w-full bg-surface-2 overflow-hidden">
        {imageSrc &&
        (imageSrc.startsWith('http://') ||
          imageSrc.startsWith('https://') ||
          imageSrc.startsWith('/')) ? (
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-surface-2 text-accent p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center mb-2 text-accent shadow-xs">
              <ShoppingBag className="w-6 h-6" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">
              Nông sản XFarm
            </span>
          </div>
        )}

        {/* In-stock / Out-of-stock badge */}
        <div className="absolute top-3 right-3 z-10">
          {inStock ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-ok-bg text-ok border border-ok/20 shadow-xs">
              Còn hàng
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-surface-2 text-muted border border-line shadow-xs">
              Tạm hết hàng
            </span>
          )}
        </div>
      </div>

      {/* Product Content */}
      <div className="flex-1 flex flex-col p-5">
        <h3 className="font-bold text-fg text-base sm:text-lg group-hover:text-accent transition-colors line-clamp-1 mb-1.5">
          <Link
            href={`/san-pham/${product.slug}`}
            className="focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
          >
            {product.name}
          </Link>
        </h3>

        <div className="mt-auto pt-3 flex items-baseline justify-between gap-2 border-t border-line">
          <div>
            <span className="text-lg sm:text-xl font-extrabold text-accent">
              {formatCurrency(product.price)}
            </span>
            <span className="text-xs text-muted ml-1">/ {product.unit}</span>
          </div>

          <Link
            href={`/san-pham/${product.slug}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
          >
            <span>Chi tiết</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <AddToCartButton
          productId={product.id}
          productName={product.name}
          inStock={inStock}
          variant="card"
        />
      </div>
    </article>
  );
}
