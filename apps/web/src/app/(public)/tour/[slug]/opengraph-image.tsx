import { ImageResponse } from 'next/og';
import { getPublicTourBySlug, formatCurrency } from '@/lib/public-api';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const alt = 'Tour du lịch trải nghiệm XFarm';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TourOpengraphImage({ params }: Props) {
  const { slug } = await params;
  const tour = await getPublicTourBySlug(slug);

  const name = tour?.name || 'Tour Du Lịch Trải Nghiệm Sinh Thái';
  const price = tour ? formatCurrency(tour.priceAdult) : '';
  const duration = tour?.durationMinutes ? `${tour.durationMinutes} phút` : '';

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
        <span style={{ fontSize: '32px' }}>🧭</span>
        <span style={{ fontSize: '28px', fontWeight: 700, color: '#a7f3d0' }}>
          XFarm – Du Lịch Trải Nghiệm Sinh Thái
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <span
          style={{
            fontSize: '54px',
            fontWeight: 800,
            lineHeight: 1.15,
            color: '#ffffff',
          }}
        >
          {name}
        </span>
        {price && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
            <span style={{ fontSize: '42px', fontWeight: 700, color: '#34d399' }}>{price}</span>
            <span style={{ fontSize: '24px', color: '#a7f3d0' }}>/ vé người lớn</span>
            {duration && (
              <span style={{ fontSize: '22px', color: '#cbd5e1', marginLeft: '20px' }}>
                • Thời lượng: {duration}
              </span>
            )}
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
        <span>Một ngày làm nông dân • Trải nghiệm thu hoạch thực tế</span>
        <span>Đặt chỗ trực tuyến tại xfarm.local</span>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
