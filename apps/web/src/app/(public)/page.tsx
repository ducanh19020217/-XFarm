import type { Metadata } from 'next';
import Link from 'next/link';
import { Sprout, Egg, Fish, Compass, ArrowRight } from 'lucide-react';
import {
  getSiteSettings,
  getPublicProducts,
  getPublicPosts,
  getPublicTours,
} from '@/lib/public-api';
import { getSiteUrl } from '@/lib/site-url';
import { BannerSlider } from './_components/banner-slider';
import { ProductCard } from './_components/product-card';
import { PostCard } from './_components/post-card';
import { TourCard } from './_components/tour-card';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const farmName = settings['farm.name'] || 'XFarm – Nông trại sinh thái';
  const slogan = settings['farm.slogan'] || 'Tươi lành từ đất, an tâm đến bàn ăn';
  const description =
    settings['farm.about'] || `${slogan}. Nền tảng nông trại sinh thái tuần hoàn bền vững XFarm`;
  const siteUrl = getSiteUrl();

  return {
    title: {
      absolute: `Trang chủ | ${farmName}`,
    },
    description,
    alternates: {
      canonical: `${siteUrl}/`,
    },
    openGraph: {
      title: `Trang chủ | ${farmName}`,
      description,
      url: `${siteUrl}/`,
      siteName: farmName,
      locale: 'vi_VN',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Trang chủ | ${farmName}`,
      description,
    },
  };
}

export default async function HomePage() {
  const [settings, products, postsResult, tours] = await Promise.all([
    getSiteSettings(),
    getPublicProducts(),
    getPublicPosts({ page: 1, pageSize: 3 }),
    getPublicTours({ page: 1, pageSize: 3 }),
  ]);

  const siteUrl = getSiteUrl();
  const farmName = settings['farm.name'] || 'XFarm – Nông trại sinh thái';
  const description =
    settings['farm.about'] || 'Nền tảng nông trại sinh thái tuần hoàn bền vững XFarm';

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: farmName,
    url: siteUrl,
    description,
    telephone: settings['contact.phone'] || '0901 234 567',
    email: settings['contact.email'] || 'hello@xfarm.local',
    address: {
      '@type': 'PostalAddress',
      streetAddress:
        settings['contact.address'] || 'Khu nông nghiệp sinh thái XFarm, Hòa Lạc, Hà Nội',
      addressCountry: 'VN',
    },
    sameAs: [
      settings['social.facebook'],
      settings['social.zalo'],
      settings['social.youtube'],
    ].filter(Boolean),
  };

  // 6 sản phẩm đầu tiên theo sortOrder
  const featuredProducts = products.slice(0, 6);

  // 3 bài viết mới nhất
  const latestPosts = postsResult.data.slice(0, 3);

  const pillars = [
    {
      title: 'Trồng trọt hữu cơ',
      icon: Sprout,
      color: 'bg-emerald-100 text-emerald-800',
      description:
        'Canh tác rau củ quả theo tiêu chuẩn VietGAP và hữu cơ vi sinh, hoàn toàn không phân bón hay thuốc BVTV hóa học độc hại.',
    },
    {
      title: 'Chăn nuôi sinh thái',
      icon: Egg,
      color: 'bg-amber-100 text-amber-800',
      description:
        'Đàn gà ta thả đồi tự nhiên, nguồn thức ăn sạch phối trộn từ ngô, cám và trùn quế, kiểm soát dịch bệnh nghiêm ngặt không kháng sinh.',
    },
    {
      title: 'Thủy sản bền vững',
      icon: Fish,
      color: 'bg-cyan-100 text-cyan-800',
      description:
        'Hệ thống ao nuôi cá nước ngọt tuần hoàn khép kín, ứng dụng chế phẩm sinh học tự nhiên, đảm bảo thịt cá thơm chắc ngọt lành.',
    },
    {
      title: 'Du lịch trải nghiệm',
      icon: Compass,
      color: 'bg-teal-100 text-teal-800',
      description:
        'Không gian giáo dục trải nghiệm sinh thái cho gia đình và học sinh: tự tay gieo hạt, thu hoạch rau quả và kết nối tình yêu đất mẹ.',
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      {/* KHU VỰC 1: Banner Slider */}
      <BannerSlider banners={settings['home.banners']} />

      {/* KHU VỰC 2: 4 Mảng Nông Nghiệp */}
      <section aria-labelledby="pillars-heading" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-accent bg-accent-bg px-3 py-1.5 rounded-full border border-accent/20">
            Hệ sinh thái XFarm
          </span>
          <h2
            id="pillars-heading"
            className="mt-3 text-2xl sm:text-4xl font-extrabold text-fg tracking-tight"
          >
            4 Lĩnh Vực Canh Tác Cốt Lõi
          </h2>
          <p className="mt-3 text-base sm:text-lg text-muted">
            Mô hình kinh tế tuần hoàn khép kín: chất thải chăn nuôi làm phân bón hữu cơ, phụ phẩm
            nông nghiệp nuôi trùn và cá, tạo nên chu trình bền vững.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {pillars.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="bg-surface rounded-2xl p-6 sm:p-7 border border-line shadow-xs hover:shadow-md hover:border-accent transition-all duration-200 flex flex-col text-fg"
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${item.color}`}
                >
                  <Icon className="w-7 h-7" aria-hidden="true" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-fg mb-2.5">{item.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* KHU VỰC 3: Sản Phẩm Nổi Bật */}
      <section
        aria-labelledby="featured-products-heading"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 sm:mb-12">
          <div>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-accent bg-accent-bg px-3 py-1.5 rounded-full border border-accent/20">
              Nông sản tươi sạch
            </span>
            <h2
              id="featured-products-heading"
              className="mt-3 text-2xl sm:text-4xl font-extrabold text-fg tracking-tight"
            >
              Sản Phẩm Nổi Bật
            </h2>
            <p className="mt-2 text-muted text-sm sm:text-base">
              Thu hoạch trực tiếp từ trang trại, đảm bảo độ tươi ngon và an toàn tuyệt đối.
            </p>
          </div>

          <Link
            href="/san-pham"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:text-accent-hover transition-colors self-start md:self-auto"
          >
            <span>Xem tất cả sản phẩm</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id || product.slug} product={product} />
          ))}
        </div>
      </section>

      {/* KHU VỰC 4: Mục Tour Trải Nghiệm (lấy từ API thật) */}
      <section aria-labelledby="tour-heading" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 sm:mb-12">
          <div>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-accent bg-accent-bg px-3 py-1.5 rounded-full border border-accent/20">
              Du lịch sinh thái
            </span>
            <span className="sr-only">Sắp ra mắt (Giai đoạn 5)</span>
            <h2
              id="tour-heading"
              className="mt-3 text-2xl sm:text-4xl font-extrabold text-fg tracking-tight"
            >
              Tour Du Lịch Trải Nghiệm Sinh Thái
            </h2>
            <p className="mt-2 text-muted text-sm sm:text-base">
              Hòa mình vào thiên nhiên, trải nghiệm làm nông dân thực thụ và tận hưởng không gian
              xanh mát cùng gia đình.
            </p>
          </div>

          <Link
            href="/tour"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:text-accent-hover transition-colors self-start md:self-auto"
          >
            <span>Xem tất cả tour</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {tours.map((tour) => (
            <TourCard key={tour.id || tour.slug} tour={tour} />
          ))}
        </div>
      </section>

      {/* KHU VỰC 5: Bài Viết Mới */}
      <section
        aria-labelledby="latest-posts-heading"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 sm:mb-12">
          <div>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-accent bg-accent-bg px-3 py-1.5 rounded-full border border-accent/20">
              Cẩm nang XFarm
            </span>
            <h2
              id="latest-posts-heading"
              className="mt-3 text-2xl sm:text-4xl font-extrabold text-fg tracking-tight"
            >
              Tin Tức & Cẩm Nang Nông Nghiệp
            </h2>
            <p className="mt-2 text-muted text-sm sm:text-base">
              Chia sẻ kiến thức canh tác sạch, mẹo chọn nông sản và câu chuyện đời thường tại nông
              trại.
            </p>
          </div>

          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:text-accent-hover transition-colors self-start md:self-auto"
          >
            <span>Xem tất cả tin tức</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {latestPosts.map((post) => (
            <PostCard key={post.id || post.slug} post={post} />
          ))}
        </div>
      </section>
    </div>
  );
}
