import type { Metadata } from 'next';
import { CartView } from './cart-view';

export const metadata: Metadata = {
  title: 'Giỏ hàng',
  description: 'Giỏ hàng nông sản sạch XFarm – Quản lý số lượng và thanh toán an toàn tiện lợi.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CartPage() {
  return <CartView />;
}
