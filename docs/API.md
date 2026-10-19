# XFarm API – Phân hệ Du lịch & Đặt chỗ (Giai đoạn 5)

API dùng tiền tố `/api/v1`, xác thực bằng cookie HttpOnly hoặc `Authorization: Bearer`. Response danh sách trả về định dạng `{ data, total, page, pageSize }`; lỗi trả về `{ statusCode, message, errors? }`.

## 1. Quản lý Tour & Lịch suất (Admin)

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

## 2. Tour & Đặt chỗ công khai (Public)

Các endpoint công khai nằm dưới `/public/*`. Dữ liệu trả về chỉ gồm thông tin cần thiết phục vụ khách tham quan; tuyệt đối không để lộ giá vốn, tên nhân viên, kho hay dữ liệu của khách hàng khác.

| Method | Route | Quyền | Mục đích |
| --- | --- | --- | --- |
| GET | `/public/tours` | Public | Danh sách tour đã xuất bản (kèm giá vé người lớn/trẻ em, thời lượng, danh sách mediaIds) |
| GET | `/public/tours/:slug` | Public | Chi tiết tour kèm các suất trong 60 ngày tới còn chỗ (`remaining = capacity - bookedCount > 0`, `isActive = true`, `startAt` trong tương lai) |
| POST | `/public/bookings` | Public | Đặt chỗ trực tuyến: khóa dòng suất trải nghiệm bằng `SELECT ... FOR UPDATE`, kiểm tra chỗ trống, tự sinh mã `BK-YYYY-xxxx`, cập nhật `bookedCount`, lưu thông tin khách hàng và sinh mã VietQR thanh toán |
| GET | `/public/bookings/lookup?code=&phone=` | Public | Tra cứu đặt chỗ khi biết chính xác cả mã đặt chỗ và số điện thoại |
| GET | `/public/bookings/:code` | Public | Chi tiết đặt chỗ sau khi tạo thành công kèm thông tin chuyển khoản VietQR |

## 3. Quản lý Đặt chỗ & Thu tiền (Admin)

| Method | Route | Quyền | Mục đích |
| --- | --- | --- | --- |
| GET | `/bookings` | OWNER, MANAGER, SALES, ACCOUNTANT | Danh sách đặt chỗ (hỗ trợ phân trang `?page&pageSize`, lọc theo `?status`, `?paymentStatus`, `?tourId`, `?from&to`, tìm kiếm `?search` theo mã, tên khách, số điện thoại; WORKER bị chặn 403) |
| GET | `/bookings/:id` | OWNER, MANAGER, SALES, ACCOUNTANT | Chi tiết đặt chỗ kèm lịch sử các lần thanh toán `payments` |
| POST | `/bookings/:id/confirm` | OWNER, MANAGER, SALES | Xác nhận đặt chỗ (chuyển sang `CONFIRMED`, tự động gửi email thông báo xác nhận nếu có cấu hình Mailpit/SMTP) |
| POST | `/bookings/:id/cancel` | OWNER, MANAGER, SALES | Hủy đặt chỗ (chuyển sang `CANCELLED`, tự động hoàn trả số chỗ vào `tour_slots.bookedCount` trong database transaction) |
| POST | `/bookings/:id/complete` | OWNER, MANAGER, SALES | Đánh dấu hoàn thành chuyến tham quan (`COMPLETED`) |
| POST | `/bookings/:id/payments` | OWNER, MANAGER, SALES, ACCOUNTANT | Ghi nhận thu tiền đặt chỗ: kiểm tra không thu vượt tổng tiền, tự sinh mã phiếu thu `TT-`, cập nhật `paymentStatus` (`PARTIAL` hoặc `PAID`), tự động tạo `Transaction` loại `INCOME` với danh mục tài chính `TOUR` trong cùng transaction |
