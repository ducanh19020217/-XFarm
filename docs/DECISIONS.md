# XFarm – Nhật ký Quyết định Kỹ thuật (Decisions Log)

Tài liệu này ghi lại các quyết định thiết kế và kỹ thuật quan trọng trong quá trình triển khai dự án XFarm.

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

### DECISION-007: Dùng TypeScript watch và Node watch cho API development server
- **Bối cảnh**: `tsx watch` dùng esbuild và không phát sinh `emitDecoratorMetadata`, khiến NestJS không inject được các dependency constructor không có `@Inject()` trong môi trường dev.
- **Quyết định**: Đổi script `@xfarm/api dev` sang script chạy `tsc` một lần, sau đó chạy `tsc --watch` song song với `node --watch dist/src/main.js`. TypeScript compiler dùng `tsconfig.json` hiện tại nên phát sinh decorator metadata trong lúc watch.
- **Lý do chọn phương án**: Nest CLI Webpack cần thêm loader và khi chạy trong monorepo này externalize `@xfarm/shared`, dẫn tới lỗi ESM source không có extension. Phương án compiler/runtime tách đôi không cần thay đổi package shared.
- **Hệ quả**: Hot reload vẫn được giữ, dev server dùng cùng cơ chế metadata với bản build `tsc`; thêm smoke test khởi động bằng chính script `dev` để kiểm tra các route bị ảnh hưởng.

---

### DECISION-008: Đưa Playwright E2E lên GĐ 1
- **Bối cảnh**: Lỗi giao diện liên quan đến layout và tương tác trình duyệt thật không được phát hiện bởi test jsdom; yêu cầu sản phẩm cần kiểm tra ngay các luồng GĐ 0–1.
- **Quyết định**: Bổ sung bộ test Playwright tại `apps/web/e2e` trong task P1, dùng Chrome hệ thống và không tải browser riêng.
- **Hệ quả**: `test:ui` cần web/API đang chạy và database slot đã migrate/seed; kế hoạch gốc đặt Playwright ở GĐ 3 được điều chỉnh cho mục tiêu kiểm thử sớm.

---

### DECISION-009: Tồn kho theo kho và hướng điều chỉnh
- `StockLot.warehouseId` được lưu nullable để lô nhập kho xác định được kho hiện tại; các lô thu hoạch ở giai đoạn sau có thể được gán kho khi phát sinh nhập.
- `StockMove.quantity` luôn là số dương. Với `ADJUST`, cột `direction` (IN/OUT) biểu diễn tăng hoặc giảm; view `stock_balances` không suy diễn dấu từ `refType`.
- View tổng hợp mọi biến động theo `(itemId, stockLotId, warehouseId)`, nên không lưu số tồn riêng trong bảng nghiệp vụ.

---

### DECISION-010: Hoãn tính năng Trả tiền và Transaction chi của Đơn mua hàng sang GĐ 4
- **Bối cảnh**: Kế hoạch tổng thể (`docs/PLAN.md` mục 6 "Mua hàng") có nêu: "Nếu đánh dấu đã trả tiền thì tạo thêm Transaction chi". Tuy nhiên, phân hệ Tài chính (FinanceCategory, Transaction thu/chi) và luồng thanh toán thuộc Giai đoạn 4.
- **Quyết định**: Trong Giai đoạn 2 (task `p2-api-purchase`), API đơn mua hàng chỉ tập trung giải quyết trọn vẹn vòng đời mua hàng và quản lý kho vận: lập đơn (DRAFT), duyệt đặt hàng (ORDERED), hủy đơn (CANCELLED), và tiếp nhận hàng hóa vào kho qua `InventoryService.receive` (PARTIAL / RECEIVED). Nghiệp vụ thanh toán và tự động hạch toán bút toán chi (Transaction EXPENSE) sẽ được tích hợp đồng bộ ở GĐ 4 khi phân hệ Tài chính được hoàn thiện.
- **Hệ quả**: Giữ đúng phạm vi ranh giới của GĐ 2, tránh phụ thuộc chéo vào schema tài chính chưa sẵn sàng, đảm bảo module `purchase-orders` độc lập, an toàn và dễ kiểm thử.

---

### DECISION-011: Chọn kho mặc định khi Activity xuất vật tư
- Khi dòng vật tư có `warehouseId`, hệ thống xuất đúng kho đó.
- Nếu bỏ trống, hệ thống ưu tiên kho có `areaId` trùng với khu/lô của Activity, sau đó lần lượt các kho gắn với khu cha của khu/lô đó.
- Nếu không tìm được kho theo cây khu/lô, dùng kho đầu tiên theo `createdAt`, rồi `id` để kết quả deterministic. Không có kho nào thì trả 422 và transaction tạo Activity bị rollback.

---

### DECISION-012: Tạm tính giá vốn lô thu hoạch ở GĐ 3
- Khi Activity HARVEST sinh StockLot, `unitCost` được ghi nhận là `0` để bảo đảm lô và tồn kho được tạo nguyên tử cùng nhật ký.
- Giá thành thực tế của mùa vụ sẽ được tính lại ở GĐ 4 từ vật tư, chi phí và công lao động; luồng HARVEST không tự suy đoán giá vốn tại thời điểm nhập kho.

---

### DECISION-013: Không cache trang truy xuất khi trạng thái công khai thay đổi
- **Bối cảnh**: Khi tắt `HarvestLot.isPublic`, URL truy xuất phải ngừng hiển thị ngay; cache ISR có thể tiếp tục trả nội dung public cũ trong thời gian revalidate.
- **Quyết định**: Trang `/trace/[code]` dùng `cache: 'no-store'` và `force-dynamic`; các trang public CMS khác vẫn dùng revalidate theo quy ước chung.
- **Hệ quả**: Thay đổi công khai được phản ánh ngay trên URL truy xuất, đổi lại mỗi lượt truy xuất cần gọi API backend.

---

### DECISION-014: Chạy Playwright trên bản build production và dùng env theo worktree
- **Bối cảnh**: Next dev biên dịch động trong lúc test khiến bộ UI gộp dễ timeout/`ERR_ABORTED`; các worktree cần dùng đúng API và cổng web riêng trong `.env` gốc.
- **Quyết định**: Playwright build web một lần rồi chạy `next start`; Next config và script `dev`/`start` nạp `.env` gốc, lấy cổng từ `WEB_URL`. Client server/public dùng chung một `API_BASE_URL`.
- **Hệ quả**: UI E2E kiểm tra gần với môi trường production và không tranh cổng mặc định giữa các slot; đổi lại mỗi lượt `test:ui` cần thời gian build.

---

### DECISION-015: Hợp nhất schema và seed GĐ 3 với GĐ 6
- **Bối cảnh**: `phase-6-hr` tách từ nền GĐ 2 trong khi `main` đã có schema và seed GĐ 3.
- **Quyết định**: Giữ nguyên toàn bộ model/migration Harvest, CMS, trace và bổ sung model Employee, Task, Attendance, Payroll cùng các quan hệ cần thiết; seed giữ cả dữ liệu public/CMS/Harvest và HR, đều dùng upsert để chạy lặp lại.
- **Hệ quả**: Hai nhóm tính năng dùng chung Prisma Client và có thể migrate deploy trên DB trống mà không sửa migration đã phát hành.

---

### DECISION-016: Giới hạn số worker và tiến trình song song khi kiểm thử
- **Bối cảnh**: Trên máy phát triển 12 nhân, có 4–6 worker/agent cùng chạy song song. Mỗi lần chạy kiểm thử, Vitest mặc định kích hoạt toàn bộ luồng (~12 threads/forks) và Turbo thực thi đồng thời nhiều task, khiến system load vọt lên 40–60 làm máy bị treo/đơ.
- **Quyết định**:
  1. **Vitest**: Cấu hình `test.maxWorkers: 2` và `minWorkers: 1` trong tất cả các tệp cấu hình Vitest (`apps/web/vitest.config.ts`, `packages/shared/vitest.config.ts`), cho phép ghi đè thông qua biến môi trường `VITEST_MAX_WORKERS`.
  2. **Jest**: Đặt `maxWorkers: 2` cho bộ unit tests (`apps/api/jest.config.json`); tiếp tục giữ `--runInBand` cho Jest E2E (`apps/api/package.json` script `test:e2e`).
  3. **Turbo**: Cấu hình `"concurrency": "2"` trong `turbo.json` và bổ sung `--concurrency=2` cho script `test` trong `package.json` gốc nhằm giới hạn số lượng tác vụ test chạy song song.
  4. **Playwright**: Tiếp tục duy trì `workers: 1` (`apps/web/playwright.config.ts`) tránh tranh chấp cổng và tài nguyên DB.
- **Hệ quả**: Giảm thiểu tải CPU đột ngột khi chạy kiểm thử đồng thời giữa các agent/worker, đảm bảo máy phát triển hoạt động ổn định và các lệnh kiểm thử hoàn thành tin cậy trong thời gian hợp lý.

---

### DECISION-017: Single-flight server cho refresh token
- **Bối cảnh**: Client đã gom các request refresh trong cùng một bundle, nhưng nhiều tab, prefetch hoặc request tới nhiều instance API vẫn có thể gửi cùng refresh token đồng thời. Rotation khi đó chỉ cho một request thành công; request còn lại nhận 401 và có thể làm layout điều hướng sai về `/admin`.
- **Quyết định**: Trong mỗi instance API, các request refresh đồng thời có cùng raw token dùng chung một Promise rotation. Tất cả request trong nhóm nhận cùng access/refresh token mới; token cũ vẫn được revoke một lần. Việc dùng lại token sau cửa sổ grace 30 giây vẫn kích hoạt cơ chế revoke toàn bộ phiên như DECISION-003.
- **Hệ quả**: Refresh race trong một instance không làm mất phiên hoặc ghi đè cookie bằng kết quả lỗi. Với deployment nhiều instance, client single-flight vẫn là lớp chính; cần shared lock/cache nếu mở rộng theo chiều ngang.

---

### DECISION-018: Xuất bản website công khai lên GitHub Pages dạng demo tĩnh (Static Export)
- **Bối cảnh**:
  - Cần một bản demo công khai để người dùng truy cập trực tiếp tại `https://ducanh19020217.github.io/-XFarm/` mà không phải duy trì hạ tầng máy chủ (NestJS, PostgreSQL, Redis, MinIO).
  - GitHub Pages chỉ phục vụ các tệp tĩnh từ nhánh hoặc qua GitHub Actions deployment artifact.
  - Phân hệ quản trị (`/admin`), màn hình đăng nhập (`/login`) và PWA công nhân (`/admin/m`) sử dụng SSR, middleware xác thực, dynamic route và dynamic server logic không tương thích với `output: 'export'`.
- **Quyết định**:
  1. **Chế độ Demo (`NEXT_PUBLIC_DEMO=1`)**:
     - `apps/web/src/lib/public-api.ts` tự động phát hiện cờ demo và trả về dữ liệu mẫu cố định từ `apps/web/src/demo/fixtures.ts` mà không gửi bất kỳ HTTP fetch nào tới backend.
     - Các thao tác yêu cầu gửi dữ liệu lên server (đặt hàng, đặt tour, gửi liên hệ, tra cứu đơn hàng/booking) hiển thị thông báo mô phỏng "Đây là bản demo, thao tác không được gửi đi", không để phát sinh lỗi mạng.
     - Thêm banner nhỏ cố định "Bản demo – dữ liệu mẫu" trên tất cả các trang công khai kèm liên kết tới GitHub repository.
  2. **Kiến trúc Build Demo cô lập (`apps/web/scripts/build-demo.mjs`)**:
     - Khi build demo, script tạm thời ẩn (stash) các thư mục quản trị và middleware động (`src/app/admin`, `src/app/login`, `src/middleware.ts`), thay thế bằng các trang placeholder tĩnh thông báo giới hạn tính năng.
     - Thư mục kiểu dữ liệu dùng chung (`src/app/admin/hr/common/types.ts`) vẫn được giữ lại để TypeScript compile thành công.
     - Cấu hình Next.js tự động chuyển `output: 'export'`, `basePath: '/-XFarm'` (cho phép ghi đè qua `DEMO_BASE_PATH`), `images: { unoptimized: true }`, tắt Serwist PWA và API rewrites.
     - Tự động sinh tệp `.nojekyll` và tệp sao chép `-XFarm.txt` để hỗ trợ RSC prefetch trên GitHub Pages.
     - Khôi phục nguyên vẹn 100% cấu trúc tệp mã nguồn ban đầu trong khối `finally`, không gây tác động ngoài ý muốn tới build production tiêu chuẩn.
  3. **Tự động hóa CI/CD (.github/workflows/pages.yml)**:
     - Kích hoạt khi có thay đổi trên `main` liên quan tới `apps/web/**`, `packages/**` hoặc file workflow.
     - Sử dụng Node.js 22, pnpm 9, thực thi `pnpm --filter web build:demo`, upload artifact `apps/web/out` và deploy an toàn qua OpenID Connect (`id-token: write`, `pages: write`).
- **Hệ quả**:
  - Website công khai chạy độc lập, mượt mà và trực quan trên GitHub Pages với 0 lỗi mạng, 0 lỗi 404 hình ảnh và 0 lỗi console.
  - Mã nguồn production và quy trình build chuẩn (`pnpm build`) hoàn toàn không bị ảnh hưởng, giữ nguyên 76 routes đầy đủ tính năng SSR và PWA.
