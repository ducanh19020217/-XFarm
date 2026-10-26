import { ImageResponse } from 'next/og';
import { getPublicProductBySlug, formatCurrency } from '@/lib/public-api';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const alt = 'Sản phẩm XFarm';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProductOpengraphImage({ params }: Props) {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  const name = product?.name || 'Sản phẩm nông sản';
  const price = product ? formatCurrency(product.price) : '';
  const unit = product?.unit ? `/${product.unit}` : '';

  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#064e3b',
        color: 'white',
        padding: '60px 80px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '32px' }}>🌱</span>
        <span style={{ fontSize: '28px', fontWeight: 700, color: '#a7f3d0' }}>
          XFarm – Nông sản sinh thái
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <span
          style={{
            fontSize: '56px',
            fontWeight: 800,
            lineHeight: 1.1,
            color: '#ffffff',
          }}
        >
          {name}
        </span>
        {price && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontSize: '42px', fontWeight: 700, color: '#34d399' }}>{price}</span>
            <span style={{ fontSize: '24px', color: '#a7f3d0' }}>{unit}</span>
          </div>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '2px solid rgba(255,255,255,0.15)',
          paddingTop: '20px',
          fontSize: '20px',
          color: '#a7f3d0',
        }}
      >
        <span>Tiêu chuẩn VietGAP • 100% Thu hoạch tự nhiên</span>
        <span>Mã truy xuất minh bạch</span>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
