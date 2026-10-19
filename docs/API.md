# XFarm API Documentation

API dùng tiền tố `/api/v1`, xác thực bằng cookie HttpOnly hoặc `Authorization: Bearer`. Response danh sách trả về định dạng `{ data, total, page, pageSize }`; lỗi trả về `{ statusCode, message, errors? }`.

---

## Phân hệ Thiết bị & IoT (Giai đoạn 7)

### 1. Quản lý Thiết bị (`/equipment`)

| Method | Route | Quyền | Mục đích & Mô tả |
| --- | --- | --- | --- |
| GET | `/equipment` | OWNER, MANAGER, ACCOUNTANT, WORKER | Danh sách thiết bị (hỗ trợ phân trang `?page&pageSize`, tìm kiếm `?search`, lọc theo `?type`, `?status`, `?areaId`, sắp xếp `?sort`) |
| GET | `/equipment/:id` | OWNER, MANAGER, ACCOUNTANT, WORKER | Chi tiết thiết bị kèm danh sách lịch bảo trì, 20 nhật ký bảo trì gần nhất và tổng chi phí bảo trì `totalMaintenanceCost` |
| POST | `/equipment` | OWNER, MANAGER | Tạo mới thiết bị (`code` tự sinh nếu để trống, `name`, `type`, `model?`, `serialNumber?`, `areaId?`, `purchasedAt?`, `warrantyUntil?`, `notes?`) |
| PATCH | `/equipment/:id` | OWNER, MANAGER | Cập nhật thông tin thiết bị (`name`, `type`, `model`, `serialNumber`, `areaId`, `status`, `purchasedAt`, `warrantyUntil`, `notes`, `isActive`) |
| DELETE | `/equipment/:id` | OWNER, MANAGER | Khóa mềm thiết bị (`isActive = false`) |
| GET | `/equipment/:id/maintenance-schedules` | OWNER, MANAGER, ACCOUNTANT, WORKER | Danh sách lịch bảo trì của thiết bị cụ thể |
| POST | `/equipment/:id/maintenance-schedules` | OWNER, MANAGER | Tạo lịch bảo trì cho thiết bị (`name`, `intervalDays`, `nextDueDate?`, `notes?`) |
| GET | `/equipment/:id/maintenance-logs` | OWNER, MANAGER, ACCOUNTANT, WORKER | Danh sách nhật ký bảo trì của thiết bị cụ thể |
| POST | `/equipment/:id/maintenance-logs` | OWNER, MANAGER, WORKER | Ghi nhật ký bảo trì cho thiết bị trong database transaction; tự động tính và dời `nextDueDate` của lịch liên kết (`maintenanceDate + intervalDays`) |

### 2. Quản lý Lịch bảo trì (`/maintenance-schedules`)

| Method | Route | Quyền | Mục đích & Mô tả |
| --- | --- | --- | --- |
| GET | `/maintenance-schedules` | OWNER, MANAGER, ACCOUNTANT, WORKER | Danh sách lịch bảo trì toàn hệ thống (lọc theo `?equipmentId`, `?isActive`, tìm kiếm `?search`, phân trang `?page&pageSize`) |
| GET | `/maintenance-schedules/:id` | OWNER, MANAGER, ACCOUNTANT, WORKER | Chi tiết lịch bảo trì |
| POST | `/maintenance-schedules` | OWNER, MANAGER | Tạo lịch bảo trì mới (`equipmentId`, `name`, `intervalDays ≥ 1`, `nextDueDate?`, `notes?`) |
| PATCH | `/maintenance-schedules/:id` | OWNER, MANAGER | Cập nhật lịch bảo trì (`name`, `intervalDays`, `nextDueDate`, `isActive`, `notes`) |
| DELETE | `/maintenance-schedules/:id` | OWNER, MANAGER | Khóa mềm lịch bảo trì (`isActive = false`) |

### 3. Nhật ký bảo trì (`/maintenance-logs`) & Kiểm tra cảnh báo đến hạn

| Method | Route | Quyền | Mục đích & Mô tả |
| --- | --- | --- | --- |
| GET | `/maintenance-logs` | OWNER, MANAGER, ACCOUNTANT, WORKER | Danh sách nhật ký bảo trì (lọc `?equipmentId`, `?scheduleId`, `?from&to`, phân trang `?page&pageSize`, sắp xếp `?sort`) |
| GET | `/maintenance-logs/:id` | OWNER, MANAGER, ACCOUNTANT, WORKER | Chi tiết nhật ký bảo trì |
| POST | `/maintenance-logs` | OWNER, MANAGER, WORKER | Ghi nhận nhật ký bảo trì theo thiết bị trong database transaction |
| PATCH | `/maintenance-logs/:id` | OWNER, MANAGER | Cập nhật nhật ký bảo trì (`cost`, `notes`, `performedBy`) |
| POST | `/alerts/run-maintenance-check` | OWNER, MANAGER | Chạy quét lịch bảo trì đến hạn trong vòng ≤ 3 ngày; tự sinh cảnh báo `MAINTENANCE_DUE` trên chuông thông báo có liên kết trực tiếp tới trang chi tiết thiết bị |

### 4. Quản lý Cảm biến IoT (`/sensors`)

| Method | Route | Quyền | Mục đích & Mô tả |
| --- | --- | --- | --- |
| GET | `/sensors` | OWNER, MANAGER, ACCOUNTANT, WORKER | Danh sách cảm biến (lọc theo `?areaId`, `?type`, `?isActive`, tìm kiếm `?search`, phân trang `?page&pageSize`) |
| GET | `/sensors/:id` | OWNER, MANAGER, ACCOUNTANT, WORKER | Chi tiết cảm biến kèm thông tin khu/lô |
| POST | `/sensors` | OWNER, MANAGER | Tạo cảm biến mới (`code` tự sinh nếu để trống, `name`, `type`, `unit`, `areaId`, `isActive?`). Trả về `{ data, apiKey }` (API key thô hiển thị duy nhất 1 lần cho người dùng copy) |
| PATCH | `/sensors/:id` | OWNER, MANAGER | Cập nhật thông tin cảm biến (`name`, `type`, `unit`, `areaId`, `isActive`) |
| POST | `/sensors/:id/rotate-key` | OWNER, MANAGER | Thu hồi API key cũ và tạo API key mới; trả về key mới một lần duy nhất |

### 5. Thu thập dữ liệu IoT & Biểu đồ (`/iot`)

| Method | Route | Quyền | Mục đích & Mô tả |
| --- | --- | --- | --- |
| POST | `/iot/readings` | Public (xác thực qua header `X-Sensor-Key`) | Nhận dữ liệu đo theo lô `{ readings: [{ value, recordedAt? }] }`. Xác thực key bằng constant-time so sánh SHA-256; rate limit 60 request/phút; lưu `SensorReading`; cập nhật `lastSeenAt`; quét các `AlertRule` đang kích hoạt và tự động sinh cảnh báo `SENSOR_THRESHOLD` gửi tới chuông thông báo nếu vượt ngưỡng và đã qua thời gian cooldown |
| GET | `/iot/series` | OWNER, MANAGER, ACCOUNTANT, WORKER | Lấy chuỗi dữ liệu đo của cảm biến phục vụ vẽ biểu đồ (hỗ trợ gom nhóm `?bucket=hour` hoặc `day`, khoảng thời gian `?from&to`) |
| GET | `/iot/latest` | OWNER, MANAGER, ACCOUNTANT, WORKER | Lấy giá trị đọc mới nhất của các cảm biến theo khu vực `?areaId` |

### 6. Cấu hình Quy tắc Cảnh báo Ngưỡng Cảm biến (`/alert-rules`)

| Method | Route | Quyền | Mục đích & Mô tả |
| --- | --- | --- | --- |
| GET | `/alert-rules` | OWNER, MANAGER, ACCOUNTANT, WORKER | Danh sách quy tắc cảnh báo (hỗ trợ lọc `?sensorId`, `?isActive`, tìm kiếm `?search`) |
| GET | `/alert-rules/:id` | OWNER, MANAGER, ACCOUNTANT, WORKER | Chi tiết quy tắc cảnh báo |
| POST | `/alert-rules` | OWNER, MANAGER | Tạo quy tắc cảnh báo cho cảm biến (`sensorId`, toán tử `op: 'GT' \| 'LT'`, ngưỡng `threshold`, thời gian giãn cách `cooldownMinutes`) |
| PATCH | `/alert-rules/:id` | OWNER, MANAGER | Cập nhật quy tắc cảnh báo (`op`, `threshold`, `cooldownMinutes`, `isActive`) |
| DELETE | `/alert-rules/:id` | OWNER, MANAGER | Xóa quy tắc cảnh báo |

---

## Phân hệ Du lịch & Đặt chỗ (Giai đoạn 5)

### 1. Quản lý Tour & Lịch suất (Admin)

| Method | Route | Quyền | Mục đích |
| --- | --- | --- | --- |
| GET | `/tours` | OWNER, MANAGER, SALES, ACCOUNTANT | Danh sách tour (phân trang `?page&pageSize`, tìm kiếm `?search`, lọc `?isPublished`) |
| GET | `/tours/:id` | OWNER, MANAGER, SALES, ACCOUNTANT | Chi tiết tour |
| POST | `/tours` | OWNER, MANAGER | Tạo tour mới (tự sinh slug từ tên nếu để trống, chống trùng slug) |
| PATCH | `/tours/:id` | OWNER, MANAGER | Cập nhật thông tin tour |
| PATCH | `/tours/:id/publish` | OWNER, MANAGER | Chuyển đổi trạng thái xuất bản tour |
| GET | `/tours/:id/slots` | OWNER, MANAGER, SALES, ACCOUNTANT | Danh sách suất trải nghiệm theo tour, hỗ trợ lọc `?from&to` |
| GET | `/tour-slots/:id` | OWNER, MANAGER, SALES, ACCOUNTANT | Chi tiết suất trải nghiệm |
| POST | `/tours/:id/slots` | OWNER, MANAGER | Tạo một suất trải nghiệm đơn lẻ |
| POST | `/tours/:id/slots/batch` | OWNER, MANAGER | Tạo suất trải nghiệm hàng loạt theo khoảng ngày, thứ trong tuần và các khung giờ |
| PATCH | `/tour-slots/:id` | OWNER, MANAGER | Cập nhật suất (sức chứa, bật/tắt; chặn giảm sức chứa nhỏ hơn số vé đã đặt `capacity < bookedCount` bằng mã lỗi 422) |
| DELETE | `/tour-slots/:id` | OWNER, MANAGER | Xóa suất chưa có lượt đặt chỗ (chặn xóa suất đã có booking bằng mã lỗi 400) |

### 2. Tour & Đặt chỗ công khai (Public)

Các endpoint công khai nằm dưới `/public/*`. Dữ liệu trả về chỉ gồm thông tin cần thiết phục vụ khách tham quan; tuyệt đối không để lộ giá vốn, tên nhân viên, kho hay dữ liệu của khách hàng khác.

| Method | Route | Quyền | Mục đích |
| --- | --- | --- | --- |
| GET | `/public/tours` | Public | Danh sách tour đã xuất bản (kèm giá vé người lớn/trẻ em, thời lượng, danh sách mediaIds) |
| GET | `/public/tours/:slug` | Public | Chi tiết tour kèm các suất trong 60 ngày tới còn chỗ (`remaining = capacity - bookedCount > 0`, `isActive = true`, `startAt` trong tương lai) |
| POST | `/public/bookings` | Public | Đặt chỗ trực tuyến: khóa dòng suất trải nghiệm bằng `SELECT ... FOR UPDATE`, kiểm tra chỗ trống, tự sinh mã `BK-YYYY-xxxx`, cập nhật `bookedCount`, lưu thông tin khách hàng và sinh mã VietQR thanh toán |
| GET | `/public/bookings/lookup?code=&phone=` | Public | Tra cứu đặt chỗ khi biết chính xác cả mã đặt chỗ và số điện thoại |
| GET | `/public/bookings/:code` | Public | Chi tiết đặt chỗ sau khi tạo thành công kèm thông tin chuyển khoản VietQR |

### 3. Quản lý Đặt chỗ & Thu tiền (Admin)

| Method | Route | Quyền | Mục đích |
| --- | --- | --- | --- |
| GET | `/bookings` | OWNER, MANAGER, SALES, ACCOUNTANT | Danh sách đặt chỗ (hỗ trợ phân trang `?page&pageSize`, lọc theo `?status`, `?paymentStatus`, `?tourId`, `?from&to`, tìm kiếm `?search` theo mã, tên khách, số điện thoại; WORKER bị chặn 403) |
| GET | `/bookings/:id` | OWNER, MANAGER, SALES, ACCOUNTANT | Chi tiết đặt chỗ kèm lịch sử các lần thanh toán `payments` |
| POST | `/bookings/:id/confirm` | OWNER, MANAGER, SALES | Xác nhận đặt chỗ (chuyển sang `CONFIRMED`, tự động gửi email thông báo xác nhận nếu có cấu hình Mailpit/SMTP) |
| POST | `/bookings/:id/cancel` | OWNER, MANAGER, SALES | Hủy đặt chỗ (chuyển sang `CANCELLED`, tự động hoàn trả số chỗ vào `tour_slots.bookedCount` trong database transaction) |
| POST | `/bookings/:id/complete` | OWNER, MANAGER, SALES | Đánh dấu hoàn thành chuyến tham quan (`COMPLETED`) |
| POST | `/bookings/:id/payments` | OWNER, MANAGER, SALES, ACCOUNTANT | Ghi nhận thu tiền đặt chỗ: kiểm tra không thu vượt tổng tiền, tự sinh mã phiếu thu `TT-`, cập nhật `paymentStatus` (`PARTIAL` hoặc `PAID`), tự động tạo `Transaction` loại `INCOME` với danh mục tài chính `TOUR` trong cùng transaction |
