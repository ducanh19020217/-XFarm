# XFarm – Tiến độ thực hiện dự án

## Giai đoạn 0: Nền tảng (phase-0-foundation) – HOÀN THÀNH

### 1. Việc đã làm
- **Monorepo & Cấu trúc dự án**:
  - Cấu hình pnpm workspace và Turborepo v2 (`turbo.json`).
  - Thiết lập gói dùng chung `packages/config` (tsconfig base/library/nextjs/nestjs, eslint flat config, prettier).
  - Tích hợp scripts toàn cục ở root: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `db:migrate`, `db:seed`, `db:studio`, `db:reset`.
- **Hạ tầng Docker**:
  - `docker-compose.yml` với PostgreSQL 16 (port 5442), Redis 7 (port 6389), MinIO (API port 9010, Console port 9011).
  - Service `createbuckets` tự động khởi tạo bucket `xfarm-media` và phân quyền đọc công khai.
  - Script khởi tạo `scripts/init-test-db.sql` tạo cơ sở dữ liệu `xfarm_test` chạy kiểm thử độc lập.
- **Cơ sở dữ liệu (`packages/db`)**:
  - Schema Prisma gồm các bảng hệ thống: `User`, `RefreshToken`, `Sequence`, `Media`, `AuditLog`, enum `Role`.
  - Singleton `prisma` export.
  - Script `prisma/seed.ts` khởi tạo 5 tài khoản mẫu cho 5 vai trò (OWNER, MANAGER, ACCOUNTANT, SALES, WORKER) với mật khẩu băm bằng Argon2, hỗ trợ chạy lặp lại an toàn (upsert).
- **Gói dùng chung (`packages/shared`)**:
  - Định nghĩa Zod schemas: login, create/update user, phân trang pagination.
  - Enum `Role` và kiểu dữ liệu `Paginated<T>`.
- **Thư viện giao diện (`packages/ui`)**:
  - Tích hợp Tailwind CSS và Radix UI primitives.
  - Xây dựng các component tái sử dụng: `Button`, `Input`, `Label`, `Dialog`, `Table`, `Badge`, `Select`.
  - Các higher-level components theo đề bài:
    - `DataTable` (kết hợp TanStack Table, phân trang phía server, ô tìm kiếm, trạng thái loading).
    - `FormDialog` (modal biểu mẫu tương tác).
    - `PageHeader` (tiêu đề trang, mô tả, nút hành động).
    - `StatusBadge` (huy hiệu hiển thị trạng thái hoạt động và vai trò màu sắc chuẩn).
    - `ConfirmDialog` (hộp thoại xác nhận thao tác quan trọng).
- **Backend API (`apps/api` - NestJS 11)**:
  - Prefix `/api/v1`, tài liệu Swagger OpenAPI tại `/docs`.
  - Global guards: `JwtAuthGuard` (kèm decorator `@Public()`), `RolesGuard` (kèm decorator `@Roles()`), `ThrottlerGuard`.
  - Global exception filter `AllExceptionsFilter` chuẩn hóa response lỗi `{ statusCode, message, errors? }`, tự động map `ZodError` thành 400.
  - `AuditLogInterceptor` tự động ghi log vào bảng `AuditLog` cho các request thay đổi dữ liệu thành công (POST, PATCH, PUT, DELETE).
  - `SequenceService.next(key)` sinh mã số tăng dần dạng `KEY-YYYY-0001` trong transaction an toàn.
  - Mô-đun **Auth**:
    - `POST /auth/login` cấp 2 cookie httpOnly: `access_token` (15 phút) và `refresh_token` (7 ngày, path `/api/v1/auth`), có rate limit.
    - `POST /auth/refresh` có cơ chế xoay vòng token (rotation) và phát hiện dùng lại token bị thu hồi (revoke toàn bộ phiên đăng nhập của user).
    - `POST /auth/logout`, `GET /auth/me`.
    - Refresh token lưu dạng hash SHA-256 trong database.
    - Chặn đăng nhập/làm mới đối với người dùng `isActive = false`.
  - Mô-đun **Users** (chỉ OWNER):
    - `GET /users` (phân trang, tìm kiếm), `POST /users` (tạo mới), `PATCH /users/:id` (cập nhật), `PATCH /users/:id/status` (khóa/mở khóa).
    - Response không bao giờ để lộ `passwordHash`.
  - Mô-đun **Media**:
    - `POST /media/presign`: kiểm tra mime ảnh/pdf và kích thước <= 10MB, trả về presigned PUT URL với MinIO S3 SDK.
    - `POST /media`: lưu bản ghi metadata Media sau khi tải lên.
- **Frontend Web (`apps/web` - Next.js 15 App Router, Tailwind 4)**:
  - Middleware xác thực bảo vệ các trang `/admin/*`, tự động chuyển hướng về `/login` nếu chưa có cookie xác thực.
  - Client gọi API `src/lib/api.ts` tự động gửi kèm credentials (`credentials: 'include'`) và tự động refresh token khi gặp 401 rồi gửi lại request.
  - Trang đăng nhập `/login` (react-hook-form + zod schema tiếng Việt).
  - Layout quản trị `/admin`:
    - Sidebar hiển thị đầy đủ các phân hệ trong dự án XFarm (các phân hệ chưa làm được làm mờ và gắn badge "Sắp có").
    - Header hiển thị tên người dùng, vai trò và nút đăng xuất.
    - Hỗ trợ menu thu gọn trên thiết bị di động (mobile drawer).
  - Trang chào mừng `/admin`.
  - Trang quản lý người dùng `/admin/users` (DataTable phân trang server, tìm kiếm, FormDialog thêm/sửa, ConfirmDialog khóa/mở khóa).
  - Toàn bộ giao diện 100% tiếng Việt.
- **Kiểm thử**:
  - Bộ 13 test cases e2e của API (`apps/api/test/app.e2e-spec.ts`) chạy độc lập trên database `xfarm_test`.
  - Unit tests cho `lib/api.ts` trên web bằng Vitest (`apps/web/src/lib/api.test.ts`).

---

### 2. Việc chưa làm (kế hoạch giai đoạn tiếp theo)
- **Giai đoạn 1**: Phân hệ Sản xuất (Trồng trọt, chăn nuôi, thủy sản) - Quản lý Area bản đồ GeoJSON, Cycle mùa vụ, Activity nhật ký nông trại, đàn vật nuôi và ao cá.
- **Giai đoạn 2**: Phân hệ Kho + Mua hàng (Vật tư, lô hàng, phiếu nhập/xuất kho FIFO, cảnh báo tồn kho BullMQ).
- **Giai đoạn 3**: Phân hệ Thu hoạch + Truy xuất nguồn gốc QR code + Website giới thiệu công khai.
- **Giai đoạn 4**: Phân hệ Bán hàng + Webshop + Tài chính doanh thu / chi phí.
- **Giai đoạn 5**: Phân hệ Du lịch trải nghiệm (Tour & Booking).
- **Giai đoạn 6**: Phân hệ Nhân sự + PWA cho công nhân.
- **Giai đoạn 7**: Thiết bị cảm biến IoT & Bảng điều khiển tổng hợp (Dashboard).

---

### 3. Cách chạy thử
1. Khởi động môi trường:
   ```bash
   source ~/.nvm/nvm.sh && nvm use 22
   docker compose up -d
   pnpm i
   pnpm db:migrate
   pnpm db:seed
   ```
2. Kiểm tra chất lượng mã nguồn:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm test:e2e
   pnpm build
   ```
3. Chạy môi trường phát triển:
   ```bash
   pnpm dev
   ```
4. Đăng nhập tại `http://localhost:3100/login` với tài khoản `admin@xfarm.local` / `Admin@123`.

---

### 4. Các điểm còn lo ngại & Lưu ý
- Khi chạy kiểm thử API e2e, script kiểm thử tự động khởi tạo và dọn dẹp trên database `xfarm_test` nhằm không làm ảnh hưởng đến dữ liệu đang chạy của database chính `xfarm`.
- Cần đảm bảo các port (5442, 6389, 9010, 9011, 4100, 3100) không bị chiếm dụng bởi các tiến trình ngoài dự án trên máy phát triển.

---

## GĐ 1 – Sản xuất (phase-1-production) – HOÀN THÀNH

### Kiểm thử UI Playwright (P1)
```bash
pnpm db:migrate && pnpm db:seed
pnpm test:ui
```
`WEB_URL` trong `.env` quyết định địa chỉ web; cấu hình dùng Chrome hệ thống (`channel: 'chrome'`) và tự khởi động dev server nếu chưa chạy.

Bộ UI E2E hiện có 8 kịch bản, chạy tuần tự một worker. Global setup tạo storage state mới cho OWNER/MANAGER/SALES/WORKER và làm nóng các route admin trước khi test. Sau khi tạo dữ liệu, test dùng tìm kiếm hoặc API response để định vị bản ghi; danh sách API có tie-breaker `createdAt`/`id` để thứ tự ổn định khi trùng ngày.

### 1. Việc đã làm
- **Khu / Lô & Bản đồ (`Area`)**:
  - Quản lý danh mục khu/lô phân cấp cha - con (`parentId`), tự động sinh mã dạng `AR-0001`.
  - Tích hợp bản đồ trực quan bằng Leaflet và `@geoman-io/leaflet-geoman-free`, hỗ trợ xem tổng quan, vẽ và chỉnh sửa ranh giới GeoJSON (`Polygon` / `MultiPolygon`).
  - Cây phân cấp trực quan (`AreaTreeView`), tính toán tự động diện tích theo mét vuông/hecta.
  - Phân quyền: OWNER / MANAGER tạo và sửa, các vai trò khác chỉ xem.
- **Mùa vụ & Chuyển trạng thái (`Cycle`)**:
  - Quản lý mùa vụ cho 3 mảng: Trồng trọt (`CROP`), Chăn nuôi (`LIVESTOCK`), Thủy sản (`AQUA`), mã tự sinh `CY-YYYY-0001`.
  - Máy trạng thái vòng đời nghiêm ngặt: `PLANNED` → `ACTIVE` → `COMPLETED` / `CANCELLED` → `CLOSED`.
  - Ràng buộc đóng mùa vụ (`CLOSED`): kiểm tra toàn bộ hoạt động chưa hoàn thành, chỉ cho phép khi trạng thái hiện tại là `COMPLETED` hoặc `CANCELLED`. Khi mùa vụ đã `CLOSED`, chặn mọi thao tác ghi nhật ký hoặc thay đổi trạng thái (trả về mã lỗi 422).
- **Nhật ký nông trại & Timeline & Ảnh đính kèm (`Activity`)**:
  - Ghi nhận nhật ký canh tác cho từng mùa vụ: ngày thực hiện, loại công việc, người phụ trách, chi phí, vật tư, đính kèm media ảnh.
  - Chế độ xem Timeline dòng thời gian trực quan phân nhóm theo ngày kèm ảnh thumbnail, filter theo loại hoạt động, khoảng thời gian.
  - Upload ảnh thông qua presigned URL tương thích chuẩn S3, lưu metadata vào bảng `Media`.
- **Vật nuôi & Thủy sản (`Animal`, `AnimalGroup`, `AnimalEvent`)**:
  - Quản lý đàn vật nuôi / ao cá (`AnimalGroup`), mã tự sinh dạng `AG-0001`, theo dõi số lượng biến động.
  - Quản lý cá thể vật nuôi (`Animal`) theo thẻ tai/tag, giống, giới tính, trạng thái sinh trưởng.
  - Sự kiện sinh sản, phối giống, bệnh tật, tử vong, tiêm phòng (`AnimalEvent`), tự động cập nhật số lượng cá thể con và số lượng đàn.
- **Lịch nông trại (`Calendar`)**:
  - API và giao diện lịch nông vụ (`/admin/calendar`) hiển thị tổng hợp: các sự kiện bắt đầu/thu hoạch mùa vụ và các hoạt động nhật ký canh tác theo tháng.
  - Hỗ trợ lọc theo mảng (`kind`), khu/lô (`areaId`), mùa vụ (`cycleId`). Phân quyền: WORKER chỉ thấy hoạt động do mình thực hiện nhưng vẫn xem được lịch chung của mùa vụ.
- **Môi trường & Hạ tầng**:
  - **Dev server**: Thay thế `tsx watch` bằng giải pháp biên dịch tách đôi: `tsc --watch` kết hợp `node --watch dist/src/main.js` (hoặc `--import tsx`) đảm bảo bảo tồn `emitDecoratorMetadata` cho NestJS dependency injection.
  - **Lưu trữ S3**: Sử dụng `rustfs/rustfs` và `amazon/aws-cli` thay thế MinIO để đảm bảo tương thích 100% chuẩn S3 API cho presigned PUT và public read.

### 2. Cách chạy thử
1. Khởi động môi trường & seed dữ liệu mẫu:
   ```bash
   docker compose up -d
   pnpm db:migrate
   pnpm db:seed
   ```
2. Khởi chạy ứng dụng:
   ```bash
   pnpm dev
   ```
3. Đăng nhập tại `http://localhost:3110/login` (hoặc cổng slot được cấp) với tài khoản `admin@xfarm.local` / `Admin@123`.
4. Trải nghiệm các trang phân hệ tại giao diện quản trị:
   - `/admin/areas`: Danh sách khu/lô, bản đồ tổng quan, vẽ biên dạng GeoJSON, cây phân cấp.
   - `/admin/areas/[id]`: Chi tiết khu/lô, chỉnh sửa ranh giới polygon bằng Geoman editor.
   - `/admin/cycles`: Quản lý mùa vụ, tạo mới mùa vụ theo mảng, chuyển trạng thái vòng đời.
   - `/admin/cycles/[id]`: Chi tiết mùa vụ, thông tin khu/lô, danh sách đàn/vật nuôi liên kết.
   - `/admin/activities`: Nhật ký canh tác, chuyển đổi qua lại giữa chế độ Bảng và Timeline, lọc và đính kèm ảnh.
   - `/admin/animals`: Quản lý đàn và cá thể vật nuôi/ao cá, chi tiết cá thể `/admin/animals/[id]`, ghi nhận sự kiện đàn.
   - `/admin/calendar`: Lịch nông trại theo tháng, hiển thị trực quan cả mùa vụ và hoạt động.

### 3. Nghiệm thu
- **Quy trình luồng chính**: Đã kiểm tra và chạy hoàn chỉnh cho cả 3 mảng (Trồng trọt, Chăn nuôi, Thủy sản):
  - Tạo khu/lô → Khởi tạo mùa vụ gắn với khu → Ghi nhật ký hoạt động canh tác/chăm sóc kèm ảnh.
  - Khi mùa vụ ở trạng thái `CLOSED`: hệ thống từ chối mọi thao tác ghi hoạt động mới với mã phản hồi HTTP 422 Unprocessable Entity.
- **Kiểm thử tự động**:
  - `pnpm lint` (bao gồm `pnpm format:check`): 0 errors, 0 warnings.
  - `pnpm typecheck`: Không có lỗi kiểu dữ liệu ở cả 6 packages.
  - `pnpm test`: 55/55 unit/component tests trên web và shared packages đều PASS.
  - `pnpm test:e2e`: Toàn bộ 72/72 test cases e2e trên API đều PASS.
  - `pnpm --filter @xfarm/api smoke:dev`: Khởi động dev server và kiểm tra các route chính (`/users`, `/areas`, `/cycles`, `/activities`, `/animal-groups`, `/animals`, `/calendar`) đều PASS 200.

### 4. Các điểm còn lo ngại
- **Timeline chưa phân trang**: Timeline nhật ký của mùa vụ hiện tải toàn bộ hoạt động theo mùa vụ, về lâu dài khi mùa vụ có hàng nghìn hoạt động cần bổ sung infinite scroll hoặc pagination.
- **Quy tắc sinh mã chưa đồng nhất**: Mã khu/lô và đàn vật nuôi không theo năm (`AR-0001`, `AG-0001`), trong khi mã mùa vụ đánh theo năm (`CY-2026-0001`). Cần xem xét chuẩn hóa lại quy ước sinh mã số ở các giai đoạn sau nếu cần quản lý tài sản theo niên độ.
- **Kiểm tra vòng lặp cha–con của khu/lô**: Thuật toán phát hiện chu trình khi chọn khu/lô cha hiện đang duyệt từng cấp (recursive loop check), có thể xem xét tối ưu bằng CTE query trong database khi cây phân cấp sâu.

---

## GĐ 6 – Nhân sự + PWA công nhân (phase-6-hr) – HOÀN THÀNH

### 1. Việc đã làm
- **Cơ sở dữ liệu & Schema (`packages/db`)**:
  - Mô hình thực thể: `Employee`, `Task`, `Attendance`, `Payroll`, `PayrollDetail`.
  - Enums: `PayType` (`DAILY`, `MONTHLY`, `PIECE`), `TaskStatus` (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), `AttendanceStatus` (`PRESENT`, `ABSENT`, `LEAVE`, `HALF_DAY`), `PayrollStatus` (`DRAFT`, `APPROVED`, `PAID`).
  - Ràng buộc phân bổ giờ công đa mùa vụ: `unique(employeeId, date, cycleId)` trên bảng `Attendance`.
  - Khóa ngoại liên kết tài khoản hệ thống `User.employeeId`.
- **Backend API (`apps/api`)**:
  - Mô-đun **Employees** (`/employees`): Quản lý hồ sơ nhân viên, mã tự sinh dạng `EMP-0001`, tìm kiếm theo tên/mã, lọc theo phòng ban, trạng thái hoạt động và hình thức trả lương.
  - Mô-đun **Tasks** (`/tasks`): Giao việc cho nhân viên, gắn với mùa vụ và khu/lô, theo dõi tiến độ và trạng thái công việc. WORKER chỉ thấy công việc được giao cho chính mình.
  - Mô-đun **Attendance** (`/attendance`): Chấm công vào/ra ca tự động tính số giờ công (nghỉ trưa 1h nếu > 6h, làm tròn 15 phút), cho phép điều chỉnh công thủ công, hỗ trợ gắn mùa vụ để tính giá thành nhân công.
  - Mô-đun **Payroll** (`/payrolls`):
    - Tính lương hàng loạt theo kỳ (`POST /payrolls/generate`), tự động gộp giờ công theo ngày, tính ngày công chuẩn (≥ 4h tính 1 công, < 4h tính 0,5 công).
    - Phân bổ chi phí và ngày công theo mùa vụ cho cả `DAILY` và `MONTHLY`.
    - Xử lý làm tròn tiền tệ và bù số dư vào dòng cuối đảm bảo tổng tiền bảng lương khớp tuyệt đối với chi tiết.
    - Bỏ qua bảng lương đã duyệt (`APPROVED`) hoặc đã trả (`PAID`) khi tính toán lại trong cùng kỳ (DECISION-013).
    - Vòng đời: `DRAFT` → `APPROVED` (Kế toán duyệt) → `PAID` (Chủ trang trại duyệt chi trả).
    - Phát sinh sự kiện `PayrollPaidEvent` khi chi trả lương sẵn sàng cho phân hệ Tài chính (GĐ 4).
  - Mô-đun **Labor Cost** (`/cycles/:id/labor-cost`): Tổng hợp tổng chi phí nhân công và số công của mùa vụ từ các bản ghi chấm công có gắn `cycleId`.
  - Mô-đun **Sync** (`POST /sync/batch`): Tiếp nhận đồng bộ nhật ký từ PWA công nhân, kiểm tra và đảm bảo tính duy nhất qua `clientSyncId` (idempotent).
- **Frontend Quản trị Web (`apps/web` - Desktop Admin)**:
  - Trang Quản lý nhân viên `/admin/employees`: Danh sách DataTable, tìm kiếm, form thêm/sửa, liên kết tài khoản đăng nhập.
  - Trang Giao việc `/admin/tasks`: Quản lý danh sách công việc, phân công người thực hiện, lọc theo trạng thái, mùa vụ và khu/lô.
  - Trang Chấm công `/admin/attendance`: Bảng theo dõi chấm công theo ngày/tháng, điều chỉnh giờ công và mùa vụ gắn kèm.
  - Trang Bảng lương `/admin/payrolls`: Tạo kỳ lương mới, xem chi tiết bảng lương từng nhân viên, duyệt lương và thanh toán lương theo phân quyền.
- **PWA & Giao diện Mobile cho Công nhân (`/admin/m`)**:
  - Tích hợp Serwist (`@serwist/next`), Service Worker (`/sw.js`) và Web App Manifest (`/manifest.webmanifest`) cài đặt được trên thiết bị di động (PWA Installable).
  - Giao diện mobile-first tối ưu màn hình cảm ứng, bottom tab bar tiện lợi:
    - `/admin/m`: Việc hôm nay của công nhân, chuyển trạng thái và hoàn thành việc.
    - `/admin/m/checkin`: Chấm công vào ca / ra ca nhanh bằng một chạm.
    - `/admin/m/qr`: Quét mã QR khu/lô với cơ chế quét kép (BarcodeDetector phần cứng + ZXing fallback) và nhập mã thủ công.
    - `/admin/m/activities`: Ghi nhật ký nông trại nhanh.
  - Cơ chế ngoại tuyến (Offline Queue) bằng IndexedDB:
    - Cho phép công nhân tiếp tục ghi nhật ký khi ở ngoài đồng không có sóng di động/mạng.
    - Tự động nhận diện mạng online trở lại và gửi đồng bộ qua `POST /sync/batch`.
    - Không phát sinh dữ liệu trùng lặp khi đồng bộ nhiều lần hoặc reload trang.

### 2. Cách chạy thử
1. Chạy di chuyển schema và dữ liệu mẫu:
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```
2. Khởi chạy ứng dụng:
   ```bash
   pnpm dev
   ```
3. Đăng nhập kiểm tra:
   - Quản trị viên/Kế toán: Truy cập `http://localhost:3100/login` với tài khoản `admin@xfarm.local` hoặc `accountant@xfarm.local`.
   - Công nhân: Truy cập `http://localhost:3100/login` với tài khoản `worker@xfarm.local` / `Worker@123`, tự động chuyển hướng vào PWA `/admin/m`.
4. Trải nghiệm các tính năng GĐ 6:
   - `/admin/employees`: Hồ sơ nhân sự và hình thức trả lương.
   - `/admin/tasks`: Giao việc và theo dõi tiến độ công việc.
   - `/admin/attendance`: Chấm công và điều chỉnh ngày công.
   - `/admin/payrolls`: Tính toán, phê duyệt và thanh toán lương.
   - `/admin/m`: Trải nghiệm PWA công nhân, kiểm tra offline mode bằng cách bật DevTools Offline và ghi nhật ký.

### 3. Nghiệm thu
- **Kịch bản nghiệm thu GĐ 6 (`e2e/phase6-acceptance.spec.ts`)**:
  - Tiêu chí (a): WORKER trên PWA hoạt động offline, ghi 2 nhật ký vào IndexedDB queue, khi bật mạng lại tự động đồng bộ lên máy chủ, đếm qua API đúng 2 bản ghi và không bị trùng lặp khi reload: **PASS**.
  - Tiêu chí (b): Chấm công 3 ngày (tổng 24 giờ), chạy tính lương kỳ hiện tại thì bảng lương khớp chính xác tổng số giờ và ngày công: **PASS**.
  - Tiêu chí (c): Chi phí công mùa vụ (`/cycles/:id/labor-cost`) khớp chính xác với tổng chấm công có gắn mã mùa vụ đó: **PASS**.
- **Kiểm tra PWA cài đặt được (`e2e/pwa.spec.ts`)**:
  - Manifest (`/manifest.webmanifest`): Trả về HTTP 200, đầy đủ `name`, `short_name`, `start_url`, `display: standalone`, icon 192x192 và 512x512.
  - Icon files: `/icons/icon-192.png` và `/icons/icon-512.png` đều trả về HTTP 200 (image/png).
  - Service Worker: `/sw.js` trả về HTTP 200 và đăng ký `active` thành công trên trình duyệt.
- **Kiểm thử tự động**:
  - `pnpm lint`: Đạt chuẩn lint và prettier format trên toàn bộ monorepo (0 lỗi).
  - `pnpm typecheck`: Đạt chuẩn kiểu dữ liệu TypeScript 100% trên toàn bộ packages.
  - `pnpm test`: 175/175 tests unit/component đều PASS.
  - `pnpm --filter @xfarm/api test:e2e`: 155/155 tests e2e API đều PASS.
  - `pnpm --filter @xfarm/api smoke:dev`: Toàn bộ 18 endpoints API chính khởi chạy và trả về 200 OK.
  - `pnpm test:ui`: Toàn bộ các bộ test Playwright E2E đều đạt khi chạy đơn lẻ.

### 4. Các điểm còn lo ngại & Lưu ý
- **Giới hạn inotify trên môi trường Linux**: Khi chạy đồng thời nhiều watcher trong monorepo lớn, hệ thống có thể chạm ngưỡng inotify instances (`max_user_instances`). Giải pháp thiết lập `WATCHPACK_POLLING=true` giúp Next.js dev server chạy ổn định và mượt mà mà không phụ thuộc vào inotify handle.
- **Tích hợp sổ quỹ GĐ 4**: Sự kiện `PayrollPaidEvent` đã được phát ra từ module payroll; khi triển khai GĐ 4 phân hệ Tài chính chỉ cần thêm listener để tự động hạch toán bút toán chi tiền.
