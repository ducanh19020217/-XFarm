# XFarm API Reference

Tài liệu toàn diện danh mục các endpoint API của hệ thống XFarm (Giai đoạn 0 – 7).
Tất cả các API dùng tiền tố `/api/v1`, xác thực bằng cookie HttpOnly hoặc header `Authorization: Bearer <token>`.
Response danh sách phân trang tuân thủ định dạng chuẩn `{ data, total, page, pageSize }`; lỗi trả về `{ statusCode, message, errors? }` bằng tiếng Việt.

---

## 1. Hệ thống, Xác thực & Người dùng (GĐ 0)

| Method | Route | Quyền | Mục đích |
| --- | --- | --- | --- |
| POST | `/auth/login` | Public | Đăng nhập tài khoản, trả JWT access/refresh token qua cookie và JSON |
| POST | `/auth/refresh` | Public | Cấp lại access token và xoay vòng refresh token (hỗ trợ single-flight) |
| POST | `/auth/logout` | Authenticated | Đăng xuất, thu hồi refresh token hiện tại và xóa cookie |
| GET | `/auth/me` | Authenticated | Lấy thông tin user đăng nhập và quyền hạn hiện tại |
| GET | `/users` | OWNER | Danh sách người dùng (hỗ trợ phân trang, tìm kiếm `?search`, lọc vai trò) |
| GET | `/users/:id` | OWNER | Chi tiết người dùng |
| POST | `/users` | OWNER | Tạo tài khoản người dùng mới |
| PATCH | `/users/:id` | OWNER | Cập nhật thông tin người dùng |
| PATCH | `/users/:id/status` | OWNER | Khóa hoặc mở khóa trạng thái hoạt động của người dùng |
| POST | `/media/presign` | Authenticated | Sinh URL presigned PUT để client upload file trực tiếp lên S3/RustFS |
| POST | `/media` | Authenticated | Xác nhận hoàn tất upload file và tạo bản ghi `Media` |
| GET | `/media/:id` | Authenticated | Lấy metadata của tệp tin media |

---

## 2. Sản xuất: Khu/lô, Mùa vụ, Nhật ký, Đàn & Lịch (GĐ 1)

| Method | Route | Quyền | Mục đích |
| --- | --- | --- | --- |
| GET | `/areas` | All roles | Danh sách khu/lô nông trại (phân trang, lọc `?type`, `?parentId`) |
| GET | `/areas/tree` | All roles | Cây phân cấp khu/lô kèm thông tin GeoJSON đa giác ranh giới |
| GET | `/areas/:id` | All roles | Chi tiết khu/lô |
| POST | `/areas` | OWNER, MANAGER | Tạo khu/lô mới |
| PATCH | `/areas/:id` | OWNER, MANAGER | Cập nhật thông tin và tọa độ GeoJSON |
| DELETE | `/areas/:id` | OWNER, MANAGER | Xóa khu/lô (chặn xóa nếu có khu con hoặc mùa vụ liên kết) |
| GET | `/cycles` | All roles | Danh sách mùa vụ (lọc theo `?status`, `?kind`, `?areaId`) |
| GET | `/cycles/:id` | All roles | Chi tiết mùa vụ |
| POST | `/cycles` | OWNER, MANAGER | Khởi tạo mùa vụ mới |
| PATCH | `/cycles/:id` | OWNER, MANAGER | Cập nhật thông tin mùa vụ |
| POST | `/cycles/:id/transition` | OWNER, MANAGER | Chuyển trạng thái mùa vụ (PLANNED → ACTIVE → HARVESTING → CLOSED) |
| GET | `/cycles/:id/labor-cost` | OWNER, MANAGER, ACCOUNTANT | Chi phí công lao động hạch toán cho mùa vụ |
| GET | `/activities` | All roles | Danh sách nhật ký canh tác (phân trang, lọc theo `?cycleId`, `?areaId`, `?type`) |
| GET | `/activities/:id` | All roles | Chi tiết nhật ký canh tác kèm vật tư tiêu hao |
| POST | `/activities` | OWNER, MANAGER, WORKER | Ghi nhật ký canh tác mới (tự động xuất vật tư FIFO nếu có, sinh lô thu hoạch nếu HARVEST) |
| PATCH | `/activities/:id` | OWNER, MANAGER, WORKER | Cập nhật thông tin nhật ký |
| DELETE | `/activities/:id` | OWNER, MANAGER | Xóa nhật ký |
| GET | `/cycles/:id/timeline` | All roles | Dòng thời gian các nhật ký canh tác trong mùa vụ |
| GET | `/animal-groups` | All roles | Danh sách đàn vật nuôi |
| GET | `/animal-groups/:id` | All roles | Chi tiết đàn vật nuôi |
| POST | `/animal-groups` | OWNER, MANAGER | Tạo đàn vật nuôi mới |
| PATCH | `/animal-groups/:id` | OWNER, MANAGER | Cập nhật đàn vật nuôi |
| GET | `/animals` | All roles | Danh sách cá thể gia súc/vật nuôi theo mã tai/thẻ |
| GET | `/animals/:id` | All roles | Chi tiết cá thể vật nuôi kèm thông tin phả hệ |
| POST | `/animals` | OWNER, MANAGER | Thêm mới cá thể vật nuôi |
| PATCH | `/animals/:id` | OWNER, MANAGER | Cập nhật thông tin cá thể |
| GET | `/animals/:id/events` | All roles | Lịch sử sự kiện (tiêm phòng, phối giống, sinh đẻ, cân nặng) của cá thể |
| POST | `/animals/:id/events` | OWNER, MANAGER, WORKER | Ghi sự kiện mới cho cá thể vật nuôi |
| GET | `/calendar` | All roles | Lịch biểu hoạt động canh tác và sự kiện theo tháng `?month=YYYY-MM` |

---

## 3. Kho, Vật tư & Mua hàng (GĐ 2)

| Method | Route | Quyền | Mục đích |
| --- | --- | --- | --- |
| GET | `/items` | All roles | Danh mục vật tư & hàng hóa (phân trang, tìm kiếm `?search`, lọc `?category`) |
| GET | `/items/:id` | All roles | Chi tiết vật tư |
| POST | `/items` | OWNER, MANAGER | Tạo mới vật tư (SKU, đơn vị, tồn tối thiểu `minStock`) |
| PATCH | `/items/:id` | OWNER, MANAGER | Cập nhật vật tư |
| DELETE | `/items/:id` | OWNER, MANAGER | Xóa vật tư chưa phát sinh biến động kho |
| GET | `/warehouses` | All roles | Danh sách kho hàng |
| GET | `/warehouses/:id` | All roles | Chi tiết kho hàng |
| POST | `/warehouses` | OWNER, MANAGER | Tạo kho mới |
| PATCH | `/warehouses/:id` | OWNER, MANAGER | Cập nhật thông tin kho |
| DELETE | `/warehouses/:id` | OWNER, MANAGER | Xóa kho hàng |
| GET | `/stock/balances` | All roles | Xem số dư tồn kho theo kho, nhóm hàng, lô và tìm kiếm `?search` |
| GET | `/stock/moves` | OWNER, MANAGER, ACCOUNTANT | Lịch sử biến động xuất/nhập/chuyển kho |
| GET | `/stock/documents` | OWNER, MANAGER, ACCOUNTANT | Danh sách chứng từ kho (phiếu nhập, xuất, chuyển, kiểm kê) |
| GET | `/stock/documents/:code` | OWNER, MANAGER, ACCOUNTANT | Chi tiết chứng từ kho theo mã chứng từ |
| POST | `/stock/receipts` | OWNER, MANAGER | Tạo phiếu nhập kho trực tiếp (tự sinh lô `StockLot` và biến động IN) |
| POST | `/stock/issues` | OWNER, MANAGER | Tạo phiếu xuất kho (xuất theo FIFO, chặn tồn âm bằng lỗi 422) |
| POST | `/stock/transfers` | OWNER, MANAGER | Tạo phiếu điều chuyển hàng hóa giữa hai kho |
| POST | `/stock/counts` | OWNER, MANAGER | Tạo phiếu kiểm kê và điều chỉnh cân bằng kho (`ADJUST`) |
| GET | `/suppliers` | All roles | Danh sách nhà cung cấp |
| GET | `/suppliers/:id` | All roles | Chi tiết nhà cung cấp |
| POST | `/suppliers` | OWNER, MANAGER | Thêm nhà cung cấp mới |
| PATCH | `/suppliers/:id` | OWNER, MANAGER | Cập nhật thông tin nhà cung cấp |
| GET | `/purchase-orders` | OWNER, MANAGER, ACCOUNTANT | Danh sách đơn mua hàng (phân trang, lọc `?status`, `?supplierId`) |
| GET | `/purchase-orders/:id` | OWNER, MANAGER, ACCOUNTANT | Chi tiết đơn mua hàng |
| POST | `/purchase-orders` | OWNER, MANAGER, ACCOUNTANT | Lập đơn mua hàng (trạng thái `DRAFT`) |
| PATCH | `/purchase-orders/:id` | OWNER, MANAGER, ACCOUNTANT | Cập nhật đơn mua hàng |
| DELETE | `/purchase-orders/:id` | OWNER, MANAGER, ACCOUNTANT | Xóa đơn mua hàng còn ở trạng thái DRAFT |
| POST | `/purchase-orders/:id/order` | OWNER, MANAGER, ACCOUNTANT | Duyệt đặt hàng (chuyển sang `ORDERED`) |
| POST | `/purchase-orders/:id/cancel` | OWNER, MANAGER, ACCOUNTANT | Hủy đơn mua hàng |
| POST | `/purchase-orders/:id/receive` | OWNER, MANAGER | Nhận hàng vào kho (hỗ trợ nhận một phần `PARTIAL` hoặc đủ `RECEIVED`) |
| POST | `/purchase-orders/:id/pay` | OWNER, MANAGER, ACCOUNTANT | Ghi nhận chi trả tiền đơn mua, sinh phiếu chi và `Transaction EXPENSE` |
| GET | `/alerts` | All roles | Danh sách cảnh báo hệ thống (tồn dưới mức tối thiểu, hạn dùng lô, bảo trì, IoT) |
| GET | `/alerts/unread-count` | All roles | Số lượng cảnh báo chưa đọc hiển thị ở chuông thông báo |
| PATCH | `/alerts/:id/read` | All roles | Đánh dấu cảnh báo đã đọc |
| POST | `/alerts/read-all` | All roles | Đánh dấu tất cả cảnh báo đã đọc |
| POST | `/alerts/run-stock-check` | OWNER, MANAGER | Kích hoạt quét cảnh báo tồn kho và cận hạn sử dụng lô |

---

## 4. Thu hoạch, Truy xuất nguồn gốc & CMS (GĐ 3)

| Method | Route | Quyền | Mục đích |
| --- | --- | --- | --- |
| GET | `/harvest-lots` | All roles | Danh sách lô thu hoạch |
| GET | `/harvest-lots/:id` | All roles | Chi tiết lô thu hoạch kèm thông tin mã QR |
| PATCH | `/harvest-lots/:id` | OWNER, MANAGER | Bật/tắt công khai `isPublic` của lô thu hoạch |
| GET | `/harvest-lots/:id/qr` | All roles | Lấy hình ảnh mã QR truy xuất dạng Data URL hoặc SVG |
| GET | `/public/trace/:code` | Public | Trang tra cứu thông tin truy xuất nguồn gốc công khai (trả 404 nếu `isPublic = false`) |
| GET | `/products` | OWNER, MANAGER, SALES | Quản lý danh mục sản phẩm CMS |
| POST | `/products` | OWNER, MANAGER | Tạo sản phẩm thương mại mới |
| PATCH | `/products/:id` | OWNER, MANAGER | Cập nhật thông tin sản phẩm |
| GET | `/posts` | OWNER, MANAGER | Quản lý bài viết blog tin tức nông trại |
| POST | `/posts` | OWNER, MANAGER | Đăng bài viết mới |
| PATCH | `/posts/:id` | OWNER, MANAGER | Cập nhật bài viết |
| GET | `/pages` | OWNER, MANAGER | Quản lý các trang tĩnh giới thiệu |
| POST | `/pages` | OWNER, MANAGER | Tạo trang tĩnh mới |
| PATCH | `/pages/:id` | OWNER, MANAGER | Cập nhật nội dung trang |
| GET | `/site-settings` | OWNER, MANAGER | Quản lý cấu hình website (VietQR, SEO, liên hệ) |
| PATCH | `/site-settings` | OWNER | Cập nhật cấu hình website |
| GET | `/public/products` | Public | Danh sách sản phẩm niêm yết công khai trên website |
| GET | `/public/products/:slug` | Public | Chi tiết sản phẩm công khai |
| GET | `/public/posts` | Public | Danh sách bài viết tin tức công khai |
| GET | `/public/posts/:slug` | Public | Chi tiết bài viết công khai |
| GET | `/public/pages/:slug` | Public | Xem trang tĩnh công khai (giới thiệu, chính sách, liên hệ) |
| GET | `/public/site-settings` | Public | Cấu hình website công khai (tên, slogan, liên hệ, VietQR) |

---

## 5. Bán hàng, Webshop & Tài chính (GĐ 4)

| Method | Route | Quyền | Mục đích |
| --- | --- | --- | --- |
| GET | `/customers` | OWNER, MANAGER, SALES, ACCOUNTANT | Danh sách khách hàng và công nợ tổng hợp |
| GET | `/customers/:id` | OWNER, MANAGER, SALES, ACCOUNTANT | Chi tiết khách hàng, lịch sử đơn hàng và công nợ |
| POST | `/customers` | OWNER, MANAGER, SALES | Tạo hồ sơ khách hàng mới |
| PATCH | `/customers/:id` | OWNER, MANAGER, SALES | Cập nhật khách hàng |
| GET | `/sales-orders` | OWNER, MANAGER, SALES, ACCOUNTANT | Danh sách đơn bán hàng |
| GET | `/sales-orders/:id` | OWNER, MANAGER, SALES, ACCOUNTANT | Chi tiết đơn bán hàng |
| GET | `/sales-orders/:id/print` | OWNER, MANAGER, SALES, ACCOUNTANT | Xem dữ liệu in hóa đơn / phiếu giao hàng |
| POST | `/sales-orders` | OWNER, MANAGER, SALES | Lập đơn bán hàng tại quầy / admin |
| PATCH | `/sales-orders/:id` | OWNER, MANAGER, SALES | Cập nhật đơn bán hàng |
| POST | `/sales-orders/:id/confirm` | OWNER, MANAGER, SALES | Xác nhận đơn và tự động xuất kho theo FIFO |
| POST | `/sales-orders/:id/cancel` | OWNER, MANAGER, SALES | Hủy đơn bán hàng và hoàn kho về đúng lô cũ |
| PATCH | `/sales-orders/:id/status` | OWNER, MANAGER, SALES | Cập nhật trạng thái giao hàng của đơn |
| POST | `/sales-orders/:id/payments` | OWNER, MANAGER, SALES, ACCOUNTANT | Thu tiền đơn hàng: sinh phiếu thu `TT-` và `Transaction INCOME` |
| POST | `/public/orders` | Public | Khách vãng lai đặt hàng trực tuyến (kênh `WEBSHOP/PENDING`) |
| GET | `/public/orders/lookup` | Public | Tra cứu đơn hàng trực tuyến qua mã đơn `?code=` và số điện thoại `?phone=` |
| GET | `/payments` | OWNER, MANAGER, SALES, ACCOUNTANT | Danh sách phiếu thu tiền |
| GET | `/payments/:id` | OWNER, MANAGER, SALES, ACCOUNTANT | Chi tiết phiếu thu |
| GET | `/finance/receivables` | OWNER, MANAGER, ACCOUNTANT | Báo cáo công nợ phải thu từ khách hàng |
| GET | `/finance-categories` | OWNER, MANAGER, ACCOUNTANT | Danh mục phân loại thu/chi tài chính |
| GET | `/finance-categories/tree` | OWNER, MANAGER, ACCOUNTANT | Cây danh mục thu/chi |
| POST | `/finance-categories` | OWNER, MANAGER, ACCOUNTANT | Thêm danh mục tài chính mới |
| PATCH | `/finance-categories/:id` | OWNER, MANAGER, ACCOUNTANT | Cập nhật danh mục tài chính |
| DELETE | `/finance-categories/:id` | OWNER, MANAGER, ACCOUNTANT | Xóa danh mục tài chính |
| GET | `/transactions` | OWNER, MANAGER, ACCOUNTANT | Sổ quỹ giao dịch thu/chi |
| GET | `/transactions/:id` | OWNER, MANAGER, ACCOUNTANT | Chi tiết giao dịch tài chính |
| POST | `/transactions` | OWNER, MANAGER, ACCOUNTANT | Ghi nhận giao dịch tài chính thủ công |
| PATCH | `/transactions/:id` | OWNER, MANAGER, ACCOUNTANT | Chỉnh sửa giao dịch thủ công (chặn sửa giao dịch tự động) |
| DELETE | `/transactions/:id` | OWNER, MANAGER, ACCOUNTANT | Xóa giao dịch thủ công |
| GET | `/reports/cashflow` | OWNER, MANAGER, ACCOUNTANT | Báo cáo dòng tiền thu/chi theo 12 tháng `?year=YYYY` |
| GET | `/reports/cycles` | OWNER, MANAGER, ACCOUNTANT | Tổng hợp giá thành, sản lượng và lãi/lỗ tất cả mùa vụ |
| GET | `/reports/cycles/:id/cost` | OWNER, MANAGER, ACCOUNTANT | Chi tiết cấu thành chi phí (vật tư, nhân công, dịch vụ) của một mùa vụ |
| GET | `/reports/products` | OWNER, MANAGER, ACCOUNTANT | Báo cáo doanh số và sản lượng tiêu thụ theo mặt hàng `?from=&to=` |

---

## 6. Du lịch nông nghiệp & Đặt chỗ tour (GĐ 5)

| Method | Route | Quyền | Mục đích |
| --- | --- | --- | --- |
| GET | `/tours` | OWNER, MANAGER, SALES, ACCOUNTANT | Quản lý danh sách tour du lịch trải nghiệm |
| GET | `/tours/:id` | OWNER, MANAGER, SALES, ACCOUNTANT | Chi tiết tour du lịch |
| POST | `/tours` | OWNER, MANAGER | Tạo tour du lịch mới |
| PATCH | `/tours/:id` | OWNER, MANAGER | Cập nhật tour |
| PATCH | `/tours/:id/publish` | OWNER, MANAGER | Xuất bản / gỡ xuất bản tour |
| GET | `/tours/:id/slots` | OWNER, MANAGER, SALES, ACCOUNTANT | Lịch suất trải nghiệm của tour `?from=&to=` |
| GET | `/tour-slots/:id` | OWNER, MANAGER, SALES, ACCOUNTANT | Chi tiết một suất trải nghiệm |
| POST | `/tours/:id/slots` | OWNER, MANAGER | Mở một suất trải nghiệm đơn lẻ |
| POST | `/tours/:id/slots/batch` | OWNER, MANAGER | Mở suất hàng loạt theo khoảng ngày, thứ trong tuần và khung giờ |
| PATCH | `/tour-slots/:id` | OWNER, MANAGER | Cập nhật sức chứa suất (chặn giảm nhỏ hơn số vé đã đặt) |
| DELETE | `/tour-slots/:id` | OWNER, MANAGER | Xóa suất chưa có lượt đặt vé |
| GET | `/public/tours` | Public | Danh sách tour công khai cho khách tham quan |
| GET | `/public/tours/:slug` | Public | Chi tiết tour kèm các suất còn chỗ trống trong 60 ngày tới |
| POST | `/public/bookings` | Public | Đặt vé tour trực tuyến (khóa suất bằng `SELECT FOR UPDATE`, chống đặt quá chỗ) |
| GET | `/public/bookings/lookup` | Public | Tra cứu đặt chỗ bằng mã booking và số điện thoại |
| GET | `/public/bookings/:code` | Public | Chi tiết đặt chỗ sau khi đặt thành công kèm mã QR thanh toán VietQR |
| GET | `/bookings` | OWNER, MANAGER, SALES, ACCOUNTANT | Quản lý danh sách đặt chỗ tour (phân trang, lọc trạng thái, ngày) |
| GET | `/bookings/:id` | OWNER, MANAGER, SALES, ACCOUNTANT | Chi tiết đặt chỗ kèm lịch sử thanh toán |
| POST | `/bookings/:id/confirm` | OWNER, MANAGER, SALES | Xác nhận đặt chỗ và gửi email thông báo |
| POST | `/bookings/:id/cancel` | OWNER, MANAGER, SALES | Hủy đặt chỗ và hoàn trả số vé vào suất |
| POST | `/bookings/:id/complete` | OWNER, MANAGER, SALES | Đánh dấu hoàn thành chuyến tham quan |
| POST | `/bookings/:id/payments` | OWNER, MANAGER, SALES, ACCOUNTANT | Thu tiền tour: sinh phiếu thu `TT-` và `Transaction INCOME` (danh mục `TOUR`) |

---

## 7. Nhân sự, Chấm công, Bảng lương & PWA Sync (GĐ 6)

| Method | Route | Quyền | Mục đích |
| --- | --- | --- | --- |
| GET | `/employees` | OWNER, MANAGER, ACCOUNTANT | Danh sách hồ sơ nhân viên (hình thức trả lương, mức lương) |
| GET | `/employees/:id` | OWNER, MANAGER, ACCOUNTANT | Chi tiết nhân viên |
| POST | `/employees` | OWNER, MANAGER | Tiếp nhận nhân viên mới |
| PATCH | `/employees/:id` | OWNER, MANAGER | Cập nhật hồ sơ nhân viên |
| DELETE | `/employees/:id` | OWNER, MANAGER | Xóa nhân viên chưa phát sinh công hoặc lương |
| PATCH | `/employees/:id/user` | OWNER, MANAGER | Liên kết hoặc hủy liên kết tài khoản đăng nhập với nhân viên |
| GET | `/tasks` | All roles | Quản lý danh sách nhiệm vụ công việc nông trại |
| GET | `/tasks/my` | All roles | Danh sách công việc được giao cho nhân viên hiện tại |
| GET | `/tasks/:id` | All roles | Chi tiết công việc |
| POST | `/tasks` | OWNER, MANAGER | Phân công giao việc mới (có thể gắn với mùa vụ) |
| PATCH | `/tasks/:id` | OWNER, MANAGER | Cập nhật thông tin công việc |
| DELETE | `/tasks/:id` | OWNER, MANAGER | Hủy công việc |
| POST | `/tasks/:id/start` | OWNER, MANAGER, WORKER | Bắt đầu thực hiện công việc (`IN_PROGRESS`) |
| POST | `/tasks/:id/complete` | OWNER, MANAGER, WORKER | Hoàn thành công việc (tự động liên kết tạo nhật ký canh tác nếu có) |
| POST | `/attendance/check-in` | OWNER, MANAGER, WORKER | Chấm công vào ca làm việc |
| POST | `/attendance/check-out` | OWNER, MANAGER, WORKER | Chấm công ra ca làm việc |
| GET | `/attendance` | All roles | Danh sách chấm công (lọc ngày, nhân viên, mùa vụ) |
| GET | `/attendance/:id` | All roles | Chi tiết bản ghi chấm công |
| POST | `/attendance` | OWNER, MANAGER | Tạo bản ghi chấm công thủ công |
| PATCH | `/attendance/:id` | OWNER, MANAGER | Điều chỉnh giờ công hoặc số lượng khoán |
| DELETE | `/attendance/:id` | OWNER, MANAGER | Xóa bản ghi chấm công |
| POST | `/payrolls/generate` | OWNER, ACCOUNTANT | Tổng hợp bảng lương tự động từ dữ liệu chấm công theo kỳ |
| GET | `/payrolls` | OWNER, ACCOUNTANT | Danh sách bảng lương |
| GET | `/payrolls/:id` | OWNER, ACCOUNTANT | Chi tiết bảng lương và các dòng lương nhân viên |
| POST | `/payrolls/:id/approve` | OWNER, ACCOUNTANT | Phê duyệt bảng lương |
| POST | `/payrolls/:id/pay` | OWNER | Chi trả lương: tự động sinh phiếu chi và `Transaction EXPENSE` (danh mục `LUONG`) |
| POST | `/payrolls` | OWNER, ACCOUNTANT | Tạo bảng lương thủ công |
| PATCH | `/payrolls/:id` | OWNER, ACCOUNTANT | Điều chỉnh bảng lương |
| DELETE | `/payrolls/:id` | OWNER, ACCOUNTANT | Hủy bảng lương chưa duyệt |
| POST | `/sync/batch` | All roles | Đồng bộ thao tác offline từ PWA công nhân (xử lý idempotent qua `clientId`) |

---

## 8. Thiết bị, Bảo trì, IoT & Bảng điều khiển (GĐ 7)

| Method | Route | Quyền | Mục đích |
| --- | --- | --- | --- |
| GET | `/equipment` | All roles | Danh mục thiết bị nông nghiệp (phân trang, lọc khu/lô, trạng thái) |
| GET | `/equipment/:id` | All roles | Chi tiết thiết bị, lịch bảo dưỡng và nhật ký bảo trì |
| POST | `/equipment` | OWNER, MANAGER | Thêm thiết bị mới |
| PATCH | `/equipment/:id` | OWNER, MANAGER | Cập nhật thông tin thiết bị |
| DELETE | `/equipment/:id` | OWNER, MANAGER | Xóa thiết bị |
| GET | `/maintenance-schedules` | All roles | Lịch bảo dưỡng định kỳ các thiết bị |
| POST | `/maintenance-schedules` | OWNER, MANAGER | Lập lịch bảo dưỡng định kỳ mới |
| PATCH | `/maintenance-schedules/:id` | OWNER, MANAGER | Cập nhật lịch bảo dưỡng |
| GET | `/maintenance-logs` | All roles | Nhật ký thực hiện bảo trì, thay thế phụ tùng |
| POST | `/maintenance-logs` | OWNER, MANAGER, WORKER | Ghi nhận hoàn thành bảo trì |
| PATCH | `/maintenance-logs/:id` | OWNER, MANAGER | Cập nhật nhật ký bảo trì |
| POST | `/alerts/run-maintenance-check` | OWNER, MANAGER | Quét lịch bảo trì đến hạn và sinh cảnh báo `MAINTENANCE_DUE` |
| GET | `/sensors` | All roles | Danh sách cảm biến IoT lắp đặt tại các khu/lô |
| GET | `/sensors/:id` | All roles | Chi tiết cảm biến |
| POST | `/sensors` | OWNER, MANAGER | Khởi tạo cảm biến mới (trả API key duy nhất một lần) |
| PATCH | `/sensors/:id` | OWNER, MANAGER | Cập nhật thông tin cảm biến |
| POST | `/sensors/:id/rotate-key` | OWNER, MANAGER | Đổi mã API key cho cảm biến IoT |
| POST | `/iot/readings` | Public (Header `X-Sensor-Key`) | Thu nạp dữ liệu cảm biến theo lô (batch), tự động kích hoạt luật cảnh báo |
| GET | `/iot/series` | All roles | Lấy chuỗi dữ liệu lịch sử cảm biến theo khoảng thời gian để vẽ biểu đồ |
| GET | `/iot/latest` | All roles | Lấy chỉ số mới nhất của các cảm biến theo khu/lô |
| GET | `/alert-rules` | All roles | Danh mục quy tắc giám sát ngưỡng cảm biến |
| POST | `/alert-rules` | OWNER, MANAGER | Thiết lập quy tắc cảnh báo (ngưỡng `GT`/`LT`, thời gian cooldown) |
| PATCH | `/alert-rules/:id` | OWNER, MANAGER | Cập nhật quy tắc cảnh báo |
| DELETE | `/alert-rules/:id` | OWNER, MANAGER | Xóa quy tắc cảnh báo |
| GET | `/dashboard/summary` | All roles | Tổng hợp chỉ số KPI điều hành nông trại (tối ưu 1 SQL aggregate, < 50ms) |
| GET | `/dashboard/charts` | All roles | Dữ liệu chuỗi thời gian doanh thu/chi phí và sản lượng 12 tháng phục vụ biểu đồ |
