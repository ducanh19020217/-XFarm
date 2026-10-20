import * as React from 'react';
import Link from 'next/link';
import { AlertCircle, Home, QrCode } from 'lucide-react';

export default function TraceNotFound() {
  return (
    <div className="min-h-screen bg-app text-fg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface rounded-3xl p-6 sm:p-8 shadow-xs border border-line text-center space-y-6">
        <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-crit-bg text-crit border border-crit/20">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-fg tracking-tight">
            Không tìm thấy thông tin truy xuất
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            Mã QR hoặc mã truy xuất bạn vừa quét không tồn tại trên hệ thống, hoặc lô hàng này chưa
            được thiết lập chế độ công khai.
          </p>
        </div>

        <div className="bg-surface-2 rounded-2xl p-4 text-xs text-muted text-left space-y-1.5 border border-line">
          <p className="font-semibold text-fg-2 flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 text-accent" /> Gợi ý kiểm tra:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Đảm bảo bạn quét đúng tem truy xuất chính thức của XFarm.</li>
            <li>Kiểm tra đường truyền internet trên thiết bị của bạn.</li>
            <li>Liên hệ trực tiếp với chúng tôi nếu bạn cần hỗ trợ kiểm tra nguồn gốc lô hàng.</li>
          </ul>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-accent hover:bg-accent-hover text-accent-contrast text-sm font-semibold transition active:scale-95 shadow-xs"
          >
            <Home className="w-4 h-4" />
            <span>Về trang chủ XFarm</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
