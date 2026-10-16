# Task: phase-0 – Nền tảng (GĐ 0)

Đọc trước: `AGENTS.md`, `docs/PLAN.md` (đặc biệt mục 2–5 và "GĐ 0").
Khi xong tạo `docs/tasks/phase-0.DONE`. Nếu bị chặn thì tạo `docs/tasks/phase-0.BLOCKED`.

## Git
1. `git init -b main`. Tạo `.gitignore` (node_modules, .env, dist, .next, .turbo, coverage…).
2. Commit các file đang có (`AGENTS.md`, `GEMINI.md`, `docs/`) lên `main` với message `chore: initial docs`.
3. Tạo nhánh `phase-0-foundation`. Mọi việc còn lại làm trên nhánh này, **không merge vào main**.

## Môi trường (bắt buộc)
- Đầu **mỗi** lệnh shell dùng Node phải chạy `source ~/.nvm/nvm.sh && nvm use 22`. Node 22.21.1 đã được cài sẵn.
- pnpm 9: `corepack enable && corepack prepare pnpm@9 --activate`. Khai báo thêm `"packageManager"` trong `package.json` gốc.
- **Cổng mặc định trên máy đã bị dịch vụ khác chiếm**, nên dùng đúng các cổng sau, cấu hình qua `.env`:

| Dịch vụ | Cổng host |
|---|---|
| Web Next.js | 3100 |
| API NestJS | 4100 |
| Postgres | 5442 |
| Redis | 6389 |
| MinIO API | 9010 |
| MinIO Console | 9011 |

- Đặt `name: xfarm` trong docker-compose và đặt tên volume riêng, để không đụng vào các container sẵn có trên máy.
- **Không dừng, không xóa** container hoặc volume nào không thuộc dự án xfarm.

## Việc cần làm
Làm đủ mục "GĐ 0" trong PLAN.md. Dưới đây là phần làm rõ thêm:

1. **Monorepo**
   - `pnpm-workspace.yaml`, `turbo.json`.
   - `packages/config`: tsconfig base, eslint flat config, prettier.
   - Các script ở gốc: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `db:migrate`, `db:seed`, `db:studio`, `db:reset`.
2. **docker-compose**: postgres:16, redis:7, minio, cùng một service `createbuckets` (dùng `minio/mc`) để tạo bucket `xfarm-media`.
3. **packages/db**
   - Prisma schema chỉ gồm phần **Hệ thống**: `User`, `RefreshToken`, `Sequence`, `Media`, `AuditLog`, enum `Role`.
   - Đúng quy ước mục 5 của PLAN: id dùng cuid, có `createdAt`/`updatedAt`.
   - Export một singleton `prisma`.
   - `seed.ts` tạo user OWNER `admin@xfarm.local` / `Admin@123` và mỗi vai trò còn lại một user (`manager@`, `accountant@`, `sales@`, `worker@xfarm.local`, cùng mật khẩu). Seed chạy nhiều lần không bị lỗi (dùng upsert).
4. **packages/shared**
   - zod schema cho login, tạo/sửa user, query phân trang.
   - Enum `Role` và type `Paginated<T>`.
5. **apps/api** (NestJS 11, prefix `/api/v1`)
   - **Auth**:
     - `POST /auth/login` set 2 cookie httpOnly: `access_token` (15 phút) và `refresh_token` (7 ngày, path `/api/v1/auth`).
     - `POST /auth/refresh` có rotation: refresh token cũ bị revoke. Nếu một token đã revoke bị dùng lại thì revoke toàn bộ token của user đó.
     - `POST /auth/logout`, `GET /auth/me`.
     - Refresh token chỉ lưu dạng **hash** (sha256) trong DB.
     - User có `isActive=false` thì không login và không refresh được.
   - Guard JWT global, decorator `@Public()` để bỏ qua guard, `@Roles()` + RolesGuard, `@CurrentUser()`.
   - **Users** CRUD (chỉ OWNER): list có phân trang và tìm kiếm, create, update, khóa/mở khóa (`PATCH /users/:id/status`). Response **không bao giờ** chứa `passwordHash`.
   - **Media**: `POST /media/presign` (kiểm tra mime ảnh/pdf, giới hạn 10MB, trả về presigned PUT URL) và `POST /media` (lưu bản ghi Media sau khi upload xong).
   - Các phần chung:
     - `SequenceService.next(key)` trả mã dạng `KEY-YYYY-0001`, tăng số trong transaction.
     - Global exception filter trả về `{statusCode, message, errors?}`. ZodError chuyển thành 400 kèm `errors`.
     - AuditLog interceptor ghi lại các request POST/PATCH/PUT/DELETE thành công.
     - Swagger tại `/docs`.
     - CORS chỉ cho phép `WEB_URL`, có `credentials`.
     - Dùng helmet và rate limit cho `/auth/login` (`@nestjs/throttler`).
   - Config đọc từ env và **validate env bằng zod** khi khởi động.
6. **apps/web** (Next.js 15, App Router, Tailwind 4, shadcn/ui)
   - Biến môi trường `NEXT_PUBLIC_API_URL=http://localhost:4100/api/v1`.
   - `/login`: form dùng react-hook-form với schema zod từ `packages/shared`.
   - `middleware.ts`: chưa có cookie `access_token` hoặc `refresh_token` thì chuyển về `/login`. Nếu API và web chạy khác cổng, cookie phải gửi kèm được (dùng `sameSite: 'lax'`, domain là localhost).
   - `lib/api.ts`: fetch kèm `credentials: 'include'`. Khi nhận 401 thì gọi refresh một lần, rồi thử lại request.
   - Layout `/admin`:
     - Sidebar hiển thị đủ các phân hệ trong PLAN. Mục chưa làm thì mờ đi, gắn badge "Sắp có".
     - Header có tên user, vai trò, nút đăng xuất.
     - Sidebar thu gọn được trên mobile.
   - `/admin` là trang chào mừng. `/admin/users` gồm DataTable (phân trang phía server, ô tìm kiếm), FormDialog tạo/sửa user và nút khóa/mở khóa.
   - Toàn bộ chữ trên giao diện viết bằng tiếng Việt.
7. **packages/ui**: `DataTable` (dùng TanStack Table, phân trang phía server), `FormDialog`, `PageHeader`, `StatusBadge`, `ConfirmDialog`, cùng các component shadcn cần dùng.
8. **Docs**
   - `README.md`: hướng dẫn chạy từ đầu.
   - `.env.example` đầy đủ biến.
   - `docs/PROGRESS.md` và `docs/DECISIONS.md`.

## Test (bắt buộc)
- API e2e (Jest + supertest) chạy trên **database test riêng** `xfarm_test`, cùng container Postgres. Test phải tự migrate hoặc reset DB trước khi chạy. Các case cần có:
  - login đúng (có cookie) và login sai (401);
  - `/auth/me` khi có và không có token;
  - refresh hoạt động; dùng lại refresh token cũ thì nhận 401;
  - user bị khóa không login được;
  - WORKER gọi `GET /users` nhận 403; OWNER tạo user được, response không có `passwordHash`;
  - `SequenceService` sinh mã tăng dần.
- Web: ít nhất 1 test Vitest cho `lib/api.ts` (logic refresh rồi thử lại).

## Nghiệm thu
Chạy các lệnh sau và dán kết quả tóm tắt vào file `.DONE`:
```
docker compose up -d
pnpm i
pnpm db:migrate && pnpm db:seed
pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e
pnpm build
```
Sau đó chạy `pnpm dev` và kiểm tra bằng curl:
- login lấy cookie, gọi `/auth/me` thành công;
- `http://localhost:3100/login` trả về 200.

Kiểm tra xong thì **tắt dev server**. Để các container docker chạy tiếp.
