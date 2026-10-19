import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LookupView } from './lookup-view';

export const metadata: Metadata = {
  title: 'Tra cứu đơn hàng',
  description: 'Tra cứu tiến độ và trạng thái thanh toán đơn hàng nông sản sạch XFarm.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LookupPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" />
        </div>
      }
    >
      <LookupView />
    </Suspense>
  );
}
