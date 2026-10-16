# XFarm – Nhật ký Quyết định Kỹ thuật (Decisions Log)

### DECISION-012: Nhất quán số tiền lương MONTHLY và phân bổ ngày công đa mùa vụ
- **Bối cảnh**:
  1. Khi một nhân viên làm việc cho nhiều mùa vụ trong cùng một ngày, mỗi mùa vụ ghi nhận một dòng `Attendance` (`unique(employeeId, date, cycleId)`). Việc tính độc lập từng dòng dẫn tới lỗi tính trùng ngày công (nhân viên làm 2 mùa vụ trong 1 ngày bị tính thành 2 công).
  2. Với nhân viên hưởng lương tháng (`MONTHLY`), việc tính độc lập từng dòng theo `(baseRate / 26) * dayWork` rồi làm tròn ở từng dòng có thể dẫn tới độ lệch giữa tổng các dòng và tổng bảng lương `baseRate * (actualDays / 26)`.
- **Quyết định**:
  1. Khi tính lương (`POST /payrolls/generate`) và chi phí công theo mùa vụ (`GET /cycles/:id/labor-cost`), hệ thống gộp giờ công theo ngày (`employeeId`, `date`) trước để xác định tổng ngày công chuẩn của ngày (≥ 4h tính 1 công, < 4h tính 0,5 công). Sau đó, chi phí và ngày công được phân bổ cho từng mùa vụ theo tỷ lệ giờ làm.
  2. Với `MONTHLY`, tổng số tiền bảng lương `amount` được tính làm tròn chuẩn từ `baseRate * (actualDays / 26)` dùng `Prisma.Decimal.ROUND_HALF_UP`. Trong danh sách `details`, các dòng được làm tròn chuẩn và phần dư làm tròn được bù vào dòng cuối cùng. Mọi phép tính tiền tệ đều sử dụng `Prisma.Decimal`.
- **Hệ quả**: Bảng lương và giá thành nhân công mùa vụ phản ánh đúng thực tế lao động trong ngày, không bị trùng công, và tổng số tiền bảng lương luôn khớp chính xác tuyệt đối với tổng các dòng chi tiết.

### DECISION-011: Hook phát sinh chi phí thanh toán lương (PayrollPaidEvent) cho Giai đoạn 4
- **Bối cảnh**: Khi bảng lương chuyển trạng thái sang `PAID`, hệ thống cần ghi nhận giao dịch chi phí (`Transaction { type: EXPENSE, refType: 'PAYROLL', refId }`) gắn vào sổ quỹ tài chính. Tuy nhiên, phân hệ Tài chính thuộc Giai đoạn 4 (PLAN mục 6), còn nhánh hiện tại là Giai đoạn 6 (tách từ Phase 2 chưa có GĐ 4).
- **Quyết định**: Khi OWNER gọi `POST /payrolls/:id/pay`, nghiệp vụ chuyển trạng thái bảng lương thành `PAID`, cập nhật `paidAt = now()`, đồng thời phát sự kiện `PayrollPaidEvent` thông qua Node.js `EventEmitter` (`payrollEvents`).
- **Hệ quả**: Giữ kiến trúc tách biệt (loose coupling) giữa module Nhân sự và Tài chính. Khi triển khai Giai đoạn 4, module Tài chính chỉ cần đăng ký listener lắng nghe sự kiện `payroll.paid` để tự động tạo `Transaction` chi tương ứng mà không làm gián đoạn hay phụ thuộc vòng vào module Payroll.

### DECISION-009: Tồn kho theo kho và hướng điều chỉnh
- `StockLot.warehouseId` được lưu nullable để lô nhập kho xác định được kho hiện tại; các lô thu hoạch ở giai đoạn sau có thể được gán kho khi phát sinh nhập.
- `StockMove.quantity` luôn là số dương. Với `ADJUST`, cột `direction` (IN/OUT) biểu diễn tăng hoặc giảm; view `stock_balances` không suy diễn dấu từ `refType`.
- View tổng hợp mọi biến động theo `(itemId, stockLotId, warehouseId)`, nên không lưu số tồn riêng trong bảng nghiệp vụ.

Tài liệu này ghi lại các quyết định thiết kế và kỹ thuật quan trọng trong quá trình triển khai dự án XFarm.

### DECISION-011: Lựa chọn Serwist cho PWA Next.js 15 và cơ chế quét mã QR kép (Dual-engine)
- **Bối cảnh**:
  - Giai đoạn 6 yêu cầu giao diện PWA di động cho công nhân tại `/admin/m`, có manifest, service worker cache app shell và các trang `/admin/m/*` để mở được khi offline. Kế hoạch gốc (`docs/PLAN.md`) gợi ý `next-pwa`.
  - Quét mã QR khu/lô (`xfarm:area:<code>`) cần hoạt động nhanh, chính xác trên đa dạng thiết bị di động của công nhân.
- **Quyết định Serwist**:
  - Thư viện `next-pwa` đã ngưng bảo trì và không tương thích tốt với Next.js 15 / React 19. Dự án lựa chọn `@serwist/next` + `serwist` (bản kế thừa hiện đại của Workbox/next-pwa).
  - Cấu hình Serwist tự động precache app static chunks và dùng chiến lược `NetworkFirst` cho các trang `/admin/m/*`, đảm bảo công nhân luôn mở được giao diện kể cả khi mất kết nối mạng.
- **Quyết định Quét QR**:
  - Ưu tiên sử dụng API phần cứng chuẩn `BarcodeDetector` khi trình duyệt hỗ trợ (Chromium trên Android, Chrome hiện đại) cho hiệu năng tối đa, không tốn tài nguyên giải mã JS.
  - Tự động fallback sang `@zxing/browser` (`BrowserQRCodeReader.decodeFromVideoElement`) đối với các trình duyệt chưa hỗ trợ `BarcodeDetector` (như Safari trên iOS, Firefox, hoặc môi trường headless).
  - Bổ sung chế độ nhập mã thủ công dự phòng khi camera gặp lỗi phân quyền hoặc thiết bị không có camera.
- **Hệ quả**:
  - PWA tải nhanh, ổn định trên Next.js 15, sẵn sàng cho lớp offline queue của `p6-pwa-offline`. Quét QR mượt mà trên cả Android và iOS.

### DECISION-010: Chọn kho mặc định khi Activity xuất vật tư
- Khi dòng vật tư có `warehouseId`, hệ thống xuất đúng kho đó.
- Nếu bỏ trống, hệ thống ưu tiên kho có `areaId` trùng với khu/lô của Activity, sau đó lần lượt các kho gắn với khu cha của khu/lô đó.
- Nếu không tìm được kho theo cây khu/lô, dùng kho đầu tiên theo `createdAt`, rồi `id` để kết quả deterministic. Không có kho nào thì trả 422 và transaction tạo Activity bị rollback.

### DECISION-008: Đưa Playwright E2E lên GĐ 1
- **Bối cảnh**: Lỗi giao diện liên quan đến layout và tương tác trình duyệt thật không được phát hiện bởi test jsdom; yêu cầu sản phẩm cần kiểm tra ngay các luồng GĐ 0–1.
- **Quyết định**: Bổ sung bộ test Playwright tại `apps/web/e2e` trong task P1, dùng Chrome hệ thống và không tải browser riêng.
- **Hệ quả**: `test:ui` cần web/API đang chạy và database slot đã migrate/seed; kế hoạch gốc đặt Playwright ở GĐ 3 được điều chỉnh cho mục tiêu kiểm thử sớm.

---

### DECISION-007: Dùng TypeScript watch và Node watch cho API development server
- **Bối cảnh**: `tsx watch` dùng esbuild và không phát sinh `emitDecoratorMetadata`, khiến NestJS không inject được các dependency constructor không có `@Inject()` trong môi trường dev.
- **Quyết định**: Đổi script `@xfarm/api dev` sang script chạy `tsc` một lần, sau đó chạy `tsc --watch` song song với `node --watch dist/src/main.js`. TypeScript compiler dùng `tsconfig.json` hiện tại nên phát sinh decorator metadata trong lúc watch.
- **Lý do chọn phương án**: Nest CLI Webpack cần thêm loader và khi chạy trong monorepo này externalize `@xfarm/shared`, dẫn tới lỗi ESM source không có extension. Phương án compiler/runtime tách đôi không cần thay đổi package shared.
- **Hệ quả**: Hot reload vẫn được giữ, dev server dùng cùng cơ chế metadata với bản build `tsc`; thêm smoke test khởi động bằng chính script `dev` để kiểm tra các route bị ảnh hưởng.

---

### DECISION-001: Quản lý biến môi trường trong Monorepo Prisma với dotenv-cli
- **Bối cảnh**: Trong kiến trúc monorepo Turborepo, tệp cấu hình `.env` duy nhất được lưu tại thư mục gốc của dự án. Mặc định, Prisma CLI chạy trong thư mục `packages/db` sẽ chỉ tìm tệp `.env` tại thư mục làm việc hiện tại của nó.
- **Quyết định**: Sử dụng `dotenv-cli` trong các kịch bản script của `@xfarm/db` (`dotenv -e ../../.env -- prisma ...`) và export biến môi trường tương ứng.
- **Hệ quả**: Tất cả các thao tác `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:studio`, `pnpm db:reset` từ thư mục gốc hoặc trong package `db` đều đồng bộ, không cần duplicate file `.env`.

---

### DECISION-002: Hỗ trợ xác thực kép (HttpOnly Cookie & Authorization Bearer Header)
- **Bối cảnh**: Yêu cầu đề bài chỉ định lưu `access_token` và `refresh_token` trong httpOnly cookie để bảo mật cho trình duyệt Web Next.js. Tuy nhiên, việc kiểm thử tự động, tích hợp tài liệu Swagger OpenAPI (`/docs`), và các công cụ dòng lệnh như `curl` cũng cần cơ chế xác thực tiện lợi.
- **Quyết định**: `JwtStrategy` của NestJS được cấu hình với custom extractor: ưu tiên trích xuất JWT từ cookie `access_token`, nếu không có sẽ trích xuất từ header `Authorization: Bearer <token>`.
- **Hệ quả**: Frontend hoạt động mượt mà và bảo mật với httpOnly cookie, đồng thời Swagger UI và các bài test API e2e đều có thể dễ dàng kiểm thử.

---

### DECISION-003: Cơ chế xoay vòng Refresh Token (Rotation) và Thu hồi toàn bộ khi phát hiện tái sử dụng
- **Bối cảnh**: Refresh token có thời hạn 7 ngày. Nếu bị lộ, kẻ tấn công có thể cố gắng làm mới token liên tục.
- **Quyết định**:
  1. Mỗi lần gọi `POST /auth/refresh`, refresh token cũ ngay lập tức bị gán `revokedAt = now()`.
  2. Một refresh token ngẫu nhiên mới được cấp phát và lưu mã băm SHA-256 vào database.
  3. Nếu nhận được một refresh token đã có `revokedAt !== null` (tức token cũ đã từng được sử dụng trước đó), hệ thống lập tức phát hiện nguy cơ tấn công đánh cắp token và tiến hành **thu hồi (revoke) toàn bộ refresh token hiện có của user đó**, buộc đăng nhập lại từ đầu.
- **Hệ quả**: Ngăn chặn hoàn toàn các cuộc tấn công tái sử dụng token (Token Reuse Attack).

---

### DECISION-004: Tách biệt cơ sở dữ liệu kiểm thử (xfarm_test)
- **Bối cảnh**: Test e2e cần chạy liên tục trong quá trình phát triển và CI/CD mà không làm bẩn hoặc xóa nhầm dữ liệu đang phát triển trong database `xfarm`.
- **Quyết định**: Khởi tạo database riêng biệt `xfarm_test` trong cùng container PostgreSQL thông qua script `scripts/init-test-db.sql`. Bộ test `app.e2e-spec.ts` tự động đồng bộ schema và dọn dẹp các bảng trên `xfarm_test` trước khi chạy.
- **Hệ quả**: Test e2e chạy nhanh, độc lập, tin cậy và không bao giờ ảnh hưởng tới môi trường dev.

---

### DECISION-005: Thay thế MinIO bằng RustFS và amazon/aws-cli cho môi trường phát triển (S3-compatible Storage)
- **Bối cảnh**:
  - Image `minio/minio` trên Docker Hub trả về lỗi `pull access denied` (không còn cho phép pull công khai).
  - Tương tự, image `quay.io/minio/minio` báo `unauthorized` và `minio/mc` cũng bị hạn chế truy cập (`pull access denied`).
  - Hệ thống cần một dịch vụ lưu trữ tương thích chuẩn S3 API cho môi trường dev và test để lưu trữ media (`xfarm-media`).
- **Các phương án đã thử nghiệm**:
  1. `rustfs/rustfs`: Hình ảnh công khai tải về thành công ngay lập tức (`docker pull rustfs/rustfs`). Tương thích hoàn toàn chuẩn AWS S3 API, hỗ trợ path-style addressing (`forcePathStyle: true`), hỗ trợ trực tiếp các biến môi trường cấu hình gốc của MinIO (`MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`), có endpoint kiểm tra sức khỏe tương thích `/minio/health/live`, khởi động cực nhanh và tốn ít tài nguyên.
  2. `minio/mc`: Đã thử pull nhưng gặp lỗi `pull access denied` từ Docker Hub.
  3. `amazon/aws-cli`: Hình ảnh công khai tải về thành công (`docker pull amazon/aws-cli`), thay thế hoàn hảo cho `minio/mc` trong tác vụ khởi tạo bucket `xfarm-media` và áp dụng chính sách truy cập công khai (public read policy) qua AWS CLI chuẩn (`s3 mb`, `s3api put-bucket-policy`).
  (Các ứng viên dự phòng khác trong danh sách đề bài gồm `chrislusf/seaweedfs`, `garagehq/garage`, `bitnami/minio`, `bitnamilegacy/minio` không cần dùng đến do `rustfs/rustfs` hoạt động tốt ngay từ lần thử đầu tiên).
- **Quyết định**:
  - Sử dụng `rustfs/rustfs` thay thế `minio/minio` trong `docker-compose.yml`, giữ nguyên cổng 9010 (S3 API) và 9011 (Console), giữ nguyên tên biến môi trường `MINIO_*` và cấu hình volume `xfarm_miniodata`.
  - Sử dụng `amazon/aws-cli` thay thế `minio/minio` trong container `createbuckets` để tạo bucket `xfarm-media` và set anonymous public read policy một cách idempotent.
- **Hệ quả**:
  - Môi trường phát triển và kiểm thử khôi phục đầy đủ khả năng lưu trữ đối tượng tương thích S3.
  - Không cần sửa đổi bất kỳ biến môi trường nào trong ứng dụng và toàn bộ luồng tạo presigned PUT, upload, head object, public get và delete đều hoạt động chính xác.

---

### DECISION-006: Lựa chọn Leaflet kết hợp @geoman-io/leaflet-geoman-free cho bản đồ khu/lô
- **Bối cảnh**:
  - Giao diện quản lý Khu/lô yêu cầu hiển thị bản đồ nền OpenStreetMap, trực quan hóa ranh giới polygon theo loại khu, và cho phép vẽ, sửa đổi polygon để lưu tọa độ GeoJSON vào database.
  - Đề bài gợi ý hai phương án: `leaflet-draw` hoặc `@geoman-io/leaflet-geoman-free`.
- **Đánh giá phương án**:
  1. `leaflet-draw`: Phiên bản cuối cùng ra mắt cách đây nhiều năm (v1.0.4 từ 2018), thiếu hỗ trợ TypeScript chính thức, gặp nhiều xung đột và vấn đề tương thích khi chạy cùng Leaflet 1.9+ và React 19 / Next.js 15.
  2. `@geoman-io/leaflet-geoman-free`: Thư viện vẽ và chỉnh sửa hình học (polygon, marker, rectangle...) hiện đại hàng đầu cho Leaflet, được duy trì tích cực (v2.20+), hỗ trợ TypeScript đầy đủ, API thao tác trực tiếp với layer GeoJSON tiện lợi (`map.pm.getGeomanLayers()`, `toGeoJSON()`), hỗ trợ chế độ chỉnh sửa đỉnh (vertex edit), kéo dãn (drag), cắt hình (cut), xoay và xóa rất mượt mà.
- **Quyết định**:
  - Sử dụng `leaflet` kết hợp `@geoman-io/leaflet-geoman-free` (cùng `react-leaflet` khi cần) cho tính năng bản đồ và biên tập polygon.
  - Sử dụng `next/dynamic` với `ssr: false` để tải các thành phần bản đồ ở client-side nhằm tránh lỗi SSR do Leaflet yêu cầu đối tượng `window`.
- **Hệ quả**:
  - Đảm bảo tính ổn định, dễ bảo trì, khả năng mở rộng tốt cho các giai đoạn tiếp theo (như cắt lô, chia luống, đo diện tích tự động).

---

### DECISION-011: Quy tắc tính giờ công từ check-in và check-out
- **Bối cảnh**: Hệ thống chấm công cho phép WORKER tự chấm công vào và ra ca làm việc qua PWA hoặc API, yêu cầu tự động quy đổi thành số giờ công (`hours`) chuẩn xác cho bảng lương và giá thành mùa vụ.
- **Quyết định**:
  1. Thời gian làm việc thô: `rawHours = (checkOut - checkIn) / 3600000`.
  2. Nghỉ trưa: Nếu ca làm việc kéo dài trên 6 giờ (`rawHours > 6`), tự động trừ 1 giờ nghỉ trưa (`netHours = rawHours - 1`); nếu ca làm việc <= 6 giờ thì giữ nguyên (`netHours = rawHours`).
  3. Làm tròn: Số giờ làm việc thực tế được làm tròn theo bước 0,25 giờ (15 phút) gần nhất theo công thức `hours = Math.max(0, Math.round(netHours * 4) / 4)`.
- **Hệ quả**:
  - Đảm bảo tính nhất quán giữa chấm công và tính lương theo `payType` (DAILY, MONTHLY, PIECE).
  - Ngăn ngừa tình trạng sai lệch số giờ công do thời gian quẹt thẻ chênh lệch vài phút.
