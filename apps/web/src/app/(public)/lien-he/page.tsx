import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, MapPin, Phone, Mail, Clock, MessageSquare } from 'lucide-react';
import { getSiteSettings } from '@/lib/public-api';
import { getSiteUrl } from '@/lib/site-url';
import { ContactForm } from './contact-form';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const farmName = settings['farm.name'] || 'XFarm – Nông trại sinh thái';
  const siteUrl = getSiteUrl();
  const title = 'Liên hệ';
  const description =
    'Liên hệ với Nông trại sinh thái XFarm để đặt hàng, tham quan hoặc tìm hiểu thông tin hợp tác.';

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/lien-he`,
    },
    openGraph: {
      title: `${title} | ${farmName}`,
      description,
      url: `${siteUrl}/lien-he`,
      siteName: farmName,
      locale: 'vi_VN',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${farmName}`,
      description,
    },
  };
}

export default async function ContactPage() {
  const settings = await getSiteSettings();

  const farmName = settings['farm.name'] || 'XFarm – Nông trại sinh thái';
  const address = settings['contact.address'] || 'Khu nông nghiệp sinh thái XFarm, Hòa Lạc, Hà Nội';
  const phone = settings['contact.phone'] || '0901 234 567';
  const email = settings['contact.email'] || 'hello@xfarm.local';

  return (
    <div className="py-10 sm:py-16 text-fg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs sm:text-sm text-muted"
        >
          <Link href="/" className="hover:text-accent transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
          <span className="text-fg font-semibold" aria-current="page">
            Liên hệ
          </span>
        </nav>

        {/* Page Header */}
        <div className="border-b border-line pb-8">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-accent bg-accent-bg px-3 py-1.5 rounded-full border border-accent/20">
            Kết nối với chúng tôi
          </span>
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold text-fg tracking-tight">
            Liên Hệ & Bản Đồ
          </h1>
          <p className="mt-2 text-muted text-base max-w-2xl">
            Chúng tôi luôn hân hạnh đón tiếp quý khách đến tham quan nông trại hoặc trao đổi cơ hội
            hợp tác cung ứng nông sản sạch.
          </p>
        </div>

        {/* 2-column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Farm Info & OpenStreetMap Embed */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-line shadow-xs space-y-6 text-fg">
              <h2 className="text-xl font-bold text-fg border-b border-line pb-4">
                Thông Tin Trang Trại
              </h2>

              <ul className="space-y-5 text-sm">
                <li className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-accent-bg text-accent flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="block font-semibold text-fg">Địa chỉ trang trại</span>
                    <span className="text-muted leading-relaxed">{address}</span>
                  </div>
                </li>

                <li className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-accent-bg text-accent flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="block font-semibold text-fg">Hotline tư vấn</span>
                    <a
                      href={`tel:${phone.replace(/\s+/g, '')}`}
                      className="text-accent hover:text-accent-hover font-medium"
                    >
                      {phone}
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-accent-bg text-accent flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="block font-semibold text-fg">Thư điện tử</span>
                    <a
                      href={`mailto:${email}`}
                      className="text-accent hover:text-accent-hover font-medium"
                    >
                      {email}
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-accent-bg text-accent flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="block font-semibold text-fg">Giờ mở cửa đón khách</span>
                    <span className="text-muted">07:30 - 17:30 (Thứ 2 đến Chủ Nhật)</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Embedded OpenStreetMap */}
            <div className="bg-surface rounded-3xl p-6 border border-line shadow-xs space-y-3 text-fg">
              <h3 className="text-base font-bold text-fg flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent" aria-hidden="true" />
                <span>Bản Đồ Nông Trại XFarm</span>
              </h3>
              <div className="w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-line relative bg-surface-2">
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
              <p className="text-xs text-muted">
                Bản đồ vị trí khu nông trại sinh thái XFarm (OpenStreetMap).
              </p>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-surface-2 border border-line rounded-3xl p-6 mb-6 text-fg">
              <h2 className="text-base font-bold text-fg flex items-center gap-2 mb-1">
                <MessageSquare className="w-5 h-5 text-accent" aria-hidden="true" />
                <span>Gửi Tin Nhắn Cho XFarm</span>
              </h2>
              <p className="text-xs sm:text-sm text-muted">
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
