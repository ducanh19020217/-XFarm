import * as React from 'react';
import Link from 'next/link';
import { AlertCircle, Home, QrCode } from 'lucide-react';

export default function TraceNotFound() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 text-center space-y-6">
        <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-rose-50 text-rose-500 border border-rose-100">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Không tìm thấy thông tin truy xuất
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Mã QR hoặc mã truy xuất bạn vừa quét không tồn tại trên hệ thống, hoặc lô hàng này chưa
            được thiết lập chế độ công khai.
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-500 text-left space-y-1.5 border border-slate-100">
          <p className="font-semibold text-slate-700 flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 text-emerald-600" /> Gợi ý kiểm tra:
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
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition active:scale-95 shadow-sm"
          >
            <Home className="w-4 h-4" />
            <span>Về trang chủ XFarm</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
