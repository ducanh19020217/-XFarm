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
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Column 1: Farm brand info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-white">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <Sprout className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="font-bold text-lg text-white">{farmName}</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">{slogan}</p>
            <p className="text-xs text-slate-500">
              Mô hình nông nghiệp tuần hoàn sinh thái: Trồng trọt – Chăn nuôi – Thủy sản – Du lịch
              trải nghiệm.
            </p>
          </div>

          {/* Column 2: Quick links */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              Khám Phá
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/"
                  className="hover:text-emerald-400 transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-emerald-400 rounded-sm"
                >
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link
                  href="/gioi-thieu"
                  className="hover:text-emerald-400 transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-emerald-400 rounded-sm"
                >
                  Giới thiệu nông trại
                </Link>
              </li>
              <li>
                <Link
                  href="/san-pham"
                  className="hover:text-emerald-400 transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-emerald-400 rounded-sm"
                >
                  Sản phẩm sạch
                </Link>
              </li>
              <li>
                <Link
                  href="/tour"
                  className="hover:text-emerald-400 transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-emerald-400 rounded-sm"
                >
                  Tour trải nghiệm
                </Link>
              </li>
              <li>
                <Link
                  href="/tour/tra-cuu"
                  className="hover:text-emerald-400 transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-emerald-400 rounded-sm"
                >
                  Tra cứu đặt chỗ
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="hover:text-emerald-400 transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-emerald-400 rounded-sm"
                >
                  Tin tức & Cẩm nang
                </Link>
              </li>
              <li>
                <Link
                  href="/lien-he"
                  className="hover:text-emerald-400 transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-emerald-400 rounded-sm"
                >
                  Liên hệ & Bản đồ
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact info */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              Thông Tin Liên Hệ
            </h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{address}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="hover:text-emerald-400 transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-emerald-400 rounded-sm"
                >
                  {phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <a
                  href={`mailto:${email}`}
                  className="hover:text-emerald-400 transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-emerald-400 rounded-sm"
                >
                  {email}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Social & Admin Login */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-3">
              Mạng Xã Hội
            </h3>
            <div className="flex items-center gap-3">
              <a
                href={facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-emerald-600 transition-colors flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-400"
                aria-label="Facebook XFarm"
              >
                <Facebook className="w-4 h-4" aria-hidden="true" />
              </a>
              <a
                href={zalo}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-emerald-600 transition-colors flex items-center justify-center text-xs font-bold focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-400"
                aria-label="Zalo XFarm"
              >
                Zalo
              </a>
              <a
                href={youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-emerald-600 transition-colors flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-400"
                aria-label="YouTube XFarm"
              >
                <Youtube className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-emerald-700 text-slate-200 hover:text-white text-xs font-medium transition-colors border border-slate-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-400"
                aria-label="Đăng nhập trang quản trị"
              >
                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Đăng nhập</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 {farmName}. Bản quyền thuộc về XFarm.</p>
          <p className="text-slate-500">Hệ thống ERP & Website Quảng bá Nông nghiệp Sinh thái</p>
        </div>
      </div>
    </footer>
  );
}
