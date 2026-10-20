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

  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col bg-app text-fg">
        <Header settings={settings} />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer settings={settings} />
      </div>
    </CartProvider>
  );
}
