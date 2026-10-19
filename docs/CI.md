# Hướng dẫn Chạy CI và Kiểm thử Tương đương ở Local

Tài liệu này mô tả kiến trúc quy trình CI (Continuous Integration) trên GitHub Actions của hệ thống XFarm và hướng dẫn chi tiết cách chạy kiểm tra tương đương trên môi trường máy phát triển (local).

---

## 1. Kiến trúc Quy trình CI trên GitHub Actions

File cấu hình workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

### Điều kiện kích hoạt (Trigger)
- Mọi thao tác `push` vào nhánh `main`.
- Mọi `pull_request` nhắm tới nhánh `main`.

### Cấu hình môi trường CI
- **Hệ điều hành**: `ubuntu-latest`.
- **Runtime**: Node.js `22` LTS.
- **Package Manager**: pnpm `9` (quản lý qua `corepack`).
- **Cache**: Tự động cache pnpm store (`pnpm store path`) theo hash của `pnpm-lock.yaml`.
- **Dịch vụ hỗ trợ (Services)**:
  - `postgres:16` (cổng 5432, cơ sở dữ liệu `xfarm_test`, kiểm tra sức khỏe qua `pg_isready`).
  - `redis:7` (cổng 6379, kiểm tra sức khỏe qua `redis-cli ping`).
- **Biến môi trường**: Cấu hình công khai trực tiếp qua `env:` trong workflow (không dùng secret thật cho môi trường test/CI).

### Các Job trong CI

1. **Job `test` (Lint, Test & Build)**:
   - `pnpm install --frozen-lockfile`: Cài đặt dependencies chính xác theo lockfile.
   - `pnpm lint`: Kiểm tra định dạng Prettier (`format:check`) và ESLint toàn bộ monorepo.
   - `pnpm typecheck`: Kiểm tra kiểu TypeScript với `tsc --noEmit`.
   - `pnpm turbo run test`: Chạy unit tests cho tất cả packages và apps (Jest cho backend/shared, Vitest cho web).
   - `pnpm --filter @xfarm/db exec prisma migrate deploy`: Áp dụng tất cả migrations Prisma vào DB test mà không reset DB.
   - `pnpm --filter @xfarm/api test:e2e`: Chạy toàn bộ integration & e2e test suite của API NestJS (17 suites).
   - `pnpm --filter @xfarm/web build`: Build ứng dụng Next.js 15 App Router.

2. **Job `e2e-ui` (Playwright UI Tests)**:
   - Dựng sẵn service `postgres:16` và `redis:7`.
   - `pnpm install --frozen-lockfile`.
   - `pnpm --filter @xfarm/db exec prisma migrate deploy`: Áp migration DB test.
   - `pnpm db:seed`: Nạp dữ liệu mẫu (các tài khoản `admin@xfarm.local`, `manager@xfarm.local`, `worker@xfarm.local`, danh mục hàng, khu vực, ...).
   - `pnpm --filter @xfarm/web exec playwright install --with-deps chromium`: Cài đặt trình duyệt Chromium và các thư viện hệ thống cần thiết.
   - `pnpm test:ui --reporter=list,html`: Chạy toàn bộ test E2E giao diện Playwright (tự động khởi động dev API và Web qua webServer).
   - `actions/upload-artifact@v4`: Tự động thu thập và upload thư mục `playwright-report` khi có test thất bại (`if: failure()`).

---

## 2. Chuẩn bị Môi trường ở Local

### Yêu cầu phần mềm
- **Node.js**: Phiên bản 22 LTS.
  ```bash
  source ~/.nvm/nvm.sh && nvm use 22
  ```
- **pnpm**: Phiên bản 9.
  ```bash
  corepack enable && corepack prepare pnpm@9 --activate
  ```
- **Docker & Docker Compose**: Để chạy PostgreSQL và Redis.

### Cấu hình biến môi trường
Sao chép `.env.example` thành `.env` (nếu chưa có):
```bash
cp .env.example .env
```

Các biến môi trường chuẩn phục vụ kiểm thử:
```env
# Database
DATABASE_URL=postgresql://xfarm:xfarm_secret@localhost:5442/xfarm?schema=public
DATABASE_URL_TEST=postgresql://xfarm:xfarm_secret@localhost:5442/xfarm_test?schema=public

# Redis
REDIS_URL=redis://localhost:6389

# JWT
JWT_SECRET=super-secret-jwt-key-change-in-production-32chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# App Ports
API_PORT=4100
WEB_URL=http://localhost:3100
NEXT_PUBLIC_SITE_URL=http://localhost:3100
NEXT_PUBLIC_API_URL=http://localhost:4100/api/v1

# MinIO / Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9010
MINIO_ACCESS_KEY=xfarm_minio
MINIO_SECRET_KEY=xfarm_minio_secret
MINIO_BUCKET=xfarm-media
MINIO_USE_SSL=false
```

---

## 3. Các Bước Chạy Kiểm tra Tương Đương ở Local

### Bước 1: Khởi động các container phụ trợ
Khởi động PostgreSQL và Redis bằng Docker Compose:
```bash
docker compose up -d postgres redis
```
Kiểm tra container đang chạy:
```bash
docker compose ps
```

### Bước 2: Cài đặt dependencies
Cài đặt gói đúng phiên bản đóng băng trong lockfile:
```bash
pnpm install --frozen-lockfile
```

### Bước 3: Kiểm tra Lint và Format
Chạy Prettier format check và ESLint cho tất cả package/app:
```bash
pnpm lint
```
*(Nếu muốn tự động sửa định dạng: `pnpm format`)*

### Bước 4: Kiểm tra kiểu dữ liệu (Typecheck)
Kiểm tra tính hợp lệ TypeScript toàn bộ repo:
```bash
pnpm typecheck
```

### Bước 5: Chạy Unit Tests
Chạy kiểm thử đơn vị với Turborepo:
```bash
pnpm turbo run test
```
*(Hoặc dùng lệnh rút gọn: `pnpm test`)*

### Bước 6: Cập nhật Schema DB cho môi trường Test
Triển khai các migration chưa chạy vào cơ sở dữ liệu test:
```bash
pnpm --filter @xfarm/db exec prisma migrate deploy
```
*(Lưu ý: Không dùng `prisma migrate reset` để tránh làm mất dữ liệu hoặc xung đột slot)*

### Bước 7: Chạy API E2E Tests
Chạy bộ kiểm thử tích hợp API:
```bash
pnpm --filter @xfarm/api test:e2e
```
Để chạy một file kiểm thử cụ thể (ví dụ `catalog.e2e-spec.ts`):
```bash
pnpm --filter @xfarm/api test:e2e test/catalog.e2e-spec.ts
```

### Bước 8: Kiểm tra Build ứng dụng Web
Build thử frontend Next.js để phát hiện lỗi SSR, dynamic import hoặc route:
```bash
pnpm --filter @xfarm/web build
```

### Bước 9: Chạy Playwright E2E UI Tests
1. **Cài đặt Chromium và dependencies** (chỉ cần chạy một lần đầu):
   ```bash
   pnpm --filter @xfarm/web exec playwright install --with-deps chromium
   ```

2. **Nạp dữ liệu mẫu (Seed)** vào cơ sở dữ liệu để có tài khoản đăng nhập:
   ```bash
   pnpm db:seed
   ```

3. **Chạy test Playwright**:
   ```bash
   pnpm test:ui
   ```
   Hoặc chạy và sinh báo cáo HTML:
   ```bash
   pnpm test:ui --reporter=list,html
   ```

4. **Xem báo cáo trực quan** (nếu có test fail):
   ```bash
   pnpm --filter @xfarm/web exec playwright show-report
   ```

---

## 4. Lệnh Kiểm tra Nhanh Toàn Bộ (All-in-One One-Liner)

Trước khi commit hoặc mở Pull Request, có thể chạy chuỗi lệnh sau để đảm bảo mọi bước CI đều pass:

```bash
pnpm lint && \
pnpm typecheck && \
pnpm turbo run test && \
pnpm --filter @xfarm/db exec prisma migrate deploy && \
pnpm --filter @xfarm/api test:e2e && \
pnpm --filter @xfarm/web build
```

---

## 5. Xử lý Lỗi Thường Gặp (Troubleshooting)

- **Lỗi `The table public.xxx does not exist in the current database`**:
  Chạy lệnh `pnpm --filter @xfarm/db exec prisma migrate deploy` để áp dụng các file migration mới nhất vào DB test.
- **Lỗi `Đăng nhập e2e cho OWNER thất bại` trong Playwright**:
  Cơ sở dữ liệu chưa có tài khoản admin. Hãy chạy `pnpm db:seed` để khởi tạo người dùng mặc định (`Admin@123`).
- **Lỗi `playwright: not found`**:
  Playwright được cài đặt trong workspace `@xfarm/web`. Luôn gọi qua `pnpm --filter @xfarm/web exec playwright ...` hoặc chạy lệnh `pnpm test:ui`.
- **Lỗi xung đột cổng (EADDRINUSE)**:
  Kiểm tra các tiến trình đang chiếm cổng (ví dụ 4100, 3100) bằng `ss -ltnp | grep -E '4100|3100'` và tắt các tiến trình dev cũ trước khi chạy lại.
