import type { Metadata } from 'next';
import './globals.css';

import { getSiteUrl } from '@/lib/site-url';
import { ThemeProvider } from '@xfarm/ui';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: 'XFarm - Hệ thống Quản lý Nông trại',
  description: 'Nền tảng ERP & Quảng bá nông trại sinh thái XFarm',
};

const themeScript = `(function(){try{var t=localStorage.getItem('xfarm_theme')||localStorage.getItem('theme');var d=document.documentElement;var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&m)||(t==='system'&&m)){d.classList.add('dark')}else{d.classList.remove('dark')}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased bg-app text-fg">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
