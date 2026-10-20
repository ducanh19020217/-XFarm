import * as React from 'react';
import Link from 'next/link';
import { Phone, Mail, MapPin, ShieldCheck, Home } from 'lucide-react';
import { PublicSiteSettings, DEFAULT_SITE_SETTINGS } from '../trace-utils';

interface TraceFooterProps {
  settings?: PublicSiteSettings | null;
}

export function TraceFooter({ settings }: TraceFooterProps) {
  const farmName = settings?.farmName || DEFAULT_SITE_SETTINGS.farmName;
  const slogan = settings?.slogan || DEFAULT_SITE_SETTINGS.slogan;
  const phone = settings?.phone || DEFAULT_SITE_SETTINGS.phone;
  const email = settings?.email || DEFAULT_SITE_SETTINGS.email;
  const address = settings?.address || DEFAULT_SITE_SETTINGS.address;

  return (
    <footer className="mt-8 border-t border-line pt-6 text-muted">
      <div className="bg-surface-2 text-fg rounded-2xl p-5 shadow-xs border border-line space-y-4">
        {/* Brand & Mission */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <h3 className="font-bold text-base text-fg">{farmName}</h3>
          </div>
          {slogan && <p className="text-xs text-muted italic">{slogan}</p>}
        </div>

        {/* Contact info from site-settings */}
        <div className="space-y-2 text-xs border-t border-line pt-3">
          {phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>Hotline / Zalo: </span>
              <a
                href={`tel:${phone}`}
                className="font-medium text-accent hover:underline underline-offset-2"
              >
                {phone}
              </a>
            </div>
          )}

          {email && (
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>Email: </span>
              <a
                href={`mailto:${email}`}
                className="font-medium text-accent hover:underline underline-offset-2 break-all"
              >
                {email}
              </a>
            </div>
          )}

          {address && (
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
              <span className="text-fg-2 leading-tight">{address}</span>
            </div>
          )}
        </div>

        {/* Home navigation link */}
        <div className="border-t border-line pt-3 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-accent-contrast text-xs font-semibold transition active:scale-95 shadow-xs"
          >
            <Home className="w-4 h-4" />
            <span>Về trang chủ XFarm</span>
          </Link>
        </div>
      </div>

      <p className="text-center text-[11px] text-muted mt-4">
        Hệ thống truy xuất nguồn gốc nông sản minh bạch © {new Date().getFullYear()} XFarm
      </p>
    </footer>
  );
}
