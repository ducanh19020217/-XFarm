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

## 5. Dữ liệu demo (Demo Content & Catalog)

Hệ thống cung cấp kịch bản nạp nội dung và danh mục demo sinh động (`pnpm db:seed:content`):

- **Bộ hình ảnh SVG minh họa**: ~32 file SVG phong cách phẳng đặt tại `apps/web/public/demo/*.svg` (< 30 KB/file, có `<title>`), được đăng ký vào bảng `Media` trỏ URL `/demo/<file>.svg`.
- **Bản đồ 23 khu vực**: Tọa độ GeoJSON Polygon thực tế, chuẩn xác tại Lâm Đồng (11.94°N, 108.44°E), không chồng lấn, phủ đủ 4 nhóm phân hệ (Trồng trọt, Chăn nuôi, Thủy sản, Dịch vụ/Cảnh quan/Hạ tầng).
- **Danh mục 42 vật tư**: Thuộc 4 kho (`KHO-TT`, `KHO-CN`, `KHO-TS`, `KHO-CHUNG`), có định mức dự trữ tối thiểu (`minStock`).
- **20 sản phẩm bán lẻ webshop**: Đầy đủ phân loại, đơn vị tính, giá bán, mô tả HTML trực quan và ảnh minh họa SVG.
- **12 bài viết Blog**: Trải dài 12 tháng qua 4 chuyên mục (Kỹ thuật canh tác, Đời sống nông trại, Ẩm thực sạch, Cẩm nang trải nghiệm).
- **Trang tĩnh & Cấu hình Farm**: Giới thiệu (`/gioi-thieu`), Chính sách giao hàng (`/chinh-sach-giao-hang`), Liên hệ (`/lien-he`), cùng 3 banner trình chiếu và thông tin `SiteSetting`.
- **6 tour trải nghiệm**: Đi kèm đầy đủ các suất tour (TourSlot) cố định vào các ngày thứ Bảy, Chủ Nhật trong 8 tuần tiếp theo.
- **Dữ liệu đối tác & nhân sự**: 60 khách hàng Việt Nam giả lập hợp lệ, 15 nhân viên đa dạng chức vụ và hình thức trả lương (`MONTHLY`, `DAILY`, `HOURLY`), 10 nhà cung cấp uy tín.
- **Chăn nuôi & Thiết bị & IoT**: 4 đàn vật nuôi, 20 cá thể có thẻ tai/RFID và ghi nhận phả hệ mẹ, 15 máy móc thiết bị kèm lịch bảo trì định kỳ, 12 cảm biến IoT cùng bộ quy tắc cảnh báo (AlertRule).

### Các lệnh quản trị dữ liệu demo

```bash
# Nạp dữ liệu nền tảng ban đầu (tài khoản, quyền, cấu hình gốc)
pnpm db:seed

# Nạp dữ liệu nội dung & danh mục demo sinh động (idempotent upsert)
pnpm db:seed:content

# Xóa riêng toàn bộ dữ liệu demo (không ảnh hưởng tới dữ liệu gốc hay người dùng thật)
pnpm db:seed:content --reset-content
```
