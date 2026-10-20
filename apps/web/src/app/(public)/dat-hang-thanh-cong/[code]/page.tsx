import type { Metadata } from 'next';
import { SuccessView } from './success-view';

interface SuccessPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: SuccessPageProps): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Đặt hàng thành công #${code}`,
    description: 'Xác nhận đơn hàng và thông tin thanh toán nông sản sạch XFarm.',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function SuccessPage({ params }: SuccessPageProps) {
  const { code } = await params;
  return <SuccessView code={code} />;
}
