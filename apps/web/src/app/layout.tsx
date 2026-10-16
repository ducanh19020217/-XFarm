import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'XFarm - Hệ thống Quản lý Nông trại',
  description: 'Nền tảng ERP & Quảng bá nông trại sinh thái XFarm',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
