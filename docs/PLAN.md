# XFarm – Kế hoạch triển khai (dành cho agent thực thi)

> Tài liệu này giao cho AI agent (Antigravity) thực hiện, sau đó Claude sẽ review.
> Agent **làm đúng theo kế hoạch**. Nếu buộc phải làm khác, ghi rõ lý do vào `docs/DECISIONS.md`.

## 1. Bối cảnh
- Hệ thống web vừa **quản lý (ERP)** vừa **quảng bá** cho **một nông trại duy nhất**, không làm multi-tenant.
- Nông trại có 4 mảng: **trồng trọt, chăn nuôi, thủy sản, du lịch trải nghiệm**.
- Làm đủ tất cả phân hệ, chia thành 8 giai đoạn (GĐ 0–7). Mỗi giai đoạn phải chạy được trọn vẹn.
- Thư mục dự án `/home/ducanh/Desktop/XFarm` hiện đang trống.
- Giao diện hiển thị **tiếng Việt**. Code, tên bảng, tên biến viết **tiếng Anh**.

## 2. Quy tắc bắt buộc cho agent
1. Chạy `git init` ngay đầu GĐ 0. **Mỗi giai đoạn làm trên một nhánh riêng** (`phase-0-foundation`, `phase-1-production`, …), commit nhỏ, message theo Conventional Commits. Xong giai đoạn thì **dừng lại để review**, chưa merge.
2. Không đổi stack hay phiên bản ở mục 3. Không thêm thư viện lớn ngoài danh sách khi chưa ghi lý do vào `docs/DECISIONS.md`.
3. Cuối mỗi giai đoạn, ba lệnh `pnpm lint`, `pnpm typecheck`, `pnpm test` phải chạy không lỗi.
4. Cập nhật `docs/PROGRESS.md` sau mỗi giai đoạn, gồm: việc đã làm, việc chưa làm, cách chạy thử, các điểm còn lo ngại.
5. Không commit secret. Mọi cấu hình đặt trong `.env`, kèm file mẫu `.env.example`.
6. Mọi thao tác ghi đụng tới nhiều bảng (trừ kho, thu hoạch, đơn hàng…) phải nằm trong **một transaction Prisma** (`prisma.$transaction`).

## 3. Stack và phiên bản
| Thành phần | Lựa chọn |
|---|---|
| Runtime / quản lý gói | Node 22 LTS, pnpm 9, Turborepo |
| Backend | NestJS 11, Prisma 6, PostgreSQL 16, Redis 7 (cache + BullMQ), Swagger (`@nestjs/swagger`) |
| Validate | zod (schema dùng chung), `nestjs-zod` |
| Auth | JWT: access token 15 phút + refresh token 7 ngày, lưu trong httpOnly cookie. Mật khẩu băm bằng argon2 |
| Frontend | Next.js 15 (App Router, TS), Tailwind CSS 4, shadcn/ui, TanStack Query, TanStack Table, react-hook-form, Recharts, Leaflet (react-leaflet), next-pwa (Serwist) |
| Lưu file | MinIO (tương thích S3), upload qua presigned URL |
| Test | Jest + supertest (API e2e), Vitest (web), Playwright (luồng chính, từ GĐ 3) |
| Hạ tầng dev | docker-compose: postgres, redis, minio |

## 4. Cấu trúc thư mục
```
XFarm/
├── apps/
│   ├── api/                      NestJS, cổng 4000
│   │   └── src/
│   │       ├── common/           guards, decorators (@Roles, @CurrentUser), filters, pagination, sequence
│   │       ├── modules/<name>/   <name>.module.ts, .controller.ts, .service.ts, dto/
│   │       └── main.ts
│   └── web/                      Next.js, cổng 3000
│       └── app/
│           ├── (public)/         trang chủ, gioi-thieu, san-pham, blog, tour, gio-hang, trace/[code]
│           ├── admin/            ERP (đã đăng nhập), mỗi phân hệ một thư mục
│           ├── admin/m/          giao diện mobile/PWA cho công nhân (GĐ 6)
│           └── login/
├── packages/
│   ├── db/        prisma/schema.prisma, migrations, seed.ts, export PrismaClient
│   ├── shared/    zod schemas + enums + types (api và web cùng import)
│   ├── ui/        component shadcn dùng chung: DataTable, FormDialog, PageHeader, StatusBadge, MoneyInput…
│   └── config/    eslint, tsconfig, prettier dùng chung
├── docs/          PROGRESS.md, DECISIONS.md, API.md
├── docker-compose.yml
└── .env.example
```

## 5. Quy ước chung
- **Tiền**: `Decimal(18,2)`, đơn vị VND. **Số lượng**: `Decimal(18,3)`. Ở frontend hiển thị bằng `Intl.NumberFormat('vi-VN')`.
- **Thời gian**: lưu UTC, hiển thị theo `Asia/Ho_Chi_Minh`.
- **Trường chung của mọi bảng nghiệp vụ**: `id` (cuid), `createdAt`, `updatedAt`, `createdById?`. Dữ liệu danh mục dùng cờ `isActive`, không xóa cứng.
- **Mã chứng từ** (`PO-2026-0001`, `SO-…`, `HL-…`, `BK-…`): sinh từ bảng `Sequence { key, year, current }`, tăng giá trị trong transaction.
- **API**:
  - REST, prefix `/api/v1`.
  - Danh sách hỗ trợ `?page&pageSize&search&sort`, trả về `{ data, total, page, pageSize }`.
  - Lỗi trả về `{ statusCode, message, errors? }`.
  - Endpoint public (không cần đăng nhập) đặt dưới `/api/v1/public/*`.
- **RBAC**: các vai trò `OWNER`, `MANAGER`, `ACCOUNTANT`, `SALES`, `WORKER`. Dùng `@Roles()` ở controller. `WORKER` chỉ được xem việc được giao và ghi nhật ký.
- **Frontend admin**: mỗi phân hệ gồm `page.tsx` (danh sách dùng DataTable), `[id]/page.tsx` (chi tiết) và form trong FormDialog hoặc trang `new`. Gọi API qua một client chung `lib/api.ts` (fetch kèm `credentials: 'include'`, tự refresh token khi nhận 401).
- **Frontend public**: dùng Server Components, fetch `/public/*` với `revalidate`. Có metadata SEO, OpenGraph, `sitemap.ts`, `robots.ts`.

## 6. Mô hình dữ liệu (Prisma)
Đây là các trường tối thiểu. Agent được thêm trường phụ nếu cần, nhưng **không đổi tên các thực thể**.

**Hệ thống**
- `User { email, passwordHash, fullName, phone?, role: Role, isActive, employeeId? }`
- `RefreshToken { userId, tokenHash, expiresAt, revokedAt? }`
- `Sequence`, `Media { url, key, mime, size, alt? }`
- `AuditLog { userId, action, entity, entityId, diff Json }`

**Sản xuất**
- `Area { code, name, type: AreaType(ZONE|FIELD|GREENHOUSE|BARN|POND|VISITOR_ZONE|WAREHOUSE_ZONE), parentId?, areaM2?, geojson Json?, description?, isActive }`
- `Cycle { code, name, kind: CycleKind(CROP|LIVESTOCK|AQUA), areaId, species, variety?, startDate, expectedEndDate?, endDate?, status(PLANNED|ACTIVE|HARVESTING|CLOSED|CANCELLED), expectedYield?, yieldUnit?, initialQuantity?, notes? }`
- `Activity { cycleId?, areaId, type: ActivityType, performedAt, performedById?, quantity?, unit?, data Json?, notes?, mediaIds[] }`
  - `ActivityType` gồm: SOWING, PLANTING, FERTILIZING, SPRAYING, IRRIGATION, PRUNING, WEEDING, FEEDING, VACCINATION, TREATMENT, WATER_TEST, STOCKING, MORTALITY, WEIGHING, HARVEST, CLEANING, OTHER.
  - `data` chứa chỉ số riêng theo loại, ví dụ WATER_TEST lưu `{pH, DO, temp, salinity, NH3}`, WEIGHING lưu `{avgWeightKg, sampleSize}`.
- `ActivityMaterial { activityId, itemId, stockLotId?, quantity, unitCost }`: mỗi dòng sinh ra một StockMove OUT.
- `AnimalGroup { code, cycleId, species, breed?, headCount, areaId }`
- `Animal { tag, groupId?, species, breed?, sex, birthDate?, status(ALIVE|SOLD|DEAD), motherId? }`
- `AnimalEvent { animalId, type(VACCINATION|TREATMENT|BREEDING|BIRTH|WEIGHING|DEATH|SALE), date, data Json, notes? }`

**Kho**
- `Item { sku, name, category: ItemCategory(SEED|FERTILIZER|PESTICIDE|FEED|VETERINARY|TOOL|PACKAGING|PRODUCE|LIVESTOCK_PRODUCT|AQUA_PRODUCT|OTHER), unit, minStock?, isSellable, isActive }`
- `Warehouse { code, name, areaId? }`
- `StockLot { itemId, lotCode, expiryDate?, harvestLotId?, unitCost }`
- `StockMove { type(IN|OUT|TRANSFER|ADJUST), itemId, stockLotId?, fromWarehouseId?, toWarehouseId?, quantity (luôn dương), unitCost, refType?, refId?, movedAt, notes? }`
- Tồn kho là **view hoặc truy vấn tổng hợp** từ StockMove theo (item, lot, warehouse). Không lưu số tồn ở cột riêng. Không cho phép xuất quá số tồn, trả lỗi 422.

**Thu hoạch và truy xuất**
- `HarvestLot { code, traceCode (nanoid 10 ký tự, unique), cycleId, activityId, itemId, quantity, unit, harvestedAt, warehouseId, qualityGrade?, certification?, isPublic }`
- Khi tạo một Activity loại HARVEST, transaction phải tạo cùng lúc: HarvestLot, StockLot (liên kết `harvestLotId`), và StockMove IN.

**Mua hàng**
- `Supplier { code, name, phone?, address?, taxCode? }`
- `PurchaseOrder { code, supplierId, status(DRAFT|ORDERED|PARTIAL|RECEIVED|CANCELLED), orderDate, total }`
- `PurchaseOrderLine { poId, itemId, quantity, unitPrice, receivedQty }`
- Thao tác "Nhận hàng" tạo StockLot + StockMove IN, cập nhật `receivedQty` và trạng thái PO. Nếu đánh dấu đã trả tiền thì tạo thêm Transaction chi.

**Bán hàng / CRM**
- `Customer { code, name, phone, email?, address?, type(RETAIL|WHOLESALE|AGENT), userId? }`
- `SalesOrder { code, customerId, channel(ADMIN|WEBSHOP), status(PENDING|CONFIRMED|PACKING|SHIPPING|COMPLETED|CANCELLED), paymentStatus(UNPAID|PARTIAL|PAID), paymentMethod(COD|BANK_TRANSFER|CASH|VNPAY), shippingAddress, subtotal, discount, shippingFee, total, notes? }`
- `SalesOrderLine { orderId, productId?, itemId, stockLotId?, quantity, unitPrice }`
- `Payment { orderId?, amount, method, paidAt, transactionId? }`
- Khi đơn chuyển sang CONFIRMED thì xuất kho theo FIFO trên StockLot. Hủy đơn thì hoàn kho.

**Tài chính**
- `FinanceCategory { name, type(INCOME|EXPENSE), parentId? }`
- `Transaction { code, type(INCOME|EXPENSE), categoryId, amount, date, cycleId?, refType?, refId?, method, notes?, mediaIds[] }`
- **Giá thành của một Cycle** = tổng chi phí vật tư (ActivityMaterial.qty × unitCost) + Transaction EXPENSE gắn với cycleId + chi phí công (Attendance có cycleId) từ GĐ 6.

**Nhân sự**
- `Employee { code, fullName, phone, position, payType(DAILY|MONTHLY|PIECE), baseRate, isActive }`
- `Task { title, description?, assigneeId, areaId?, cycleId?, dueDate, status(TODO|IN_PROGRESS|DONE|CANCELLED), activityId? }`
- `Attendance { employeeId, date, checkIn?, checkOut?, hours, cycleId?, pieceQty?, notes? }`
- `Payroll { employeeId, periodStart, periodEnd, amount, details Json, status(DRAFT|APPROVED|PAID) }`

**Thiết bị / IoT**
- `Equipment { code, name, type, areaId?, purchaseDate?, value?, status }`
- `MaintenanceLog { equipmentId, date, type, cost, notes }`, `MaintenanceSchedule { equipmentId, intervalDays, nextDueDate }`
- `Sensor { code, name, type(TEMP|HUMIDITY|SOIL_MOISTURE|PH|DO|LIGHT|OTHER), areaId, apiKeyHash }`
- `SensorReading { sensorId, value, recordedAt }` (đánh index theo `(sensorId, recordedAt)`)
- `AlertRule { sensorId, op(GT|LT), threshold, isActive }`
- `Alert { ruleId?, type, message, createdAt, readAt? }`

**Du lịch**
- `Tour { slug, name, description, durationMinutes, priceAdult, priceChild, capacity, mediaIds[], isPublished }`
- `TourSlot { tourId, startAt, capacity, bookedCount }`
- `Booking { code, slotId, customerName, phone, email?, adults, children, total, status(PENDING|CONFIRMED|CANCELLED|COMPLETED), paymentStatus }`
- Đặt chỗ phải kiểm tra `bookedCount + số khách <= capacity` trong transaction, khóa dòng bằng `SELECT … FOR UPDATE` (Prisma `$queryRaw`).

**Nội dung website**
- `Product { slug, name, itemId, description (rich text), price, unit, mediaIds[], isPublished, sortOrder }`
- `Post { slug, title, excerpt, content, coverMediaId?, publishedAt?, status }`
- `Page { slug, title, content }`, `SiteSetting { key, value Json }` (thông tin trại, liên hệ, mạng xã hội, banner)

## 7. Các giai đoạn
Mỗi giai đoạn gồm **danh sách việc** và **tiêu chí nghiệm thu**. Agent chỉ coi một giai đoạn là xong khi đạt đủ mọi tiêu chí.

### GĐ 0 – Nền tảng
**Việc cần làm:**
- Monorepo (pnpm workspace, turbo.json, `packages/config`), docker-compose, `.env.example`.
- Package `db` (schema chỉ có phần Hệ thống), migrate, `seed.ts` tạo tài khoản OWNER `admin@xfarm.local` / `Admin@123` cùng mỗi vai trò một user mẫu.
- API:
  - Auth: `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`.
  - Guard JWT + Roles, CRUD Users (chỉ OWNER).
  - `POST /media/presign` + `POST /media`.
  - Swagger tại `/docs`, global exception filter, helper phân trang, service Sequence, interceptor ghi AuditLog cho các request ghi.
- Web:
  - Trang `/login`.
  - Layout admin: sidebar đủ mục các phân hệ, mục nào chưa làm thì để "Sắp có".
  - Trang Users, các component DataTable và FormDialog trong `packages/ui`.
  - Middleware chuyển về `/login` khi chưa đăng nhập.
- Scripts gốc: `dev`, `build`, `lint`, `typecheck`, `test`, `db:migrate`, `db:seed`, `db:studio`.

**Nghiệm thu:**
- Từ repo vừa clone, chạy `docker compose up -d && pnpm i && pnpm db:migrate && pnpm db:seed && pnpm dev` là chạy được.
- Đăng nhập được, tạo và khóa được user.
- User WORKER gọi API Users nhận 403.
- Có test e2e cho auth: login đúng, login sai, refresh, user bị khóa.

### GĐ 1 – Sản xuất (trồng trọt, chăn nuôi, thủy sản)
**Việc cần làm:**
- CRUD Area dạng cây, có bản đồ Leaflet để vẽ polygon và lưu GeoJSON.
- CRUD Cycle với form thay đổi theo `kind`. Trạng thái chỉ được đi theo luồng hợp lệ: PLANNED → ACTIVE → HARVESTING → CLOSED.
- Activity:
  - Form thay đổi theo `type`, cho đính kèm ảnh.
  - Trang chi tiết Cycle hiển thị dòng thời gian (timeline) các nhật ký.
  - Trong GĐ 1, Activity **chưa** trừ kho (ActivityMaterial làm ở GĐ 2).
- AnimalGroup, Animal, AnimalEvent.
- Trang lịch (calendar) hiển thị Activity và Cycle theo tháng.
- Seed dữ liệu mẫu cho cả 3 mảng: 1 lô rau, 1 chuồng gà, 1 ao cá.

**Nghiệm thu:**
- Tạo được Area → Cycle → nhiều Activity cho cả 3 kind.
- Cycle đã CLOSED thì không ghi thêm Activity được (trả 422).
- Có test e2e cho luồng chuyển trạng thái và cho việc tạo Activity.

### GĐ 2 – Kho + Mua hàng
**Việc cần làm:**
- Item, Warehouse, StockLot, StockMove.
- Trang Tồn kho lọc theo kho, nhóm hàng, lô.
- Phiếu nhập, xuất, điều chuyển, kiểm kê.
- ActivityMaterial: khi ghi nhật ký có dùng vật tư thì tự xuất kho theo FIFO.
- Supplier, PurchaseOrder, chức năng nhận hàng.
- Job BullMQ chạy hằng ngày, tạo Alert khi tồn dưới `minStock` hoặc lô hàng hết hạn trong 30 ngày tới.

**Nghiệm thu:**
- Nhập 10 kg phân bón, ghi bón phân dùng 3 kg, tồn còn 7 kg.
- Xuất quá số tồn bị chặn.
- Nhận hàng một phần thì PO ở trạng thái PARTIAL.
- Có test e2e cho FIFO, cho việc chặn tồn âm và cho nhận hàng PO.

### GĐ 3 – Thu hoạch + Truy xuất + Website quảng bá
**Việc cần làm:**
- Activity HARVEST sinh HarvestLot + StockLot + StockMove IN.
- Trang HarvestLot có QR, in được tem: dùng thư viện `qrcode`, trang in khổ A4 hoặc tem nhỏ.
- Trang public `/trace/[code]` hiển thị: sản phẩm, lô, ngày thu hoạch, khu/lô, giống, timeline nhật ký (ẩn tên nhân viên, ẩn chi phí), chứng nhận, ảnh.
- Website public: trang chủ (banner, giới thiệu 4 mảng, sản phẩm nổi bật, tour, bài viết mới), giới thiệu, danh sách và chi tiết sản phẩm, blog, liên hệ.
- Admin CMS: Product, Post, Page, SiteSetting, dùng trình soạn rich text Tiptap.
- SEO: metadata, sitemap, robots, ảnh OG.

**Nghiệm thu:**
- Thu hoạch xong thì quét QR mở ra đúng trang truy xuất.
- HarvestLot có `isPublic=false` trả về 404.
- Lighthouse SEO ≥ 90 trên trang chủ.
- Có Playwright test cho luồng thu hoạch → truy xuất.

### GĐ 4 – Bán hàng + Cửa hàng online + Tài chính
**Việc cần làm:**
- Customer, SalesOrder (tạo từ admin), xác nhận đơn thì xuất kho FIFO, hủy đơn thì hoàn kho.
- In hóa đơn hoặc phiếu giao hàng.
- Webshop:
  - Giỏ hàng lưu ở localStorage, checkout cho khách vãng lai (họ tên, SĐT, địa chỉ), tạo SalesOrder channel WEBSHOP ở trạng thái PENDING.
  - Thanh toán COD hoặc chuyển khoản (hiển thị QR VietQR theo số tài khoản cấu hình trong SiteSetting).
  - Trang tra cứu đơn hàng bằng mã đơn + SĐT.
- Payment, công nợ khách hàng.
- FinanceCategory, Transaction thu/chi. Hệ thống tự tạo Transaction khi đơn hàng được thanh toán và khi PO được trả tiền.
- Báo cáo: thu chi theo tháng, **giá thành và lãi lỗ theo Cycle**, doanh thu theo sản phẩm.

**Nghiệm thu:**
- Đặt hàng trên web → đơn xuất hiện trong admin → xác nhận → kho giảm → thu tiền → có Transaction → báo cáo cập nhật.
- Có test e2e cho tính giá thành Cycle và cho hủy đơn hoàn kho.

### GĐ 5 – Du lịch trải nghiệm
**Việc cần làm:**
- Admin: Tour, tạo TourSlot hàng loạt (ví dụ mỗi thứ 7 và CN, lúc 8h và 14h, trong 3 tháng), quản lý Booking.
- Public: danh sách và chi tiết tour, chọn ngày và slot còn chỗ, đặt chỗ, xem trang xác nhận có mã booking.
- Gửi email xác nhận qua Nodemailer (SMTP lấy từ env; ở môi trường dev dùng Mailpit trong docker-compose).
- Khi booking được thanh toán thì tạo Transaction INCOME.

**Nghiệm thu:**
- Hai request đặt chỗ đồng thời cho slot chỉ còn 1 chỗ: chỉ một request thành công (có test e2e chạy song song để chứng minh).

### GĐ 6 – Nhân sự + PWA cho công nhân
**Việc cần làm:**
- Employee, Task (giao việc, có thể liên kết sang Activity khi hoàn thành).
- Attendance: chấm công vào/ra, ghi giờ công theo Cycle.
- Payroll: tính lương theo `payType`, có bước duyệt.
- PWA `/admin/m`:
  - Các màn hình: việc hôm nay, ghi nhật ký nhanh (chụp ảnh), chấm công, quét QR khu/lô.
  - Cài được lên điện thoại (manifest + service worker).
  - Chạy offline: lưu hàng đợi thao tác trong IndexedDB (dùng `idb`), tự đồng bộ khi có mạng lại. Mỗi thao tác gửi kèm `clientId` để server xử lý idempotent, không ghi trùng.

**Nghiệm thu:**
- Bật chế độ offline trong DevTools, ghi 2 nhật ký, bật mạng lại: dữ liệu đồng bộ lên server và không bị trùng.
- Bảng lương khớp với giờ công đã chấm.
- Chi phí công được cộng vào giá thành Cycle.

### GĐ 7 – Thiết bị/IoT + Dashboard
**Việc cần làm:**
- Equipment, MaintenanceSchedule, MaintenanceLog. Job hằng ngày tạo Alert khi thiết bị đến hạn bảo trì.
- `POST /api/v1/iot/readings`: xác thực bằng header `X-Sensor-Key`, nhận theo lô (batch). Kiểm tra AlertRule và tạo Alert khi vượt ngưỡng.
- Biểu đồ dữ liệu cảm biến theo khu/lô.
- MQTT là tùy chọn: dùng một bridge riêng (`apps/iot-bridge`) chỉ khi cần, ghi quyết định vào DECISIONS.md.
- Dashboard tổng quan:
  - Các ô chỉ số: Cycle đang chạy, tồn kho cảnh báo, doanh thu tháng, booking sắp tới, việc quá hạn.
  - Biểu đồ: doanh thu/chi phí 12 tháng, sản lượng theo Cycle.
  - Chuông thông báo hiển thị Alert.

**Nghiệm thu:**
- Gửi một reading vượt ngưỡng thì chuông thông báo hiện Alert.
- Dashboard tải xong dưới 1 giây với dữ liệu seed.

## 8. Những gì Claude sẽ review sau mỗi giai đoạn
- Code bám đúng kế hoạch: schema, tên thực thể, cấu trúc thư mục.
- Tính đúng nghiệp vụ: transaction, kho không âm, FIFO, giá thành, chuyển trạng thái, xử lý đồng thời khi đặt chỗ.
- Bảo mật: phân quyền đủ ở mọi endpoint, endpoint public không lộ dữ liệu nội bộ, upload an toàn, không có secret trong code.
- Chất lượng: lint, typecheck, test qua hết; không code chết; không lặp code giữa api và web (zod schema phải để trong `packages/shared`).
- `docs/PROGRESS.md` mô tả đúng trạng thái thực tế.

**Cách giao lại để review:** cuối mỗi giai đoạn, nói với Claude tên nhánh và đường dẫn repo. Claude sẽ đọc diff, chạy kiểm tra và đưa ra danh sách lỗi cần sửa.
