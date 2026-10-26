import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ChevronRight, ArrowLeft, ShieldCheck, Truck, RefreshCw } from 'lucide-react';
import { getPublicProductBySlug, getPublicProducts, formatCurrency } from '@/lib/public-api';
import { getSiteUrl, getAssetPath } from '@/lib/site-url';
import { sanitizeHtml } from '@/lib/sanitize';
import { AddToCartButton } from '../../_components/add-to-cart-button';

export async function generateStaticParams() {
  const products = await getPublicProducts();
  return products.map((p) => ({ slug: p.slug }));
}

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);
  const siteUrl = getSiteUrl();

  if (!product) {
    return {
      title: 'Không tìm thấy sản phẩm',
      description: 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.',
    };
  }

  const title = product.name;
  const description = `Mua ${product.name} tươi sạch tại nông trại sinh thái XFarm. Giá: ${formatCurrency(product.price)}/${product.unit}.`;
  const canonicalUrl = `${siteUrl}/san-pham/${product.slug}`;
  const images = product.mediaIds && product.mediaIds.length > 0 ? product.mediaIds : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const inStock = product.inStock !== false;
  const imageSrc = product.mediaIds && product.mediaIds.length > 0 ? product.mediaIds[0] : null;
  const sanitizedDescription = sanitizeHtml(product.description);
  const rawDescription = product.description
    ? product.description.replace(/<[^>]+>/g, '').trim()
    : product.name;
  const siteUrl = getSiteUrl();

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: rawDescription,
    image: product.mediaIds && product.mediaIds.length > 0 ? product.mediaIds : undefined,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'VND',
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${siteUrl}/san-pham/${product.slug}`,
    },
  };

  return (
    <div className="py-10 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs sm:text-sm text-muted"
        >
          <Link href="/" className="hover:text-accent transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
          <Link href="/san-pham" className="hover:text-accent transition-colors">
            Sản phẩm
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
          <span className="text-fg font-semibold truncate max-w-xs" aria-current="page">
            {product.name}
          </span>
        </nav>

        {/* Back Link */}
        <div>
          <Link
            href="/san-pham"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-accent hover:text-accent-hover transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Quay lại danh sách sản phẩm</span>
          </Link>
        </div>

        {/* Product Details Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 bg-surface rounded-3xl p-6 sm:p-10 border border-line shadow-xs text-fg">
          {/* Left: Product Image */}
          <div className="relative aspect-4/3 sm:aspect-square w-full rounded-2xl bg-surface-2 overflow-hidden border border-line">
            {imageSrc &&
            (imageSrc.startsWith('http://') ||
              imageSrc.startsWith('https://') ||
              imageSrc.startsWith('/')) ? (
              <Image
                src={getAssetPath(imageSrc)}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-surface-2 text-accent p-8 text-center">
                <span className="text-lg font-bold text-fg mb-2">{product.name}</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Nông sản sạch XFarm
                </span>
              </div>
            )}
          </div>

          {/* Right: Info & Actions */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {inStock ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-ok-bg text-ok border border-ok/20">
                    <span className="w-2 h-2 rounded-full bg-ok animate-pulse" />
                    Còn hàng
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-surface-2 text-muted border border-line">
                    <span className="w-2 h-2 rounded-full bg-muted" />
                    Tạm hết hàng
                  </span>
                )}
                <span className="text-xs text-muted font-medium">Mã SP: {product.slug}</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-fg tracking-tight leading-tight">
                {product.name}
              </h1>

              {/* Price */}
              <div className="p-4 rounded-2xl bg-surface-2 border border-line flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-accent">
                  {formatCurrency(product.price)}
                </span>
                <span className="text-sm font-semibold text-muted">/ {product.unit}</span>
              </div>

              {/* Sanitized HTML Description */}
              <div className="pt-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-2">
                  Mô tả sản phẩm
                </h2>
                <div
                  className="prose prose-sm prose-slate dark:prose-invert text-fg-2 leading-relaxed max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                />
              </div>

              {/* Quality Highlights */}
              <div className="pt-4 space-y-2.5 border-t border-line text-xs sm:text-sm text-muted">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                  <span>Tiêu chuẩn VietGAP, an toàn cho sức khỏe</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                  <span>Thu hoạch tươi trong ngày, bảo quản tự nhiên</span>
                </div>
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                  <span>Mã QR truy xuất nguồn gốc minh bạch đến từng lô</span>
                </div>
              </div>
            </div>

            {/* Order Action Buttons */}
            <div className="pt-6 border-t border-line space-y-4">
              <AddToCartButton
                productId={product.id}
                productName={product.name}
                inStock={inStock}
                variant="detail"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
