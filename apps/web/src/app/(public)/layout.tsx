import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/public-api';
import { Header } from './_components/header';
import { Footer } from './_components/footer';

import { getSiteUrl } from '@/lib/site-url';
import { CartProvider } from '@/lib/cart';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const farmName = settings['farm.name'] || 'XFarm – Nông trại sinh thái';
  const slogan = settings['farm.slogan'] || 'Tươi lành từ đất, an tâm đến bàn ăn';
  const description =
    settings['farm.about'] || 'Nền tảng nông trại sinh thái tuần hoàn bền vững XFarm';
  const siteUrl = getSiteUrl();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      template: `%s | ${farmName}`,
      default: `${farmName} - ${slogan}`,
    },
    description,
    openGraph: {
      title: `${farmName} - ${slogan}`,
      description,
      url: siteUrl,
      siteName: farmName,
      locale: 'vi_VN',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${farmName} - ${slogan}`,
      description,
    },
  };
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const isDemo = process.env.NEXT_PUBLIC_DEMO === '1';

  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col bg-app text-fg">
        {isDemo && (
          <aside
            aria-label="Thông báo bản demo"
            className="sticky top-0 z-50 bg-emerald-800 text-emerald-50 text-xs sm:text-sm py-2 px-4 border-b border-emerald-700/60 shadow-xs flex items-center justify-center gap-2 sm:gap-3 font-medium text-center"
          >
            <span>
              🌱 <strong>Bản demo – dữ liệu mẫu</strong> (hoạt động tĩnh, không kết nối backend)
            </span>
            <span className="hidden sm:inline text-emerald-300/60">•</span>
            <a
              href="https://github.com/ducanh19020217/-XFarm"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white font-semibold inline-flex items-center gap-1 transition-colors"
            >
              GitHub Repo
            </a>
          </aside>
        )}
        <Header settings={settings} />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer settings={settings} />
      </div>
    </CartProvider>
  );
}
