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
