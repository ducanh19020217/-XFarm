import { ImageResponse } from 'next/og';
import { getSiteSettings } from '@/lib/public-api';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const alt = 'XFarm - Nông trại sinh thái';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const settings = await getSiteSettings();
  const farmName = settings['farm.name'] || 'XFarm – Nông trại sinh thái';
  const slogan = settings['farm.slogan'] || 'Tươi lành từ đất, an tâm đến bàn ăn';

  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#064e3b',
        color: 'white',
        padding: '40px 60px',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
          }}
        >
          🌱
        </div>
        <span
          style={{
            fontSize: '44px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#a7f3d0',
          }}
        >
          {farmName}
        </span>
      </div>
      <p
        style={{
          fontSize: '28px',
          maxWidth: '900px',
          textAlign: 'center',
          color: '#ecfdf5',
          lineHeight: 1.4,
          margin: 0,
        }}
      >
        {slogan}
      </p>
      <div
        style={{
          marginTop: '36px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          fontSize: '18px',
          color: '#6ee7b7',
        }}
      >
        <span>Trồng trọt hữu cơ</span>
        <span>•</span>
        <span>Chăn nuôi sinh thái</span>
        <span>•</span>
        <span>Thủy sản tuần hoàn</span>
        <span>•</span>
        <span>Truy xuất minh bạch</span>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
