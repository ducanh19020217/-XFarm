import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Award, HeartHandshake, Leaf, Users } from 'lucide-react';
import { getPublicPageBySlug } from '@/lib/public-api';
import { sanitizeHtml } from '@/lib/sanitize';

export const metadata: Metadata = {
  title: 'Giới thiệu',
  description: 'Khám phá câu chuyện hình thành và mô hình canh tác sinh thái tuần hoàn tại XFarm.',
};

export default async function AboutPage() {
  const page = await getPublicPageBySlug('gioi-thieu');

  if (!page) {
    notFound();
  }

  const sanitizedContent = sanitizeHtml(page.content);

  const values = [
    {
      title: 'Tự nhiên & Nguyên bản',
      icon: Leaf,
      description:
        'Tôn trọng sự cân bằng của tự nhiên, canh tác không phân hóa học và hóa chất độc hại.',
    },
    {
      title: 'Minh bạch xuất xứ',
      icon: Award,
      description:
        'Mỗi sản phẩm đều gắn mã truy xuất nguồn gốc, thông tin canh tác rõ ràng đến từng luống.',
    },
    {
      title: 'Bền vững với môi trường',
      icon: HeartHandshake,
      description:
        'Ứng dụng mô hình kinh tế tuần hoàn, tái chế phế phụ phẩm, bảo vệ tài nguyên đất và nước.',
    },
    {
      title: 'Đồng hành cùng cộng đồng',
      icon: Users,
      description:
        'Tạo công ăn việc làm cho bà con địa phương và không gian trải nghiệm học tập sinh thái.',
    },
  ];

  return (
    <div className="py-10 sm:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
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
            Giới thiệu
          </span>
        </nav>

        {/* Header banner */}
        <div className="border-b border-slate-200 pb-8">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            Về chúng tôi
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {page.title}
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-700 leading-relaxed">
            Hành trình xây dựng nền nông nghiệp sinh thái tuần hoàn, bảo vệ sức khỏe con người và
            gìn giữ đất mẹ.
          </p>
        </div>

        {/* Core Values Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          {values.map((v) => {
            const Icon = v.icon;
            return (
              <div
                key={v.title}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base sm:text-lg mb-1">{v.title}</h2>
                  <p className="text-sm text-slate-700 leading-relaxed">{v.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Content Body */}
        <article
          className="prose prose-slate prose-emerald max-w-none bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-xs leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      </div>
    </div>
  );
}
