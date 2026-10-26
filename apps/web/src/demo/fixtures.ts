import type {
  PublicProduct,
  PublicPost,
  PublicTour,
  PublicPage,
  PublicSiteSettings,
  PublicBookingView,
} from '@/lib/public-api';
import type { PublicTraceData } from '@/app/(public)/trace/[code]/trace-utils';
import { getAssetPath } from '@/lib/site-url';

const demoAsset = (p: string) => getAssetPath(p);

export const DEMO_SITE_SETTINGS: PublicSiteSettings = {
  'farm.name': 'XFarm – Nông trại sinh thái',
  'farm.slogan': 'Tươi lành từ đất, an tâm đến bàn ăn',
  'farm.about':
    'XFarm là nông trại sinh thái phát triển bền vững, ứng dụng công nghệ vi sinh bản địa và mô hình kinh tế tuần hoàn trong trồng trọt, chăn nuôi và du lịch giáo dục trải nghiệm.',
  'contact.phone': '0901 234 567',
  'contact.email': 'demo@xfarm.local',
  'contact.address': 'Khu nông nghiệp sinh thái XFarm, Hòa Lạc, Hà Nội',
  'social.facebook': 'https://facebook.com/xfarm',
  'social.zalo': 'https://zalo.me/0901234567',
  'social.youtube': 'https://youtube.com/@xfarm',
  'home.banners': [
    {
      title: 'Nông nghiệp sinh thái bền vững',
      subtitle: '100% không hóa chất độc hại, ứng dụng vi sinh hữu cơ tuần hoàn',
      image: demoAsset('/demo/banner-1.svg'),
    },
    {
      title: 'Nông sản tươi ngon mỗi ngày',
      subtitle: 'Thu hoạch từ sáng sớm, đóng gói và giao ngay đến tận bếp nhà bạn',
      image: demoAsset('/demo/banner-2.svg'),
    },
    {
      title: 'Trải nghiệm du lịch nông trại',
      subtitle: 'Không gian xanh mát, hoạt động bổ ích cho cả gia đình vào dịp cuối tuần',
      image: demoAsset('/demo/banner-3.svg'),
    },
  ],
  'bank.vietqr': { bank: 'VCB', accountNumber: '0123456789', accountName: 'XFARM' },
};

export const DEMO_PRODUCTS: PublicProduct[] = [
  {
    id: 'prod-cai-ngot',
    slug: 'cai-ngot-huu-co',
    name: 'Cải ngọt hữu cơ',
    description:
      '<p>Cải ngọt hữu cơ trồng tại lô rau sinh thái XFarm theo tiêu chuẩn VietGAP. Thân mập, lá xanh mướt, vị ngọt đậm đà, không tồn dư thuốc BVTV hóa học.</p><p>Được tưới bằng nguồn nước ngầm lọc vi sinh và bón phân hữu cơ hoai mục ủ từ trùn quế.</p>',
    price: 25000,
    unit: 'kg',
    mediaIds: [demoAsset('/demo/rau-cai.svg')],
    isPublished: true,
    sortOrder: 1,
    inStock: true,
  },
  {
    id: 'prod-trung-ga',
    slug: 'trung-ga-ta',
    name: 'Trứng gà ta thả đồi',
    description:
      '<p>Trứng gà ta nuôi thả tự nhiên trên đồi cỏ sinh thái XFarm. Thức ăn tự phối trộn từ ngô hạt, cám gạo, thảo mộc và giun quế giàu protein.</p><p>Lòng đỏ to tròn, màu cam đậm tự nhiên, thơm bùi và giàu vitamin A, D, E.</p>',
    price: 45000,
    unit: 'hộp 10 quả',
    mediaIds: [demoAsset('/demo/trung-ga.svg')],
    isPublished: true,
    sortOrder: 2,
    inStock: true,
  },
  {
    id: 'prod-ca-ro-phi',
    slug: 'ca-ro-phi-tuoi',
    name: 'Cá rô phi sinh thái',
    description:
      '<p>Cá rô phi nuôi trong hệ thống ao tuần hoàn sinh thái Aquaponics. Nguồn nước sạch tự nhiên, không sử dụng kháng sinh hay chất kích thích tăng trưởng.</p><p>Thịt cá dai ngọt tự nhiên, không mùi bùn, thích hợp cho món nướng hoặc hấp xì dầu.</p>',
    price: 75000,
    unit: 'kg',
    mediaIds: [demoAsset('/demo/ca-ro-phi.svg')],
    isPublished: true,
    sortOrder: 3,
    inStock: true,
  },
  {
    id: 'prod-ca-chua',
    slug: 'ca-chua-bi-soc',
    name: 'Cà chua bi organic',
    description:
      '<p>Cà chua bi giống Hà Lan trồng trong nhà màng công nghệ cao kiểm soát nhiệt độ và độ ẩm. Vị ngọt thanh xen lẫn chua nhẹ thanh tao, rất giàu vitamin C và lycopene.</p>',
    price: 45000,
    unit: 'hộp 500g',
    mediaIds: [demoAsset('/demo/ca-chua.svg')],
    isPublished: true,
    sortOrder: 4,
    inStock: true,
  },
  {
    id: 'prod-dua-luoi',
    slug: 'dua-luoi-mat-ong',
    name: 'Dưa lưới mật ong',
    description:
      '<p>Dưa lưới canh tác trên giá thể xơ dừa vi sinh, tưới nhỏ giọt công nghệ Israel. Độ ngọt brix đạt trên 14, ruột cam giòn tan, thơm ngát hương mật ong tự nhiên.</p>',
    price: 65000,
    unit: 'kg',
    mediaIds: [demoAsset('/demo/dua-luoi.svg')],
    isPublished: true,
    sortOrder: 5,
    inStock: true,
  },
  {
    id: 'prod-bap-cai',
    slug: 'bap-cai-trai-tim',
    name: 'Bắp cải trái tim',
    description:
      '<p>Bắp cải trái tim trồng vụ đông xuân trên đất bồi phù sa. Búp cải cuốn chặt, lá mềm ngọt, nấu canh hay xào đều giữ trọn độ giòn ngọt tự nhiên.</p>',
    price: 30000,
    unit: 'bắp',
    mediaIds: [demoAsset('/demo/bap-cai.svg')],
    isPublished: true,
    sortOrder: 6,
    inStock: true,
  },
  {
    id: 'prod-xa-lach',
    slug: 'xa-lach-thuy-canh',
    name: 'Xà lách mỡ thủy canh',
    description:
      '<p>Xà lách mỡ gieo trồng trong giàn thủy canh tuần hoàn nước khép kín. Từng búp xà lách sạch sẽ tuyệt đối, không dính bùn đất, tươi giòn lý tưởng cho các món salad.</p>',
    price: 35000,
    unit: 'túi 300g',
    mediaIds: [demoAsset('/demo/xa-lach.svg')],
    isPublished: true,
    sortOrder: 7,
    inStock: true,
  },
  {
    id: 'prod-mat-ong',
    slug: 'mat-ong-hoa-rung',
    name: 'Mật ong hoa rừng tự nhiên',
    description:
      '<p>Mật ong nguyên chất thu hoạch từ các thùng ong đặt tại vườn cây ăn trái và rừng keo sinh thái của XFarm. Màu vàng óng ả, hương hoa thanh khiết, sánh đặc tự nhiên.</p>',
    price: 180000,
    unit: 'chai 500ml',
    mediaIds: [demoAsset('/demo/phan-huu-co.svg')],
    isPublished: true,
    sortOrder: 8,
    inStock: false,
  },
];

export const DEMO_POSTS: PublicPost[] = [
  {
    id: 'post-vuon-rau',
    slug: 'vuon-rau-huu-co',
    title: 'Một ngày ở vườn rau hữu cơ XFarm',
    excerpt:
      'Khám phá quy trình chăm sóc rau theo hướng hữu cơ vi sinh, không phân bón hóa học và bảo vệ nguồn đất mẹ tại XFarm.',
    content:
      '<p>Tại XFarm, mỗi luống rau đều được chăm sóc với tất cả sự tận tâm. Chúng tôi sử dụng phân ủ vi sinh từ phế phụ phẩm nông nghiệp và chế phẩm thảo mộc tự nhiên để xua đuổi sâu bọ.</p><p>Quy trình tưới tiêu tự động sử dụng nguồn nước ngầm đã qua xử lý lọc đa tầng, đảm bảo an toàn tuyệt đối cho người tiêu dùng.</p><p>Từ 5 giờ sáng, các công nhân nông trại đã bắt đầu thu hoạch để rau giữ được độ tươi mát và giòn ngọt nhất trước khi đóng gói gửi tới khách hàng.</p>',
    coverMediaId: demoAsset('/demo/canh-dong.svg'),
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
      '<p>Minh bạch là kim chỉ nam cho mọi hoạt động của XFarm. Thông qua hệ thống tem QR truy xuất nguồn gốc, khách hàng có thể quét mã để xem chi tiết lô thu hoạch, giống cây trồng và ngày thu hoạch thực tế.</p><p>Điều này xóa tan nỗi lo về thực phẩm không rõ nguồn gốc trên thị trường hiện nay, mang lại niềm tin trọn vẹn cho từng bữa cơm gia đình.</p>',
    coverMediaId: demoAsset('/demo/nha-kinh.svg'),
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
      '<p>Chất thải từ chăn nuôi gà và bò được ủ hoai mục thành phân bón hữu cơ cao cấp cho vườn rau và cây ăn trái. Phế phụ phẩm rau xanh lại trở thành nguồn thức ăn giàu xơ cho ao cá.</p><p>Mô hình tuần hoàn khép kín này không chỉ nâng cao chất lượng nông sản mà còn bảo vệ môi trường sống xung quanh nông trại, hướng tới tương lai trung hòa carbon.</p>',
    coverMediaId: demoAsset('/demo/ao-ca.svg'),
    publishedAt: '2026-03-15T08:00:00Z',
    status: 'PUBLISHED',
  },
];

export const DEMO_TOURS: PublicTour[] = [
  {
    id: 'tour-1-ngay-lam-nong-dan',
    slug: 'mot-ngay-lam-nong-dan',
    name: 'Một ngày làm nông dân nhí & gia đình',
    description:
      '<p>Trải nghiệm chân thực và sống động cùng hệ sinh thái nông nghiệp tuần hoàn XFarm. Tự tay thu hoạch rau củ quả hữu cơ, cho gà ăn trên đồi, bắt cá ao sinh thái và thưởng thức bữa trưa đậm vị thôn dã ngay tại trang trại.</p>',
    durationMinutes: 180,
    priceAdult: 250000,
    priceChild: 150000,
    capacity: 30,
    mediaIds: [demoAsset('/demo/tour-thu-hoach.svg')],
    isPublished: true,
    sortOrder: 1,
    slots: [
      {
        id: 'slot-sample-1',
        tourId: 'tour-1-ngay-lam-nong-dan',
        startAt: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
        capacity: 30,
        bookedCount: 8,
        remaining: 22,
        isActive: true,
      },
      {
        id: 'slot-sample-2',
        tourId: 'tour-1-ngay-lam-nong-dan',
        startAt: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
        capacity: 30,
        bookedCount: 12,
        remaining: 18,
        isActive: true,
      },
    ],
  },
  {
    id: 'tour-kham-pha-he-sinh-thai',
    slug: 'kham-pha-he-sinh-thai-tuan-hoan',
    name: 'Khám phá nông trại sinh thái tuần hoàn',
    description:
      '<p>Chương trình tham quan học tập chuyên sâu: tìm hiểu quy trình nuôi cấy vi sinh bản địa IMO, hệ thống tưới nhỏ giọt tiết kiệm nước và cách xử lý phụ phẩm nông nghiệp thành tài nguyên hữu cơ giá trị cao.</p>',
    durationMinutes: 120,
    priceAdult: 180000,
    priceChild: 100000,
    capacity: 25,
    mediaIds: [demoAsset('/demo/tour-cam-trai.svg')],
    isPublished: true,
    sortOrder: 2,
    slots: [
      {
        id: 'slot-sample-3',
        tourId: 'tour-kham-pha-he-sinh-thai',
        startAt: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
        capacity: 25,
        bookedCount: 6,
        remaining: 19,
        isActive: true,
      },
    ],
  },
  {
    id: 'tour-lop-hoc-xanh',
    slug: 'lop-hoc-nong-nghiep-xanh',
    name: 'Lớp học thiên nhiên & gieo mầm hy vọng',
    description:
      '<p>Dành riêng cho các nhóm học sinh và mầm non: tìm hiểu thế giới loài ong, nhận biết các loại côn trùng có ích, thực hành gieo hạt giống vào chậu cây mang về nhà chăm sóc.</p>',
    durationMinutes: 150,
    priceAdult: 200000,
    priceChild: 120000,
    capacity: 20,
    mediaIds: [demoAsset('/demo/tour-lop-hoc-xanh.svg')],
    isPublished: true,
    sortOrder: 3,
    slots: [
      {
        id: 'slot-sample-4',
        tourId: 'tour-lop-hoc-xanh',
        startAt: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString(),
        capacity: 20,
        bookedCount: 4,
        remaining: 16,
        isActive: true,
      },
    ],
  },
];

export const DEMO_PAGES: Record<string, PublicPage> = {
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
        <li><strong>Trồng trọt hữu cơ:</strong> Canh tác rau củ quả theo tiêu chuẩn VietGAP, ứng dụng công nghệ tưới nhỏ giọt và chế phẩm vi sinh hữu cơ.</li>
        <li><strong>Chăn nuôi nhân đạo:</strong> Đàn gà thả đồi tự nhiên, kiểm soát dịch bệnh nghiêm ngặt không dùng kháng sinh.</li>
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

export const DEMO_TRACE_DATA: Record<string, PublicTraceData> = {
  'RAU-2026-001': {
    product: {
      name: 'Cải ngọt hữu cơ',
      slug: 'cai-ngot-huu-co',
      unit: 'kg',
    },
    lot: {
      code: 'LOT-2026-0315',
      traceCode: 'RAU-2026-001',
      quantity: 120,
      unit: 'kg',
      harvestedAt: '2026-03-15T06:30:00Z',
      qualityGrade: 'Loại A (VietGAP)',
      certification: 'VietGAP #VG-2026-089',
    },
    area: {
      name: 'Khu nhà màng công nghệ cao A1',
      type: 'Nhà màng trồng rau',
    },
    cycle: {
      name: 'Vụ rau hữu cơ xuân hè 2026',
      species: 'Cải ngọt',
      variety: 'Cải ngọt F1 Nhật Bản',
      startDate: '2026-02-01T08:00:00Z',
    },
    timeline: [
      {
        type: 'SOWING',
        performedAt: '2026-02-01T08:00:00Z',
        summary: 'Gieo hạt khay ươm giá thể hữu cơ vi sinh',
      },
      {
        type: 'PLANTING',
        performedAt: '2026-02-12T07:30:00Z',
        summary: 'Đưa cây con ra luống trồng nhà màng A1',
      },
      {
        type: 'IRRIGATION',
        performedAt: '2026-02-20T09:00:00Z',
        summary: 'Tưới nước nhỏ giọt kết hợp dinh dưỡng hữu cơ IMO',
      },
      {
        type: 'FERTILIZING',
        performedAt: '2026-02-28T08:00:00Z',
        summary: 'Bổ sung phân bón hữu cơ hoai mục ủ vi sinh',
      },
      {
        type: 'HARVEST',
        performedAt: '2026-03-15T06:30:00Z',
        summary: 'Thu hoạch sáng sớm, phân loại đạt chuẩn loại A',
      },
    ],
    photos: [
      { url: demoAsset('/demo/rau-cai.svg'), caption: 'Lô cải ngọt thu hoạch buổi sáng' },
      { url: demoAsset('/demo/nha-kinh.svg'), caption: 'Khu nhà màng công nghệ cao A1' },
    ],
  },
  'TRUNG-2026-002': {
    product: {
      name: 'Trứng gà ta thả đồi',
      slug: 'trung-ga-ta',
      unit: 'hộp 10 quả',
    },
    lot: {
      code: 'LOT-2026-0318',
      traceCode: 'TRUNG-2026-002',
      quantity: 500,
      unit: 'quả',
      harvestedAt: '2026-03-18T07:00:00Z',
      qualityGrade: 'Loại 1',
      certification: 'Chăn nuôi sinh thái an toàn dịch bệnh',
    },
    area: {
      name: 'Khu đồi cỏ thả gà B2',
      type: 'Đồi cỏ sinh thái',
    },
    cycle: {
      name: 'Đàn gà ta đồi thả tự nhiên K3',
      species: 'Gà ta Lạc Thủy',
      variety: 'Gà bản địa',
      startDate: '2025-10-01T08:00:00Z',
    },
    timeline: [
      {
        type: 'FEEDING',
        performedAt: '2026-03-10T06:30:00Z',
        summary: 'Cho ăn hỗn hợp bắp hạt, cám gạo và giun quế tươi',
      },
      {
        type: 'CLEANING',
        performedAt: '2026-03-14T08:00:00Z',
        summary: 'Khử khuẩn chuồng trại bằng đệm lót sinh học vi sinh',
      },
      {
        type: 'HARVEST',
        performedAt: '2026-03-18T07:00:00Z',
        summary: 'Thu gom trứng sáng sớm, chiếu đèn kiểm tra chất lượng',
      },
    ],
    photos: [
      { url: demoAsset('/demo/trung-ga.svg'), caption: 'Trứng gà ta chọn lọc' },
      { url: demoAsset('/demo/canh-dong.svg'), caption: 'Khu đồi cỏ thả gà sinh thái' },
    ],
  },
  'CA-2026-003': {
    product: {
      name: 'Cá rô phi sinh thái',
      slug: 'ca-ro-phi-tuoi',
      unit: 'kg',
    },
    lot: {
      code: 'LOT-2026-0320',
      traceCode: 'CA-2026-003',
      quantity: 350,
      unit: 'kg',
      harvestedAt: '2026-03-20T06:00:00Z',
      qualityGrade: 'Loại A (>800g/con)',
      certification: 'Nuôi trồng thủy sản tuần hoàn',
    },
    area: {
      name: 'Ao sinh thái tuần hoàn C1',
      type: 'Ao nuôi tuần hoàn',
    },
    cycle: {
      name: 'Vụ cá rô phi sinh thái 2025-2026',
      species: 'Cá rô phi đơn tính',
      variety: 'Dòng cá tăng trưởng nhanh',
      startDate: '2025-09-15T08:00:00Z',
    },
    timeline: [
      {
        type: 'WATER_TEST',
        performedAt: '2026-03-05T08:00:00Z',
        summary: 'Kiểm tra chất lượng nước ao: pH 7.5, DO 6.2 mg/L',
      },
      {
        type: 'FEEDING',
        performedAt: '2026-03-15T07:00:00Z',
        summary: 'Bổ sung thức ăn tự nhiên và bèo tấm sinh học',
      },
      {
        type: 'HARVEST',
        performedAt: '2026-03-20T06:00:00Z',
        summary: 'Kéo lưới thu hoạch mẻ cá đạt trọng lượng xuất bán',
      },
    ],
    photos: [
      { url: demoAsset('/demo/ca-ro-phi.svg'), caption: 'Cá rô phi tươi sống thu hoạch' },
      { url: demoAsset('/demo/ao-ca.svg'), caption: 'Hệ thống ao nuôi sinh thái C1' },
    ],
  },
};

export const DEMO_BOOKINGS: Record<string, PublicBookingView> = {
  'XF-BK-DEMO-01': {
    code: 'XF-BK-DEMO-01',
    tourName: 'Một ngày làm nông dân nhí & gia đình',
    tourSlug: 'mot-ngay-lam-nong-dan',
    startAt: '2026-11-01T08:00:00Z',
    customerName: 'Nguyễn Văn An (Demo)',
    phone: '0901234567',
    email: 'an.demo@example.com',
    adults: 2,
    children: 1,
    total: 650000,
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    paymentMethod: 'VIETQR',
    createdAt: '2026-10-26T10:00:00Z',
    bankTransfer: {
      bankId: 'VCB',
      accountNo: '0123456789',
      accountName: 'XFARM',
      amount: '650000',
      addInfo: 'XF-BK-DEMO-01',
    },
  },
};

export const DEMO_ORDERS: Record<string, unknown> = {
  'XF-ORD-DEMO-01': {
    code: 'XF-ORD-DEMO-01',
    total: 120000,
    paymentMethod: 'COD',
    customerName: 'Trần Thị Bình (Demo)',
    phone: '0901234567',
    address: 'Số 123 Đường Sinh Thái, Hà Nội',
    items: [
      { productName: 'Cải ngọt hữu cơ', quantity: 2, unitPrice: 25000, subtotal: 50000 },
      { productName: 'Cá rô phi sinh thái', quantity: 1, unitPrice: 75000, subtotal: 75000 },
    ],
  },
};
