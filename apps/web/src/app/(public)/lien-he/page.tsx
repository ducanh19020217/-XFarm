import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, MapPin, Phone, Mail, Clock, MessageSquare } from 'lucide-react';
import { getSiteSettings } from '@/lib/public-api';
import { ContactForm } from './contact-form';

export const metadata: Metadata = {
  title: 'Liên hệ',
  description:
    'Liên hệ với Nông trại sinh thái XFarm để đặt hàng, tham quan hoặc tìm hiểu thông tin hợp tác.',
};

export default async function ContactPage() {
  const settings = await getSiteSettings();

  const farmName = settings['farm.name'] || 'XFarm – Nông trại sinh thái';
  const address = settings['contact.address'] || 'Khu nông nghiệp sinh thái XFarm, Hòa Lạc, Hà Nội';
  const phone = settings['contact.phone'] || '0901 234 567';
  const email = settings['contact.email'] || 'hello@xfarm.local';

  return (
    <div className="py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs sm:text-sm text-slate-700"
        >
          <Link href="/" className="hover:text-emerald-700 transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <span className="text-slate-900 font-semibold" aria-current="page">
            Liên hệ
          </span>
        </nav>

        {/* Page Header */}
        <div className="border-b border-slate-200 pb-8">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            Kết nối với chúng tôi
          </span>
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Liên Hệ & Bản Đồ
          </h1>
          <p className="mt-2 text-slate-700 text-base max-w-2xl">
            Chúng tôi luôn hân hạnh đón tiếp quý khách đến tham quan nông trại hoặc trao đổi cơ hội
            hợp tác cung ứng nông sản sạch.
          </p>
        </div>

        {/* 2-column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Farm Info & OpenStreetMap Embed */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">
                Thông Tin Trang Trại
              </h2>

              <ul className="space-y-5 text-sm">
                <li className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-900">Địa chỉ trang trại</span>
                    <span className="text-slate-700 leading-relaxed">{address}</span>
                  </div>
                </li>

                <li className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-900">Hotline tư vấn</span>
                    <a
                      href={`tel:${phone.replace(/\s+/g, '')}`}
                      className="text-emerald-700 hover:text-emerald-800 font-medium"
                    >
                      {phone}
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-900">Thư điện tử</span>
                    <a
                      href={`mailto:${email}`}
                      className="text-emerald-700 hover:text-emerald-800 font-medium"
                    >
                      {email}
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-900">Giờ mở cửa đón khách</span>
                    <span className="text-slate-700">07:30 - 17:30 (Thứ 2 đến Chủ Nhật)</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Embedded OpenStreetMap */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                <span>Bản Đồ Nông Trại XFarm</span>
              </h3>
              <div className="w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-200 relative bg-slate-100">
                <iframe
                  title="Bản đồ OpenStreetMap vị trí nông trại XFarm"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  loading="lazy"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=105.5000%2C20.9800%2C105.5800%2C21.0400&amp;layer=mapnik&amp;marker=21.0100%2C105.5400"
                  className="w-full h-full"
                />
              </div>
              <p className="text-xs text-slate-700">
                Bản đồ vị trí khu nông trại sinh thái XFarm (OpenStreetMap).
              </p>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-3xl p-6 mb-6">
              <h2 className="text-base font-bold text-emerald-950 flex items-center gap-2 mb-1">
                <MessageSquare className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                <span>Gửi Tin Nhắn Cho XFarm</span>
              </h2>
              <p className="text-xs sm:text-sm text-emerald-900">
                Hãy để lại lời nhắn, đội ngũ tư vấn của {farmName} sẽ phản hồi quý khách trong vòng
                24 giờ làm việc.
              </p>
            </div>

            <ContactForm recipientEmail={email} />
          </div>
        </div>
      </div>
    </div>
  );
}
