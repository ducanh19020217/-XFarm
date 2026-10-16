export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api/v1';

export interface PublicProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  mediaIds?: string[];
  isPublished?: boolean;
  sortOrder?: number;
  inStock?: boolean;
}

export interface PublicPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverMediaId?: string | null;
  publishedAt?: string | Date | null;
  status?: 'DRAFT' | 'PUBLISHED';
}

export interface PublicPage {
  id: string;
  slug: string;
  title: string;
  content: string;
}

export interface PublicSiteSettings {
  'farm.name'?: string;
  'farm.slogan'?: string;
  'farm.about'?: string;
  'contact.phone'?: string;
  'contact.email'?: string;
  'contact.address'?: string;
  'social.facebook'?: string;
  'social.zalo'?: string;
  'social.youtube'?: string;
  'home.banners'?: Array<{ title?: string; subtitle?: string; image: string }> | string[];
  'bank.vietqr'?: { bank: string; accountNumber: string; accountName: string };
  [key: string]: unknown;
}

export const FALLBACK_SITE_SETTINGS: PublicSiteSettings = {
  'farm.name': 'XFarm – Nông trại sinh thái',
  'farm.slogan': 'Tươi lành từ đất, an tâm đến bàn ăn',
  'farm.about':
    'XFarm là nông trại sinh thái phát triển bền vững, ứng dụng công nghệ vi sinh và mô hình kinh tế tuần hoàn trong trồng trọt, chăn nuôi và du lịch trải nghiệm.',
  'contact.phone': '0901 234 567',
  'contact.email': 'hello@xfarm.local',
  'contact.address': 'Khu nông nghiệp sinh thái XFarm, Hòa Lạc, Hà Nội',
  'social.facebook': 'https://facebook.com/xfarm',
  'social.zalo': 'https://zalo.me/0901234567',
  'social.youtube': 'https://youtube.com/@xfarm',
  'home.banners': [
    {
      title: 'Nông nghiệp sinh thái bền vững',
      subtitle: '100% không hóa chất độc hại, ứng dụng vi sinh hữu cơ tuần hoàn',
      image: '/images/banner-1.jpg',
    },
    {
      title: 'Nông sản tươi ngon mỗi ngày',
      subtitle: 'Thu hoạch từ sáng sớm, đóng gói và giao ngay đến tận bếp nhà bạn',
      image: '/images/banner-2.jpg',
    },
    {
      title: 'Trải nghiệm du lịch nông trại',
      subtitle: 'Không gian xanh mát, hoạt động bổ ích cho cả gia đình vào dịp cuối tuần',
      image: '/images/banner-3.jpg',
    },
  ],
  'bank.vietqr': { bank: 'VCB', accountNumber: '0123456789', accountName: 'XFARM' },
};

export const FALLBACK_PRODUCTS: PublicProduct[] = [
  {
    id: 'prod-cai-ngot',
    slug: 'cai-ngot-huu-co',
    name: 'Cải ngọt hữu cơ',
    description:
      '<p>Cải ngọt hữu cơ trồng tại lô rau sinh thái XFarm theo tiêu chuẩn VietGAP. Thân mập, lá xanh mướt, vị ngọt đậm đà, không dư lượng thuốc BVTV hóa học.</p>',
    price: 25000,
    unit: 'kg',
    mediaIds: ['/images/cai-ngot.jpg'],
    isPublished: true,
    sortOrder: 1,
    inStock: true,
  },
  {
    id: 'prod-trung-ga',
    slug: 'trung-ga-ta',
    name: 'Trứng gà ta',
    description:
      '<p>Trứng gà ta nuôi thả tự nhiên trên đồi cỏ sinh thái. Thức ăn tự phối trộn từ bắp, cám gạo và giun quế. Lòng đỏ trứng to tròn, bùi béo và giàu dinh dưỡng.</p>',
    price: 4500,
    unit: 'quả',
    mediaIds: ['/images/trung-ga.jpg'],
    isPublished: true,
    sortOrder: 2,
    inStock: true,
  },
  {
    id: 'prod-ca-ro-phi',
    slug: 'ca-ro-phi-tuoi',
    name: 'Cá rô phi tươi',
    description:
      '<p>Cá rô phi nuôi trong hệ thống ao tuần hoàn sinh thái. Nguồn nước sạch tự nhiên, không sử dụng kháng sinh hay chất tăng trưởng. Thịt cá dai ngọt, thơm ngon.</p>',
    price: 75000,
    unit: 'kg',
    mediaIds: ['/images/ca-ro-phi.jpg'],
    isPublished: true,
    sortOrder: 3,
    inStock: true,
  },
  {
    id: 'prod-ca-chua',
    slug: 'ca-chua-bi-soc',
    name: 'Cà chua bi sọc',
    description:
      '<p>Cà chua bi giống Hà Lan trồng trong nhà màng công nghệ cao. Vị ngọt thanh xen lẫn chua nhẹ, rất giàu vitamin C và chất chống oxy hóa lycopene.</p>',
    price: 45000,
    unit: 'hộp 500g',
    mediaIds: ['/images/ca-chua.jpg'],
    isPublished: true,
    sortOrder: 4,
    inStock: true,
  },
  {
    id: 'prod-dua-luoi',
    slug: 'dua-luoi-mat-ong',
    name: 'Dưa lưới mật ong',
    description:
      '<p>Dưa lưới canh tác trên giá thể xơ dừa vi sinh, tưới nhỏ giọt công nghệ Israel. Độ ngọt brix đạt trên 14, ruột cam giòn tan, thơm ngát mùi mật ong.</p>',
    price: 65000,
    unit: 'kg',
    mediaIds: ['/images/dua-luoi.jpg'],
    isPublished: true,
    sortOrder: 5,
    inStock: true,
  },
  {
    id: 'prod-mat-ong',
    slug: 'mat-ong-hoa-rung',
    name: 'Mật ong hoa rừng',
    description:
      '<p>Mật ong nguyên chất được thu hoạch từ những thùng ong đặt tại vườn cây ăn quả sinh thái XFarm. Màu vàng óng ả, hương thơm tự nhiên của hoa rừng.</p>',
    price: 180000,
    unit: 'chai 500ml',
    mediaIds: ['/images/mat-ong.jpg'],
    isPublished: true,
    sortOrder: 6,
    inStock: false,
  },
];

export const FALLBACK_POSTS: PublicPost[] = [
  {
    id: 'post-vuon-rau',
    slug: 'vuon-rau-huu-co',
    title: 'Một ngày ở vườn rau hữu cơ XFarm',
    excerpt:
      'Khám phá quy trình chăm sóc rau theo hướng hữu cơ vi sinh, không phân bón hóa học và bảo vệ nguồn đất mẹ tại XFarm.',
    content:
      '<p>Tại XFarm, mỗi luống rau đều được chăm sóc với tất cả sự tận tâm. Chúng tôi sử dụng phân ủ vi sinh từ phế phụ phẩm nông nghiệp và chế phẩm thảo mộc tự nhiên để xua đuổi sâu bọ.</p><p>Quy trình tưới tiêu tự động sử dụng nguồn nước giếng khoan đã qua xử lý lọc đa tầng, đảm bảo an toàn tuyệt đối cho người tiêu dùng.</p>',
    coverMediaId: '/images/blog-rau.jpg',
    publishedAt: '2026-03-01T08:00:00Z',
    status: 'PUBLISHED',
  },
  {
    id: 'post-trang-trai',
    slug: 'tu-trang-trai-den-ban-an',
    title: 'Từ trang trại đến bàn ăn: Hành trình minh bạch nông sản',
    excerpt:
      'Mỗi sản phẩm XFarm đều mang một mã truy xuất nguồn gốc, giúp người tiêu dùng nắm rõ nhật ký thu hoạch và quy trình canh tác.',
    content:
      '<p>Minh bạch là kim chỉ nam cho mọi hoạt động của XFarm. Thông qua hệ thống tem QR truy xuất nguồn gốc, khách hàng có thể quét mã để xem chi tiết lô thu hoạch, giống cây trồng và ngày thu hoạch thực tế.</p><p>Điều này xóa tan nỗi lo về thực phẩm không rõ nguồn gốc trên thị trường hiện nay.</p>',
    coverMediaId: '/images/blog-trace.jpg',
    publishedAt: '2026-03-10T08:00:00Z',
    status: 'PUBLISHED',
  },
  {
    id: 'post-tuan-hoan',
    slug: 'mo-hinh-nong-nghiep-tuan-hoan',
    title: 'Mô hình kinh tế tuần hoàn: Trồng trọt - Chăn nuôi - Thủy sản',
    excerpt:
      'Tìm hiểu cách XFarm liên kết chuỗi sản xuất để giảm thiểu phát thải và tận dụng tối đa tài nguyên tự nhiên.',
    content:
      '<p>Chất thải từ chăn nuôi gà và bò được ủ hoai mục thành phân bón hữu cơ cao cấp cho vườn rau và cây ăn trái. Phế phụ phẩm rau xanh lại trở thành nguồn thức ăn giàu xơ cho ao cá.</p><p>Mô hình tuần hoàn khép kín này không chỉ nâng cao chất lượng nông sản mà còn bảo vệ môi trường sống xung quanh nông trại.</p>',
    coverMediaId: '/images/blog-circular.jpg',
    publishedAt: '2026-03-15T08:00:00Z',
    status: 'PUBLISHED',
  },
];

export const FALLBACK_PAGES: Record<string, PublicPage> = {
  'gioi-thieu': {
    id: 'page-gioi-thieu',
    slug: 'gioi-thieu',
    title: 'Giới thiệu Nông trại sinh thái XFarm',
    content: `
      <h2>Câu chuyện khởi đầu</h2>
      <p>XFarm được thành lập với khát vọng kiến tạo một nền nông nghiệp xanh, sạch và bền vững. Chúng tôi tin rằng thực phẩm tốt cho sức khỏe phải bắt nguồn từ mảnh đất được nâng niu và quy trình canh tác thuận theo tự nhiên.</p>
      
      <h2>Tầm nhìn & Sứ mệnh</h2>
      <p>Trở thành mô hình nông trại sinh thái tuần hoàn tiêu biểu tại Việt Nam, mang đến nguồn nông sản an toàn tuyệt đối cho người tiêu dùng và trải nghiệm kết nối thiên nhiên sâu sắc cho cộng đồng.</p>
      
      <h2>4 Trụ cột hoạt động</h2>
      <ul>
        <li><strong>Trồng trọt hữu cơ:</strong> Canh tác rau củ quả theo tiêu chuẩn VietGAP, ứng dụng công nghệ tưới tiêu nhỏ giọt và chế phẩm vi sinh.</li>
        <li><strong>Chăn nuôi nhân đạo:</strong> Đàn gia cầm và gia súc được chăn thả tự nhiên, kiểm soát dịch bệnh nghiêm ngặt không dùng kháng sinh.</li>
        <li><strong>Thủy sản nước ngọt:</strong> Hệ thống ao nuôi sinh thái tuần hoàn nước khép kín, môi trường sống trong lành cho cá.</li>
        <li><strong>Du lịch giáo dục trải nghiệm:</strong> Không gian xanh cho gia đình, học sinh đến tham quan, học tập và trải nghiệm thu hoạch thực tế.</li>
      </ul>

      <h2>Cam kết chất lượng</h2>
      <p>Mọi sản phẩm trước khi xuất kho đều được kiểm định chất lượng, gắn tem truy xuất nguồn gốc và vận chuyển nhanh chóng để giữ trọn vẹn hương vị tươi ngon nhất.</p>
    `,
  },
  'lien-he': {
    id: 'page-lien-he',
    slug: 'lien-he',
    title: 'Liên hệ với Nông trại XFarm',
    content:
      '<p>Chúng tôi luôn sẵn sàng lắng nghe và giải đáp mọi thắc mắc của bạn về sản phẩm, dịch vụ và các chuyến tham quan trải nghiệm.</p>',
  },
};

/**
 * Fetch public site settings
 */
export async function getSiteSettings(): Promise<PublicSiteSettings> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/site-settings`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return FALLBACK_SITE_SETTINGS;

    const data = await res.json();
    if (data && typeof data === 'object') {
      if (Array.isArray(data.data)) {
        const mapped: Record<string, unknown> = {};
        for (const item of data.data) {
          if (item?.key) mapped[item.key] = item.value;
        }
        return { ...FALLBACK_SITE_SETTINGS, ...mapped };
      }
      return { ...FALLBACK_SITE_SETTINGS, ...data };
    }
  } catch {
    // API not reachable, use fallback
  }
  return FALLBACK_SITE_SETTINGS;
}

/**
 * Fetch all published public products
 */
export async function getPublicProducts(): Promise<PublicProduct[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/products`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return FALLBACK_PRODUCTS;

    const body = await res.json();
    const rawList: PublicProduct[] = Array.isArray(body)
      ? body
      : Array.isArray(body.data)
        ? body.data
        : [];

    if (rawList.length > 0) {
      return rawList
        .filter((p) => p.isPublished !== false)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
  } catch {
    // fallback
  }
  return FALLBACK_PRODUCTS;
}

/**
 * Fetch public product by slug
 */
export async function getPublicProductBySlug(slug: string): Promise<PublicProduct | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/products/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const body = await res.json();
      const data = body?.data ?? body;
      if (data && data.isPublished !== false) {
        return data;
      }
      return null;
    }
  } catch {
    // fallback
  }

  const found = FALLBACK_PRODUCTS.find((p) => p.slug === slug);
  return found || null;
}

/**
 * Fetch published posts with pagination
 */
export async function getPublicPosts(params?: {
  page?: number;
  pageSize?: number;
}): Promise<{ data: PublicPost[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, params?.page || 1);
  const pageSize = Math.max(1, params?.pageSize || 6);

  try {
    const res = await fetch(`${API_BASE_URL}/public/posts?page=${page}&pageSize=${pageSize}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const body = await res.json();
      if (body && Array.isArray(body.data)) {
        const publishedOnly = body.data.filter((p: PublicPost) => p.status !== 'DRAFT');
        return {
          data: publishedOnly,
          total: body.total ?? publishedOnly.length,
          page: body.page ?? page,
          pageSize: body.pageSize ?? pageSize,
        };
      }
    }
  } catch {
    // fallback
  }

  // Filter out any non-published posts from fallback
  const publishedFallback = FALLBACK_POSTS.filter((p) => p.status !== 'DRAFT');
  const start = (page - 1) * pageSize;
  const paged = publishedFallback.slice(start, start + pageSize);

  return {
    data: paged,
    total: publishedFallback.length,
    page,
    pageSize,
  };
}

/**
 * Fetch public post by slug (only returns if published)
 */
export async function getPublicPostBySlug(slug: string): Promise<PublicPost | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/posts/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const body = await res.json();
      const post = body?.data ?? body;
      if (post && post.status !== 'DRAFT') {
        return { ...post, status: 'PUBLISHED' };
      }
      // If draft, do not expose
      return null;
    }
  } catch {
    // fallback
  }

  const found = FALLBACK_POSTS.find((p) => p.slug === slug);
  if (found && found.status === 'PUBLISHED') {
    return found;
  }
  return null;
}

/**
 * Fetch public page by slug
 */
export async function getPublicPageBySlug(slug: string): Promise<PublicPage | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/pages/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const body = await res.json();
      const page = body?.data ?? body;
      if (page) return page;
    }
  } catch {
    // fallback
  }

  return FALLBACK_PAGES[slug] || null;
}

/**
 * Currency formatter (vi-VN)
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount == null) return '0 ₫';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(num);
}

/**
 * Date formatter (vi-VN)
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}
