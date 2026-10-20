import type { Metadata } from 'next';
import { getPublicBookingByCode, getSiteSettings } from '@/lib/public-api';
import { BookingSuccessClient } from './_components/booking-success-client';

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const farmName = settings['farm.name'] || 'XFarm – Nông trại sinh thái';

  return {
    title: `Đặt chỗ thành công | ${farmName}`,
    description: 'Xác nhận thông tin đặt chỗ tour du lịch trải nghiệm tại XFarm.',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function BookingSuccessPage({ params }: Props) {
  const { code } = await params;
  const booking = await getPublicBookingByCode(code);

  return (
    <div className="py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BookingSuccessClient initialBooking={booking} code={code} />
      </div>
    </div>
  );
}
