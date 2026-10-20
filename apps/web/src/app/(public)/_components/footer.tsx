import Link from 'next/link';
import { Sprout, MapPin, Phone, Mail, Facebook, Youtube, LogIn } from 'lucide-react';
import type { PublicSiteSettings } from '@/lib/public-api';

interface FooterProps {
  settings?: PublicSiteSettings;
}

export function Footer({ settings }: FooterProps) {
  const farmName = settings?.['farm.name'] || 'XFarm – Nông trại sinh thái';
  const slogan = settings?.['farm.slogan'] || 'Tươi lành từ đất, an tâm đến bàn ăn';
  const address =
    settings?.['contact.address'] || 'Khu nông nghiệp sinh thái XFarm, Hòa Lạc, Hà Nội';
  const phone = settings?.['contact.phone'] || '0901 234 567';
  const email = settings?.['contact.email'] || 'hello@xfarm.local';
  const facebook = settings?.['social.facebook'] || 'https://facebook.com';
  const zalo = settings?.['social.zalo'] || 'https://zalo.me';
  const youtube = settings?.['social.youtube'] || 'https://youtube.com';

  return (
    <footer className="bg-surface-2 text-fg-2 border-t border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Column 1: Farm brand info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-fg">
              <div className="w-9 h-9 rounded-lg bg-accent text-surface flex items-center justify-center shadow-xs">
                <Sprout className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="font-bold text-lg text-fg">{farmName}</span>
            </div>
            <p className="text-muted text-sm leading-relaxed">{slogan}</p>
            <p className="text-xs text-muted">
              Mô hình nông nghiệp tuần hoàn sinh thái: Trồng trọt – Chăn nuôi – Thủy sản – Du lịch
              trải nghiệm.
            </p>
          </div>

          {/* Column 2: Quick links */}
          <div>
            <h3 className="text-sm font-semibold text-fg tracking-wider uppercase mb-4">
              Khám Phá
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/"
                  className="hover:text-accent transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-accent rounded-sm"
                >
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link
                  href="/gioi-thieu"
                  className="hover:text-accent transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-accent rounded-sm"
                >
                  Giới thiệu nông trại
                </Link>
              </li>
              <li>
                <Link
                  href="/san-pham"
                  className="hover:text-accent transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-accent rounded-sm"
                >
                  Sản phẩm sạch
                </Link>
              </li>
              <li>
                <Link
                  href="/tour"
                  className="hover:text-accent transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-accent rounded-sm"
                >
                  Tour trải nghiệm
                </Link>
              </li>
              <li>
                <Link
                  href="/tour/tra-cuu"
                  className="hover:text-accent transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-accent rounded-sm"
                >
                  Tra cứu đặt chỗ
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="hover:text-accent transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-accent rounded-sm"
                >
                  Tin tức & Cẩm nang
                </Link>
              </li>
              <li>
                <Link
                  href="/lien-he"
                  className="hover:text-accent transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-accent rounded-sm"
                >
                  Liên hệ & Bản đồ
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact info */}
          <div>
            <h3 className="text-sm font-semibold text-fg tracking-wider uppercase mb-4">
              Thông Tin Liên Hệ
            </h3>
            <ul className="space-y-3 text-sm text-fg-2">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
                <span>{address}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="hover:text-accent transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-accent rounded-sm"
                >
                  {phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                <a
                  href={`mailto:${email}`}
                  className="hover:text-accent transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-accent rounded-sm"
                >
                  {email}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Social & Admin Login */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-fg tracking-wider uppercase mb-3">
              Mạng Xã Hội
            </h3>
            <div className="flex items-center gap-3">
              <a
                href={facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-surface border border-line text-fg-2 hover:text-surface hover:bg-accent transition-colors flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Facebook XFarm"
              >
                <Facebook className="w-4 h-4" aria-hidden="true" />
              </a>
              <a
                href={zalo}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-surface border border-line text-fg-2 hover:text-surface hover:bg-accent transition-colors flex items-center justify-center text-xs font-bold focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Zalo XFarm"
              >
                Zalo
              </a>
              <a
                href={youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-surface border border-line text-fg-2 hover:text-surface hover:bg-accent transition-colors flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="YouTube XFarm"
              >
                <Youtube className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>

            <div className="pt-3 border-t border-line">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface hover:bg-accent hover:text-surface text-fg-2 text-xs font-medium transition-colors border border-line focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Đăng nhập trang quản trị"
              >
                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Đăng nhập</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-12 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between text-xs text-muted gap-4">
          <p>© 2026 {farmName}. Bản quyền thuộc về XFarm.</p>
          <p className="text-muted">Hệ thống ERP & Website Quảng bá Nông nghiệp Sinh thái</p>
        </div>
      </div>
    </footer>
  );
}
