import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/public-api';
import { Header } from './_components/header';
import { Footer } from './_components/footer';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const farmName = settings['farm.name'] || 'XFarm – Nông trại sinh thái';
  const slogan = settings['farm.slogan'] || 'Tươi lành từ đất, an tâm đến bàn ăn';

  return {
    title: {
      template: `%s | ${farmName}`,
      default: `${farmName} - ${slogan}`,
    },
    description: settings['farm.about'] || 'Nền tảng nông trại sinh thái tuần hoàn bền vững XFarm',
  };
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header settings={settings} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer settings={settings} />
    </div>
  );
}
