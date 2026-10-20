import type { Metadata } from 'next';
import { CheckoutView } from './checkout-view';

export const metadata: Metadata = {
  title: 'Thanh toán đơn hàng',
  description: 'Thanh toán đặt hàng nông sản sinh thái XFarm nhanh chóng, an toàn.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
