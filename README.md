# XFarm – Hệ thống Quản lý (ERP) & Quảng bá Nông trại Sinh thái

Dự án ERP tích hợp đa phân hệ cho một nông trại duy nhất với 4 mảng: Trồng trọt, Chăn nuôi, Thủy sản và Du lịch trải nghiệm.

## 1. Yêu cầu hệ thống

- **Node.js**: v22 LTS (khuyến nghị chạy `source ~/.nvm/nvm.sh && nvm use 22`).
- **pnpm**: v9 (`corepack enable && corepack prepare pnpm@9 --activate`).
- **Docker** & **Docker Compose**.

## 2. Cổng dịch vụ (Tránh xung đột môi trường máy chủ)

| Dịch vụ          | Cổng Host | Ghi chú                          |
| ---------------- | --------- | -------------------------------- |
| Web (Next.js 15) | 3100      | `http://localhost:3100`          |
| API (NestJS 11)  | 4100      | `http://localhost:4100/api/v1`   |
| Swagger Docs     | 4100      | `http://localhost:4100/docs`     |
| PostgreSQL 16    | 5442      | Database `xfarm` và `xfarm_test` |
| Redis 7          | 6389      | Cache & BullMQ                   |
| MinIO API        | 9010      | S3-compatible Object Storage     |
| MinIO Console    | 9011      | Quản trị giao diện MinIO         |

## 3. Hướng dẫn khởi chạy từ đầu

### Bước 1: Sao chép tệp môi trường

```bash
cp .env.example .env
```

### Bước 2: Khởi động các container Docker

```bash
docker compose up -d
```

Lệnh này khởi động PostgreSQL, Redis, MinIO và tự động tạo bucket `xfarm-media`.

### Bước 3: Cài đặt các gói phụ thuộc

```bash
pnpm i
```

### Bước 4: Tạo cấu trúc dữ liệu và nạp dữ liệu mẫu

```bash
pnpm db:migrate
pnpm db:seed
# Nạp dữ liệu demo xác định cho 12 tháng gần nhất (có thể chạy lặp lại)
pnpm db:seed:demo
# Xóa riêng dữ liệu demo rồi tạo lại
pnpm --filter @xfarm/db exec dotenv -e ../../.env -- tsx prisma/seed-demo.ts --reset-demo
```

`db:seed:demo` tạo khoảng 4.000 đơn bán (có mùa vụ cao điểm, hủy, công nợ gần đây), 72 mùa vụ với nhật ký/vật tư/thu hoạch, 15 nhân viên chấm công và tính lương theo tháng, khoảng 400 booking tour cuối tuần và 12 cảm biến. Reading cảm biến được ghi mỗi 15 phút trong 30 ngày gần nhất và mỗi 2 giờ cho 11 tháng trước đó. Dữ liệu có tiền tố `DEMO-`, chạy lại không nhân đôi và không thay đổi seed nền.

### Bước 5: Chạy kiểm thử chất lượng và build

```bash
# Kiểm tra lint, typecheck và chạy unit/e2e tests
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

### Bước 6: Chạy chế độ phát triển (Development)

```bash
pnpm dev
```

Truy cập:

- Giao diện người dùng: [http://localhost:3100/login](http://localhost:3100/login)
- Tài liệu API (Swagger): [http://localhost:4100/docs](http://localhost:4100/docs)

## 4. Tài khoản đăng nhập mẫu

Hệ thống được seed sẵn các tài khoản sau (cùng mật khẩu `Admin@123`):

- **Chủ trại (OWNER)**: `admin@xfarm.local`
- **Quản lý (MANAGER)**: `manager@xfarm.local`
- **Kế toán (ACCOUNTANT)**: `accountant@xfarm.local`
- **Bán hàng (SALES)**: `sales@xfarm.local`
- **Công nhân (WORKER)**: `worker@xfarm.local`
